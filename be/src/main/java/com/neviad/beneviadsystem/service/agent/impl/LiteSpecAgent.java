package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.presentation.dto.requirement.ClarificationQuestion;
import com.neviad.beneviadsystem.service.ObjectLibraryService;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.codegen.AgentActivityPublisher;
import com.neviad.beneviadsystem.service.agent.codegen.AgentSteps;
import com.neviad.beneviadsystem.service.agent.tools.objects.ObjectLibraryTools;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * One call that turns a teacher's request into one drawing request per thing in the scene that needs a figure of its own (an apparatus,
 * or a particle, nucleus, atom, molecule, planet, cell... of the phenomenon): a title, a prose description of the look (and any visible change of its parts), and a
 * hint with the output and ports. Before that it may ask the teacher about the look, one question at a time (style, scale, which version
 * of the apparatus, viewpoint, layout), at most {@link #MAX_ANSWERS} times, and the style agreed on goes to the drawer and the judge. It
 * carries no physics and no inputs: the scenario step that follows decides what each object is fed, and the object is then drawn to
 * exactly that.
 */
@Service
public class LiteSpecAgent {
    private static final Logger log = LoggerFactory.getLogger(LiteSpecAgent.class);
    static final int MAX_ATTEMPTS = 3;
    private static final int MAX_OBJECTS = 4;
    /** Calls of get_objects one attempt may make: the index is in the prompt, so only the details of a few candidates are fetched. */
    private static final int MAX_LIBRARY_CALLS = 3;

    private static final String INSTRUCTIONS = """
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
            """;

    /**
     * Added when the library of drawn objects has some, followed by its index: the agent reads the whole index, fetches the details of its
     * candidates and may reuse a ready-made object instead of having one drawn.
     */
    private static final String LIBRARY_INSTRUCTIONS = """

            KHO VẬT CÓ SẴN: cuối phần hướng dẫn này là MỤC LỤC của toàn bộ kho vật đã vẽ sẵn, xếp theo chủ đề, mỗi dòng một vật: id | tên | mô tả | Dùng khi. Khi định trả READY, đọc mục lục, chọn ra các vật có thể dùng cho từng vật trong cảnh (theo nghĩa, không cần trùng chữ: cùng loại thiết bị hay thực thể là đủ để xét), rồi gọi tool get_objects với id của các ứng viên đó (gộp vào một lần gọi) để xem avoidWhen, bộ phận chuyển động, kích thước và các điểm có tên trước khi quyết định. Khi hỏi lại giáo viên hay UNSUPPORTED thì không cần gọi.
            Mỗi mục objects có thêm trường "reference": nếu kho có đúng vật đó (cùng loại thiết bị, đúng phiên bản và thang nhìn đã chốt với giáo viên) thì điền id của nó (đúng như tool trả về, ví dụ "can-don.ts") và vật sẽ được dùng lại, không vẽ mới; các bộ phận chuyển động và kích thước của vật có sẵn là cố định nên request và frame phải mô tả ĐÚNG vật đó. Không có vật phù hợp thì reference = null (vật sẽ được vẽ mới). Đừng ép dùng vật gần giống nhưng khác loại.
            Mỗi vật có "useWhen" (khi nào nên dùng) và "avoidWhen" (khi nào KHÔNG nên dùng, chỉ có trong kết quả get_objects): đối chiếu yêu cầu đã chốt với giáo viên với hai trường này; chỉ điền reference khi yêu cầu khớp một ý của useWhen và không rơi vào ý nào của avoidWhen.

            MỤC LỤC KHO VẬT:
            """;

    private final AiClient aiClient;
    private final ObjectMapper mapper;
    private final ObjectLibraryService library;
    private final AgentActivityPublisher activity;

    public LiteSpecAgent(AiClient aiClient, ObjectMapper mapper) {
        this(aiClient, mapper, null);
    }

    public LiteSpecAgent(AiClient aiClient, ObjectMapper mapper, ObjectLibraryService library) {
        this(aiClient, mapper, library, AgentActivityPublisher.NONE);
    }

    @Autowired
    public LiteSpecAgent(AiClient aiClient, ObjectMapper mapper, ObjectLibraryService library, AgentActivityPublisher activity) {
        this.aiClient = aiClient;
        this.mapper = mapper;
        this.library = library;
        this.activity = activity == null ? AgentActivityPublisher.NONE : activity;
    }

    /** The index of the library, or null when there is none to offer: no library, no drawn object, or a database that is down. */
    private String libraryIndex() {
        if (library == null) return null;
        try {
            String index = library.index();
            return index.isBlank() ? null : index;
        } catch (RuntimeException unavailable) {
            log.warn("Library of drawn objects not available, drawing every object: {}", unavailable.getMessage());
            return null;
        }
    }

    public enum Status { READY, NEEDS_CLARIFICATION, UNSUPPORTED }

    /** One visible part of the object, in words: the frame the drawer builds the figure on. */
    public record FramePart(String name, String shape, String position, String proportion) { }

    /** One drawing request: the prose request and hint, and the frame (the visible parts, where they sit and how big they are). */
    public record ObjectRequest(String id, String title, String request, String hint, List<FramePart> frame, String reference) {
        public ObjectRequest {
            frame = frame == null ? List.of() : List.copyOf(frame);
            reference = reference == null || reference.isBlank() ? null : reference.trim();
        }

        public ObjectRequest(String id, String title, String request, String hint, List<FramePart> frame) { this(id, title, request, hint, frame, null); }

        public ObjectRequest(String id, String title, String request, String hint) { this(id, title, request, hint, List.of(), null); }
    }

    static final int MIN_FRAME_PARTS = 1;

    /** How many answered questions (lines "Trả lời:" in the request) end the asking: the agent then chooses what is still open. */
    static final int MAX_ANSWERS = 5;
    private static final Pattern ANSWER_LINE = Pattern.compile("(?m)^\\s*Trả lời:");

    /** {@code question} is only set for NEEDS_CLARIFICATION; {@code style} (the look agreed with the teacher) and {@code objects} only for READY. */
    public record LiteOutcome(Status status, String phenomenon, String reason, ClarificationQuestion question, String style,
                              List<ObjectRequest> objects) { }

    public LiteOutcome analyze(String teacherRequest) {
        return analyze(teacherRequest, null);
    }

    /** {@code runId}: the run the frontend listens to; when set, every call of a library tool is published there while the agent works. */
    public LiteOutcome analyze(String teacherRequest, String runId) {
        String user = "Yêu cầu của giáo viên (trả lời bằng JSON): " + teacherRequest;
        boolean answeredEnough = ANSWER_LINE.matcher(teacherRequest).results().count() >= MAX_ANSWERS;
        String issue = null;
        RuntimeException last = null;
        String index = libraryIndex();
        AgentSteps steps = runId == null || runId.isBlank() ? null : new AgentSteps(activity, runId, "litespec", "Tách yêu cầu");
        List<ToolCallback> tools = index == null ? List.of() : ObjectLibraryTools.of(library, steps);
        // The instructions and the index come before the teacher's request, so the provider can cache them as one prefix.
        String libraryPart = index == null ? "" : LIBRARY_INSTRUCTIONS + index;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String prompt = INSTRUCTIONS + libraryPart + "\n" + user
                    + (issue == null ? "" : "\n\nLần trước bị từ chối vì: " + issue + "\nHãy trả lại toàn bộ JSON đã sửa.");
            long started = System.nanoTime();
            try {
                String raw = (index == null
                        ? aiClient.generateReasoned(prompt, StructuredOutputSchemaRegistry.LITE_SPEC_RESPONSE)
                        : aiClient.generateWithTools(prompt, tools, StructuredOutputSchemaRegistry.LITE_SPEC_RESPONSE, MAX_LIBRARY_CALLS)).text();
                LiteOutcome outcome = parse(mapper.readTree(raw));
                if (answeredEnough && outcome.status() == Status.NEEDS_CLARIFICATION)
                    throw invalid("giáo viên đã trả lời đủ " + MAX_ANSWERS + " câu, không hỏi thêm: trả READY và tự chọn hợp lý phần còn lại");
                log.info("LiteSpecAgent accepted: attempt={}/{}, status={}, objects={}, elapsedMs={}", attempt, MAX_ATTEMPTS,
                        outcome.status(), outcome.objects().size(), (System.nanoTime() - started) / 1_000_000);
                return outcome;
            } catch (InvalidAgentResponseException rejected) {
                issue = rejected.getMessage();
                last = rejected;
                log.warn("LiteSpecAgent rejected: attempt={}/{}, issue={}", attempt, MAX_ATTEMPTS, issue);
            } catch (com.fasterxml.jackson.core.JsonProcessingException malformed) {
                issue = "JSON không hợp lệ: " + malformed.getOriginalMessage();
                last = new InvalidAgentResponseException("AI trả về JSON không hợp lệ", malformed);
                log.warn("LiteSpecAgent malformed JSON: attempt={}/{}", attempt, MAX_ATTEMPTS);
            }
        }
        throw new InvalidAgentResponseException("Không lập được yêu cầu vẽ hợp lệ sau " + MAX_ATTEMPTS + " lần: "
                + (last == null ? "" : last.getMessage()), last);
    }

    LiteOutcome parse(JsonNode root) {
        Status status;
        try { status = Status.valueOf(root.path("status").asText()); }
        catch (IllegalArgumentException unknown) { throw invalid("status phải là READY, NEEDS_CLARIFICATION hoặc UNSUPPORTED"); }
        String phenomenon = root.path("phenomenon").asText("").trim();
        if (status == Status.UNSUPPORTED) {
            String reason = root.path("reason").asText("").trim();
            if (reason.isEmpty()) throw invalid("UNSUPPORTED cần reason");
            return new LiteOutcome(status, phenomenon, reason, null, "", List.of());
        }
        if (status == Status.NEEDS_CLARIFICATION) {
            JsonNode q = root.path("question");
            String text = q.path("text").asText("").trim();
            if (text.isEmpty()) throw invalid("NEEDS_CLARIFICATION cần question.text");
            List<String> suggestions = new ArrayList<>();
            q.path("suggestions").forEach(s -> { if (s.isTextual() && !s.asText().isBlank()) suggestions.add(s.asText().trim()); });
            return new LiteOutcome(status, phenomenon, null,
                    new ClarificationQuestion(q.path("topic").asText("Làm rõ yêu cầu"), text, suggestions), "", List.of());
        }
        String style = root.path("style").asText("").trim();
        if (style.isEmpty()) throw invalid("READY cần style: phong cách hình đã chốt với giáo viên");
        JsonNode list = root.path("objects");
        if (!list.isArray() || list.isEmpty()) throw invalid("READY cần ít nhất một mục trong objects");
        if (list.size() > MAX_OBJECTS) throw invalid("có " + list.size() + " vật, tối đa " + MAX_OBJECTS + " (vật đặt lên thiết bị là bộ phận của nó; thứ sinh ra hàng loạt để cho mục hiện tượng)");
        List<String> problems = new ArrayList<>();
        List<ObjectRequest> objects = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (JsonNode node : list) {
            String id = node.path("id").asText("").trim();
            String title = node.path("title").asText("").trim();
            String request = node.path("request").asText("").trim();
            String hint = node.path("hint").asText("").trim();
            String label = "vật '" + (id.isEmpty() ? "?" : id) + "'";
            if (!id.matches("[a-z][A-Za-z0-9]*")) problems.add(label + ": id phải camelCase ASCII, bắt đầu bằng chữ thường");
            else if (!ids.add(id)) problems.add(label + ": id bị trùng");
            if (title.isEmpty()) problems.add(label + ": thiếu title");
            if (request.length() < 80) problems.add(label + ": request phải là đoạn văn mô tả đủ bộ phận và cách đặt");
            if (hint.toLowerCase().contains("đầu vào:")) problems.add(label + ": hint không được nêu \"đầu vào:\"; đầu vào của vật do bước kịch bản chốt");
            List<FramePart> frame = frame(node.path("frame"), label, problems);
            String reference = node.path("reference").isTextual() ? node.path("reference").asText().trim() : "";
            if (!reference.isEmpty()) {
                var found = library == null ? java.util.Optional.<ObjectLibraryService.Summary>empty() : library.find(reference);
                if (found.isEmpty()) problems.add(label + ": reference '" + reference + "' không có trong kho vật; dùng đúng id mà tool trả về, hoặc để null để vẽ mới");
                else request = request + "\n" + libraryGeometry(found.get());
            }
            objects.add(new ObjectRequest(id, title, request, hint, frame, reference));
        }
        if (!problems.isEmpty()) throw invalid(String.join("; ", problems));
        return new LiteOutcome(status, phenomenon, null, null, style, objects);
    }

    /** What the scenario step must take as given for an object reused from the library: it is not drawn again, so its geometry is fixed. */
    private static String libraryGeometry(ObjectLibraryService.Summary s) {
        StringBuilder out = new StringBuilder("[Vật có sẵn trong kho, KHÔNG vẽ lại; hình học cố định] Khung bao ")
                .append(plain(s.width())).append(" m × ").append(plain(s.height())).append(" m. Điểm neo: ").append(s.anchor()).append(".");
        for (ObjectLibraryService.Part p : s.parts())
            out.append(" Bộ phận ").append(p.name()).append(" (").append(p.label()).append("): ")
                    .append("slide".equals(p.motion()) ? "trượt" : "quay").append(" từ ").append(plain(p.min())).append(" đến ").append(plain(p.max()))
                    .append("slide".equals(p.motion()) ? " m." : " độ.");
        if (!s.points().isEmpty()) out.append(" Điểm có tên: ").append(String.join(", ", s.points())).append(".");
        return out.toString();
    }

    private static String plain(double value) {
        return java.math.BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    /** The frame of one object: its visible parts, at least one, each named once and described in all four fields. */
    private static List<FramePart> frame(JsonNode array, String label, List<String> problems) {
        List<FramePart> parts = new ArrayList<>();
        if (!array.isArray()) {
            problems.add(label + ": thiếu frame (khung các bộ phận nhìn thấy được)");
            return parts;
        }
        Set<String> names = new HashSet<>();
        for (JsonNode node : array) {
            FramePart part = new FramePart(node.path("name").asText("").trim(), node.path("shape").asText("").trim(),
                    node.path("position").asText("").trim(), node.path("proportion").asText("").trim());
            String where = label + ", bộ phận '" + (part.name().isEmpty() ? "?" : part.name()) + "'";
            if (part.name().isEmpty()) problems.add(label + ": frame có bộ phận không tên");
            else if (!names.add(part.name().toLowerCase())) problems.add(where + ": tên bị trùng trong frame");
            if (part.shape().isEmpty() || part.position().isEmpty() || part.proportion().isEmpty())
                problems.add(where + ": cần đủ shape (dáng thật), position (ở đâu, nối vào đâu) và proportion (to nhỏ so với cả vật)");
            parts.add(part);
        }
        if (parts.size() < MIN_FRAME_PARTS)
            problems.add(label + ": frame có " + parts.size() + " phần, cần ít nhất " + MIN_FRAME_PARTS + " và đủ các phần làm vật nhận ra ngay");
        return parts;
    }

    private static InvalidAgentResponseException invalid(String message) {
        return new InvalidAgentResponseException(message, null);
    }
}
