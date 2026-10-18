package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.service.agent.impl.ScenarioAgent;
import com.neviad.beneviadsystem.service.agent.draft.CodeDraftPublisher;
import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeBridge;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Runs the code agent of ONE layer on the copy of {@code neviadlike_structure} that the browser holds. This class only knows what is
 * specific to an experiment (the three layers, the names derived from the slug, the scenario and the drawn objects, the prompts) and
 * builds the {@link AgentSpec}; the agent itself (tools, rounds, ledger) is {@link AgentRunner}.
 */
@Service
public class CodeAgentService {
    static final int MAX_ROUNDS = AgentRunner.MAX_ROUNDS;
    private static final String CONTINUATION_HINT = "Hãy đọc lại các file engine đã ghi để biết chúng đang ra sao, sửa chỗ còn thiếu hoặc sai bằng `edit_file`, ghi chú nếu chưa, rồi `finish`.";
    /** The samples of the engine layer; kept here because the tests name them. */
    static final List<String> TEMPLATE_FILES = CodeLayer.ENGINE_TEMPLATES;

    /**
     * One drawn object: where its code is and what its drawer noted. Its geometry (size, anchor, points, moving parts) is not here: it is in the
     * scenario's {@code objectGeometry}, the one source every layer reads.
     */
    public record ObjectInfo(String id, String title, String file, String functionName, String notes) { }

    public record Request(String runId, String slug, String request, ScenarioAgent.Scenario scenario, List<ObjectInfo> objects) { }

    /** {@code status} is {@code "finished"} only when the session says so; {@code files} are the files the agent wrote. */
    public record Result(String status, int rounds, String summary, String ledger, String notesPath, List<String> files, List<String> failures) {
        public Result(String status, int rounds, String summary, String ledger, String notesPath, List<String> files) { this(status, rounds, summary, ledger, notesPath, files, List.of()); }
    }

    private final AgentRunner runner;
    private final Function<String, CodeStore> stores;
    private final AgentActivityPublisher activity;
    private final CodeDraftPublisher drafts;
    private final Map<CodeLayer, String> prompts = new EnumMap<>(CodeLayer.class);

    @Autowired
    public CodeAgentService(AiClient aiClient, LiveCodeBridge bridge, AgentActivityPublisher activity, CodeDraftPublisher drafts) {
        this(aiClient, runId -> new BridgedCodeStore(bridge, runId), activity, drafts);
    }

    CodeAgentService(AiClient aiClient, Function<String, CodeStore> stores) {
        this(aiClient, stores, AgentActivityPublisher.NONE, null);
    }

    CodeAgentService(AiClient aiClient, Function<String, CodeStore> stores, AgentActivityPublisher activity) {
        this(aiClient, stores, activity, null);
    }

    CodeAgentService(AiClient aiClient, Function<String, CodeStore> stores, AgentActivityPublisher activity, CodeDraftPublisher drafts) {
        this.runner = new AgentRunner(aiClient);
        this.stores = stores;
        this.activity = activity == null ? AgentActivityPublisher.NONE : activity;
        this.drafts = drafts;
        for (CodeLayer layer : CodeLayer.values()) {
            try {
                prompts.put(layer, new String(new ClassPathResource(layer.promptResource()).getInputStream().readAllBytes(), StandardCharsets.UTF_8));
            } catch (IOException exception) {
                throw new UncheckedIOException("Không đọc được " + layer.promptResource(), exception);
            }
        }
    }

    public Result runEngine(Request request) { return run(CodeLayer.ENGINE, request); }

    public Result run(CodeLayer layer, Request request) {
        ExperimentNames names = ExperimentNames.of(request.slug());
        CodeStore store = stores.apply(request.runId());
        String notesPath = SourceStore.NOTES_DIR + names.slug() + ".md";
        // Only files that exist: a sample missing from the copy must not block the layer for good.
        List<String> objectFiles = request.objects().stream().map(ObjectInfo::file).filter(f -> f != null && !f.isBlank() && store.exists(f)).toList();
        List<String> mustRead = new ArrayList<>(layer.mustRead(names, objectFiles).stream().filter(store::exists).toList());
        List<String> writable = layer.writable(names, objectFiles);
        AgentSteps steps = new AgentSteps(activity, request.runId(), layer.label(), layer.title());
        AgentSpec spec = new AgentSpec(fill(prompts.get(layer), names), task(layer, request, names, writable, mustRead), layer.label(), notesPath,
                Set.copyOf(writable), Set.copyOf(mustRead), CodeSession.Limits.defaults(), CONTINUATION_HINT, null, 0, null, steps, true, null,
                drafts == null ? null : drafts.streamer(request.runId()));
        steps.whole(AgentActivity.STARTED, true, "Agent bắt đầu viết tầng " + layer.title());
        AgentRunner.Outcome outcome = runner.run(spec, store);
        steps.whole(AgentActivity.FINISHED, "finished".equals(outcome.status()), "finished".equals(outcome.status()) ? "Đã xong" : outcome.failures().isEmpty() ? "Chưa xong" : "Chưa xong: " + outcome.failures().getLast());
        return new Result(outcome.status(), outcome.rounds(), outcome.summary(), outcome.ledger(), outcome.notesPath(), outcome.files(), outcome.failures());
    }

    private static String fill(String template, ExperimentNames names) {
        return template.replace("{{SLUG}}", names.slug()).replace("{{PASCAL}}", names.pascal()).replace("{{CAMEL}}", names.camel())
                .replace("{{SNAKE}}", names.snake());
    }

    private static String task(CodeLayer layer, Request request, ExperimentNames names, List<String> writable, List<String> mustRead) {
        StringBuilder out = new StringBuilder("# Nhiệm vụ\nViết tầng ").append(layer.title()).append(" của thí nghiệm `").append(names.slug()).append("`.\n");
        if (layer.hasEarlierLayers()) {
            out.append("Các tầng trước đã xong và nằm trong bản sao; ghi chú của chúng ở `").append(SourceStore.NOTES_DIR).append(names.slug())
                    .append(".md` (đọc nó trước, rồi đọc code của tầng trước khi cần).\n");
        }
        out.append("\n");
        out.append("## Yêu cầu của giáo viên\n").append(request.request()).append("\n\n");
        ScenarioAgent.Scenario scenario = request.scenario();
        out.append("## Kịch bản (nguồn của công thức và diễn tiến; bạn tự dịch ra code)\n");
        out.append("Tóm tắt: ").append(scenario.summary()).append("\n");
        section(out, "Công thức", scenario.formulas());
        out.append("Diễn tiến:\n");
        for (int i = 0; i < scenario.phases().size(); i++) {
            out.append("  ").append(i + 1).append(". ").append(scenario.phases().get(i).name()).append(": ").append(scenario.phases().get(i).description()).append("\n");
        }
        out.append("Bố cục: ").append(scenario.layout()).append("\n");
        if (!scenario.view().isBlank()) out.append("Góc nhìn: ").append(scenario.view()).append("\n");
        section(out, "Học sinh chỉnh", scenario.adjustable());
        section(out, "Học sinh quan sát", scenario.observable());
        section(out, "Giả định", scenario.assumptions());
        section(out, "Ví dụ tính bằng số của kịch bản (ca kiểm; kết quả do máy tính từ biểu thức, engine PHẢI cho đúng với các tham số tương ứng)",
                scenario.workedExamples().stream().map(x -> x.text() + " → " + formatValue(x.value()) + (x.unit().isBlank() ? "" : " " + x.unit()) + "  [biểu thức: " + x.expression() + "]").toList());
        phenomena(out, scenario, layer);
        out.append("\n## Các vật và hình học chung của cảnh (do kịch bản chốt; MỌI tầng dùng đúng các số này, không tầng nào tự đặt số khác)\n");
        out.append("Vật KHÔNG có vật lý: hàm dựng `(p, ppm, fill, label)` vẽ vật đúng kích thước bằng mét × `ppm`, gốc nhóm là điểm neo, và trả "
                + "`{ group, parts, points }` (xem `objects/types.ts`, kiểu `ShapeObject`). Vị trí của vật trong thế giới và tư thế của từng bộ phận do engine cấp.\n");
        out.append(switch (layer) {
            case ENGINE -> "Engine báo vị trí ĐIỂM NEO của mỗi vật bằng mét và giá trị của mỗi bộ phận; mọi tương tác (chạm, tiếp xúc, phát hạt) tính bằng kích thước và các điểm dưới đây.\n";
            case RENDERER -> "Code của vật là BẢN THAM KHẢO do người vẽ làm trước khi có engine: bạn được sửa hay viết lại nó (file của vật nằm trong danh sách file được giao), "
                    + "kể cả chọn lại điểm neo nếu cần (ghi rõ vào note và engine phải cùng hiểu), nhưng PHẢI giữ đúng kích thước, tên các bộ phận và tên các điểm dưới đây. "
                    + "Bỏ khỏi vật những thứ thuộc cảnh động (hạt, tia, chấm sáng, đường đi, số liệu vẽ cứng): engine sinh ra chúng, cảnh vẽ lại chúng từ `metrics`.\n";
            case EXPERIMENT -> "Vật và cảnh đã xong ở hai tầng trước.\n";
        });
        Map<String, ScenarioAgent.ObjectGeometry> geometry = new java.util.HashMap<>();
        for (ScenarioAgent.ObjectGeometry g : scenario.objectGeometry()) geometry.put(g.objectId(), g);
        for (ObjectInfo object : request.objects()) {
            out.append("- id `").append(object.id()).append("`: ").append(object.title()).append(" (file `").append(object.file()).append("`, hàm `")
                    .append(object.functionName()).append("`)\n");
            ScenarioAgent.ObjectGeometry g = geometry.get(object.id());
            if (g != null) {
                out.append("  Kích thước: rộng ").append(plain(g.width())).append(" m, cao ").append(plain(g.height())).append(" m. Điểm neo: ")
                        .append(g.anchor().isBlank() ? "tâm hình bao (vật không có điểm neo riêng)" : g.anchor()).append("\n");
                for (ScenarioAgent.NamedPoint p : g.points()) out.append("  Điểm `").append(p.name()).append("`: ").append(p.description()).append("\n");
                for (ScenarioAgent.MovingPart p : g.parts()) out.append("  Bộ phận `").append(p.name()).append("`: ")
                        .append("slide".equals(p.motion()) ? "trượt theo hướng " + p.axis() + ", từ " + plain(p.min()) + " đến " + plain(p.max()) + " m"
                                : "quay quanh khớp của nó, từ " + plain(p.min()) + " đến " + plain(p.max()) + " độ")
                        .append(" tính từ vị trí nghỉ").append(p.description().isBlank() ? "" : " (" + p.description() + ")").append("\n");
                if (g.parts().isEmpty()) out.append("  Không có bộ phận chuyển động bên trong.\n");
            }
            if (object.notes() != null && !object.notes().isBlank()) out.append("  Ghi chú của người vẽ: ").append(object.notes()).append("\n");
        }
        out.append("\n## File được giao (chỉ ghi được các file này)\n").append(String.join("\n", writable.stream().map(f -> "- " + f).toList())).append("\n");
        out.append("\n## File phải đọc trước khi ghi\n").append(String.join("\n", mustRead.stream().map(f -> "- " + f).toList())).append("\n");
        out.append("\nNhớ: ghi ít nhất một ghi chú bằng `append_note`, rồi gọi `finish`.");
        return out.toString();
    }

    /**
     * What the experiment produces over time and no object owns. The engine emits it through {@code metrics.items} each frame and the scene
     * draws it; without this section neither layer knows the thing has a name.
     */
    private static void phenomena(StringBuilder out, ScenarioAgent.Scenario scenario, CodeLayer layer) {
        if (scenario.phenomena().isEmpty()) return;
        out.append("\n## Hiện tượng thí nghiệm tạo ra (KHÔNG phải bộ phận của vật nào)\n");
        for (ScenarioAgent.Phenomenon p : scenario.phenomena()) {
            out.append("- `").append(p.name()).append("`: ").append(p.description());
            if (!p.from().isBlank()) out.append(" Ra từ điểm `").append(p.from()).append("` của vật.");
            if (!p.appearance().isBlank()) out.append(" Trông như: ").append(p.appearance());
            out.append("\n");
        }
        out.append(switch (layer) {
            case ENGINE -> "Đây là trạng thái của engine: bạn sinh ra, cho chúng chuyển động, cho mất đi, và đưa ra qua `metrics.items` "
                    + "(mỗi phần tử có `kind` đúng bằng tên ở trên). Số lượng thay đổi theo thời gian; rỗng khi chưa có gì.\n";
            case RENDERER -> "Engine đưa chúng ra qua `metrics.items`. Mỗi khung hình bạn đọc danh sách đó và vẽ, dùng `drawItems` "
                    + "(`shared/draw-items.ts`). Cảnh KHÔNG được đứng yên như một bức hình khi kịch bản có hiện tượng.\n";
            case EXPERIMENT -> "Engine và cảnh đã lo phần này ở hai tầng trước.\n";
        });
    }

    /** A size or range as written: 2 not 2.000, 0.05 not 5.000e-02. */
    private static String plain(double value) {
        return java.math.BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    private static String formatValue(double value) {
        return String.format(java.util.Locale.ROOT, Math.abs(value) >= 0.01 && Math.abs(value) < 100000 ? "%.4g" : "%.4e", value);
    }

    private static void section(StringBuilder out, String title, List<String> items) {
        if (items == null || items.isEmpty()) return;
        out.append(title).append(":\n");
        for (String item : items) out.append("  - ").append(item).append("\n");
    }
}
