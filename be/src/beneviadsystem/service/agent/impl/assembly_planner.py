from __future__ import annotations

import logging
import re
from typing import Any

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.service import json_fields as j
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

from .agent_json import MalformedJson, extract_json, parse
from .draw_object_agent import DrawObjectRequest

log = logging.getLogger(__name__)
MAX_ATTEMPTS = 3
MIN_COMPONENTS = 2
MAX_COMPONENTS = 6
_IDENTIFIER = re.compile(r"[a-z][A-Za-z0-9]*")
_SAFE_EXPRESSION = re.compile(r"[0-9u+\-*/().\s]+")

INSTRUCTIONS = """\
Bạn tách MỘT cỗ máy thành các bộ phận để lắp ráp, cho mô phỏng vật lý phổ thông. Mỗi bộ phận sau đó được một người khác vẽ riêng
thành một vật thể thông minh (có hình, các điểm nối "port", và đầu vào nếu nó chuyển động), rồi các bộ phận được lắp vào nhau.
Trả JSON: { "input": ..., "root": ..., "components": [...], "attachments": [...] }.

input: MỘT đầu vào duy nhất của cả máy: { "name": camelCase ASCII, "label": nhãn tiếng Việt, "unit": đơn vị, "min": số, "max": số, "default": số }.
Lấy đúng đầu vào của mô tả máy (mục "đầu vào:" của gợi ý).

components: từ 2 đến 6 bộ phận, mỗi bộ phận là một khối cơ khí nhìn thấy được từ bên ngoài. Mỗi bộ phận có:
- id: camelCase ASCII, duy nhất.
- title: tên bộ phận, ngắn.
- moving: true nếu bộ phận tự chuyển động theo đầu vào của máy (cần bơm quay, pít-tông trượt); false nếu nó đứng yên hoặc chỉ bị bộ phận khác mang đi (đế, ống nối, bệ tải đặt lên pít-tông).
- driver: null khi moving = false. Khi moving = true: { "input": tên đầu vào RIÊNG của bộ phận này (camelCase ASCII, ví dụ pistonDepth, angle), "expr": biểu thức số học của u }. u là đầu vào của máy; biểu thức chỉ gồm số, u, + - * / và ngoặc, ví dụ "u", "u*0.25", "u*400". Kết quả phải nằm trong khoảng min..max của đầu vào riêng đó khi u chạy từ min tới max của máy. Hệ số lấy từ vật lý của máy (tỉ số diện tích, tỉ số cánh tay đòn) và có thể nhân thêm cho dễ nhìn.
- request: MỘT đoạn văn xuôi mô tả riêng bộ phận này cho người vẽ: hình dạng, kích thước tương đối, nhãn chữ nếu có, và "điểm neo ở ..." (điểm (0,0) của hình). Nếu moving thì nói rõ nó chuyển động thế nào theo đầu vào riêng. Không mô tả các bộ phận khác của máy.
- hint: nếu moving: "đầu vào: <driver.input> (<đơn vị>, <ý nghĩa>, chiều dương ...). Đầu ra: <đại lượng đọc thẳng từ hình học> (<đơn vị>). Port: <tên các port, cách nhau dấu phẩy>." Nếu không moving: "Port: <tên các port, cách nhau dấu phẩy>." (không có đầu vào, đầu ra). Mỗi bộ phận có 1 đến 4 port, tên camelCase ASCII.

attachments: cây lắp ráp. Mỗi bộ phận trừ "root" đúng MỘT lần làm "child": { "child": id, "childPort": port của child, "parent": id, "parentPort": port của parent }. Nghĩa là điểm childPort của bộ phận con TRÙNG điểm parentPort của bộ phận cha ở mọi giá trị của u, nên con luôn dính vào cha và đi theo cha. Tên port phải có trong mục "Port:" của hint tương ứng. Số mục attachments = số bộ phận trừ 1, không có vòng. "root" là id của bộ phận gốc, thường là đế đặt trên sàn.

Quy tắc thiết kế:
- Mỗi cơ cấu liên kết (cần kéo pít-tông, pít-tông nâng bệ) dùng CHUNG đầu vào u của máy qua các driver; vị trí các bộ phận còn lại là hệ quả của việc dính nhau qua port. Không tạo thêm đầu vào cho máy.
- Điểm nối giữa hai bộ phận là MỘT điểm trên mặt tiếp xúc thật (đỉnh pít-tông, mặt dưới bệ, đáy xi lanh). Hai port của cùng bộ phận cách nhau ít nhất 30 px nên đặt ở hai đầu khác nhau của bộ phận.
- Bộ phận đứng yên mà bộ phận khác nối vào (đế, ống) vẫn là một bộ phận riêng (moving = false).

Ví dụ (máy nâng thuỷ lực, đầu vào pumpStroke 0..0.12 m):
{"input":{"name":"pumpStroke","label":"Hành trình ấn cần bơm","unit":"m","min":0,"max":0.12,"default":0},"root":"frame",
 "components":[
  {"id":"frame","title":"Đế và ống nối","moving":false,"driver":null,"request":"Đế máy: một tấm đế chữ nhật dẹt nằm trên sàn, ở giữa có một ống ngang nối thông hai xi lanh, hai đầu đế có hai ổ cắm để gắn hai xi lanh. Đứng trên sàn, điểm neo ở giữa đáy đế.","hint":"Port: leftSocket, rightSocket."},
  {"id":"smallCylinder","title":"Xi lanh nhỏ và pít-tông","moving":true,"driver":{"input":"pistonDepth","expr":"u"},"request":"Xi lanh nhỏ thẳng đứng bằng thuỷ tinh có pít-tông và cần đẩy phía trên, nhãn \\"A1\\" cạnh thân. Điểm neo ở giữa đáy xi lanh. Khi pistonDepth tăng, pít-tông đi xuống.","hint":"đầu vào: pistonDepth (m, quãng pít-tông đã đi xuống, chiều dương hướng xuống). Đầu ra: độ sâu pít-tông (m). Port: base, rodTop."},
  {"id":"largeCylinder","title":"Xi lanh lớn và pít-tông","moving":true,"driver":{"input":"pistonRise","expr":"u*0.25"},"request":"Xi lanh lớn thẳng đứng, rộng hơn xi lanh nhỏ, có pít-tông lớn bên trong, nhãn \\"A2\\" cạnh thân. Điểm neo ở giữa đáy xi lanh. Khi pistonRise tăng, pít-tông đi lên.","hint":"đầu vào: pistonRise (m, quãng pít-tông lớn đã đi lên, chiều dương hướng lên). Đầu ra: độ cao đỉnh pít-tông (m). Port: base, pistonTop."},
  {"id":"platform","title":"Bệ tải","moving":false,"driver":null,"request":"Bệ tải nằm ngang: một tấm chữ nhật dày có nhãn \\"tải\\". Điểm neo ở giữa mặt dưới của bệ.","hint":"Port: underside."},
  {"id":"lever","title":"Cần bơm","moving":true,"driver":{"input":"angle","expr":"u*300"},"request":"Cần bơm: một thanh dài có tay cầm ở đầu. Điểm neo ở trục quay, đầu kia là tay cầm. Khi angle tăng, tay cầm hạ xuống.","hint":"đầu vào: angle (độ, góc quay của cần, chiều dương là hạ tay cầm xuống). Đầu ra: độ cao tay cầm (m). Port: pivot, handle."}],
 "attachments":[
  {"child":"smallCylinder","childPort":"base","parent":"frame","parentPort":"leftSocket"},
  {"child":"largeCylinder","childPort":"base","parent":"frame","parentPort":"rightSocket"},
  {"child":"platform","childPort":"underside","parent":"largeCylinder","parentPort":"pistonTop"},
  {"child":"lever","childPort":"pivot","parent":"smallCylinder","parentPort":"rodTop"}]}
Viết tiếng Việt.
"""


class AssemblyPlanner:
    """Splits one machine (a drawing request) into parts that each are a smart object, and says how the parts attach: one input of the
    machine, a driver expression per moving part, and a tree of port-to-port attachments. The plan has the shape of
    ``fe/lib/assembly/assemble.ts``. Parts that never move by themselves (frame, pipe, platform) are marked static."""

    def __init__(self, ai_client: AiClient):
        self._ai_client = ai_client

    def plan(self, machine: DrawObjectRequest) -> dict[str, Any]:
        user = (f"Cỗ máy cần tách (trả lời bằng JSON):\nTên: {machine.title}\n{machine.request}\nGợi ý: {machine.hint}"
                + ("" if not machine.view else f"\nGóc nhìn chung của cả cảnh (mọi bộ phận vẽ theo góc này): {machine.view}"))
        issue: str | None = None
        last: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            prompt = INSTRUCTIONS + "\n" + user + ("" if issue is None else f"\n\nLần trước bị từ chối vì: {issue}\nHãy trả lại toàn bộ JSON đã sửa.")
            try:
                plan = parse(extract_json(self._ai_client.generate_structured_text(prompt, StructuredOutputSchemaRegistry.ASSEMBLY_PLAN_RESPONSE)))
                self.validate(plan)
                log.info("AssemblyPlanner accepted: attempt=%d/%d, components=%d", attempt, MAX_ATTEMPTS, len(plan.get("components", [])))
                return plan
            except InvalidAgentResponseError as rejected:
                issue, last = str(rejected), rejected
                log.warning("AssemblyPlanner rejected: attempt=%d/%d, issue=%s", attempt, MAX_ATTEMPTS, issue)
            except MalformedJson as malformed:
                issue, last = "JSON không hợp lệ: " + malformed.reason, InvalidAgentResponseError("AI trả về JSON không hợp lệ")
        raise InvalidAgentResponseError(f"Không tách được máy thành bộ phận hợp lệ sau {MAX_ATTEMPTS} lần: {last or ''}") from last

    @staticmethod
    def validate(plan: Any) -> None:
        """Structure only: the parts are checked for real by the assembly gate once they are drawn."""
        problems: list[str] = []
        machine_input = j.field(plan, "input")
        if not _IDENTIFIER.fullmatch(j.text(j.field(machine_input, "name"))):
            problems.append("input.name phải camelCase ASCII")
        for name in ("min", "max", "default"):
            if not j.is_number(j.field(machine_input, name)):
                problems.append(f"input.{name} phải là số")
        if not problems:
            low, high, default = (j.number(j.field(machine_input, n)) for n in ("min", "max", "default"))
            if not (low < high and low <= default <= high):
                problems.append("input cần min < max và default nằm trong khoảng")
        components = j.field(plan, "components")
        if not isinstance(components, list) or not MIN_COMPONENTS <= len(components) <= MAX_COMPONENTS:
            problems.append(f"components phải có từ {MIN_COMPONENTS} đến {MAX_COMPONENTS} bộ phận")
            raise InvalidAgentResponseError("; ".join(problems))
        ports_of: dict[str, set[str]] = {}
        for c in components:
            component_id = j.text(j.field(c, "id"))
            label = f"bộ phận '{component_id or '?'}'"
            if not _IDENTIFIER.fullmatch(component_id):
                problems.append(f"{label}: id phải camelCase ASCII")
                continue
            if component_id in ports_of:
                problems.append(f"{label}: id bị trùng")
                continue
            hint = j.text(j.field(c, "hint"))
            ports: set[str] = set()
            at = hint.find("Port:")
            if at < 0:
                problems.append(f'{label}: hint thiếu mệnh đề "Port:"')
            else:
                ports = {p.strip() for p in hint[at + 5:].replace(".", "").split(",") if p.strip()}
            if not ports or len(ports) > 4:
                problems.append(f"{label}: cần 1 đến 4 port trong hint")
            ports_of[component_id] = ports
            if not j.text(j.field(c, "title")).strip():
                problems.append(f"{label}: thiếu title")
            if "điểm neo" not in j.text(j.field(c, "request")).lower():
                problems.append(f'{label}: request thiếu "điểm neo"')
            moving = j.field(c, "moving")
            if not isinstance(moving, bool):
                problems.append(f"{label}: moving phải là true hoặc false")
                continue
            driver = j.field(c, "driver")
            if moving:
                expr = j.text(j.field(driver, "expr"))
                own = j.text(j.field(driver, "input"))
                if not _IDENTIFIER.fullmatch(own):
                    problems.append(f"{label}: driver.input phải camelCase ASCII")
                if not _SAFE_EXPRESSION.fullmatch(expr) or "u" not in expr:
                    problems.append(f'{label}: driver.expr chỉ gồm số, u, + - * / ( ) và phải có u (thấy "{expr}")')
                if not hint.startswith("đầu vào:") or "Đầu ra:" not in hint:
                    problems.append(f'{label}: hint của bộ phận chuyển động phải có "đầu vào:" và "Đầu ra:"')
                if own and own not in hint:
                    problems.append(f'{label}: hint phải nhắc đầu vào "{own}"')
                if hint.find("đầu vào:", 1) > 0:
                    problems.append(f'{label}: hint có nhiều hơn một "đầu vào:"')
            else:
                if driver is not None:
                    problems.append(f"{label}: bộ phận không chuyển động phải có driver = null")
                if "đầu vào:" in hint:
                    problems.append(f'{label}: bộ phận tĩnh không có "đầu vào:" trong hint')
        root = j.text(j.field(plan, "root"))
        if root not in ports_of:
            problems.append(f"root '{root}' không phải id của bộ phận nào")
        attachments = j.field(plan, "attachments")
        if not isinstance(attachments, list) or len(attachments) != len(components) - 1:
            problems.append(f"attachments phải có đúng {len(components) - 1} mục (số bộ phận trừ 1)")
        else:
            parent_of: dict[str, str] = {}
            for a in attachments:
                child, parent = j.text(j.field(a, "child")), j.text(j.field(a, "parent"))
                parent_port, child_port = j.text(j.field(a, "parentPort")), j.text(j.field(a, "childPort"))
                text = f"nối {parent}.{parent_port} với {child}.{child_port}"
                if child not in ports_of or parent not in ports_of:
                    problems.append(f"{text}: id không có trong components")
                    continue
                if child == root:
                    problems.append(f"{text}: bộ phận gốc không được là con")
                if child in parent_of:
                    problems.append(f"{text}: '{child}' có hơn một cha")
                parent_of[child] = parent
                if parent_port not in ports_of[parent]:
                    problems.append(f"{text}: '{parent}' không khai port \"{parent_port}\" trong hint")
                if child_port not in ports_of[child]:
                    problems.append(f"{text}: '{child}' không khai port \"{child_port}\" trong hint")
            for component_id in ports_of:
                current, hops = component_id, 0
                while hops < MAX_COMPONENTS and current != root and current in parent_of:
                    current = parent_of[current]
                    hops += 1
                if current != root:
                    problems.append(f"bộ phận '{component_id}' không nối được tới root '{root}'")
        if problems:
            raise InvalidAgentResponseError("; ".join(problems))
