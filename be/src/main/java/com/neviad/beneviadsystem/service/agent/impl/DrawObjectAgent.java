package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.ToolImageSource;
import com.neviad.beneviadsystem.infrastructure.ai.ToolSchemaLock;
import com.neviad.beneviadsystem.service.agent.codegen.AgentActivity;
import com.neviad.beneviadsystem.service.agent.codegen.AgentActivityPublisher;
import com.neviad.beneviadsystem.service.agent.codegen.AgentRunner;
import com.neviad.beneviadsystem.service.agent.codegen.AgentSpec;
import com.neviad.beneviadsystem.service.agent.codegen.AgentSteps;
import com.neviad.beneviadsystem.service.agent.codegen.BridgedCodeStore;
import com.neviad.beneviadsystem.service.agent.codegen.CodeSession;
import com.neviad.beneviadsystem.service.agent.codegen.CodeStore;
import com.neviad.beneviadsystem.service.agent.draft.CodeDraftPublisher;
import com.neviad.beneviadsystem.service.agent.codegen.ExperimentNames;
import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeBridge;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/**
 * Draws ONE object from a request (title, prose, hint) as a free agent: its only rule is that the figure be beautiful and true to life
 * (see {@code prompts/drawobject/agent.md}). It reads what it likes of the browser's copy of {@code neviadlike_structure}, writes one file of its
 * own ({@code _drawn/<stem>.ts}, one Konva function) and calls {@code check_object}, which only says whether the code runs and draws something.
 * It may {@code finish} once the last check passed on exactly the file it now holds. What the object declares (inputs, outputs, ports) is
 * whatever the code itself says; nothing is required of it.
 */
@Service
public class DrawObjectAgent {
    private static final Logger log = LoggerFactory.getLogger(DrawObjectAgent.class);
    static final int MAX_CHECKS = 12;
    /** A figure is a short file; a deeper setting only risks a silent turn that a gateway cuts, so the code agents keep "high" and this one does not. */
    static final String DEFAULT_REASONING_EFFORT = "medium";
    private static final String AGENT_PATH = "prompts/drawobject/agent.md";
    private static final CodeSession.Limits LIMITS = new CodeSession.Limits(20, 30, 5, 120_000, 20_000);
    private static final String CONTINUATION_HINT = "Hãy đọc lại file đã ghi, gọi `check_object`, sửa chỗ còn lỗi hoặc còn sơ sài bằng `edit_file`, rồi `finish`.";

    /**
     * {@code isStatic} is kept for callers that still say it. {@code geometry} is what the scenario fixed for this object (size in metres, anchor,
     * named points, moving parts): the figure is drawn to exactly that and the check measures it; null when no scenario was given (the figure
     * then only has to run). {@code view} is the one viewpoint the scenario chose for the whole scene (empty when there is none). {@code style}
     * is the look agreed with the teacher in the lite spec (empty means as real as possible).
     */
    public record DrawObjectRequest(String title, String request, String hint, boolean isStatic, ScenarioAgent.ObjectGeometry geometry, String view,
                                    List<LiteSpecAgent.FramePart> frame, String style) {
        public DrawObjectRequest {
            view = view == null ? "" : view.trim();
            frame = frame == null ? List.of() : List.copyOf(frame);
            style = style == null ? "" : style.trim();
        }

        public DrawObjectRequest(String title, String request, String hint, boolean isStatic, ScenarioAgent.ObjectGeometry geometry, String view,
                                 List<LiteSpecAgent.FramePart> frame) {
            this(title, request, hint, isStatic, geometry, view, frame, "");
        }

        public DrawObjectRequest(String title, String request, String hint, boolean isStatic, ScenarioAgent.ObjectGeometry geometry, String view) {
            this(title, request, hint, isStatic, geometry, view, List.of());
        }

        public DrawObjectRequest(String title, String request, String hint, boolean isStatic) { this(title, request, hint, isStatic, null, ""); }

        public DrawObjectRequest(String title, String request, String hint) { this(title, request, hint, false, null, ""); }

        public DrawObjectRequest(String title, String request, String hint, ScenarioAgent.ObjectGeometry geometry, String view) { this(title, request, hint, false, geometry, view); }
    }

    /**
     * Same fields as {@code DrawObjectItem} of the frontend gallery, so the page can draw it as it is. {@code size} (metres), {@code moving} (the
     * moving parts) and {@code points} come from the shape contract; the older fields stay for the gallery's older items and are empty here.
     */
    public record DrawObjectResult(int id, String title, String request, String hint, String source, String status, int attempts,
                                   String name, String shape, String anchor, JsonNode ports, JsonNode inputs, JsonNode outputs,
                                   JsonNode selfTests, List<String> selfTestReport, JsonNode parts, String notes, String code,
                                   String js, List<String> problems, JsonNode size, JsonNode moving, JsonNode points) { }

    public record CheckInput(String reason) { }

    /** One part of the object as the drawer remembers its familiar look, before any code. */
    public record RealPart(String name, String realShape, String position, String proportion, String material, String details) { }

    /** {@code describe_real_object}: the familiar look of the object in detail (its look, size, every part, what the scene's viewpoint shows). */
    public record DescribeInput(String overall, String size, List<RealPart> parts, String viewNotes) { }

    public record DescribeOutput(boolean ok, List<String> problems, String next) { }

    static final int MIN_DESCRIBED_PARTS = 1;
    static final int MIN_OVERALL_CHARS = 60;
    static final int MIN_SHAPE_CHARS = 20;
    private static final int DESCRIBE_CALLS = 4;

    /** The accepted description of one run; the write gate opens once it is there. */
    private static final class Description {
        volatile DescribeInput accepted;
    }

    public record CheckOutput(boolean ok, List<String> problems, List<String> report) { }

    /**
     * What the last {@code check_object} of one run saw; the finish gate and the result both read it. {@code images} are the pictures of
     * that check (the judge reads them); {@code pending} are the same pictures until the model has been shown them once.
     */
    private static final class Checks {
        volatile int count;
        volatile boolean ok;
        volatile List<String> problems = List.of();
        volatile List<String> report = List.of();
        volatile String js;
        volatile JsonNode meta;
        volatile String fingerprint = "";
        volatile List<ToolImageSource.Image> images = List.of();
        volatile List<ToolImageSource.Image> pending = List.of();
    }

    /** How many times the judge may refuse {@code finish} before the object is accepted with a warning (so one object never stops an experiment). */
    static final int MAX_JUDGINGS = 3;

    /** The judge's side of one run: the criteria (fixed once), every verdict, and the version it passed. */
    private static final class Judging {
        DrawObjectJudge.Criteria criteria;
        int count;
        DrawObjectJudge.Verdict last;
        String passedFingerprint;
        String failure;
        final List<String> lines = new ArrayList<>();
    }

    private final AgentRunner runner;
    private final DrawObjectValidator validator;
    private final ObjectMapper mapper;
    private final Function<String, CodeStore> stores;
    private final AgentActivityPublisher activity;
    private final CodeDraftPublisher drafts;
    private final DrawObjectJudge judge;
    private final String system;
    private final String reasoningEffort;

    @Autowired
    public DrawObjectAgent(AiClient aiClient, DrawObjectValidator validator, ObjectMapper mapper, LiveCodeBridge bridge, AgentActivityPublisher activity,
                           @Value("${app.ai.openai.agent.draw-object-reasoning-effort:medium}") String reasoningEffort, CodeDraftPublisher drafts,
                           DrawObjectJudge judge) {
        this(aiClient, validator, mapper, runId -> new BridgedCodeStore(bridge, runId), activity, reasoningEffort, drafts, judge);
    }

    DrawObjectAgent(AiClient aiClient, DrawObjectValidator validator, ObjectMapper mapper, Function<String, CodeStore> stores, AgentActivityPublisher activity) {
        this(aiClient, validator, mapper, stores, activity, DEFAULT_REASONING_EFFORT);
    }

    DrawObjectAgent(AiClient aiClient, DrawObjectValidator validator, ObjectMapper mapper, Function<String, CodeStore> stores, AgentActivityPublisher activity,
                    String reasoningEffort) {
        this(aiClient, validator, mapper, stores, activity, reasoningEffort, null, null);
    }

    /** {@code judge} null means no judging: {@code finish} only needs a passing check, as before. */
    DrawObjectAgent(AiClient aiClient, DrawObjectValidator validator, ObjectMapper mapper, Function<String, CodeStore> stores, AgentActivityPublisher activity,
                    String reasoningEffort, CodeDraftPublisher drafts, DrawObjectJudge judge) {
        this.drafts = drafts;
        this.judge = judge;
        this.reasoningEffort = reasoningEffort == null || reasoningEffort.isBlank() ? null : reasoningEffort.trim();
        this.runner = new AgentRunner(aiClient);
        this.validator = validator;
        this.mapper = mapper;
        this.stores = stores;
        this.activity = activity == null ? AgentActivityPublisher.NONE : activity;
        try {
            this.system = new String(new ClassPathResource(AGENT_PATH).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Không đọc được " + AGENT_PATH, exception);
        }
    }

    /** {@code runId} is the live code session of the browser whose copy of the tree the agent works on. */
    public DrawObjectResult generate(DrawObjectRequest request, String runId) {
        return generate(request, runId, () -> stores.apply(runId));
    }

    /**
     * Same agent, same prompt, same check and same model, on a tree that is not the browser's: {@code store} (for example an
     * {@code OverlayCodeStore} over the template from the database). Used to draw one object with a fixed input without the page, e.g. to compare two
     * versions of the agent on the same object.
     */
    public DrawObjectResult generate(DrawObjectRequest request, String runId, CodeStore store) {
        return generate(request, runId, () -> store);
    }

    private DrawObjectResult generate(DrawObjectRequest request, String runId, java.util.function.Supplier<CodeStore> storeOf) {
        String stem = ExperimentNames.slugify(request.title()) + "-" + UUID.randomUUID().toString().substring(0, 4);
        String codePath = "_drawn/" + stem + ".ts";
        String notesPath = "_notes/draw-" + stem + ".md";
        Checks checks = new Checks();
        Judging judging = new Judging();
        AgentSteps steps = new AgentSteps(activity, runId, stem, request.title());
        steps.whole(AgentActivity.STARTED, true, "Agent bắt đầu vẽ vật");
        try {
            CodeStore store = storeOf.get();
            Description description = new Description();
            AgentSpec spec = new AgentSpec(system, task(request, codePath), "object", notesPath, Set.of(codePath), Set.of(), LIMITS, CONTINUATION_HINT,
                    List.of(describeTool(store, notesPath, description, request, steps), checkTool(store, codePath, checks, steps, request.geometry())),
                    MAX_CHECKS + DESCRIBE_CALLS, gate(store, codePath, checks, judging, request, steps),
                    steps, false, reasoningEffort, drafts == null ? null : drafts.streamer(runId, request.title(), codePath),
                    path -> description.accepted != null ? Optional.empty()
                            : Optional.of("DESCRIBE_FIRST: hãy gọi describe_real_object (tả chi tiết hình mẫu quen thuộc của vật) trước khi viết code"));
            long started = System.nanoTime();
            AgentRunner.Outcome outcome = runner.run(spec, store);
            log.info("DrawObjectAgent status={}, rounds={}, checks={}, ok={}, judgings={}, elapsedMs={}", outcome.status(), outcome.rounds(), checks.count, checks.ok,
                    judging.count, (System.nanoTime() - started) / 1_000_000);
            String code = store.read(codePath).orElse("");
            boolean passed = "finished".equals(outcome.status()) && checks.ok && checks.fingerprint.equals(fingerprint(code));
            steps.whole(AgentActivity.FINISHED, passed, passed ? "Đã vẽ xong" : outcome.failures().isEmpty() ? "Chưa xong" : "Chưa xong: " + outcome.failures().getLast());
            String notes = readNotes(store, notesPath);
            if (passed) {
                List<String> report = new ArrayList<>(judging.lines);
                report.addAll(checks.report);
                return result(request, checks.meta, code, notes, "ok", Math.max(1, checks.count), report, checks.js, List.of());
            }
            List<String> problems = new ArrayList<>(checks.problems);
            problems.addAll(outcome.failures());
            if (problems.isEmpty()) problems.add("Agent chưa xong sau " + outcome.rounds() + " lượt: chưa có lần check_object nào qua trên bản cuối.");
            return result(request, checks.meta, code, notes, "failed", Math.max(1, checks.count), List.of(), null, problems);
        } catch (RuntimeException exception) {
            log.warn("DrawObjectAgent failed: {}", exception.getMessage());
            steps.whole(AgentActivity.FINISHED, false, "Agent không chạy được: " + exception.getMessage());
            return result(request, null, "", null, "failed", Math.max(1, checks.count), List.of(), null, List.of("Agent không chạy được: " + exception.getMessage()));
        }
    }

    private static String task(DrawObjectRequest request, String codePath) {
        return "# Nhiệm vụ\nVẽ MỘT vật thể. Luật về hình: phải đẹp và giống thật"
                + (request.style().isEmpty() ? "" : ", theo phong cách đã chốt với giáo viên") + ".\n\n# Mô tả (tham khảo)\n\nVật thể: " + request.title() + "\n" + request.request()
                + (request.hint() == null || request.hint().isBlank() ? "" : "\n\nGợi ý giao diện (chỉ để tham khảo, bạn tự quyết): " + request.hint())
                + styleSection(request.style())
                + frameSection(request.frame())
                + geometrySection(request.geometry())
                + viewSection(request.view())
                + "\n\n## File được giao (chỉ ghi được file này)\n- " + codePath
                + "\n\nNhớ: BẮT ĐẦU bằng `describe_real_object` (hệ thống từ chối ghi code trước đó), rồi code theo khung và mô tả của bạn, gọi `check_object` "
                + "sau mỗi lần sửa, và gọi `finish` khi hình đã giống hình mẫu của vật.";
    }

    /** The look the teacher chose when the lite spec asked back; it sets how real, how flat and how detailed the figure is. */
    static String styleSection(String style) {
        if (style == null || style.isBlank()) return "";
        return "\n\n## Phong cách hình đã chốt với giáo viên (BẮT BUỘC)\n" + style.trim()
                + "\nVẽ theo đúng phong cách này thay cho \"giống thật hết mức\"; khung, tỉ lệ và góc nhìn vẫn giữ như dưới đây.";
    }

    /** The frame the spec step wrote: the visible parts of the object, where they sit and how big they are. */
    static String frameSection(List<LiteSpecAgent.FramePart> frame) {
        if (frame == null || frame.isEmpty()) return "";
        StringBuilder out = new StringBuilder("\n\n## Khung của vật (BẮT BUỘC có đủ các bộ phận này, mỗi bộ phận một hình riêng)\n");
        for (LiteSpecAgent.FramePart p : frame)
            out.append("- **").append(p.name()).append("**: ").append(p.shape()).append("; ").append(p.position()).append("; ").append(p.proportion()).append("\n");
        return out.append("Được thêm bộ phận ngoài khung nếu hình mẫu của vật có, để hình giống hơn.").toString();
    }

    /**
     * What is missing from a description of the object's familiar look: too short a look, no size or viewpoint, too few parts, a part without its
     * outline, position or proportion, or a part of the frame that the description leaves out. Empty means accepted.
     */
    static List<String> describeProblems(DescribeInput input, List<LiteSpecAgent.FramePart> frame) {
        if (input == null) return List.of("thiếu nội dung mô tả");
        List<String> problems = new ArrayList<>();
        int wantedParts = Math.max(MIN_DESCRIBED_PARTS, frame == null ? 0 : frame.size());
        if (blank(input.overall()) || input.overall().strip().length() < MIN_OVERALL_CHARS)
            problems.add("overall: tả hình mẫu quen thuộc của vật trông thế nào (dáng chung, phong cách, màu, cảm giác), ít nhất " + MIN_OVERALL_CHARS + " ký tự");
        if (blank(input.size())) problems.add("size: kích thước của vật (thật, hay cỡ mô hình đã ghi) và tỉ lệ của các khối chính");
        if (blank(input.viewNotes())) problems.add("viewNotes: nhìn từ góc nhìn của cảnh thì thấy mặt nào, bộ phận nào che bộ phận nào");
        List<RealPart> parts = input.parts() == null ? List.of() : input.parts();
        if (parts.size() < wantedParts)
            problems.add("parts: có " + parts.size() + " bộ phận, cần ít nhất " + wantedParts + " (mọi bộ phận của khung, thêm bộ phận khác nếu hình mẫu có)");
        for (RealPart part : parts) {
            if (part == null || blank(part.name())) { problems.add("parts: có bộ phận không tên"); continue; }
            String name = part.name().strip();
            if (blank(part.realShape()) || part.realShape().strip().length() < MIN_SHAPE_CHARS)
                problems.add("bộ phận '" + name + "': realShape phải tả đường bao thật (bo, vát, cong, thuôn ở đâu), ít nhất " + MIN_SHAPE_CHARS + " ký tự");
            if (blank(part.position()) || blank(part.proportion()))
                problems.add("bộ phận '" + name + "': cần đủ position (ở đâu, nối vào đâu) và proportion (to nhỏ so với cả vật)");
        }
        if (frame != null) for (LiteSpecAgent.FramePart wanted : frame) {
            String key = wanted.name().strip().toLowerCase();
            boolean covered = parts.stream().filter(p -> p != null && !blank(p.name())).map(p -> p.name().strip().toLowerCase())
                    .anyMatch(name -> name.contains(key) || key.contains(name));
            if (!covered) problems.add("thiếu bộ phận '" + wanted.name() + "' của khung");
        }
        return problems;
    }

    private static boolean blank(String text) { return text == null || text.isBlank(); }

    /** The description as notes: the renderer and the teacher read what the drawer meant to draw. */
    static String describeNote(DescribeInput input) {
        StringBuilder out = new StringBuilder("\n## Hình mẫu của vật (người vẽ tả trước khi code)\n").append(input.overall().strip())
                .append("\n- Kích thước: ").append(input.size().strip()).append("\n- Góc nhìn: ").append(input.viewNotes().strip()).append("\n");
        for (RealPart p : input.parts())
            out.append("- **").append(p.name().strip()).append("**: ").append(p.realShape().strip()).append("; ").append(p.position().strip()).append("; ")
                    .append(p.proportion().strip()).append(blank(p.material()) ? "" : "; " + p.material().strip())
                    .append(blank(p.details()) ? "" : "; " + p.details().strip()).append("\n");
        return out.toString();
    }

    private ToolCallback describeTool(CodeStore store, String notesPath, Description description, DrawObjectRequest request, AgentSteps steps) {
        return ToolSchemaLock.build(() -> FunctionToolCallback.builder("describe_real_object", (Function<DescribeInput, DescribeOutput>) input -> {
                    steps.tool("describe_real_object", AgentActivity.STARTED, true, "Tả hình mẫu của vật");
                    List<String> problems = describeProblems(input, request.frame());
                    if (problems.isEmpty()) {
                        description.accepted = input;
                        try {
                            store.appendNote(notesPath, describeNote(input));
                        } catch (RuntimeException unwritable) {
                            log.warn("DrawObjectAgent could not note the description: {}", unwritable.getMessage());
                        }
                    }
                    steps.tool("describe_real_object", AgentActivity.FINISHED, problems.isEmpty(),
                            problems.isEmpty() ? "Đã tả hình mẫu của vật" : problems.size() + " chỗ thiếu: " + problems.getFirst());
                    return new DescribeOutput(problems.isEmpty(), problems, problems.isEmpty()
                            ? "Giờ code theo đúng mô tả này: mỗi bộ phận một hình riêng với đường bao như đã tả, đúng vị trí và tỉ lệ đã tả."
                            : "Bổ sung đúng các chỗ thiếu rồi gọi lại describe_real_object.");
                })
                .description("FIRST step, before any code: describe the familiar look of the object in detail and in Vietnamese: the real thing "
                        + "as it looks in real life, or, for what cannot be photographed (a particle, nucleus, atom, molecule), the usual scientific "
                        + "illustration. Input: {overall: its overall look (silhouette, style, colours), size: its size (real, or the model size the task "
                        + "fixed) and the proportions of its main blocks, parts: [{name, realShape: the outline of the part (where it is rounded, chamfered, "
                        + "curved, tapered), position: where it sits and what it joins, proportion: how big it is against the whole, material: optional, "
                        + "material, colour and how it catches light, details: the small details that make it recognisable}], viewNotes: what the scene's "
                        + "viewpoint shows and hides}. A simple object may have a single part. Every part of the task's frame must be in parts. Writing code is refused until a description is accepted; you may call it again to improve it.")
                .inputType(DescribeInput.class)
                .build());
    }

    /** The viewpoint of the whole scene, firm like the geometry: every object of the experiment is drawn one by one, yet they share one scene. */
    private static String viewSection(String view) {
        if (view == null || view.isBlank()) return "";
        return "\n\n## Góc nhìn chung của cả cảnh (BẮT BUỘC)\n" + view
                + "\nCác vật khác của thí nghiệm được vẽ riêng nhưng theo đúng góc nhìn này rồi ghép vào cùng một cảnh, nên vật của bạn PHẢI vẽ theo đúng góc nhìn này, "
                + "kể cả khi một góc khác trông quen hơn hay đẹp hơn (ví dụ một lá mỏng nằm vuông góc với mặt phẳng hình thì vẽ thành vạch mảnh nhìn từ cạnh, không vẽ chính diện). "
                + "Mọi bộ phận của vật cũng dùng cùng góc nhìn và cùng một kiểu phối cảnh.";
    }

    /** The geometry the scenario fixed: size, anchor, named points and moving parts; check_object measures the figure against it. */
    static String geometrySection(ScenarioAgent.ObjectGeometry g) {
        if (g == null) return "";
        StringBuilder out = new StringBuilder("\n\n## Hình học của vật (BẮT BUỘC; check_object đo đúng các số này)\n")
                .append("- Kích thước trên mặt phẳng hình: rộng ").append(number(g.width())).append(" m, cao ").append(number(g.height()))
                .append(" m. Mọi độ dài trong code = mét × `ppm`, nên khung bao của hình phải là ").append(number(g.width())).append("·ppm × ")
                .append(number(g.height())).append("·ppm (sai lệch tối đa 20%).\n")
                .append("- Điểm neo (gốc (0,0) của `group`): ")
                .append(g.anchor().isBlank() ? "TÂM HÌNH BAO. Vật này không có điểm neo riêng, nên đặt gốc (0,0) ở giữa hình: "
                        + "hình trải đều quanh gốc, mỗi phía khoảng một nửa kích thước" : g.anchor()).append(".\n");
        if (g.points().isEmpty()) out.append("- Điểm có tên: không có (trả `points: {}`).\n");
        else {
            out.append("- Điểm có tên, trả trong `points` bằng toạ độ cục bộ px, nằm trên hình:\n");
            for (ScenarioAgent.NamedPoint p : g.points()) out.append("  - `").append(p.name()).append("`: ").append(p.description()).append("\n");
        }
        if (g.parts().isEmpty()) out.append("- Bộ phận chuyển động: KHÔNG CÓ. Vật vẽ đứng yên trọn vẹn (trả `parts: {}`); nếu cả vật di chuyển thì đó là việc của engine, không phải của bạn.\n");
        else {
            out.append("- Bộ phận chuyển động, mỗi cái một `Konva.Group` con riêng trong `parts` (bạn KHÔNG viết code cho nó chạy; engine đưa số, cảnh dời nhóm con):\n");
            for (ScenarioAgent.MovingPart p : g.parts()) {
                out.append("  - `").append(p.name()).append("`: ");
                if ("slide".equals(p.motion())) out.append("trượt theo hướng `").append(p.axis()).append("` từ ").append(number(p.min())).append(" đến ")
                        .append(number(p.max())).append(" m tính từ vị trí nghỉ; gốc nhóm con đặt ở vị trí nghỉ, và phần bao quanh phải đủ chỗ cho cả hành trình");
                else out.append("quay từ ").append(number(p.min())).append(" đến ").append(number(p.max()))
                        .append(" độ; gốc nhóm con đặt ĐÚNG tâm khớp quay");
                out.append(p.description().isBlank() ? "" : " (" + p.description() + ")").append(". Khai báo `{ node, motion: \"").append(p.motion()).append("\"")
                        .append("slide".equals(p.motion()) ? ", axis: \"" + p.axis() + "\"" : "").append(", min: ").append(number(p.min())).append(", max: ")
                        .append(number(p.max())).append(" }`.\n");
            }
        }
        return out.append("Vật không có vật lý: không `inputs`, `set`, `get`, `read`, không thời gian, vận tốc, khối lượng hay lực; không đổi vị trí của `group` sau khi dựng.").toString();
    }

    private static String number(double value) {
        return java.math.BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    private ToolCallback checkTool(CodeStore store, String codePath, Checks checks, AgentSteps steps, ScenarioAgent.ObjectGeometry geometry) {
        ToolCallback callback = ToolSchemaLock.build(() -> FunctionToolCallback.builder("check_object", (Function<CheckInput, CheckOutput>) input -> {
                    steps.tool("check_object", AgentActivity.STARTED, true, "Chạy thử code");
                    CheckOutput output = check(store, codePath, checks, geometry);
                    steps.tool("check_object", AgentActivity.FINISHED, output.ok(),
                            output.ok() ? "Chạy được" : output.problems().size() + " lỗi: " + (output.problems().isEmpty() ? "" : output.problems().getFirst()));
                    return output;
                })
                .description("Run your file as it is now: whether it compiles, runs and draws something, and, when the task fixes a geometry, whether the figure "
                        + "has the fixed size (it is built at two scales and measured), the named points and the moving parts as separate child groups. "
                        + "It also returns PICTURES of the figure as built (at rest, and with every moving part at its maximum): LOOK at them and judge "
                        + "yourself whether it looks like the real thing. Input: {reason}: optional. Returns {ok, problems, report} and the pictures. "
                        + "Call it after every change; finish is only accepted when the last check passed on the file you hold now, and then an "
                        + "independent judge looks at the pictures.")
                .inputType(CheckInput.class)
                .build());
        return new ImageAttachingToolCallback(callback, checks);
    }

    /** {@code check_object} as the model sees it: the text result plus the pictures of the figure, each shown once. */
    private record ImageAttachingToolCallback(ToolCallback delegate, Checks checks) implements ToolCallback, ToolImageSource {
        @Override public org.springframework.ai.tool.definition.ToolDefinition getToolDefinition() { return delegate.getToolDefinition(); }
        @Override public String call(String input) { return delegate.call(input); }
        @Override public String call(String input, org.springframework.ai.chat.model.ToolContext context) { return delegate.call(input, context); }
        @Override public List<Image> takeImages() {
            List<Image> images = checks.pending;
            checks.pending = List.of();
            return images;
        }
    }

    private synchronized CheckOutput check(CodeStore store, String codePath, Checks checks, ScenarioAgent.ObjectGeometry geometry) {
        checks.count++;
        String code = store.read(codePath).orElse(null);
        if (code == null || code.isBlank()) return remember(checks, false, List.of("Chưa có file " + codePath + "."), List.of(), null, null, "", List.of());
        ObjectNode answer = mapper.createObjectNode();
        answer.put("code", code);
        if (geometry != null) answer.set("geometry", mapper.valueToTree(geometry));
        DrawObjectValidator.Validation checked = validator.validate(answer);
        boolean ok = checked.problems().isEmpty();
        return remember(checks, ok, checked.problems(), checked.report(), ok ? checked.js() : null, checked.meta(), fingerprint(code), checked.images());
    }

    private static CheckOutput remember(Checks checks, boolean ok, List<String> problems, List<String> report, String js, JsonNode meta, String fingerprint,
                                        List<ToolImageSource.Image> images) {
        checks.ok = ok;
        checks.problems = List.copyOf(problems);
        checks.report = List.copyOf(report);
        checks.js = js;
        checks.meta = meta;
        checks.fingerprint = fingerprint;
        checks.images = List.copyOf(images);
        checks.pending = checks.images;
        return new CheckOutput(ok, checks.problems, checks.report);
    }

    /**
     * {@code finish} needs a passing check of exactly the file the agent holds now, and then (when there is a judge) the judge's pass on the
     * pictures of that check. The judge may refuse at most {@link #MAX_JUDGINGS} times; after that, or when it cannot run, the object is
     * accepted and the result says so, because one object must never stop the whole experiment.
     */
    private CodeSession.FinishGate gate(CodeStore store, String codePath, Checks checks, Judging judging, DrawObjectRequest request, AgentSteps steps) {
        return session -> {
            if (!checks.ok) return Optional.of(checks.count == 0 ? "chưa gọi check_object lần nào" : "lần check_object gần nhất còn lỗi, hãy sửa rồi kiểm tra lại");
            if (!checks.fingerprint.equals(fingerprint(store.read(codePath).orElse("")))) return Optional.of("bạn đã sửa file sau lần check_object gần nhất: hãy gọi check_object trên bản hiện tại");
            if (judge == null || checks.fingerprint.equals(judging.passedFingerprint) || judging.failure != null) return Optional.empty();
            if (judging.count >= MAX_JUDGINGS) return Optional.empty();
            if (checks.images.isEmpty()) {
                judging.lines.add("⚠ giám khảo không chấm được: lần check cuối không dựng được ảnh");
                judging.failure = "no image";
                return Optional.empty();
            }
            return judgeLatest(checks, judging, request, steps);
        };
    }

    private Optional<String> judgeLatest(Checks checks, Judging judging, DrawObjectRequest request, AgentSteps steps) {
        steps.tool("judge", AgentActivity.STARTED, true, "Giám khảo chấm hình");
        DrawObjectJudge.Verdict verdict;
        try {
            if (judging.criteria == null) judging.criteria = judge.criteria(request);
            verdict = judge.judge(request, judging.criteria, checks.images);
        } catch (RuntimeException failure) {
            log.warn("DrawObjectAgent judge failed: {}", failure.getMessage());
            judging.failure = failure.getMessage();
            judging.lines.add("⚠ giám khảo không chạy được: " + failure.getMessage());
            steps.tool("judge", AgentActivity.FINISHED, false, "Giám khảo không chạy được");
            return Optional.empty();
        }
        judging.count++;
        judging.last = verdict;
        String first = verdict.defects().isEmpty() ? "" : " — " + verdict.defects().getFirst();
        judging.lines.add("giám khảo lần " + judging.count + ": " + verdict.score() + "/10, " + (verdict.pass() ? "qua" : "chưa qua") + first);
        steps.tool("judge", AgentActivity.FINISHED, verdict.pass(), "Giám khảo: " + verdict.score() + "/10" + (verdict.pass() ? ", qua" : ", chưa qua"));
        if (verdict.pass()) {
            judging.passedFingerprint = checks.fingerprint;
            return Optional.empty();
        }
        if (judging.count >= MAX_JUDGINGS) {
            judging.lines.add("⚠ giám khảo chưa cho qua sau " + MAX_JUDGINGS + " lần chấm (điểm cuối " + verdict.score() + "/10): vật vẫn được nhận để thí nghiệm đi tiếp; "
                    + String.join("; ", verdict.defects().stream().limit(3).toList()));
            return Optional.empty();
        }
        StringBuilder refusal = new StringBuilder("giám khảo độc lập xem ảnh và chấm ").append(verdict.score()).append("/10, chưa đạt. ")
                .append(verdict.summary()).append("\nLỗi cần sửa:");
        for (int i = 0; i < verdict.defects().size(); i++) refusal.append("\n").append(i + 1).append(". ").append(verdict.defects().get(i));
        refusal.append("\nSửa đúng từng lỗi đó bằng edit_file, gọi check_object rồi finish lại. Còn ").append(MAX_JUDGINGS - judging.count).append(" lần chấm.");
        return Optional.of(refusal.toString());
    }

    private static String readNotes(CodeStore store, String notesPath) {
        try {
            return store.read(notesPath).map(String::strip).filter(text -> !text.isEmpty()).orElse(null);
        } catch (RuntimeException unreadable) {
            return null;
        }
    }

    private static String fingerprint(String code) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    /** What the code declared becomes the fields the gallery shows; a figure that declares nothing has empty lists. */
    private DrawObjectResult result(DrawObjectRequest request, JsonNode meta, String code, String notes, String status, int attempts, List<String> report, String js, List<String> problems) {
        JsonNode node = meta == null ? mapper.createObjectNode() : meta;
        String name = node.path("name").isTextual() ? node.path("name").asText() : null;
        String anchor = request.geometry() == null ? null : request.geometry().anchor();
        return new DrawObjectResult(1, request.title(), request.request(), request.hint(), "lite", status, attempts,
                name, null, anchor, list(node, "ports"), list(node, "inputs"), list(node, "outputs"),
                mapper.createArrayNode(), report, mapper.createArrayNode(), notes, code == null || code.isBlank() ? null : code, js, problems,
                node.path("size").isObject() ? node.path("size") : null, list(node, "moving"), list(node, "points"));
    }

    private JsonNode list(JsonNode node, String field) {
        return node.path(field).isArray() ? node.path(field) : mapper.createArrayNode();
    }

    /** Providers that ignore a non-strict schema may still wrap the object in a markdown fence or prose: take the object out. */
    static String extractJson(String raw) {
        String text = raw == null ? "" : raw.trim();
        int first = text.indexOf('{');
        int last = text.lastIndexOf('}');
        return first >= 0 && last > first ? text.substring(first, last + 1) : text;
    }
}
