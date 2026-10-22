from __future__ import annotations

import logging
import re
import time
from enum import StrEnum
from typing import Annotated, Any

from pydantic import field_validator

from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, Text
from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.presentation.dto.requirement.clarification_question import ClarificationQuestion
from beneviadsystem.service import json_fields as j
from beneviadsystem.service.agent.codegen.agent_activity_publisher import AgentActivityPublisher
from beneviadsystem.service.agent.codegen.agent_steps import AgentSteps
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError
from beneviadsystem.service.agent.tools.objects.object_library_tools import ObjectLibraryTools
from beneviadsystem.service.object_library_service import ObjectLibraryService, Summary
from beneviadsystem.service.text_format import plain_number

from .agent_json import MalformedJson, parse
from .scenario_models import FramePart

log = logging.getLogger(__name__)
MAX_ATTEMPTS = 3
MAX_OBJECTS = 4
#: Calls of get_objects one attempt may make: the index is in the prompt, so only the details of a few candidates are fetched.
MAX_LIBRARY_CALLS = 3
MIN_FRAME_PARTS = 1
#: How many answered questions (lines "Trả lời:" in the request) end the asking: the agent then chooses what is still open.
MAX_ANSWERS = 5
_ANSWER_LINE = re.compile(r"^\s*Trả lời:", re.MULTILINE)
_ID = re.compile(r"[a-z][A-Za-z0-9]*")

INSTRUCTIONS = """\
Bạn lập yêu cầu vẽ các VẬT trong cảnh của một mô phỏng vật lý phổ thông Việt Nam. Đọc yêu cầu của giáo viên rồi trả JSON:
- status "UNSUPPORTED" chỉ khi yêu cầu không phải là một hiện tượng hay thí nghiệm vật lý ở mức phổ thông: điền reason (tiếng Việt, nêu hướng thay thế nếu có), question = null, style = "", objects = []. Không loại vì loại hiện tượng: cơ, nhiệt, điện, từ, quang, sóng, vật lý hạt nhân đều hợp lệ.
- status "NEEDS_CLARIFICATION" khi bạn thấy cần hỏi lại giáo viên: hoặc yêu cầu chưa đủ rõ để dựng cảnh, hoặc còn điều về HÌNH (phong cách, phiên bản của dụng cụ, cách nhìn, bố cục, mức chi tiết...) mà giáo viên chưa nói và các đáp án sẽ làm hình khác hẳn nhau. Tự cân nhắc điều gì đáng hỏi cho đúng yêu cầu này, không có danh sách bắt buộc: không hỏi cho đủ thủ tục, không hỏi điều đã rõ hay điều mà một đáp án hiển nhiên là vô nghĩa với bài này, và nếu yêu cầu đã đủ rõ thì trả READY luôn. Hỏi lần lượt, MỖI LẦN MỘT câu về điều quan trọng nhất còn thiếu (không gộp nhiều ý, không lặp lại điều đã được trả lời, các câu trả lời trước nằm sau các dòng "Trả lời:" trong yêu cầu). Điền "question" (topic ngắn, text là một câu hỏi cụ thể, dễ hiểu với giáo viên, suggestions 2-4 đáp án ngắn hợp lý), reason = null, style = "", objects = [].
  Đừng hỏi về vật liệu, ánh sáng, màu hay chi tiết nhỏ: người vẽ tự quyết. Đừng hỏi về số liệu hay công thức: bước kịch bản tự chọn.
  Chuyển sang READY khi không còn điều gì đáng hỏi, hoặc khi số dòng "Trả lời:" đã đạt 5 (khi đó tự chọn hợp lý phần còn lại). Trả lời "tuỳ bạn" / "mặc định" cho một điều nghĩa là điều đó đã xong, bạn tự chọn.
- status "READY": điền objects và style, reason = null, question = null. Điều chưa nói thì tự chọn hợp lý.
  style: một đoạn ngắn chốt phong cách hình chung cho MỌI vật theo điều giáo viên đã chọn (tả thực, sơ đồ sách giáo khoa hay minh hoạ; thang nhìn; mức chi tiết; có nhãn tên bộ phận hay không), để người vẽ và người chấm cùng theo. Mô tả của từng vật (request, frame) phải theo đúng các câu trả lời của giáo viên.
"phenomenon" luôn là tên hiện tượng vật lý chính (ngắn).

objects: MỘT mục cho mỗi VẬT nhìn thấy trong cảnh mà cần một hình riêng, tối đa 4. Vật có thể là bất cứ gì hiện tượng cần cho người xem thấy: thiết bị, dụng cụ, bộ thí nghiệm, đồ vật đời thường, hay chính các thực thể của hiện tượng như hạt (neutron, electron, photon), hạt nhân, nguyên tử, phân tử, hành tinh, tế bào, giọt nước... Không có loại nào bị cấm: chọn đúng những thứ giúp học sinh nhìn ra hiện tượng ở thang nhìn đã chốt. Ví dụ "bắn neutron vào hạt nhân uranium" ở mức hạt thì có neutron và hạt nhân uranium (kèm nguồn neutron nếu cần), không chỉ có máy bắn.
Với thiết bị: cái gắn liền, đặt lên, treo vào hay tựa vào một thiết bị là MỘT BỘ PHẬN của nó; chỉ tách khi hai thứ thật sự rời nhau; nhiều bộ phận dựng cạnh nhau trong cùng một bố trí (nguồn, bản, màn, giá đỡ) vẫn là MỘT vật.
Vật hay hiện tượng: một thứ có danh tính riêng, theo dõi được suốt thí nghiệm (viên bi, neutron bắn tới, hạt nhân bị bắn) là một VẬT ở đây. Còn những thứ sinh ra HÀNG LOẠT hay chỉ thoáng qua (mảnh vỡ, các neutron mới sinh, chấm sáng, tia lửa, gợn sóng) KHÔNG làm vật: bước kịch bản sau ghi chúng vào mục hiện tượng và cảnh vẽ chúng; ở đây chỉ nêu chỗ chúng phát ra hay được đón (cửa phát, màn hứng) nếu có.
Mỗi mục có đúng 5 trường:
- id: camelCase ASCII, duy nhất.
- title: tên vật, ngắn.
- request: MỘT đoạn văn xuôi liền mạch mô tả vật cho người vẽ, theo đúng thứ tự: (1) vật là gì và các phần nhìn thấy được, vị trí tương đối, tỉ lệ (to/nhỏ, dài/ngắn), cùng dáng chung và tính cách của nó (cổ điển, hiện đại, phòng thí nghiệm, đồ chơi, minh hoạ khoa học...); (2) nhãn chữ và thang chia vạch cố định nếu có; (3) cách đặt; CHỈ nêu điểm neo khi vật thật sự có một điểm tham chiếu tự nhiên vì nó là một cơ cấu: treo thì neo ở điểm treo (thân hướng xuống), quay quanh chốt thì neo ở tâm khớp, có chân đế dẫn động thì neo ở tâm đáy. Vật chỉ đứng đó hay bay tự do (bị tác động, bị bắn trúng, đổ, vỡ, một hạt) thì ĐỪNG nêu điểm neo, cứ tả cách đặt bằng lời; (4) nếu có phần nhìn thấy được đổi vị trí, góc hay trạng thái khi thí nghiệm diễn ra (dịch, quay, đổi độ sáng, đổi màu, rung...), nói rõ phần nào đổi THEO CÁI GÌ; vật không có phần nào đổi thì bỏ ý này. Chỉ nêu phần nhìn thấy được, không nêu chi tiết ẩn bên trong. Mô tả là HÌNH của vật, không phải diễn biến: đừng kể nó bay tới đâu, va vào gì hay vỡ ra thế nào (bước kịch bản lo chuyện đó). Phần hình thì viết giàu một chút cho người vẽ có cảm hứng (dáng chung, vài chi tiết đặc trưng nhận ra ngay vật là gì; với thứ không chụp được như hạt nhân hay phân tử thì theo hình minh hoạ quen thuộc trong sách), rồi nói thẳng rằng hình dáng và chi tiết họ cứ tự do sáng tạo cho đẹp theo phong cách đã chốt, miễn nhìn ra ngay đó là vật gì. Đừng thêm thứ giáo viên không nhắc tới và hiện tượng không cần, trừ khi chính hiện tượng cần chúng.
- frame: KHUNG của vật cho người vẽ, một mảng các phần nhìn thấy được, mỗi phần {name, shape, position, proportion}: name là tên phần (ngắn, không trùng nhau); shape là dáng của nó bằng lời (đường bao bo tròn, vát, cong, thuôn ở đâu; phẳng hay phồng; tròn đều, xếp cụm...); position là nó nằm ở đâu và nối vào phần nào; proportion là nó to nhỏ, dài ngắn thế nào so với cả vật hay so với phần khác (bằng lời, không số đo). Ít nhất 1 phần, và ĐỦ mọi phần làm người xem nhận ra ngay đó là vật gì: một chiếc ô tô có thân, ca-bin, kính, bánh, vòm bánh, cản, đèn...; một hạt nhân có các proton và neutron xếp khít thành cụm tròn; một neutron chỉ cần một quả cầu nhỏ. Không có chi tiết ẩn bên trong và không có thứ sinh ra hàng loạt (để cho mục hiện tượng).
- hint: một chuỗi NGẮN gợi ý giao diện cho người vẽ, KHÔNG bắt buộc và có thể để rỗng. Nếu có thì chỉ nêu những gì thật sự có, ví dụ "Đầu ra: <đại lượng đọc thẳng từ hình học>. Port: <các điểm quan trọng của vật>." (đầu vào của vật KHÔNG do bạn chọn: bước kịch bản sẽ chốt sau, nên đừng viết đầu vào hay tên biến nào).
Đừng đặt tên đầu vào, đừng nói công thức và các hằng số của bài (diện tích, khối lượng, điện trở, bước sóng...).
KHÔNG đưa số liệu: không khoảng giá trị, không kích thước hay đơn vị bằng số, không công thức; chỉ mô tả bằng lời (khoảng giá trị và đơn vị do bước kịch bản chọn). Đầu ra là đại lượng đọc thẳng từ hình vẽ tại một khoảnh khắc (vị trí, độ cao, góc, độ lệch, khoảng cách...), tối đa 2, KHÔNG phải đại lượng suy ra từ công thức (lực, năng lượng, cường độ, nhiệt độ, vận tốc...). Port tối đa 3: chỗ người dùng hay vật khác tác động hoặc nối vào, hoặc điểm quan trọng của vật (tay cầm, điểm treo, cửa phát, tâm, mặt hứng, tâm hạt, bề mặt hạt nhân).

Định dạng mỗi mục (điền vào, đừng chép lại chữ mô tả):
{"id":"<camelCase>","title":"<tên vật>","request":"<đoạn văn theo đúng 4 ý ở trên>","frame":[{"name":"<phần>","shape":"<dáng>","position":"<ở đâu, nối vào đâu>","proportion":"<to nhỏ so với cả vật>"}],"hint":"<gợi ý ngắn, hoặc rỗng>"}
Viết tiếng Việt.
"""

LIBRARY_INSTRUCTIONS = """\

KHO VẬT CÓ SẴN: cuối phần hướng dẫn này là MỤC LỤC của toàn bộ kho vật đã vẽ sẵn, xếp theo chủ đề, mỗi dòng một vật: id | tên | mô tả | Dùng khi. Khi định trả READY, đọc mục lục, chọn ra các vật có thể dùng cho từng vật trong cảnh (theo nghĩa, không cần trùng chữ: cùng loại thiết bị hay thực thể là đủ để xét), rồi gọi tool get_objects với id của các ứng viên đó (gộp vào một lần gọi) để xem avoidWhen, bộ phận chuyển động, kích thước và các điểm có tên trước khi quyết định. Khi hỏi lại giáo viên hay UNSUPPORTED thì không cần gọi.
Mỗi mục objects có thêm trường "reference": nếu kho có đúng vật đó (cùng loại thiết bị, đúng phiên bản và thang nhìn đã chốt với giáo viên) thì điền id của nó (đúng như tool trả về, ví dụ "can-don.ts") và vật sẽ được dùng lại, không vẽ mới; các bộ phận chuyển động và kích thước của vật có sẵn là cố định nên request và frame phải mô tả ĐÚNG vật đó. Không có vật phù hợp thì reference = null (vật sẽ được vẽ mới). Đừng ép dùng vật gần giống nhưng khác loại.
Mỗi vật có "useWhen" (khi nào nên dùng) và "avoidWhen" (khi nào KHÔNG nên dùng, chỉ có trong kết quả get_objects): đối chiếu yêu cầu đã chốt với giáo viên với hai trường này; chỉ điền reference khi yêu cầu khớp một ý của useWhen và không rơi vào ý nào của avoidWhen.

MỤC LỤC KHO VẬT:
"""


class Status(StrEnum):
    READY = "READY"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    UNSUPPORTED = "UNSUPPORTED"


class ObjectRequest(CamelModel):
    """One drawing request: the prose request and hint, the frame (the visible parts), and the library object it reuses, if any."""

    id: str
    title: str
    request: str
    hint: Text = ""
    frame: Annotated[list[FramePart], EmptyIfNone] = []
    reference: str | None = None

    @field_validator("reference")
    @classmethod
    def _blank_is_none(cls, value: str | None) -> str | None:
        return value.strip() if value and value.strip() else None


class LiteOutcome(CamelModel):
    """``question`` is only set for NEEDS_CLARIFICATION; ``style`` (the look agreed with the teacher) and ``objects`` only for READY."""

    status: Status
    phenomenon: str
    reason: str | None = None
    question: ClarificationQuestion | None = None
    style: str = ""
    objects: Annotated[list[ObjectRequest], EmptyIfNone] = []


class LiteSpecAgent:
    """One call that turns a teacher's request into one drawing request per thing in the scene that needs a figure of its own (an apparatus,
    or a particle, nucleus, planet, cell... of the phenomenon). Before that it may ask the teacher about the look, one question at a time, at
    most :data:`MAX_ANSWERS` times, and the style agreed on goes to the drawer and the judge. It carries no physics and no inputs: the scenario
    step that follows decides what each object is fed. When the library of drawn objects has some, the agent reads its index and may reuse one."""

    def __init__(self, ai_client: AiClient, library: ObjectLibraryService | None = None, activity: AgentActivityPublisher | None = None):
        self._ai_client = ai_client
        self._library = library
        self._activity = activity

    def _library_index(self) -> str | None:
        """The index of the library, or None when there is none to offer: no library, no drawn object, or a database that is down."""
        if self._library is None:
            return None
        try:
            index = self._library.index()
            return index if index.strip() else None
        except Exception as unavailable:
            log.warning("Library of drawn objects not available, drawing every object: %s", unavailable)
            return None

    def analyze(self, teacher_request: str, run_id: str | None = None) -> LiteOutcome:
        """``run_id``: the run the frontend listens to; when set, every call of a library tool is published there while the agent works."""
        user = "Yêu cầu của giáo viên (trả lời bằng JSON): " + teacher_request
        answered_enough = len(_ANSWER_LINE.findall(teacher_request)) >= MAX_ANSWERS
        issue: str | None = None
        last: Exception | None = None
        index = self._library_index()
        steps = None if not run_id or not run_id.strip() else AgentSteps(self._activity, run_id, "litespec", "Tách yêu cầu")
        tools = [] if index is None else ObjectLibraryTools.of(self._library, steps)
        # The instructions and the index come before the teacher's request, so the provider can cache them as one prefix.
        library_part = "" if index is None else LIBRARY_INSTRUCTIONS + index
        for attempt in range(1, MAX_ATTEMPTS + 1):
            prompt = INSTRUCTIONS + library_part + "\n" + user + ("" if issue is None else f"\n\nLần trước bị từ chối vì: {issue}\nHãy trả lại toàn bộ JSON đã sửa.")
            started = time.monotonic()
            try:
                result = (self._ai_client.generate_reasoned(prompt, StructuredOutputSchemaRegistry.LITE_SPEC_RESPONSE) if index is None
                          else self._ai_client.generate_with_tools(prompt, tools, StructuredOutputSchemaRegistry.LITE_SPEC_RESPONSE, MAX_LIBRARY_CALLS))
                outcome = self.parse(parse(result.text))
                if answered_enough and outcome.status is Status.NEEDS_CLARIFICATION:
                    raise InvalidAgentResponseError(f"giáo viên đã trả lời đủ {MAX_ANSWERS} câu, không hỏi thêm: trả READY và tự chọn hợp lý phần còn lại")
                log.info("LiteSpecAgent accepted: attempt=%d/%d, status=%s, objects=%d, elapsedMs=%d", attempt, MAX_ATTEMPTS, outcome.status.value,
                         len(outcome.objects), int((time.monotonic() - started) * 1000))
                return outcome
            except InvalidAgentResponseError as rejected:
                issue, last = str(rejected), rejected
                log.warning("LiteSpecAgent rejected: attempt=%d/%d, issue=%s", attempt, MAX_ATTEMPTS, issue)
            except MalformedJson as malformed:
                issue, last = "JSON không hợp lệ: " + malformed.reason, InvalidAgentResponseError("AI trả về JSON không hợp lệ")
                log.warning("LiteSpecAgent malformed JSON: attempt=%d/%d", attempt, MAX_ATTEMPTS)
        raise InvalidAgentResponseError(f"Không lập được yêu cầu vẽ hợp lệ sau {MAX_ATTEMPTS} lần: {last or ''}") from last

    def parse(self, root: Any) -> LiteOutcome:
        try:
            status = Status(j.text(j.field(root, "status")))
        except ValueError:
            raise InvalidAgentResponseError("status phải là READY, NEEDS_CLARIFICATION hoặc UNSUPPORTED") from None
        phenomenon = j.text(j.field(root, "phenomenon")).strip()
        if status is Status.UNSUPPORTED:
            reason = j.text(j.field(root, "reason")).strip()
            if not reason:
                raise InvalidAgentResponseError("UNSUPPORTED cần reason")
            return LiteOutcome(status=status, phenomenon=phenomenon, reason=reason)
        if status is Status.NEEDS_CLARIFICATION:
            question = j.field(root, "question")
            text = j.text(j.field(question, "text")).strip()
            if not text:
                raise InvalidAgentResponseError("NEEDS_CLARIFICATION cần question.text")
            return LiteOutcome(status=status, phenomenon=phenomenon, question=ClarificationQuestion(
                topic=j.text(j.field(question, "topic"), "Làm rõ yêu cầu"), text=text, suggestions=j.texts(j.field(question, "suggestions"))))
        style = j.text(j.field(root, "style")).strip()
        if not style:
            raise InvalidAgentResponseError("READY cần style: phong cách hình đã chốt với giáo viên")
        entries = j.field(root, "objects")
        if not isinstance(entries, list) or not entries:
            raise InvalidAgentResponseError("READY cần ít nhất một mục trong objects")
        if len(entries) > MAX_OBJECTS:
            raise InvalidAgentResponseError(f"có {len(entries)} vật, tối đa {MAX_OBJECTS} (vật đặt lên thiết bị là bộ phận của nó; thứ sinh ra hàng loạt để cho mục hiện tượng)")
        problems: list[str] = []
        objects: list[ObjectRequest] = []
        ids: set[str] = set()
        for node in entries:
            object_id = j.text(j.field(node, "id")).strip()
            title = j.text(j.field(node, "title")).strip()
            request = j.text(j.field(node, "request")).strip()
            hint = j.text(j.field(node, "hint")).strip()
            label = f"vật '{object_id or '?'}'"
            if not _ID.fullmatch(object_id):
                problems.append(f"{label}: id phải camelCase ASCII, bắt đầu bằng chữ thường")
            elif object_id in ids:
                problems.append(f"{label}: id bị trùng")
            else:
                ids.add(object_id)
            if not title:
                problems.append(f"{label}: thiếu title")
            if len(request) < 80:
                problems.append(f"{label}: request phải là đoạn văn mô tả đủ bộ phận và cách đặt")
            if "đầu vào:" in hint.lower():
                problems.append(f'{label}: hint không được nêu "đầu vào:"; đầu vào của vật do bước kịch bản chốt')
            frame = _frame(j.field(node, "frame"), label, problems)
            reference = j.text(j.field(node, "reference")).strip() if j.is_text(j.field(node, "reference")) else ""
            if reference:
                found = None if self._library is None else self._library.find(reference)
                if found is None:
                    problems.append(f"{label}: reference '{reference}' không có trong kho vật; dùng đúng id mà tool trả về, hoặc để null để vẽ mới")
                else:
                    request = request + "\n" + _library_geometry(found)
            objects.append(ObjectRequest(id=object_id, title=title, request=request, hint=hint, frame=frame, reference=reference or None))
        if problems:
            raise InvalidAgentResponseError("; ".join(problems))
        return LiteOutcome(status=status, phenomenon=phenomenon, style=style, objects=objects)


def _library_geometry(s: Summary) -> str:
    """What the scenario step must take as given for an object reused from the library: it is not drawn again, so its geometry is fixed."""
    out = f"[Vật có sẵn trong kho, KHÔNG vẽ lại; hình học cố định] Khung bao {plain_number(s.width)} m × {plain_number(s.height)} m. Điểm neo: {s.anchor}."
    for p in s.parts:
        slide = p.motion == "slide"
        out += f" Bộ phận {p.name} ({p.label}): {'trượt' if slide else 'quay'} từ {plain_number(p.min)} đến {plain_number(p.max)}{' m.' if slide else ' độ.'}"
    if s.points:
        out += " Điểm có tên: " + ", ".join(s.points) + "."
    return out


def _frame(array: Any, label: str, problems: list[str]) -> list[FramePart]:
    """The frame of one object: its visible parts, at least one, each named once and described in all four fields."""
    if not isinstance(array, list):
        problems.append(f"{label}: thiếu frame (khung các bộ phận nhìn thấy được)")
        return []
    parts: list[FramePart] = []
    names: set[str] = set()
    for node in array:
        part = FramePart(name=j.text(j.field(node, "name")).strip(), shape=j.text(j.field(node, "shape")).strip(),
                         position=j.text(j.field(node, "position")).strip(), proportion=j.text(j.field(node, "proportion")).strip())
        where = f"{label}, bộ phận '{part.name or '?'}'"
        if not part.name:
            problems.append(f"{label}: frame có bộ phận không tên")
        elif part.name.lower() in names:
            problems.append(f"{where}: tên bị trùng trong frame")
        else:
            names.add(part.name.lower())
        if not part.shape or not part.position or not part.proportion:
            problems.append(f"{where}: cần đủ shape (dáng thật), position (ở đâu, nối vào đâu) và proportion (to nhỏ so với cả vật)")
        parts.append(part)
    if len(parts) < MIN_FRAME_PARTS:
        problems.append(f"{label}: frame có {len(parts)} phần, cần ít nhất {MIN_FRAME_PARTS} và đủ các phần làm vật nhận ra ngay")
    return parts
