from __future__ import annotations

import logging
import re
import time
from typing import Annotated, Any

from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, Text
from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.service import json_fields as j
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

from .agent_json import MalformedJson, parse
from .math_expression import MathExpression
from .scenario_models import FramePart, MovingPart, NamedPoint, ObjectGeometry, Phase, Phenomenon, Scenario, WorkedExample

__all__ = ["FramePart", "MovingPart", "NamedPoint", "ObjectGeometry", "ObjectInfo", "Phase", "Phenomenon", "Scenario", "ScenarioAgent", "WorkedExample"]

log = logging.getLogger(__name__)
MAX_ATTEMPTS = 3
MAX_POINTS = 4
MAX_PARTS = 4
MAX_PHENOMENA = 5
_NAME = re.compile(r"[a-z][A-Za-z0-9]{0,39}")
_MOTIONS = {"slide", "rotate"}
_AXES = {"up", "down", "left", "right"}

INSTRUCTIONS = """\
Bạn đang giúp một giáo viên vật lý phổ thông ở Việt Nam hình dung thí nghiệm của họ sẽ diễn ra thế nào. Các vật chưa được vẽ; bạn là người chốt bài học và hình học của cảnh trước, rồi các vật sẽ được vẽ theo đúng phần bạn giao. Hãy kể lại thí nghiệm như đang trò chuyện với một đồng nghiệp: nhẹ nhàng, tự nhiên, tiếng Việt đời thường. Trừ mục objectGeometry (là số đo cho người lập trình), không cần id hay tên biến, chỉ cần người đọc hiểu ngay.

Cứ giữ mọi thứ giản dị. Chọn mô hình vật lý đơn giản nhất mà vẫn cho học sinh thấy rõ điều thí nghiệm muốn nói, và đừng thêm mô hình phụ (lò xo, năng lượng đàn hồi, ma sát, lực cản...) khi giáo viên không nhắc tới. Nếu có một cách hiểu hiển nhiên thì cứ chọn nó và ghi vào phần giả định, không cần cân nhắc nhiều. Cũng không cần lấp đầy mọi mục cho đủ bộ: mục nào ít chuyện để nói thì để ngắn, hoặc để trống nếu cho phép.

Trả JSON gồm:
- summary: một hai câu cho biết học sinh sẽ thấy điều gì.
- formulas: vài công thức cốt lõi (ít nhất một), mỗi mục có dạng "<công thức> — <nghĩa của nó>". Phần công thức viết bằng LaTeX thuần để giao diện dựng thành công thức đẹp: không có dấu $ hay \\( \\), dùng \\frac{a}{b}, \\sqrt{...}, chỉ số dưới h_0 hoặc t_{\\text{rơi}} (chữ tiếng Việt luôn nằm trong \\text{...}), luỹ thừa t^2, \\cdot, \\Delta, \\theta... (ví dụ "h(t) = h_0 - \\frac{1}{2} g t^2 — độ cao của tâm viên bi sau thời gian t"). Dấu " — " (gạch dài có khoảng trắng hai bên) chỉ xuất hiện đúng một lần, để ngăn công thức với lời giải thích. Chỉ cần công thức cho những gì học sinh thật sự chỉnh hoặc thấy; không phải đại lượng nào cũng cần công thức riêng, và đừng nghĩ thêm đại lượng chỉ để có chỗ viết công thức.
- phases: các pha theo thời gian (ít nhất một), mỗi pha có name ngắn và description kể chuyện gì xảy ra. Cho biết thí nghiệm chạy một lần hay lặp lại. Thời gian cũng có thang mô hình như kích thước: cả thí nghiệm phải diễn ra trên màn hình trong khoảng vài giây đến vài chục giây để học sinh theo dõi được; nếu hiện tượng thật quá nhanh (hạt bay, ánh sáng, va chạm vi mô) hay quá chậm (hành tinh quay) thì chiếu chậm lại hay tua nhanh, ghi rõ hệ số đó vào assumptions; các đại lượng thời gian thật vẫn tính theo đơn vị thật.
- layout: các vật đứng ở đâu so với nhau, nói theo cảm nhận, không cần số đo chính xác.
- view: GÓC NHÌN chung của cả cảnh, MỘT góc cho mọi vật, một hai câu: nhìn từ đâu (nhìn ngang từ bên, nhìn từ trên xuống, nhìn chính diện...), mặt phẳng của hình ứng với mặt phẳng nào trong thí nghiệm (thường là mặt phẳng nơi hiện tượng diễn ra), và vật nào hiện ra khác dáng quen thuộc ở góc nhìn đó, nhất là vật mỏng hay phẳng (ví dụ lá vàng nằm vuông góc với mặt phẳng hình thì thấy từ cạnh thành một vạch mảnh). Nếu giáo viên đã chọn góc nhìn (trong yêu cầu hay ở một dòng "Trả lời:") thì view theo đúng lựa chọn đó.
- adjustable: THAM SỐ CHỈNH, tức giá trị học sinh tự đặt: thanh trượt, ô nhập số, công tắc bật/tắt, ô chọn một trong vài lựa chọn, hoặc nút bấm để khởi động một hành động; chọn loại điều khiển hợp với từng tham số và ghi rõ loại đó. Chọn 2 đến 3 tham số gắn thẳng với công thức cốt lõi và điều bài học muốn chứng minh (ví dụ lực tác dụng, tỉ số diện tích, khối lượng tải), kèm khoảng giá trị hợp lý và đơn vị. Chọn đơn vị TRỰC QUAN cho cỡ của đại lượng (nm, MeV, cm, g, mA... chứ không ép SI) sao cho cả khoảng min..max là những số dễ đọc (khoảng 0,01 đến 10000), và ghi đúng MỘT đơn vị cho mỗi tham số. Mỗi tham số PHẢI có ý nghĩa với thí nghiệm: học sinh đổi nó để thấy một hệ quả vật lý ứng với một công thức ở trên; không tạo tham số chỉ để điều khiển hình vẽ hay cho vừa với code. Đừng chọn tham số chỉ vì một vật có chuyển động đó; đừng thêm số lần lặp, hành trình hay thứ vô nghĩa với bài học. Có thể để trống nếu thí nghiệm không có gì để chỉnh.
  Khoảng min..max phải làm cho điều bài học muốn cho thấy HIỆN RA được ở ít nhất một đầu khoảng: hãy tự tính công thức ở trên tại giá trị mặc định và hai đầu khoảng (xem workedExamples) và kiểm tra kết quả đủ lớn để học sinh nhìn thấy. Nếu hiện tượng thật quá nhỏ hay quá lớn để thấy (ví dụ góc lệch chỉ cỡ 0,003°), hãy đổi khoảng hay đơn vị, hoặc chọn thang mô hình hoá (phóng đại) và ghi rõ điều đó trong assumptions, cho tới khi nhìn thấy được.
- observable: ĐẠI LƯỢNG ĐO, tức học sinh nhìn hay đọc được gì, chỉ vài thứ quan trọng nhất, kèm đơn vị trực quan như của tham số chỉnh (không ép SI).
- assumptions: những chỗ bạn tự chọn thay giáo viên (bỏ qua ma sát, chiều dương, kiểu va chạm...) để họ xem lại.
- workedExamples: các phép tính BẰNG SỐ của công thức ở trên, mỗi mục là một đối tượng {text, expression, unit}. text mô tả đầu vào của phép tính (ví dụ "Với E = 5 MeV và b = 100 fm (giá trị mặc định)"), TUYỆT ĐỐI không ghi kết quả trong text. expression là biểu thức số học thuần để máy tự tính ra kết quả, KHÔNG phải bạn tính: chỉ gồm số (dùng dấu chấm thập phân, được viết 1e-9), + - * / ^, ngoặc, pi, e, và các hàm atan sin cos tan asin acos sqrt exp ln log10 abs (góc tính bằng radian; muốn ra độ thì nhân 180/pi). Ví dụ "2*atan(227.52/(2*5*100))*180/pi". unit là đơn vị của kết quả (ví dụ "°"). Gồm ít nhất giá trị mặc định và một đầu khác của khoảng cho MỖI tham số chỉnh (tối thiểu 2 mục). Đây là ca kiểm của engine: kết quả phải cho thấy đúng điều bài học muốn học sinh thấy; nếu không thì quay lại sửa khoảng của tham số.
- objectGeometry: HÌNH HỌC CHUNG của cảnh, nguồn duy nhất mà người vẽ vật, engine và cảnh cùng dùng (không ai được tự đặt số khác). Với MỖI vật bên dưới (theo id của nó) phải có đúng một mục:
  - objectId; width, height: kích thước của vật trên mặt phẳng hình, bằng MÉT, theo góc nhìn ở trên. Lấy cỡ thật nếu hiện tượng nhìn rõ ở cỡ đó; nếu thật quá nhỏ hay quá lớn thì chọn cỡ mô hình và ghi vào assumptions. Chọn cỡ của các vật cho cân với nhau và để toàn bộ hiện tượng (cả quãng đường các vật đi) nằm gọn trong một khung hình.
  - anchor: điểm neo của vật bằng lời (ví dụ "tâm đáy, chạm sàn", "điểm treo", "tâm lá vàng"). Engine báo vị trí của vật bằng vị trí điểm neo này. CHỈ ghi khi vật là một cơ cấu cần một điểm cố định chính xác: có bộ phận chuyển động, hoặc có điểm có tên mà vật khác và hiện tượng phải khớp đúng, hoặc nó treo, quay quanh chốt, lăn trên sàn. Vật chỉ đứng đó để bị tác động, bị bắn trúng, đổ hay vỡ thì để anchor RỖNG; khi đó gốc (0,0) mặc định là tâm hình bao và engine báo vị trí tâm.
  - points: các ĐIỂM CÓ TÊN mà vật khác hay thứ do thí nghiệm tạo ra cần dùng: mép chạm nhau khi va chạm (ví dụ frontEdge, rearEdge), cửa phát hạt, tâm màn, điểm treo, mặt đặt tải. Mỗi mục {name camelCase tiếng Anh, description}. Vật đứng một mình không chạm gì có thể để trống.
  - parts: các BỘ PHẬN chuyển động BÊN TRONG vật CHÍNH VÌ hiện tượng (pít-tông trong xi lanh, cần bơm, kim đồng hồ, quả lắc quanh điểm treo). Mỗi mục {name camelCase, motion "slide" (trượt) hoặc "rotate" (quay quanh một khớp), axis "up" | "down" | "left" | "right" (hướng trượt khi giá trị tăng; với rotate ghi "up"), min, max (mét với slide, độ với rotate, tính từ vị trí nghỉ), description}. Vật cả khối di chuyển (xe chạy, vật rơi) KHÔNG phải bộ phận: vị trí của cả vật là việc của engine. Vật đứng yên hay chỉ dời cả khối thì parts RỖNG; đừng bịa bộ phận cho có cử động.
  Lực, khối lượng, vận tốc, thời gian không thuộc về hình học của vật. Vật có thể là bất cứ gì (thiết bị, hạt, hạt nhân, nguyên tử, phân tử, hành tinh...): một hạt hay một hạt nhân là một vật như mọi vật khác, có cỡ (cỡ mô hình nếu thật quá nhỏ), thường không có anchor, points hay parts. Một vật có thể BIẾN MẤT hay XUẤT HIỆN giữa chừng (hạt nhân tách đôi thì biến mất, neutron bị hấp thụ): nói rõ điều đó trong phases; engine sẽ ẩn hay hiện nó. Thứ sinh ra hàng loạt hay thoáng qua không phải vật: chúng thuộc mục phenomena dưới đây.
- phenomena: những thứ thí nghiệm TẠO RA HÀNG LOẠT hay THOÁNG QUA theo thời gian, không vật nào sở hữu: mảnh vỡ, các hạt mới sinh (neutron mới, mảnh phân hạch), tia, chấm sáng, điểm vệt, gợn sóng, tia lửa. Một thứ đã là vật ở trên thì KHÔNG lặp lại ở đây. Engine phát chúng ra từng khoảnh khắc và cảnh vẽ chúng bằng hình riêng theo appearance. Tối đa 5 mục, mỗi mục {name camelCase tiếng Anh, description, from, appearance}:
  - name: tên ngắn để engine và cảnh gọi nó, ví dụ debris, alphaParticle, sparkDot.
  - description: nó là gì, xuất hiện khi nào và mất đi khi nào (ví dụ "các mảnh tường văng ra khi viên đá chạm tường, bay theo quán tính rồi rơi xuống đất và nằm lại").
  - from: tên MỘT điểm có tên trong points của một vật mà chúng xuất phát (cửa phát, mặt bị đập). Để rỗng nếu chúng không ra từ điểm nào cụ thể.
  - appearance: hình dáng, cỡ tương đối và màu, đủ cụ thể để người vẽ cảnh vẽ một hình riêng (ví dụ "mảnh vụn xám nhỏ nhiều cỡ, có cạnh, xoay khi bay", "mảnh phân hạch: cụm tròn nhỏ hai màu đỏ xám, cỡ bằng nửa hạt nhân").
  Để phenomena RỖNG nếu thí nghiệm không tạo ra gì ngoài chuyển động của chính các vật. Đừng bịa hạt cho có.
Gọi mỗi vật bằng tiêu đề của nó trong các mục kể chuyện; id chỉ dùng trong objectGeometry.
"""


class ObjectInfo(CamelModel):
    """One object of the experiment as the lite spec named it, not drawn yet."""

    id: str
    title: str
    request: str
    hint: Text = ""
    frame: Annotated[list[FramePart], EmptyIfNone] = []


class ScenarioAgent:
    """Writes the SCENARIO of an experiment, BEFORE its objects are drawn: the formulas, the phases over time, the layout of the objects,
    and what students adjust and watch (all in plain prose). It also fixes the geometry of every object (:class:`ObjectGeometry`), the one
    source the drawer, the engine and the scene all use; objects carry no physics. It checks no physics; a person reads it, and a later code
    agent turns it into engine, renderer and experiment."""

    def __init__(self, ai_client: AiClient):
        self._ai_client = ai_client

    def scenario(self, teacher_request: str, objects: list[ObjectInfo]) -> Scenario:
        user = "Yêu cầu của giáo viên (trả lời bằng JSON): " + teacher_request + "\n\nCác vật của thí nghiệm:\n" + _describe(objects)
        issue: str | None = None
        last: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            prompt = INSTRUCTIONS + "\n" + user + ("" if issue is None else f"\n\nLần trước bị từ chối vì: {issue}\nHãy trả lại toàn bộ JSON đã sửa.")
            started = time.monotonic()
            try:
                raw = self._ai_client.generate_reasoned(prompt, StructuredOutputSchemaRegistry.SCENARIO_RESPONSE).text
                scenario = self.parse(parse(raw), objects)
                log.info("ScenarioAgent accepted: attempt=%d/%d, formulas=%d, phases=%d, elapsedMs=%d", attempt, MAX_ATTEMPTS, len(scenario.formulas),
                         len(scenario.phases), int((time.monotonic() - started) * 1000))
                return scenario
            except InvalidAgentResponseError as rejected:
                issue, last = str(rejected), rejected
                log.warning("ScenarioAgent rejected: attempt=%d/%d, issue=%s", attempt, MAX_ATTEMPTS, issue)
            except MalformedJson as malformed:
                issue, last = "JSON không hợp lệ: " + malformed.reason, InvalidAgentResponseError("AI trả về JSON không hợp lệ")
                log.warning("ScenarioAgent malformed JSON: attempt=%d/%d", attempt, MAX_ATTEMPTS)
        raise InvalidAgentResponseError(f"Không lập được kịch bản hợp lệ sau {MAX_ATTEMPTS} lần: {last or ''}") from last

    @staticmethod
    def parse(root: Any, objects: list[ObjectInfo]) -> Scenario:
        problems: list[str] = []
        summary = j.text(j.field(root, "summary")).strip()
        if not summary:
            problems.append("thiếu summary")
        formulas = j.texts(j.field(root, "formulas"))
        if not formulas:
            problems.append("cần ít nhất một công thức trong formulas")
        phases: list[Phase] = []
        for p in j.items(j.field(root, "phases")):
            name, description = j.text(j.field(p, "name")).strip(), j.text(j.field(p, "description")).strip()
            if not name or not description:
                problems.append("mỗi pha cần name và description không rỗng")
            else:
                phases.append(Phase(name=name, description=description))
        if not phases:
            problems.append("cần ít nhất một pha trong phases")
        layout = j.text(j.field(root, "layout")).strip()
        if not layout:
            problems.append("thiếu layout")
        view = j.text(j.field(root, "view")).strip()
        if not view:
            problems.append("thiếu view (góc nhìn chung của cả cảnh)")
        geometry = _object_geometry(j.field(root, "objectGeometry"), objects, problems)
        phenomena = _phenomena(j.field(root, "phenomena"), geometry, problems)
        adjustable = j.texts(j.field(root, "adjustable"))
        worked = _worked_examples(j.field(root, "workedExamples"), problems)
        needed = 1 if not adjustable else 2
        if len(worked) < needed and not any(p.startswith("workedExamples") for p in problems):
            problems.append(f"workedExamples cần ít nhất {needed} phép tính bằng số (giá trị mặc định và một đầu khác của khoảng của mỗi tham số chỉnh), "
                            "mỗi mục có text, expression và unit")
        if problems:
            raise InvalidAgentResponseError("; ".join(problems))
        return Scenario(summary=summary, formulas=formulas, phases=phases, layout=layout, adjustable=adjustable,
                        observable=j.texts(j.field(root, "observable")), assumptions=j.texts(j.field(root, "assumptions")), object_geometry=geometry,
                        worked_examples=worked, view=view, phenomena=phenomena)


def _phenomena(array: Any, geometry: list[ObjectGeometry], problems: list[str]) -> list[Phenomenon]:
    """What the experiment produces over time. Optional; when ``from`` is given it must name a point some object declared."""
    point_names = {p.name for g in geometry for p in g.points}
    seen: set[str] = set()
    out: list[Phenomenon] = []
    for item in j.items(array):
        name = j.text(j.field(item, "name")).strip()
        who = f'hiện tượng "{name}"'
        if not _NAME.fullmatch(name):
            problems.append("hiện tượng phải có tên camelCase tiếng Anh, ví dụ debris")
            continue
        if name in seen:
            problems.append(f"tên {who} bị trùng")
            continue
        seen.add(name)
        description = j.text(j.field(item, "description")).strip()
        if not description:
            problems.append(f"{who} thiếu description (xuất hiện khi nào, mất khi nào)")
            continue
        source = j.text(j.field(item, "from")).strip()
        if source and source not in point_names:
            problems.append(f'{who} có from "{source}" nhưng không vật nào khai điểm tên đó; dùng tên một điểm trong points, hoặc để rỗng')
        out.append(Phenomenon(name=name, description=description, from_=source, appearance=j.text(j.field(item, "appearance")).strip()))
    if len(out) > MAX_PHENOMENA:
        problems.append(f"quá {MAX_PHENOMENA} hiện tượng; chỉ giữ những thứ học sinh thật sự nhìn thấy")
    return out


def _object_geometry(array: Any, objects: list[ObjectInfo], problems: list[str]) -> list[ObjectGeometry]:
    """One entry per object, by id: a positive size in metres, an anchor, and well-named points and moving parts with a valid motion and range."""
    by_id: dict[str, Any] = {}
    for entry in j.items(array):
        by_id.setdefault(j.text(j.field(entry, "objectId")).strip(), entry)
    out: list[ObjectGeometry] = []
    for obj in objects:
        entry = by_id.get(obj.id)
        who = f'vật "{obj.id}"'
        if entry is None:
            problems.append(f'objectGeometry thiếu vật có id "{obj.id}" ({obj.title})')
            continue
        width, height = j.number(j.field(entry, "width")), j.number(j.field(entry, "height"))
        if not width > 0 or not height > 0:
            problems.append(f"{who} cần width và height dương (mét)")
        anchor = j.text(j.field(entry, "anchor")).strip()
        names: set[str] = set()
        points: list[NamedPoint] = []
        for p in j.items(j.field(entry, "points")):
            name = j.text(j.field(p, "name")).strip()
            if not _NAME.fullmatch(name):
                problems.append(f'điểm "{name}" của {who} phải có tên camelCase tiếng Anh, ví dụ frontEdge')
            elif name in names:
                problems.append(f'tên "{name}" của {who} bị trùng')
            else:
                names.add(name)
                points.append(NamedPoint(name=name, description=j.text(j.field(p, "description")).strip()))
        parts: list[MovingPart] = []
        for p in j.items(j.field(entry, "parts")):
            name = j.text(j.field(p, "name")).strip()
            motion = j.text(j.field(p, "motion")).strip()
            axis = j.text(j.field(p, "axis")).strip()
            part = f'bộ phận "{name}" của {who}'
            if not _NAME.fullmatch(name):
                problems.append(f"{part} phải có tên camelCase tiếng Anh, ví dụ largePiston")
                continue
            if name in names:
                problems.append(f'tên "{name}" của {who} bị trùng')
                continue
            names.add(name)
            if motion not in _MOTIONS:
                problems.append(f'{part} cần motion "slide" hoặc "rotate"')
                continue
            if motion == "slide" and axis not in _AXES:
                problems.append(f"{part} trượt nên cần axis up, down, left hoặc right")
                continue
            low, high = j.field(p, "min"), j.field(p, "max")
            if not j.is_number(low) or not j.is_number(high) or low >= high:
                problems.append(f"{part} cần min nhỏ hơn max")
                continue
            parts.append(MovingPart(name=name, motion=motion, axis=axis if motion == "slide" else "", min=float(low), max=float(high),
                                    description=j.text(j.field(p, "description")).strip()))
        if len(points) > MAX_POINTS:
            problems.append(f"{who} có quá {MAX_POINTS} điểm; chỉ giữ những điểm vật khác hay hiện tượng thật sự dùng")
        if len(parts) > MAX_PARTS:
            problems.append(f"{who} có quá {MAX_PARTS} bộ phận chuyển động")
        # The anchor is required only of an object that is a mechanism: one with moving parts or points that must sit exactly.
        if not anchor and (points or parts):
            problems.append(f"{who} có bộ phận hoặc điểm có tên nên phải ghi anchor (điểm neo bằng lời)")
        out.append(ObjectGeometry(object_id=obj.id, width=width, height=height, anchor=anchor, points=points, parts=parts))
    return out


def _worked_examples(array: Any, problems: list[str]) -> list[WorkedExample]:
    """Each example's expression is evaluated by the backend; one that cannot be computed is sent back with the reason."""
    out: list[WorkedExample] = []
    for index, item in enumerate(j.items(array), start=1):
        text = j.text(j.field(item, "text")).strip()
        expression = j.text(j.field(item, "expression")).strip()
        unit = j.text(j.field(item, "unit")).strip()
        who = f"workedExamples[{index}]"
        if not text or not expression:
            problems.append(f"{who} cần text và expression không rỗng")
            continue
        try:
            out.append(WorkedExample(text=text, expression=expression, unit=unit, value=MathExpression.evaluate(expression)))
        except ValueError as bad:
            problems.append(f'{who}: expression "{expression}" không tính được ({bad})')
    return out


def _describe(objects: list[ObjectInfo]) -> str:
    out: list[str] = []
    for index, o in enumerate(objects, start=1):
        out.append(f"{index}. id: {o.id} | {o.title}\n   Mô tả: {o.request}\n   Gợi ý: {o.hint if o.hint and o.hint.strip() else '(không có)'}\n")
        if o.frame:
            out.append("   Khung (các bộ phận nhìn thấy được):\n")
            out.extend(f"   - {p.name}: {p.shape}; {p.position}; {p.proportion}\n" for p in o.frame)
    return "".join(out)
