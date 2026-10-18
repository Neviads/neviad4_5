package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Splits one machine (a drawing request) into parts that each are a smart object, and says how the parts attach: one input of the
 * machine, a driver expression per moving part, and a tree of port-to-port attachments. The plan has the shape of
 * {@code fe/lib/assembly/assemble.ts}. Parts that never move by themselves (frame, pipe, platform) are marked static.
 */
@Service
public class AssemblyPlanner {
    private static final Logger log = LoggerFactory.getLogger(AssemblyPlanner.class);
    static final int MAX_ATTEMPTS = 3;
    static final int MIN_COMPONENTS = 2;
    static final int MAX_COMPONENTS = 6;
    private static final Pattern IDENTIFIER = Pattern.compile("[a-z][A-Za-z0-9]*");
    private static final Pattern SAFE_EXPRESSION = Pattern.compile("[0-9u+\\-*/().\\s]+");

    private static final String INSTRUCTIONS = """
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
            """;

    private final AiClient aiClient;
    private final ObjectMapper mapper;

    public AssemblyPlanner(AiClient aiClient, ObjectMapper mapper) {
        this.aiClient = aiClient;
        this.mapper = mapper;
    }

    public JsonNode plan(DrawObjectAgent.DrawObjectRequest machine) {
        String user = "Cỗ máy cần tách (trả lời bằng JSON):\nTên: " + machine.title() + "\n" + machine.request() + "\nGợi ý: " + machine.hint()
                + (machine.view().isBlank() ? "" : "\nGóc nhìn chung của cả cảnh (mọi bộ phận vẽ theo góc này): " + machine.view());
        String issue = null;
        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String prompt = INSTRUCTIONS + "\n" + user
                    + (issue == null ? "" : "\n\nLần trước bị từ chối vì: " + issue + "\nHãy trả lại toàn bộ JSON đã sửa.");
            try {
                String raw = aiClient.generate(prompt, StructuredOutputSchemaRegistry.ASSEMBLY_PLAN_RESPONSE);
                JsonNode plan = mapper.readTree(DrawObjectAgent.extractJson(raw));
                validate(plan);
                log.info("AssemblyPlanner accepted: attempt={}/{}, components={}", attempt, MAX_ATTEMPTS, plan.path("components").size());
                return plan;
            } catch (InvalidAgentResponseException rejected) {
                issue = rejected.getMessage();
                last = rejected;
                log.warn("AssemblyPlanner rejected: attempt={}/{}, issue={}", attempt, MAX_ATTEMPTS, issue);
            } catch (JsonProcessingException malformed) {
                issue = "JSON không hợp lệ: " + malformed.getOriginalMessage();
                last = new InvalidAgentResponseException("AI trả về JSON không hợp lệ", malformed);
            }
        }
        throw new InvalidAgentResponseException("Không tách được máy thành bộ phận hợp lệ sau " + MAX_ATTEMPTS + " lần: "
                + (last == null ? "" : last.getMessage()), last);
    }

    /** Structure only: the parts are checked for real by the assembly gate once they are drawn. */
    void validate(JsonNode plan) {
        List<String> problems = new ArrayList<>();
        JsonNode input = plan.path("input");
        if (!IDENTIFIER.matcher(input.path("name").asText("")).matches()) problems.add("input.name phải camelCase ASCII");
        for (String field : List.of("min", "max", "default")) if (!input.path(field).isNumber()) problems.add("input." + field + " phải là số");
        if (problems.isEmpty() && !(input.path("min").asDouble() < input.path("max").asDouble() && input.path("default").asDouble() >= input.path("min").asDouble()
                && input.path("default").asDouble() <= input.path("max").asDouble())) problems.add("input cần min < max và default nằm trong khoảng");
        JsonNode list = plan.path("components");
        if (!list.isArray() || list.size() < MIN_COMPONENTS || list.size() > MAX_COMPONENTS) {
            problems.add("components phải có từ " + MIN_COMPONENTS + " đến " + MAX_COMPONENTS + " bộ phận");
            throw new InvalidAgentResponseException(String.join("; ", problems), null);
        }
        Map<String, Set<String>> portsOf = new HashMap<>();
        for (JsonNode c : list) {
            String id = c.path("id").asText("");
            String label = "bộ phận '" + (id.isEmpty() ? "?" : id) + "'";
            if (!IDENTIFIER.matcher(id).matches()) { problems.add(label + ": id phải camelCase ASCII"); continue; }
            if (portsOf.containsKey(id)) { problems.add(label + ": id bị trùng"); continue; }
            String hint = c.path("hint").asText("");
            Set<String> ports = new HashSet<>();
            int at = hint.indexOf("Port:");
            if (at < 0) problems.add(label + ": hint thiếu mệnh đề \"Port:\"");
            else for (String p : hint.substring(at + 5).replace(".", "").split(",")) if (!p.isBlank()) ports.add(p.trim());
            if (ports.isEmpty() || ports.size() > 4) problems.add(label + ": cần 1 đến 4 port trong hint");
            portsOf.put(id, ports);
            if (c.path("title").asText("").isBlank()) problems.add(label + ": thiếu title");
            if (!c.path("request").asText("").toLowerCase().contains("điểm neo")) problems.add(label + ": request thiếu \"điểm neo\"");
            if (!c.path("moving").isBoolean()) { problems.add(label + ": moving phải là true hoặc false"); continue; }
            JsonNode driver = c.path("driver");
            if (c.path("moving").asBoolean()) {
                String expr = driver.path("expr").asText("");
                String own = driver.path("input").asText("");
                if (!IDENTIFIER.matcher(own).matches()) problems.add(label + ": driver.input phải camelCase ASCII");
                if (!SAFE_EXPRESSION.matcher(expr).matches() || !expr.contains("u")) problems.add(label + ": driver.expr chỉ gồm số, u, + - * / ( ) và phải có u (thấy \"" + expr + "\")");
                if (!hint.startsWith("đầu vào:") || !hint.contains("Đầu ra:")) problems.add(label + ": hint của bộ phận chuyển động phải có \"đầu vào:\" và \"Đầu ra:\"");
                if (!own.isEmpty() && !hint.contains(own)) problems.add(label + ": hint phải nhắc đầu vào \"" + own + "\"");
                if (hint.indexOf("đầu vào:", 1) > 0) problems.add(label + ": hint có nhiều hơn một \"đầu vào:\"");
            } else {
                if (!driver.isNull() && !driver.isMissingNode()) problems.add(label + ": bộ phận không chuyển động phải có driver = null");
                if (hint.contains("đầu vào:")) problems.add(label + ": bộ phận tĩnh không có \"đầu vào:\" trong hint");
            }
        }
        String root = plan.path("root").asText("");
        if (!portsOf.containsKey(root)) problems.add("root '" + root + "' không phải id của bộ phận nào");
        JsonNode attachments = plan.path("attachments");
        if (!attachments.isArray() || attachments.size() != list.size() - 1) problems.add("attachments phải có đúng " + (list.size() - 1) + " mục (số bộ phận trừ 1)");
        else {
            Map<String, String> parentOf = new HashMap<>();
            for (JsonNode a : attachments) {
                String child = a.path("child").asText(""), parent = a.path("parent").asText("");
                String text = "nối " + parent + "." + a.path("parentPort").asText("") + " với " + child + "." + a.path("childPort").asText("");
                if (!portsOf.containsKey(child) || !portsOf.containsKey(parent)) { problems.add(text + ": id không có trong components"); continue; }
                if (child.equals(root)) problems.add(text + ": bộ phận gốc không được là con");
                if (parentOf.put(child, parent) != null) problems.add(text + ": '" + child + "' có hơn một cha");
                if (!portsOf.get(parent).contains(a.path("parentPort").asText(""))) problems.add(text + ": '" + parent + "' không khai port \"" + a.path("parentPort").asText("") + "\" trong hint");
                if (!portsOf.get(child).contains(a.path("childPort").asText(""))) problems.add(text + ": '" + child + "' không khai port \"" + a.path("childPort").asText("") + "\" trong hint");
            }
            for (String id : portsOf.keySet()) {
                String cur = id;
                for (int hops = 0; hops < MAX_COMPONENTS && !cur.equals(root) && parentOf.containsKey(cur); hops++) cur = parentOf.get(cur);
                if (!cur.equals(root)) problems.add("bộ phận '" + id + "' không nối được tới root '" + root + "'");
            }
        }
        if (!problems.isEmpty()) throw new InvalidAgentResponseException(String.join("; ", problems), null);
    }
}
