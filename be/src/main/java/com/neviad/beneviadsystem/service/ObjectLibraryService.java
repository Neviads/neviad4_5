package com.neviad.beneviadsystem.service;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The drawn objects of {@code /vat-the-mo-phong} (collection {@code objects}) seen as a catalogue an agent reads: a summary per object
 * (no source) and the topic it belongs to. The topics are the numbered groups of {@code docs/object-catalog.md}, loaded as collection
 * {@code catalog} by {@code npm --prefix fe run push:catalog}; an object is joined to its group by the {@code catalog} name of its OBJECT-META,
 * and one that matches no row sits in {@link #OTHER_TOPIC}. Read-only.
 */
@Service
public class ObjectLibraryService {
    private static final Logger log = LoggerFactory.getLogger(ObjectLibraryService.class);
    public static final String OBJECTS = "objects";
    public static final String CATALOG = "catalog";
    public static final String CATALOG_FILE = "object-catalog.md";
    public static final int OTHER_TOPIC = 0;
    private static final Pattern META = Pattern.compile("/\\*\\s*OBJECT-META\\s*([\\s\\S]*?)\\*/");
    private static final Pattern GROUP = Pattern.compile("^## (\\d+)\\.\\s+(.+)$");

    public record Part(String name, String label, String motion, double min, double max) { }
    /** {@code id} is the file path in the collection, the one handle the tools use. */
    public record Summary(String id, String name, String title, int topic, String topicTitle, double width, double height, String anchor,
                          List<Part> parts, List<String> points, List<String> useWhen, List<String> avoidWhen) { }
    private final SourceLibraryService sources;
    private final ObjectMapper mapper;

    public ObjectLibraryService(SourceLibraryService sources, ObjectMapper mapper) {
        this.sources = sources;
        this.mapper = mapper;
    }

    /**
     * The whole library as a short text an agent reads at once: a heading per topic (in the order of the catalogue, {@link #OTHER_TOPIC}
     * last), then one line per object with its id, name, title and useWhen. avoidWhen, parts, size and points are left out (the agent
     * asks for them by id). The text only changes when the library does, so a prompt that starts with it keeps a cacheable prefix.
     */
    public String index() {
        StringBuilder out = new StringBuilder();
        int current = Integer.MIN_VALUE;
        for (Summary s : all().stream().sorted(Comparator.comparingInt((Summary s) -> s.topic() == OTHER_TOPIC ? Integer.MAX_VALUE : s.topic())
                .thenComparing(Summary::name).thenComparing(Summary::id)).toList()) {
            if (s.topic() != current) {
                current = s.topic();
                out.append(out.isEmpty() ? "" : "\n").append("## ").append(s.topicTitle()).append('\n');
            }
            out.append("- ").append(s.id()).append(" | ").append(oneLine(s.name())).append(" | ").append(oneLine(s.title()));
            if (!s.useWhen().isEmpty()) out.append(" | Dùng khi: ").append(oneLine(String.join("; ", s.useWhen())));
            out.append('\n');
        }
        return out.toString();
    }

    private static String oneLine(String text) {
        return text.replaceAll("\\s+", " ").trim();
    }

    public Optional<Summary> find(String id) {
        return all().stream().filter(s -> s.id().equals(id)).findFirst();
    }

    /** True when the library has at least one drawn object. */
    public boolean available() {
        return !all().isEmpty();
    }

    private List<Summary> all() {
        Map<String, Integer> rowTopic = new LinkedHashMap<>();
        Map<Integer, String> topicTitles = new LinkedHashMap<>();
        catalogTopics(rowTopic, topicTitles);
        List<Summary> out = new ArrayList<>();
        for (SourceFile file : sources.files(OBJECTS)) {
            if (!file.path().endsWith(".ts")) continue;
            Matcher meta = META.matcher(file.content());
            if (!meta.find()) continue;
            try {
                JsonNode root = mapper.readTree(meta.group(1));
                String name = root.path("catalog").asText("").trim();
                int topic = rowTopic.getOrDefault(fold(name), OTHER_TOPIC);
                List<Part> parts = new ArrayList<>();
                root.path("parts").forEach(p -> parts.add(new Part(p.path("name").asText(), p.path("label").asText(p.path("name").asText()),
                        p.path("motion").asText(), p.path("min").asDouble(), p.path("max").asDouble())));
                List<String> points = new ArrayList<>();
                root.path("points").forEach(p -> points.add(p.path("name").asText()));
                List<String> useWhen = texts(root.path("useWhen"));
                List<String> avoidWhen = texts(root.path("avoidWhen"));
                out.add(new Summary(file.path(), name, root.path("title").asText(""), topic, topicTitles.getOrDefault(topic, "Khác"),
                        root.path("size").path("width").asDouble(), root.path("size").path("height").asDouble(),
                        root.path("anchor").asText(""), List.copyOf(parts), List.copyOf(points), useWhen, avoidWhen));
            } catch (Exception broken) {
                log.warn("Object {} skipped: its OBJECT-META is not valid JSON ({})", file.path(), broken.getMessage());
            }
        }
        out.sort(Comparator.comparingInt(Summary::topic).thenComparing(Summary::name));
        return out;
    }

    /** The strings of a JSON array (a lone string counts as one); empty when absent. */
    private static List<String> texts(JsonNode node) {
        List<String> out = new ArrayList<>();
        if (node.isTextual()) out.add(node.asText().trim());
        else node.forEach(n -> { if (n.isTextual() && !n.asText().isBlank()) out.add(n.asText().trim()); });
        return List.copyOf(out);
    }

    /** Folded object name to topic index, from the numbered groups and table rows of the catalogue file; none when it was not loaded. */
    private void catalogTopics(Map<String, Integer> rowTopic, Map<Integer, String> topicTitles) {
        topicTitles.put(OTHER_TOPIC, "Khác");
        Optional<SourceFile> file = sources.file(CATALOG, CATALOG_FILE);
        if (file.isEmpty()) return;
        int current = -1;
        boolean header = false;
        for (String raw : file.get().content().replace("\r\n", "\n").split("\n")) {
            String line = raw.trim();
            if (line.startsWith("## ")) {
                Matcher g = GROUP.matcher(line);
                current = g.matches() ? Integer.parseInt(g.group(1)) : -1;
                if (current >= 0) topicTitles.put(current, g.group(2).trim().replaceAll("\\s*\\(.*\\)\\s*$", ""));
                header = false;
                continue;
            }
            if (current < 0 || !line.startsWith("|") || line.matches("^\\|[\\s|:-]+\\|$")) continue;
            if (!header) { header = true; continue; }
            String name = line.substring(1).split("\\|", -1)[0].trim();
            if (!name.isEmpty()) rowTopic.putIfAbsent(fold(name), current);
        }
    }

    static String fold(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D').toLowerCase().trim();
    }
}
