package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * One call before the lite flow: is what the teacher asks for already one of the ready-made experiments of the library
 * ({@code /mo-phong-vat-ly})? The catalog comes with the request (the frontend owns the presets); the answer is up to
 * {@link #MAX_MATCHES} of its ids, best first, matched on meaning rather than wording. None means the lite flow builds a new one.
 */
@Service
public class ExperimentMatchAgent {
    private static final Logger log = LoggerFactory.getLogger(ExperimentMatchAgent.class);
    static final int MAX_ATTEMPTS = 3;
    static final int MAX_MATCHES = 3;

    private static final String INSTRUCTIONS = """
            Bạn đối chiếu yêu cầu của một giáo viên vật lý phổ thông Việt Nam với THƯ VIỆN các thí nghiệm mô phỏng đã làm sẵn, để xem điều họ muốn có sẵn rồi không. Trả JSON {"matches":[{"id","reason"}]}.
            - Chọn một thí nghiệm khi điều giáo viên muốn về cơ bản LÀ thí nghiệm đó: cùng hiện tượng và cùng cách bố trí chính (cùng dụng cụ, cùng điều học sinh quan sát). So theo NGHĨA, không cần trùng chữ: cách nói khác, tả dụng cụ thay vì gọi tên, nêu mục tiêu bài học hay đại lượng muốn đổi đều tính.
            - KHÔNG chọn thí nghiệm chỉ cùng chủ đề hay cùng chương mà khác hiện tượng hoặc khác bố trí (ví dụ yêu cầu về con lắc lò xo thì không chọn con lắc đơn).
            - Tối đa 3, xếp theo mức khớp giảm dần; chỉ đưa thêm thí nghiệm thứ hai, thứ ba khi chúng cũng khớp thật. Không có thí nghiệm nào khớp thì matches = [].
            - id: đúng như trong mục lục. reason: một câu ngắn tiếng Việt nói vì sao thí nghiệm đó đúng là điều giáo viên muốn.

            MỤC LỤC THƯ VIỆN (id | tên | lĩnh vực | lớp | mô tả | mục tiêu):
            """;

    /** One experiment of the library, as the frontend sends it. */
    public record CatalogEntry(String id, String title, String domain, int grade, String desc, String objective) { }

    public record Match(String id, String reason) { }

    public record MatchResult(List<Match> matches) {
        public MatchResult {
            matches = matches == null ? List.of() : List.copyOf(matches);
        }
    }

    private final AiClient aiClient;
    private final ObjectMapper mapper;

    public ExperimentMatchAgent(AiClient aiClient, ObjectMapper mapper) {
        this.aiClient = aiClient;
        this.mapper = mapper;
    }

    public MatchResult match(String teacherRequest, List<CatalogEntry> catalog) {
        Map<String, CatalogEntry> byId = catalog.stream().filter(e -> e.id() != null && !e.id().isBlank())
                .collect(Collectors.toMap(e -> e.id().trim(), Function.identity(), (first, second) -> first, java.util.LinkedHashMap::new));
        // The instructions and the catalog come before the teacher's request, so the provider can cache them as one prefix.
        String index = byId.values().stream().map(ExperimentMatchAgent::line).collect(Collectors.joining("\n"));
        String user = "Yêu cầu của giáo viên (trả lời bằng JSON): " + teacherRequest;
        String issue = null;
        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String prompt = INSTRUCTIONS + index + "\n\n" + user
                    + (issue == null ? "" : "\n\nLần trước bị từ chối vì: " + issue + "\nHãy trả lại toàn bộ JSON đã sửa.");
            long started = System.nanoTime();
            try {
                MatchResult result = parse(mapper.readTree(aiClient.generate(prompt, StructuredOutputSchemaRegistry.EXPERIMENT_MATCH_RESPONSE)), byId.keySet());
                log.info("ExperimentMatchAgent accepted: attempt={}/{}, matches={}, elapsedMs={}", attempt, MAX_ATTEMPTS,
                        result.matches().stream().map(Match::id).toList(), (System.nanoTime() - started) / 1_000_000);
                return result;
            } catch (InvalidAgentResponseException rejected) {
                issue = rejected.getMessage();
                last = rejected;
                log.warn("ExperimentMatchAgent rejected: attempt={}/{}, issue={}", attempt, MAX_ATTEMPTS, issue);
            } catch (com.fasterxml.jackson.core.JsonProcessingException malformed) {
                issue = "JSON không hợp lệ: " + malformed.getOriginalMessage();
                last = new InvalidAgentResponseException("AI trả về JSON không hợp lệ", malformed);
                log.warn("ExperimentMatchAgent malformed JSON: attempt={}/{}", attempt, MAX_ATTEMPTS);
            }
        }
        throw new InvalidAgentResponseException("Không đối chiếu được với thư viện sau " + MAX_ATTEMPTS + " lần: "
                + (last == null ? "" : last.getMessage()), last);
    }

    MatchResult parse(JsonNode root, Set<String> ids) {
        JsonNode list = root.path("matches");
        if (!list.isArray()) throw invalid("thiếu mảng matches");
        List<String> problems = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        List<Match> matches = new ArrayList<>();
        for (JsonNode node : list) {
            String id = node.path("id").asText("").trim();
            if (!ids.contains(id)) problems.add("id '" + id + "' không có trong mục lục; dùng đúng id trong mục lục");
            else if (seen.add(id)) matches.add(new Match(id, node.path("reason").asText("").trim()));
        }
        if (!problems.isEmpty()) throw invalid(String.join("; ", problems));
        // Best first: past the limit only the weakest are dropped, not worth another attempt.
        return new MatchResult(matches.subList(0, Math.min(matches.size(), MAX_MATCHES)));
    }

    private static String line(CatalogEntry e) {
        return String.join(" | ", e.id().trim(), clean(e.title()), clean(e.domain()), String.valueOf(e.grade()), clean(e.desc()), clean(e.objective()));
    }

    /** One line per experiment: newlines and the separator inside a field would break the index. */
    private static String clean(String text) {
        return text == null ? "" : text.replaceAll("\\s+", " ").replace("|", "/").trim();
    }

    private static InvalidAgentResponseException invalid(String message) {
        return new InvalidAgentResponseException(message, null);
    }
}
