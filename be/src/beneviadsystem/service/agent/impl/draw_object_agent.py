from __future__ import annotations

import hashlib
import logging
import threading
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Annotated, Any

from pydantic import field_validator

from beneviadsystem.config.resources import read_text
from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, Text, TextList
from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.tool_callback import FunctionToolCallback, ToolCallback
from beneviadsystem.infrastructure.ai.tool_image_source import Image, ToolImageSource
from beneviadsystem.infrastructure.ai.tool_schema_lock import ToolSchemaLock
from beneviadsystem.service.agent.codegen.agent_activity import AgentActivity
from beneviadsystem.service.agent.codegen.agent_activity_publisher import AgentActivityPublisher
from beneviadsystem.service.agent.codegen.agent_runner import AgentRunner
from beneviadsystem.service.agent.codegen.agent_spec import AgentSpec
from beneviadsystem.service.agent.codegen.agent_steps import AgentSteps
from beneviadsystem.service.agent.codegen.bridged_code_store import BridgedCodeStore
from beneviadsystem.service.agent.codegen.code_session import CodeSession, Limits
from beneviadsystem.service.agent.codegen.code_store import CodeStore
from beneviadsystem.service.agent.codegen.experiment_names import ExperimentNames
from beneviadsystem.service.agent.tools.livecode.live_code_bridge import LiveCodeBridge
from beneviadsystem.service.text_format import plain_number

from .draw_object_judge import Criteria, DrawObjectJudge, Verdict
from .draw_object_validator import DrawObjectValidator
from .scenario_models import FramePart, ObjectGeometry

log = logging.getLogger(__name__)
MAX_CHECKS = 12
#: A figure is a short file; a deeper setting only risks a silent turn that a gateway cuts, so the code agents keep "high" and this one does not.
DEFAULT_REASONING_EFFORT = "medium"
AGENT_PROMPT = "prompts/drawobject/agent.md"
LIMITS = Limits(20, 30, 5, 120_000, 20_000)
CONTINUATION_HINT = "Hãy đọc lại file đã ghi, gọi `check_object`, sửa chỗ còn lỗi hoặc còn sơ sài bằng `edit_file`, rồi `finish`."
MIN_DESCRIBED_PARTS = 1
MIN_OVERALL_CHARS = 60
MIN_SHAPE_CHARS = 20
DESCRIBE_CALLS = 4
#: How many times the judge may refuse ``finish`` before the object is accepted with a warning (so one object never stops an experiment).
MAX_JUDGINGS = 3


class DrawObjectRequest(CamelModel):
    """``is_static`` is kept for callers that still say it. ``geometry`` is what the scenario fixed for this object (size in metres, anchor,
    named points, moving parts): the figure is drawn to exactly that and the check measures it; None when no scenario was given. ``view`` is
    the one viewpoint of the whole scene (empty when there is none). ``style`` is the look agreed with the teacher (empty: as real as possible)."""

    title: str
    request: str
    hint: Text = ""
    is_static: bool = False
    geometry: ObjectGeometry | None = None
    view: Text = ""
    frame: Annotated[list[FramePart], EmptyIfNone] = []
    style: Text = ""

    @field_validator("view", "style")
    @classmethod
    def _trimmed(cls, value: str) -> str:
        return value.strip()


class DrawObjectResult(CamelModel):
    """Same fields as ``DrawObjectItem`` of the frontend gallery, so the page can draw it as it is. ``size`` (metres), ``moving`` (the moving
    parts) and ``points`` come from the shape contract; the older fields stay for the gallery's older items and are empty here."""

    id: int
    title: str
    request: str
    hint: str | None = None
    source: str
    status: str
    attempts: int
    name: str | None = None
    shape: str | None = None
    anchor: str | None = None
    ports: Any = None
    inputs: Any = None
    outputs: Any = None
    self_tests: Any = None
    self_test_report: TextList = []
    parts: Any = None
    notes: str | None = None
    code: str | None = None
    js: str | None = None
    problems: TextList = []
    size: Any = None
    moving: Any = None
    points: Any = None


class CheckInput(CamelModel):
    reason: str | None = None


class RealPart(CamelModel):
    """One part of the object as the drawer remembers its familiar look, before any code."""

    name: str | None = None
    real_shape: str | None = None
    position: str | None = None
    proportion: str | None = None
    material: str | None = None
    details: str | None = None


class DescribeInput(CamelModel):
    """``describe_real_object``: the familiar look of the object in detail (its look, size, every part, what the scene's viewpoint shows)."""

    overall: str | None = None
    size: str | None = None
    parts: list[RealPart | None] | None = None
    view_notes: str | None = None


class DescribeOutput(CamelModel):
    ok: bool
    problems: list[str]
    next: str


class CheckOutput(CamelModel):
    ok: bool
    problems: list[str]
    report: list[str]


class _Description:
    """The accepted description of one run; the write gate opens once it is there."""

    def __init__(self):
        self.accepted: DescribeInput | None = None


@dataclass
class _Checks:
    """What the last ``check_object`` of one run saw; the finish gate and the result both read it. ``images`` are the pictures of that
    check (the judge reads them); ``pending`` are the same pictures until the model has been shown them once."""

    count: int = 0
    ok: bool = False
    problems: list[str] = field(default_factory=list)
    report: list[str] = field(default_factory=list)
    js: str | None = None
    meta: dict[str, Any] | None = None
    fingerprint: str = ""
    images: list[Image] = field(default_factory=list)
    pending: list[Image] = field(default_factory=list)


@dataclass
class _Judging:
    """The judge's side of one run: the criteria (fixed once), every verdict, and the version it passed."""

    criteria: Criteria | None = None
    count: int = 0
    last: Verdict | None = None
    passed_fingerprint: str | None = None
    failure: str | None = None
    lines: list[str] = field(default_factory=list)


def _blank(text: str | None) -> bool:
    return text is None or not text.strip()


def _fingerprint(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


class _ImageAttachingToolCallback(ToolCallback, ToolImageSource):
    """``check_object`` as the model sees it: the text result plus the pictures of the figure, each shown once."""

    def __init__(self, delegate: ToolCallback, checks: _Checks):
        self._delegate = delegate
        self._checks = checks

    @property
    def definition(self):
        return self._delegate.definition

    def call(self, tool_input: str) -> str:
        return self._delegate.call(tool_input)

    def take_images(self) -> list[Image]:
        images, self._checks.pending = self._checks.pending, []
        return images


class DrawObjectAgent:
    """Draws ONE object from a request (title, prose, hint) as a free agent: its only rule is that the figure be beautiful and true to life
    (see ``prompts/drawobject/agent.md``). It reads what it likes of the browser's copy of ``neviadlike_structure``, writes one file of its
    own (``_drawn/<stem>.ts``, one Konva function) and calls ``check_object``, which says whether the code runs and draws something and shows
    the pictures. It may ``finish`` once the last check passed on exactly the file it now holds (and, with a judge, the judge passed it)."""

    def __init__(self, ai_client: AiClient, validator: DrawObjectValidator, stores: Callable[[str], CodeStore],
                 activity: AgentActivityPublisher | None = None, reasoning_effort: str | None = DEFAULT_REASONING_EFFORT, drafts=None,
                 judge: DrawObjectJudge | None = None):
        """``judge`` None means no judging: ``finish`` only needs a passing check. ``drafts`` (a :class:`CodeDraftPublisher`) shows the file
        while it is written."""
        self._runner = AgentRunner(ai_client)
        self._validator = validator
        self._stores = stores
        self._activity = activity
        self._reasoning_effort = reasoning_effort.strip() if reasoning_effort and reasoning_effort.strip() else None
        self._drafts = drafts
        self._judge = judge
        self._system = read_text(AGENT_PROMPT)
        self._check_lock = threading.Lock()

    @classmethod
    def over_bridge(cls, ai_client: AiClient, validator: DrawObjectValidator, bridge: LiveCodeBridge, activity: AgentActivityPublisher | None,
                    reasoning_effort: str | None, drafts, judge: DrawObjectJudge | None) -> DrawObjectAgent:
        """The production agent: it draws on the browser's copy of the tree through the live-code bridge."""
        return cls(ai_client, validator, lambda run_id: BridgedCodeStore(bridge, run_id), activity, reasoning_effort, drafts, judge)

    def generate(self, request: DrawObjectRequest, run_id: str, store: CodeStore | None = None) -> DrawObjectResult:
        """``run_id`` is the live code session of the browser whose copy the agent works on. With ``store``, the same agent, prompt, check and
        model run on that tree instead (for example an overlay over the template from the database), e.g. to compare two versions of the
        agent on one object without the page."""
        stem = ExperimentNames.slugify(request.title) + "-" + uuid.uuid4().hex[:4]
        code_path = f"_drawn/{stem}.ts"
        notes_path = f"_notes/draw-{stem}.md"
        checks, judging = _Checks(), _Judging()
        steps = AgentSteps(self._activity, run_id, stem, request.title)
        steps.whole(AgentActivity.STARTED, True, "Agent bắt đầu vẽ vật")
        try:
            tree = store if store is not None else self._stores(run_id)
            description = _Description()
            spec = AgentSpec(self._system, self._task(request, code_path), "object", notes_path, frozenset({code_path}), frozenset(), LIMITS,
                             CONTINUATION_HINT, [self._describe_tool(tree, notes_path, description, request, steps),
                                                 self._check_tool(tree, code_path, checks, steps, request.geometry)],
                             MAX_CHECKS + DESCRIBE_CALLS, self._gate(tree, code_path, checks, judging, request, steps), steps, False, self._reasoning_effort,
                             None if self._drafts is None else self._drafts.streamer(run_id, request.title, code_path),
                             lambda path: None if description.accepted is not None
                             else "DESCRIBE_FIRST: hãy gọi describe_real_object (tả chi tiết hình mẫu quen thuộc của vật) trước khi viết code")
            started = time.monotonic()
            outcome = self._runner.run(spec, tree)
            log.info("DrawObjectAgent status=%s, rounds=%d, checks=%d, ok=%s, judgings=%d, elapsedMs=%d", outcome.status, outcome.rounds, checks.count,
                     checks.ok, judging.count, int((time.monotonic() - started) * 1000))
            code = tree.read(code_path) or ""
            passed = outcome.status == "finished" and checks.ok and checks.fingerprint == _fingerprint(code)
            steps.whole(AgentActivity.FINISHED, passed,
                        "Đã vẽ xong" if passed else ("Chưa xong" if not outcome.failures else "Chưa xong: " + outcome.failures[-1]))
            notes = _read_notes(tree, notes_path)
            if passed:
                return self._result(request, checks.meta, code, notes, "ok", max(1, checks.count), judging.lines + checks.report, checks.js, [])
            problems = list(checks.problems) + list(outcome.failures)
            if not problems:
                problems.append(f"Agent chưa xong sau {outcome.rounds} lượt: chưa có lần check_object nào qua trên bản cuối.")
            return self._result(request, checks.meta, code, notes, "failed", max(1, checks.count), [], None, problems)
        except Exception as failure:
            log.warning("DrawObjectAgent failed: %s", failure)
            steps.whole(AgentActivity.FINISHED, False, f"Agent không chạy được: {failure}")
            return self._result(request, None, "", None, "failed", max(1, checks.count), [], None, [f"Agent không chạy được: {failure}"])

    @staticmethod
    def _task(request: DrawObjectRequest, code_path: str) -> str:
        return ("# Nhiệm vụ\nVẽ MỘT vật thể. Luật về hình: phải đẹp và giống thật" + ("" if not request.style else ", theo phong cách đã chốt với giáo viên")
                + ".\n\n# Mô tả (tham khảo)\n\nVật thể: " + request.title + "\n" + request.request
                + ("" if _blank(request.hint) else "\n\nGợi ý giao diện (chỉ để tham khảo, bạn tự quyết): " + request.hint)
                + DrawObjectAgent.style_section(request.style)
                + DrawObjectAgent.frame_section(request.frame)
                + DrawObjectAgent.geometry_section(request.geometry)
                + _view_section(request.view)
                + "\n\n## File được giao (chỉ ghi được file này)\n- " + code_path
                + "\n\nNhớ: BẮT ĐẦU bằng `describe_real_object` (hệ thống từ chối ghi code trước đó), rồi code theo khung và mô tả của bạn, gọi `check_object` "
                  "sau mỗi lần sửa, và gọi `finish` khi hình đã giống hình mẫu của vật.")

    @staticmethod
    def style_section(style: str | None) -> str:
        """The look the teacher chose when the lite spec asked back; it sets how real, how flat and how detailed the figure is."""
        if _blank(style):
            return ""
        return ("\n\n## Phong cách hình đã chốt với giáo viên (BẮT BUỘC)\n" + style.strip()
                + '\nVẽ theo đúng phong cách này thay cho "giống thật hết mức"; khung, tỉ lệ và góc nhìn vẫn giữ như dưới đây.')

    @staticmethod
    def frame_section(frame: list[FramePart] | None) -> str:
        """The frame the spec step wrote: the visible parts of the object, where they sit and how big they are."""
        if not frame:
            return ""
        lines = "".join(f"- **{p.name}**: {p.shape}; {p.position}; {p.proportion}\n" for p in frame)
        return ("\n\n## Khung của vật (BẮT BUỘC có đủ các bộ phận này, mỗi bộ phận một hình riêng)\n" + lines
                + "Được thêm bộ phận ngoài khung nếu hình mẫu của vật có, để hình giống hơn.")

    @staticmethod
    def describe_problems(description: DescribeInput | None, frame: list[FramePart] | None) -> list[str]:
        """What is missing from a description of the object's familiar look: too short a look, no size or viewpoint, too few parts, a part
        without its outline, position or proportion, or a part of the frame that the description leaves out. Empty means accepted."""
        if description is None:
            return ["thiếu nội dung mô tả"]
        problems: list[str] = []
        wanted_parts = max(MIN_DESCRIBED_PARTS, len(frame or []))
        if _blank(description.overall) or len(description.overall.strip()) < MIN_OVERALL_CHARS:
            problems.append(f"overall: tả hình mẫu quen thuộc của vật trông thế nào (dáng chung, phong cách, màu, cảm giác), ít nhất {MIN_OVERALL_CHARS} ký tự")
        if _blank(description.size):
            problems.append("size: kích thước của vật (thật, hay cỡ mô hình đã ghi) và tỉ lệ của các khối chính")
        if _blank(description.view_notes):
            problems.append("viewNotes: nhìn từ góc nhìn của cảnh thì thấy mặt nào, bộ phận nào che bộ phận nào")
        parts = description.parts or []
        if len(parts) < wanted_parts:
            problems.append(f"parts: có {len(parts)} bộ phận, cần ít nhất {wanted_parts} (mọi bộ phận của khung, thêm bộ phận khác nếu hình mẫu có)")
        for part in parts:
            if part is None or _blank(part.name):
                problems.append("parts: có bộ phận không tên")
                continue
            name = part.name.strip()
            if _blank(part.real_shape) or len(part.real_shape.strip()) < MIN_SHAPE_CHARS:
                problems.append(f"bộ phận '{name}': realShape phải tả đường bao thật (bo, vát, cong, thuôn ở đâu), ít nhất {MIN_SHAPE_CHARS} ký tự")
            if _blank(part.position) or _blank(part.proportion):
                problems.append(f"bộ phận '{name}': cần đủ position (ở đâu, nối vào đâu) và proportion (to nhỏ so với cả vật)")
        named = [p.name.strip().lower() for p in parts if p is not None and not _blank(p.name)]
        for wanted in frame or []:
            key = wanted.name.strip().lower()
            if not any(key in name or name in key for name in named):
                problems.append(f"thiếu bộ phận '{wanted.name}' của khung")
        return problems

    @staticmethod
    def describe_note(description: DescribeInput) -> str:
        """The description as notes: the renderer and the teacher read what the drawer meant to draw."""
        out = [f"\n## Hình mẫu của vật (người vẽ tả trước khi code)\n{description.overall.strip()}\n- Kích thước: {description.size.strip()}"
               f"\n- Góc nhìn: {description.view_notes.strip()}\n"]
        for p in description.parts or []:
            out.append(f"- **{p.name.strip()}**: {p.real_shape.strip()}; {p.position.strip()}; {p.proportion.strip()}"
                       + ("" if _blank(p.material) else "; " + p.material.strip()) + ("" if _blank(p.details) else "; " + p.details.strip()) + "\n")
        return "".join(out)

    def _describe_tool(self, store: CodeStore, notes_path: str, description: _Description, request: DrawObjectRequest, steps: AgentSteps) -> ToolCallback:
        def describe(given: DescribeInput | None) -> DescribeOutput:
            steps.tool("describe_real_object", AgentActivity.STARTED, True, "Tả hình mẫu của vật")
            problems = self.describe_problems(given, request.frame)
            if not problems:
                description.accepted = given
                try:
                    store.append_note(notes_path, self.describe_note(given))
                except Exception as unwritable:
                    log.warning("DrawObjectAgent could not note the description: %s", unwritable)
            steps.tool("describe_real_object", AgentActivity.FINISHED, not problems,
                       "Đã tả hình mẫu của vật" if not problems else f"{len(problems)} chỗ thiếu: {problems[0]}")
            return DescribeOutput(ok=not problems, problems=problems, next=(
                "Giờ code theo đúng mô tả này: mỗi bộ phận một hình riêng với đường bao như đã tả, đúng vị trí và tỉ lệ đã tả." if not problems
                else "Bổ sung đúng các chỗ thiếu rồi gọi lại describe_real_object."))

        return ToolSchemaLock.build(lambda: FunctionToolCallback("describe_real_object", describe, input_type=DescribeInput, description=(
            "FIRST step, before any code: describe the familiar look of the object in detail and in Vietnamese: the real thing as it looks in real "
            "life, or, for what cannot be photographed (a particle, nucleus, atom, molecule), the usual scientific illustration. Input: {overall: its "
            "overall look (silhouette, style, colours), size: its size (real, or the model size the task fixed) and the proportions of its main blocks, "
            "parts: [{name, realShape: the outline of the part (where it is rounded, chamfered, curved, tapered), position: where it sits and what it "
            "joins, proportion: how big it is against the whole, material: optional, material, colour and how it catches light, details: the small "
            "details that make it recognisable}], viewNotes: what the scene's viewpoint shows and hides}. A simple object may have a single part. Every "
            "part of the task's frame must be in parts. Writing code is refused until a description is accepted; you may call it again to improve it.")))

    @staticmethod
    def geometry_section(g: ObjectGeometry | None) -> str:
        """The geometry the scenario fixed: size, anchor, named points and moving parts; check_object measures the figure against it."""
        if g is None:
            return ""
        out = [f"\n\n## Hình học của vật (BẮT BUỘC; check_object đo đúng các số này)\n"
               f"- Kích thước trên mặt phẳng hình: rộng {plain_number(g.width)} m, cao {plain_number(g.height)} m. Mọi độ dài trong code = mét × `ppm`, "
               f"nên khung bao của hình phải là {plain_number(g.width)}·ppm × {plain_number(g.height)}·ppm (sai lệch tối đa 20%).\n"
               "- Điểm neo (gốc (0,0) của `group`): "
               + ("TÂM HÌNH BAO. Vật này không có điểm neo riêng, nên đặt gốc (0,0) ở giữa hình: hình trải đều quanh gốc, mỗi phía khoảng một nửa kích thước"
                  if not g.anchor.strip() else g.anchor) + ".\n"]
        if not g.points:
            out.append("- Điểm có tên: không có (trả `points: {}`).\n")
        else:
            out.append("- Điểm có tên, trả trong `points` bằng toạ độ cục bộ px, nằm trên hình:\n")
            out.extend(f"  - `{p.name}`: {p.description}\n" for p in g.points)
        if not g.parts:
            out.append("- Bộ phận chuyển động: KHÔNG CÓ. Vật vẽ đứng yên trọn vẹn (trả `parts: {}`); nếu cả vật di chuyển thì đó là việc của engine, không phải của bạn.\n")
        else:
            out.append("- Bộ phận chuyển động, mỗi cái một `Konva.Group` con riêng trong `parts` (bạn KHÔNG viết code cho nó chạy; engine đưa số, cảnh dời nhóm con):\n")
            for p in g.parts:
                slide = p.motion == "slide"
                line = f"  - `{p.name}`: "
                if slide:
                    line += (f"trượt theo hướng `{p.axis}` từ {plain_number(p.min)} đến {plain_number(p.max)} m tính từ vị trí nghỉ; gốc nhóm con đặt ở vị trí nghỉ, "
                             "và phần bao quanh phải đủ chỗ cho cả hành trình")
                else:
                    line += f"quay từ {plain_number(p.min)} đến {plain_number(p.max)} độ; gốc nhóm con đặt ĐÚNG tâm khớp quay"
                line += ("" if not p.description.strip() else f" ({p.description})") + f'. Khai báo `{{ node, motion: "{p.motion}"'
                line += (f', axis: "{p.axis}"' if slide else "") + f", min: {plain_number(p.min)}, max: {plain_number(p.max)} }}`.\n"
                out.append(line)
        out.append("Vật không có vật lý: không `inputs`, `set`, `get`, `read`, không thời gian, vận tốc, khối lượng hay lực; không đổi vị trí của `group` sau khi dựng.")
        return "".join(out)

    def _check_tool(self, store: CodeStore, code_path: str, checks: _Checks, steps: AgentSteps, geometry: ObjectGeometry | None) -> ToolCallback:
        def check(_: CheckInput | None) -> CheckOutput:
            steps.tool("check_object", AgentActivity.STARTED, True, "Chạy thử code")
            output = self._check(store, code_path, checks, geometry)
            steps.tool("check_object", AgentActivity.FINISHED, output.ok,
                       "Chạy được" if output.ok else f"{len(output.problems)} lỗi: {output.problems[0] if output.problems else ''}")
            return output

        callback = ToolSchemaLock.build(lambda: FunctionToolCallback("check_object", check, input_type=CheckInput, description=(
            "Run your file as it is now: whether it compiles, runs and draws something, and, when the task fixes a geometry, whether the figure has "
            "the fixed size (it is built at two scales and measured), the named points and the moving parts as separate child groups. It also returns "
            "PICTURES of the figure as built (at rest, and with every moving part at its maximum): LOOK at them and judge yourself whether it looks "
            "like the real thing. Input: {reason}: optional. Returns {ok, problems, report} and the pictures. Call it after every change; finish is "
            "only accepted when the last check passed on the file you hold now, and then an independent judge looks at the pictures.")))
        return _ImageAttachingToolCallback(callback, checks)

    def _check(self, store: CodeStore, code_path: str, checks: _Checks, geometry: ObjectGeometry | None) -> CheckOutput:
        with self._check_lock:
            checks.count += 1
            code = store.read(code_path)
            if code is None or not code.strip():
                return _remember(checks, False, [f"Chưa có file {code_path}."], [], None, None, "", [])
            answer: dict[str, Any] = {"code": code}
            if geometry is not None:
                answer["geometry"] = geometry.to_json_dict()
            checked = self._validator.validate(answer)
            ok = not checked.problems
            return _remember(checks, ok, checked.problems, checked.report, checked.js if ok else None, checked.meta, _fingerprint(code), list(checked.images))

    def _gate(self, store: CodeStore, code_path: str, checks: _Checks, judging: _Judging, request: DrawObjectRequest, steps: AgentSteps):
        """``finish`` needs a passing check of exactly the file the agent holds now, and then (when there is a judge) the judge's pass on the
        pictures of that check. The judge may refuse at most :data:`MAX_JUDGINGS` times; after that, or when it cannot run, the object is
        accepted and the result says so, because one object must never stop the whole experiment."""
        def gate(session: CodeSession) -> str | None:
            if not checks.ok:
                return "chưa gọi check_object lần nào" if checks.count == 0 else "lần check_object gần nhất còn lỗi, hãy sửa rồi kiểm tra lại"
            if checks.fingerprint != _fingerprint(store.read(code_path) or ""):
                return "bạn đã sửa file sau lần check_object gần nhất: hãy gọi check_object trên bản hiện tại"
            if self._judge is None or checks.fingerprint == judging.passed_fingerprint or judging.failure is not None:
                return None
            if judging.count >= MAX_JUDGINGS:
                return None
            if not checks.images:
                judging.lines.append("⚠ giám khảo không chấm được: lần check cuối không dựng được ảnh")
                judging.failure = "no image"
                return None
            return self._judge_latest(checks, judging, request, steps)
        return gate

    def _judge_latest(self, checks: _Checks, judging: _Judging, request: DrawObjectRequest, steps: AgentSteps) -> str | None:
        steps.tool("judge", AgentActivity.STARTED, True, "Giám khảo chấm hình")
        try:
            if judging.criteria is None:
                judging.criteria = self._judge.criteria(request)
            verdict = self._judge.judge(request, judging.criteria, list(checks.images))
        except Exception as failure:
            log.warning("DrawObjectAgent judge failed: %s", failure)
            judging.failure = str(failure)
            judging.lines.append(f"⚠ giám khảo không chạy được: {failure}")
            steps.tool("judge", AgentActivity.FINISHED, False, "Giám khảo không chạy được")
            return None
        judging.count += 1
        judging.last = verdict
        first = "" if not verdict.defects else " — " + verdict.defects[0]
        judging.lines.append(f"giám khảo lần {judging.count}: {verdict.score}/10, {'qua' if verdict.passed else 'chưa qua'}{first}")
        steps.tool("judge", AgentActivity.FINISHED, verdict.passed, f"Giám khảo: {verdict.score}/10" + (", qua" if verdict.passed else ", chưa qua"))
        if verdict.passed:
            judging.passed_fingerprint = checks.fingerprint
            return None
        if judging.count >= MAX_JUDGINGS:
            judging.lines.append(f"⚠ giám khảo chưa cho qua sau {MAX_JUDGINGS} lần chấm (điểm cuối {verdict.score}/10): vật vẫn được nhận để thí nghiệm đi tiếp; "
                                 + "; ".join(verdict.defects[:3]))
            return None
        refusal = [f"giám khảo độc lập xem ảnh và chấm {verdict.score}/10, chưa đạt. {verdict.summary}\nLỗi cần sửa:"]
        refusal.extend(f"\n{index}. {defect}" for index, defect in enumerate(verdict.defects, start=1))
        refusal.append(f"\nSửa đúng từng lỗi đó bằng edit_file, gọi check_object rồi finish lại. Còn {MAX_JUDGINGS - judging.count} lần chấm.")
        return "".join(refusal)

    @staticmethod
    def _result(request: DrawObjectRequest, meta: dict[str, Any] | None, code: str | None, notes: str | None, status: str, attempts: int,
                report: list[str], js: str | None, problems: list[str]) -> DrawObjectResult:
        """What the code declared becomes the fields the gallery shows; a figure that declares nothing has empty lists."""
        node = meta or {}

        def listed(name: str) -> list[Any]:
            value = node.get(name)
            return value if isinstance(value, list) else []

        return DrawObjectResult(id=1, title=request.title, request=request.request, hint=request.hint, source="lite", status=status, attempts=attempts,
                                name=node.get("name") if isinstance(node.get("name"), str) else None, shape=None,
                                anchor=None if request.geometry is None else request.geometry.anchor, ports=listed("ports"), inputs=listed("inputs"),
                                outputs=listed("outputs"), self_tests=[], self_test_report=report, parts=[], notes=notes, code=code or None, js=js,
                                problems=problems, size=node.get("size") if isinstance(node.get("size"), dict) else None, moving=listed("moving"),
                                points=listed("points"))


def _view_section(view: str | None) -> str:
    """The viewpoint of the whole scene, firm like the geometry: every object of the experiment is drawn one by one, yet they share one scene."""
    if _blank(view):
        return ""
    return ("\n\n## Góc nhìn chung của cả cảnh (BẮT BUỘC)\n" + view
            + "\nCác vật khác của thí nghiệm được vẽ riêng nhưng theo đúng góc nhìn này rồi ghép vào cùng một cảnh, nên vật của bạn PHẢI vẽ theo đúng góc nhìn này, "
              "kể cả khi một góc khác trông quen hơn hay đẹp hơn (ví dụ một lá mỏng nằm vuông góc với mặt phẳng hình thì vẽ thành vạch mảnh nhìn từ cạnh, không vẽ chính diện). "
              "Mọi bộ phận của vật cũng dùng cùng góc nhìn và cùng một kiểu phối cảnh.")


def _remember(checks: _Checks, ok: bool, problems: list[str], report: list[str], js: str | None, meta: dict[str, Any] | None, fingerprint: str,
              images: list[Image]) -> CheckOutput:
    checks.ok = ok
    checks.problems = list(problems)
    checks.report = list(report)
    checks.js = js
    checks.meta = meta
    checks.fingerprint = fingerprint
    checks.images = list(images)
    checks.pending = list(images)
    return CheckOutput(ok=ok, problems=checks.problems, report=checks.report)


def _read_notes(store: CodeStore, notes_path: str) -> str | None:
    try:
        text = (store.read(notes_path) or "").strip()
        return text or None
    except Exception:
        return None
