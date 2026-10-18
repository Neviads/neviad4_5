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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Writes the SCENARIO of an experiment, BEFORE its objects are drawn: the formulas, the phases over time, the layout of the
 * objects, and what students adjust and watch (all in plain prose). It also fixes the geometry of every object ({@link ObjectGeometry}: size
 * in metres, anchor, named points, moving parts), the one source the drawer, the engine and the scene all use; objects carry no physics.
 * It checks no physics; a person reads it, and a later code agent turns it into engine, renderer and experiment.
 */
@Service
public class ScenarioAgent {
    private static final Logger log = LoggerFactory.getLogger(ScenarioAgent.class);
    static final int MAX_ATTEMPTS = 3;

    private static final String INSTRUCTIONS = """
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
            """;

    private final AiClient aiClient;
    private final ObjectMapper mapper;

    public ScenarioAgent(AiClient aiClient, ObjectMapper mapper) {
        this.aiClient = aiClient;
        this.mapper = mapper;
    }

    /** One object of the experiment as the lite spec named it, not drawn yet. */
    public record ObjectInfo(String id, String title, String request, String hint, List<LiteSpecAgent.FramePart> frame) {
        public ObjectInfo {
            frame = frame == null ? List.of() : List.copyOf(frame);
        }

        public ObjectInfo(String id, String title, String request, String hint) { this(id, title, request, hint, List.of()); }
    }

    public record Phase(String name, String description) { }

    /** A point of an object that another object or something the experiment produces uses (an edge that touches, an outlet). */
    public record NamedPoint(String name, String description) { }

    /**
     * A part that moves inside its object because of the phenomenon: it slides along {@code axis} or rotates about its own joint, by a value in
     * {@code [min, max]} (metres for a slide, degrees for a rotation) from its rest pose. The engine gives the value; the object only has the part.
     */
    public record MovingPart(String name, String motion, String axis, double min, double max, String description) { }

    /**
     * The geometry of one object that the drawer, the engine and the scene all use: its size in metres, its anchor (the point whose position the
     * engine reports), its named points and its moving parts. The object carries no physics; this is the one source of its geometry.
     */
    public record ObjectGeometry(String objectId, double width, double height, String anchor, List<NamedPoint> points, List<MovingPart> parts) {
        public ObjectGeometry {
            points = points == null ? List.of() : List.copyOf(points);
            parts = parts == null ? List.of() : List.copyOf(parts);
        }
    }

    /**
     * One numeric example of the scenario's formulas: {@code text} says the inputs, {@code expression} is what the backend evaluates, and
     * {@code value} is the result the BACKEND computed from it (the model never states a result, so it cannot be miscalculated).
     */
    public record WorkedExample(String text, String expression, String unit, double value) { }

    /**
     * A thing the experiment PRODUCES over time: debris, particles, rays, spots, trail points. It belongs to no object, so it has no geometry
     * here: the engine emits it through {@code metrics.items} and the scene draws it. {@code from} names the point of an object it comes out of
     * (empty when it comes from nowhere in particular); {@code appearance} tells the scene what it looks like.
     */
    public record Phenomenon(String name, String description, String from, String appearance) { }

    /**
     * {@code workedExamples} are the numeric examples of the scenario's formulas (the engine's test cases); {@code view} is the one
     * viewpoint the whole scene is seen from, so every object is drawn from the same side; {@code phenomena} is what the experiment
     * produces over time, which no object owns.
     */
    public record Scenario(String summary, List<String> formulas, List<Phase> phases, String layout, List<String> adjustable,
                           List<String> observable, List<String> assumptions, List<ObjectGeometry> objectGeometry, List<WorkedExample> workedExamples,
                           String view, List<Phenomenon> phenomena) {
        public Scenario {
            objectGeometry = objectGeometry == null ? List.of() : List.copyOf(objectGeometry);
            workedExamples = workedExamples == null ? List.of() : List.copyOf(workedExamples);
            phenomena = phenomena == null ? List.of() : List.copyOf(phenomena);
            view = view == null ? "" : view;
        }

        public Scenario(String summary, List<String> formulas, List<Phase> phases, String layout, List<String> adjustable,
                        List<String> observable, List<String> assumptions, List<ObjectGeometry> objectGeometry) {
            this(summary, formulas, phases, layout, adjustable, observable, assumptions, objectGeometry, List.of(), "", List.of());
        }
    }

    public Scenario scenario(String teacherRequest, List<ObjectInfo> objects) {
        String user = "Yêu cầu của giáo viên (trả lời bằng JSON): " + teacherRequest + "\n\nCác vật của thí nghiệm:\n" + describe(objects);
        String issue = null;
        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String prompt = INSTRUCTIONS + "\n" + user
                    + (issue == null ? "" : "\n\nLần trước bị từ chối vì: " + issue + "\nHãy trả lại toàn bộ JSON đã sửa.");
            long started = System.nanoTime();
            try {
                String raw = aiClient.generateReasoned(prompt, StructuredOutputSchemaRegistry.SCENARIO_RESPONSE).text();
                Scenario scenario = parse(mapper.readTree(raw), objects);
                log.info("ScenarioAgent accepted: attempt={}/{}, formulas={}, phases={}, elapsedMs={}", attempt, MAX_ATTEMPTS,
                        scenario.formulas().size(), scenario.phases().size(), (System.nanoTime() - started) / 1_000_000);
                return scenario;
            } catch (InvalidAgentResponseException rejected) {
                issue = rejected.getMessage();
                last = rejected;
                log.warn("ScenarioAgent rejected: attempt={}/{}, issue={}", attempt, MAX_ATTEMPTS, issue);
            } catch (JsonProcessingException malformed) {
                issue = "JSON không hợp lệ: " + malformed.getOriginalMessage();
                last = new InvalidAgentResponseException("AI trả về JSON không hợp lệ", malformed);
                log.warn("ScenarioAgent malformed JSON: attempt={}/{}", attempt, MAX_ATTEMPTS);
            }
        }
        throw new InvalidAgentResponseException("Không lập được kịch bản hợp lệ sau " + MAX_ATTEMPTS + " lần: "
                + (last == null ? "" : last.getMessage()), last);
    }

    private static final Pattern NAME = Pattern.compile("[a-z][A-Za-z0-9]{0,39}");
    private static final Set<String> MOTIONS = Set.of("slide", "rotate");
    private static final Set<String> AXES = Set.of("up", "down", "left", "right");
    static final int MAX_POINTS = 4;
    static final int MAX_PARTS = 4;
    static final int MAX_PHENOMENA = 5;

    Scenario parse(JsonNode root, List<ObjectInfo> objects) {
        List<String> problems = new ArrayList<>();
        String summary = root.path("summary").asText("").trim();
        if (summary.isEmpty()) problems.add("thiếu summary");
        List<String> formulas = strings(root.path("formulas"));
        if (formulas.isEmpty()) problems.add("cần ít nhất một công thức trong formulas");
        List<Phase> phases = new ArrayList<>();
        for (JsonNode p : root.path("phases")) {
            String name = p.path("name").asText("").trim();
            String description = p.path("description").asText("").trim();
            if (name.isEmpty() || description.isEmpty()) problems.add("mỗi pha cần name và description không rỗng");
            else phases.add(new Phase(name, description));
        }
        if (phases.isEmpty()) problems.add("cần ít nhất một pha trong phases");
        String layout = root.path("layout").asText("").trim();
        if (layout.isEmpty()) problems.add("thiếu layout");
        String view = root.path("view").asText("").trim();
        if (view.isEmpty()) problems.add("thiếu view (góc nhìn chung của cả cảnh)");
        List<ObjectGeometry> objectGeometry = objectGeometry(root.path("objectGeometry"), objects, problems);
        List<Phenomenon> phenomena = phenomena(root.path("phenomena"), objectGeometry, problems);
        List<String> adjustable = strings(root.path("adjustable"));
        List<WorkedExample> workedExamples = workedExamples(root.path("workedExamples"), problems);
        int neededExamples = adjustable.isEmpty() ? 1 : 2;
        if (workedExamples.size() < neededExamples && problems.stream().noneMatch(p -> p.startsWith("workedExamples")))
            problems.add("workedExamples cần ít nhất " + neededExamples + " phép tính bằng số (giá trị mặc định và một đầu khác của khoảng của mỗi tham số chỉnh), mỗi mục có text, expression và unit");
        if (!problems.isEmpty()) throw new InvalidAgentResponseException(String.join("; ", problems), null);
        return new Scenario(summary, formulas, phases, layout, adjustable, strings(root.path("observable")),
                strings(root.path("assumptions")), objectGeometry, workedExamples, view, phenomena);
    }

    /** What the experiment produces over time. Optional; when {@code from} is given it must name a point some object declared. */
    private static List<Phenomenon> phenomena(JsonNode array, List<ObjectGeometry> geometry, List<String> problems) {
        Set<String> pointNames = new HashSet<>();
        for (ObjectGeometry g : geometry) for (NamedPoint p : g.points()) pointNames.add(p.name());
        Set<String> seen = new HashSet<>();
        List<Phenomenon> out = new ArrayList<>();
        for (JsonNode item : array) {
            String name = item.path("name").asText("").trim();
            String who = "hiện tượng \"" + name + "\"";
            if (!NAME.matcher(name).matches()) { problems.add("hiện tượng phải có tên camelCase tiếng Anh, ví dụ debris"); continue; }
            if (!seen.add(name)) { problems.add("tên " + who + " bị trùng"); continue; }
            String description = item.path("description").asText("").trim();
            if (description.isEmpty()) { problems.add(who + " thiếu description (xuất hiện khi nào, mất khi nào)"); continue; }
            String from = item.path("from").asText("").trim();
            if (!from.isEmpty() && !pointNames.contains(from))
                problems.add(who + " có from \"" + from + "\" nhưng không vật nào khai điểm tên đó; dùng tên một điểm trong points, hoặc để rỗng");
            out.add(new Phenomenon(name, description, from, item.path("appearance").asText("").trim()));
        }
        if (out.size() > MAX_PHENOMENA) problems.add("quá " + MAX_PHENOMENA + " hiện tượng; chỉ giữ những thứ học sinh thật sự nhìn thấy");
        return out;
    }

    /** One entry per object, by id: a positive size in metres, an anchor, and well-named points and moving parts with a valid motion and range. */
    private static List<ObjectGeometry> objectGeometry(JsonNode array, List<ObjectInfo> objects, List<String> problems) {
        Map<String, JsonNode> byId = new LinkedHashMap<>();
        for (JsonNode entry : array) byId.putIfAbsent(entry.path("objectId").asText("").trim(), entry);
        List<ObjectGeometry> out = new ArrayList<>();
        for (ObjectInfo object : objects) {
            JsonNode entry = byId.get(object.id());
            String who = "vật \"" + object.id() + "\"";
            if (entry == null) {
                problems.add("objectGeometry thiếu vật có id \"" + object.id() + "\" (" + object.title() + ")");
                continue;
            }
            double width = entry.path("width").asDouble(0), height = entry.path("height").asDouble(0);
            if (!(width > 0) || !(height > 0)) problems.add(who + " cần width và height dương (mét)");
            String anchor = entry.path("anchor").asText("").trim();
            Set<String> names = new HashSet<>();
            List<NamedPoint> points = new ArrayList<>();
            for (JsonNode p : entry.path("points")) {
                String name = p.path("name").asText("").trim();
                if (!NAME.matcher(name).matches()) problems.add("điểm \"" + name + "\" của " + who + " phải có tên camelCase tiếng Anh, ví dụ frontEdge");
                else if (!names.add(name)) problems.add("tên \"" + name + "\" của " + who + " bị trùng");
                else points.add(new NamedPoint(name, p.path("description").asText("").trim()));
            }
            List<MovingPart> parts = new ArrayList<>();
            for (JsonNode p : entry.path("parts")) {
                String name = p.path("name").asText("").trim();
                String motion = p.path("motion").asText("").trim();
                String axis = p.path("axis").asText("").trim();
                String part = "bộ phận \"" + name + "\" của " + who;
                if (!NAME.matcher(name).matches()) { problems.add(part + " phải có tên camelCase tiếng Anh, ví dụ largePiston"); continue; }
                if (!names.add(name)) { problems.add("tên \"" + name + "\" của " + who + " bị trùng"); continue; }
                if (!MOTIONS.contains(motion)) { problems.add(part + " cần motion \"slide\" hoặc \"rotate\""); continue; }
                if ("slide".equals(motion) && !AXES.contains(axis)) { problems.add(part + " trượt nên cần axis up, down, left hoặc right"); continue; }
                if (!p.path("min").isNumber() || !p.path("max").isNumber() || p.path("min").asDouble() >= p.path("max").asDouble()) {
                    problems.add(part + " cần min nhỏ hơn max");
                    continue;
                }
                parts.add(new MovingPart(name, motion, "slide".equals(motion) ? axis : "", p.path("min").asDouble(), p.path("max").asDouble(),
                        p.path("description").asText("").trim()));
            }
            if (points.size() > MAX_POINTS) problems.add(who + " có quá " + MAX_POINTS + " điểm; chỉ giữ những điểm vật khác hay hiện tượng thật sự dùng");
            if (parts.size() > MAX_PARTS) problems.add(who + " có quá " + MAX_PARTS + " bộ phận chuyển động");
            // Điểm neo chỉ bắt buộc với vật là cơ cấu: có bộ phận chuyển động hay có điểm phải đặt đúng chỗ.
            if (anchor.isEmpty() && !(points.isEmpty() && parts.isEmpty()))
                problems.add(who + " có bộ phận hoặc điểm có tên nên phải ghi anchor (điểm neo bằng lời)");
            out.add(new ObjectGeometry(object.id(), width, height, anchor, points, parts));
        }
        return out;
    }

    /** Each example's expression is evaluated by the backend; one that cannot be computed is sent back with the reason. */
    private static List<WorkedExample> workedExamples(JsonNode array, List<String> problems) {
        List<WorkedExample> out = new ArrayList<>();
        int index = 0;
        for (JsonNode item : array) {
            index += 1;
            String text = item.path("text").asText("").trim();
            String expression = item.path("expression").asText("").trim();
            String unit = item.path("unit").asText("").trim();
            String who = "workedExamples[" + index + "]";
            if (text.isEmpty() || expression.isEmpty()) {
                problems.add(who + " cần text và expression không rỗng");
                continue;
            }
            try {
                out.add(new WorkedExample(text, expression, unit, MathExpression.evaluate(expression)));
            } catch (IllegalArgumentException bad) {
                problems.add(who + ": expression \"" + expression + "\" không tính được (" + bad.getMessage() + ")");
            }
        }
        return out;
    }

    private static List<String> strings(JsonNode array) {
        List<String> out = new ArrayList<>();
        array.forEach(item -> { if (item.isTextual() && !item.asText().isBlank()) out.add(item.asText().trim()); });
        return out;
    }

    private static String describe(List<ObjectInfo> objects) {
        StringBuilder out = new StringBuilder();
        int index = 0;
        for (ObjectInfo o : objects) {
            out.append(++index).append(". id: ").append(o.id()).append(" | ").append(o.title()).append('\n')
                    .append("   Mô tả: ").append(o.request()).append('\n').append("   Gợi ý: ").append(o.hint() == null || o.hint().isBlank() ? "(không có)" : o.hint()).append('\n');
            if (!o.frame().isEmpty()) {
                out.append("   Khung (các bộ phận nhìn thấy được):\n");
                for (LiteSpecAgent.FramePart p : o.frame())
                    out.append("   - ").append(p.name()).append(": ").append(p.shape()).append("; ").append(p.position()).append("; ").append(p.proportion()).append('\n');
            }
        }
        return out.toString();
    }
}
