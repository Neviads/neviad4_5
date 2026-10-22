from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from beneviadsystem.config.resources import read_text
from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, TextList
from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.service.agent.impl.scenario_models import Scenario
from beneviadsystem.service.agent.tools.livecode.live_code_bridge import LiveCodeBridge
from beneviadsystem.service.text_format import general_number, plain_number, scientific_number

from . import agent_runner
from .agent_activity import AgentActivity
from .agent_activity_publisher import AgentActivityPublisher
from .agent_runner import AgentRunner
from .agent_spec import AgentSpec
from .agent_steps import AgentSteps
from .bridged_code_store import BridgedCodeStore
from .code_layer import ENGINE_TEMPLATES, CodeLayer
from .code_session import Limits
from .code_store import CodeStore
from .experiment_names import ExperimentNames
from .source_store import NOTES_DIR

MAX_ROUNDS = agent_runner.MAX_ROUNDS
#: The samples of the engine layer; kept here because the tests name them.
TEMPLATE_FILES = ENGINE_TEMPLATES
CONTINUATION_HINT = ("Hãy đọc lại các file engine đã ghi để biết chúng đang ra sao, sửa chỗ còn thiếu hoặc sai bằng `edit_file`, ghi chú nếu chưa, "
                     "rồi `finish`.")


class ObjectInfo(CamelModel):
    """One drawn object: where its code is and what its drawer noted. Its geometry is in the scenario's ``objectGeometry``, the one source
    every layer reads."""

    id: str
    title: str
    file: str
    function_name: str
    notes: str | None = None


class Request(CamelModel):
    run_id: str
    slug: str | None = None
    request: str
    scenario: Scenario
    objects: Annotated[list[ObjectInfo], EmptyIfNone] = []


class Result(CamelModel):
    """``status`` is ``"finished"`` only when the session says so; ``files`` are the files the agent wrote."""

    status: str
    rounds: int
    summary: str
    ledger: str
    notes_path: str
    files: TextList = []
    failures: TextList = []


class CodeAgentService:
    """Runs the code agent of ONE layer on the copy of ``neviadlike_structure`` that the browser holds. It only knows what is specific to
    an experiment (the three layers, the names derived from the slug, the scenario and the drawn objects, the prompts) and builds the
    :class:`AgentSpec`; the agent itself (tools, rounds, ledger) is :class:`AgentRunner`."""

    def __init__(self, ai_client: AiClient, stores: Callable[[str], CodeStore], activity: AgentActivityPublisher | None = None, drafts=None):
        """``stores`` gives the tree of a run id; ``drafts`` (a :class:`CodeDraftPublisher`, optional) shows files while they are written."""
        self._runner = AgentRunner(ai_client)
        self._stores = stores
        self._activity = activity
        self._drafts = drafts
        self._prompts = {layer: read_text(layer.prompt_resource) for layer in CodeLayer}

    @classmethod
    def over_bridge(cls, ai_client: AiClient, bridge: LiveCodeBridge, activity: AgentActivityPublisher | None, drafts) -> CodeAgentService:
        """The production service: every run works on the browser's copy through the live-code bridge."""
        return cls(ai_client, lambda run_id: BridgedCodeStore(bridge, run_id), activity, drafts)

    def run_engine(self, request: Request) -> Result:
        return self.run(CodeLayer.ENGINE, request)

    def run(self, layer: CodeLayer, request: Request) -> Result:
        names = ExperimentNames.of(request.slug)
        store = self._stores(request.run_id)
        notes_path = f"{NOTES_DIR}{names.slug}.md"
        # Only files that exist: a sample missing from the copy must not block the layer for good.
        object_files = [o.file for o in request.objects if o.file and o.file.strip() and store.exists(o.file)]
        must_read = [f for f in layer.must_read(names, object_files) if store.exists(f)]
        writable = layer.writable(names, object_files)
        steps = AgentSteps(self._activity, request.run_id, layer.label, layer.title)
        spec = AgentSpec(_fill(self._prompts[layer], names), _task(layer, request, names, writable, must_read), layer.label, notes_path,
                         frozenset(writable), frozenset(must_read), Limits.defaults(), CONTINUATION_HINT, listener=steps, require_note=True,
                         extra_stream=None if self._drafts is None else self._drafts.streamer(request.run_id))
        steps.whole(AgentActivity.STARTED, True, "Agent bắt đầu viết tầng " + layer.title)
        outcome = self._runner.run(spec, store)
        finished = outcome.status == "finished"
        steps.whole(AgentActivity.FINISHED, finished,
                    "Đã xong" if finished else ("Chưa xong" if not outcome.failures else "Chưa xong: " + outcome.failures[-1]))
        return Result(status=outcome.status, rounds=outcome.rounds, summary=outcome.summary, ledger=outcome.ledger, notes_path=outcome.notes_path,
                      files=outcome.files, failures=outcome.failures)


def _fill(template: str, names: ExperimentNames) -> str:
    return (template.replace("{{SLUG}}", names.slug).replace("{{PASCAL}}", names.pascal).replace("{{CAMEL}}", names.camel)
            .replace("{{SNAKE}}", names.snake))


def _format_value(value: float) -> str:
    return general_number(value, 4) if 0.01 <= abs(value) < 100000 else scientific_number(value, 4)


def _section(out: list[str], title: str, items: list[str]) -> None:
    if not items:
        return
    out.append(title + ":\n")
    out.extend(f"  - {item}\n" for item in items)


_GEOMETRY_NOTE = {
    CodeLayer.ENGINE: "Engine báo vị trí ĐIỂM NEO của mỗi vật bằng mét và giá trị của mỗi bộ phận; mọi tương tác (chạm, tiếp xúc, phát hạt) tính bằng "
                      "kích thước và các điểm dưới đây.\n",
    CodeLayer.RENDERER: "Code của vật là BẢN THAM KHẢO do người vẽ làm trước khi có engine: bạn được sửa hay viết lại nó (file của vật nằm trong danh sách "
                        "file được giao), kể cả chọn lại điểm neo nếu cần (ghi rõ vào note và engine phải cùng hiểu), nhưng PHẢI giữ đúng kích thước, tên "
                        "các bộ phận và tên các điểm dưới đây. Bỏ khỏi vật những thứ thuộc cảnh động (hạt, tia, chấm sáng, đường đi, số liệu vẽ cứng): "
                        "engine sinh ra chúng, cảnh vẽ lại chúng từ `metrics`.\n",
    CodeLayer.EXPERIMENT: "Vật và cảnh đã xong ở hai tầng trước.\n",
}

_PHENOMENA_NOTE = {
    CodeLayer.ENGINE: "Đây là trạng thái của engine: bạn sinh ra, cho chúng chuyển động, cho mất đi, và đưa ra qua `metrics.items` (mỗi phần tử có `kind` "
                      "đúng bằng tên ở trên). Số lượng thay đổi theo thời gian; rỗng khi chưa có gì.\n",
    CodeLayer.RENDERER: "Engine đưa chúng ra qua `metrics.items`. Mỗi khung hình bạn đọc danh sách đó và vẽ, dùng `drawItems` (`shared/draw-items.ts`). "
                        "Cảnh KHÔNG được đứng yên như một bức hình khi kịch bản có hiện tượng.\n",
    CodeLayer.EXPERIMENT: "Engine và cảnh đã lo phần này ở hai tầng trước.\n",
}


def _task(layer: CodeLayer, request: Request, names: ExperimentNames, writable: list[str], must_read: list[str]) -> str:
    out = [f"# Nhiệm vụ\nViết tầng {layer.title} của thí nghiệm `{names.slug}`.\n"]
    if layer.has_earlier_layers():
        out.append(f"Các tầng trước đã xong và nằm trong bản sao; ghi chú của chúng ở `{NOTES_DIR}{names.slug}.md` (đọc nó trước, rồi đọc code của "
                   "tầng trước khi cần).\n")
    out.append("\n")
    out.append(f"## Yêu cầu của giáo viên\n{request.request}\n\n")
    scenario = request.scenario
    out.append("## Kịch bản (nguồn của công thức và diễn tiến; bạn tự dịch ra code)\n")
    out.append(f"Tóm tắt: {scenario.summary}\n")
    _section(out, "Công thức", scenario.formulas)
    out.append("Diễn tiến:\n")
    for index, phase in enumerate(scenario.phases, start=1):
        out.append(f"  {index}. {phase.name}: {phase.description}\n")
    out.append(f"Bố cục: {scenario.layout}\n")
    if scenario.view.strip():
        out.append(f"Góc nhìn: {scenario.view}\n")
    _section(out, "Học sinh chỉnh", scenario.adjustable)
    _section(out, "Học sinh quan sát", scenario.observable)
    _section(out, "Giả định", scenario.assumptions)
    _section(out, "Ví dụ tính bằng số của kịch bản (ca kiểm; kết quả do máy tính từ biểu thức, engine PHẢI cho đúng với các tham số tương ứng)",
             [f"{x.text} → {_format_value(x.value)}{'' if not x.unit.strip() else ' ' + x.unit}  [biểu thức: {x.expression}]" for x in scenario.worked_examples])
    if scenario.phenomena:
        out.append("\n## Hiện tượng thí nghiệm tạo ra (KHÔNG phải bộ phận của vật nào)\n")
        for p in scenario.phenomena:
            line = f"- `{p.name}`: {p.description}"
            if p.from_.strip():
                line += f" Ra từ điểm `{p.from_}` của vật."
            if p.appearance.strip():
                line += f" Trông như: {p.appearance}"
            out.append(line + "\n")
        out.append(_PHENOMENA_NOTE[layer])
    out.append("\n## Các vật và hình học chung của cảnh (do kịch bản chốt; MỌI tầng dùng đúng các số này, không tầng nào tự đặt số khác)\n")
    out.append("Vật KHÔNG có vật lý: hàm dựng `(p, ppm, fill, label)` vẽ vật đúng kích thước bằng mét × `ppm`, gốc nhóm là điểm neo, và trả "
               "`{ group, parts, points }` (xem `objects/types.ts`, kiểu `ShapeObject`). Vị trí của vật trong thế giới và tư thế của từng bộ phận do engine cấp.\n")
    out.append(_GEOMETRY_NOTE[layer])
    geometry = {g.object_id: g for g in scenario.object_geometry}
    for obj in request.objects:
        out.append(f"- id `{obj.id}`: {obj.title} (file `{obj.file}`, hàm `{obj.function_name}`)\n")
        g = geometry.get(obj.id)
        if g is not None:
            anchor = "tâm hình bao (vật không có điểm neo riêng)" if not g.anchor.strip() else g.anchor
            out.append(f"  Kích thước: rộng {plain_number(g.width)} m, cao {plain_number(g.height)} m. Điểm neo: {anchor}\n")
            for point in g.points:
                out.append(f"  Điểm `{point.name}`: {point.description}\n")
            for part in g.parts:
                motion = (f"trượt theo hướng {part.axis}, từ {plain_number(part.min)} đến {plain_number(part.max)} m" if part.motion == "slide"
                          else f"quay quanh khớp của nó, từ {plain_number(part.min)} đến {plain_number(part.max)} độ")
                out.append(f"  Bộ phận `{part.name}`: {motion} tính từ vị trí nghỉ{'' if not part.description.strip() else ' (' + part.description + ')'}\n")
            if not g.parts:
                out.append("  Không có bộ phận chuyển động bên trong.\n")
        if obj.notes and obj.notes.strip():
            out.append(f"  Ghi chú của người vẽ: {obj.notes}\n")
    out.append("\n## File được giao (chỉ ghi được các file này)\n" + "\n".join(f"- {f}" for f in writable) + "\n")
    out.append("\n## File phải đọc trước khi ghi\n" + "\n".join(f"- {f}" for f in must_read) + "\n")
    out.append("\nNhớ: ghi ít nhất một ghi chú bằng `append_note`, rồi gọi `finish`.")
    return "".join(out)
