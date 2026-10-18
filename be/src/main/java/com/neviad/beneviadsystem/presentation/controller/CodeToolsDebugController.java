package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.SourceLibraryService;
import com.neviad.beneviadsystem.service.agent.codegen.BridgedCodeStore;
import com.neviad.beneviadsystem.service.agent.codegen.CodeSession;
import com.neviad.beneviadsystem.service.agent.codegen.CodeStore;
import com.neviad.beneviadsystem.service.agent.codegen.OverlayCodeStore;
import com.neviad.beneviadsystem.service.agent.codegen.SourceStore;
import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeBridge;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Development-only hook that calls the tools of {@link CodeSession} over HTTP, so they can be exercised before an agent uses them.
 * Two places for the tree, chosen by {@code ?store=}: {@code db} (default) reads the template from the database and keeps what the
 * run writes in memory, only under {@code _playground/<runId>/}; {@code chrome} works on the copy the browser holds (it needs the
 * live code session of that run id). Notes go to {@code _notes/playground-<runId>.md}. DELETE forgets the run and what it wrote.
 * Disabled unless {@code app.livecode.debug=true}; it is unauthenticated, so never enable it outside a local machine.
 */
@RestController
@RequestMapping("/api/v1/codetools/debug")
@ConditionalOnProperty(name = "app.livecode.debug", havingValue = "true")
public class CodeToolsDebugController {
    private static final Logger log = LoggerFactory.getLogger(CodeToolsDebugController.class);
    private static final Pattern RUN_ID = Pattern.compile("[A-Za-z0-9_-]{1,40}");
    private static final String DB = "db";
    private static final String CHROME = "chrome";

    private final SourceLibraryService sourceLibrary;
    private final LiveCodeBridge bridge;
    private final Map<String, CodeSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Map<String, List<String>>> options = new ConcurrentHashMap<>();

    public CodeToolsDebugController(SourceLibraryService sourceLibrary, LiveCodeBridge bridge) {
        this.sourceLibrary = sourceLibrary;
        this.bridge = bridge;
        log.warn("Code tools DEBUG endpoint is enabled (app.livecode.debug=true). It is unauthenticated: local use only.");
    }

    /** Body is the tool's own JSON input; the response is the tool's JSON result. */
    @PostMapping(value = "/{runId}/{tool}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> call(@PathVariable String runId, @PathVariable String tool, @RequestParam(defaultValue = DB) String store,
                                       @RequestBody String body) {
        String problem = check(runId, store);
        if (problem != null) return error(400, problem);
        CodeSession session = sessions.computeIfAbsent(key(store, runId), k -> newSession(store, runId));
        var callback = session.callbacks().stream().filter(candidate -> tool.equals(candidate.getToolDefinition().name())).findFirst();
        if (callback.isEmpty()) {
            String names = String.join("\",\"", session.callbacks().stream().map((ToolCallback candidate) -> candidate.getToolDefinition().name()).toList());
            return ResponseEntity.status(404).contentType(MediaType.APPLICATION_JSON).body("{\"error\":\"unknown tool\",\"tools\":[\"" + names + "\"]}");
        }
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(callback.get().call(body));
    }

    /** What the session has done so far: counters, the ledger, and the files it may write or must read first. */
    @GetMapping("/{runId}/state")
    public ResponseEntity<Map<String, Object>> state(@PathVariable String runId, @RequestParam(defaultValue = DB) String store) {
        String problem = check(runId, store);
        if (problem != null) return ResponseEntity.badRequest().body(Map.of("error", problem));
        CodeSession session = sessions.computeIfAbsent(key(store, runId), k -> newSession(store, runId));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("state", session.state());
        out.put("ledger", session.ledger());
        out.put("writable", writable(store, runId));
        out.put("mustRead", mustRead(store, runId));
        out.put("notes", notesPath(runId));
        return ResponseEntity.ok(out);
    }

    /**
     * Sets {@code writable} (must stay under {@code _playground/<runId>/} and be TypeScript) and {@code mustRead} for the run,
     * and starts its session over.
     */
    @PutMapping(value = "/{runId}/options", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> setOptions(@PathVariable String runId, @RequestParam(defaultValue = DB) String store,
                                                          @RequestBody Map<String, List<String>> body) {
        String problem = check(runId, store);
        if (problem != null) return ResponseEntity.badRequest().body(Map.of("error", problem));
        String prefix = playground(runId) + "/";
        for (String path : body.getOrDefault("writable", List.of())) {
            if (!path.startsWith(prefix) || !(path.endsWith(".ts") || path.endsWith(".tsx"))) {
                return ResponseEntity.badRequest().body(Map.of("error", "writable chỉ được nằm dưới " + prefix + " và là .ts/.tsx: " + path));
            }
        }
        options.put(key(store, runId), body);
        sessions.remove(key(store, runId));
        return ResponseEntity.ok(Map.of("runId", runId, "options", body.keySet()));
    }

    /** Forgets the run's session and options; with {@code db} what it wrote went with the session, with {@code chrome} the browser clears it. */
    @DeleteMapping("/{runId}")
    public ResponseEntity<Map<String, Object>> reset(@PathVariable String runId, @RequestParam(defaultValue = DB) String store) {
        String problem = check(runId, store);
        if (problem != null) return ResponseEntity.badRequest().body(Map.of("error", problem));
        sessions.remove(key(store, runId));
        options.remove(key(store, runId));
        return ResponseEntity.ok(Map.of("runId", runId, "store", store, "reset", true));
    }

    private CodeSession newSession(String store, String runId) {
        CodeStore tree = CHROME.equals(store) ? new BridgedCodeStore(bridge, runId) : new OverlayCodeStore(sourceLibrary.templateStore());
        return new CodeSession(tree, "playground", notesPath(runId), Set.copyOf(writable(store, runId)), Set.copyOf(mustRead(store, runId)),
                CodeSession.Limits.defaults(), null);
    }

    private List<String> writable(String store, String runId) {
        List<String> chosen = options.getOrDefault(key(store, runId), Map.of()).get("writable");
        return chosen != null ? chosen : List.of(playground(runId) + "/physics.ts", playground(runId) + "/types.ts");
    }

    private List<String> mustRead(String store, String runId) {
        List<String> chosen = options.getOrDefault(key(store, runId), Map.of()).get("mustRead");
        return chosen != null ? List.copyOf(new LinkedHashSet<>(chosen)) : List.of("README.md");
    }

    /** Null when the run id and the store name are acceptable, otherwise the reason. */
    private static String check(String runId, String store) {
        if (!RUN_ID.matcher(runId).matches()) return "runId chỉ gồm chữ, số, gạch ngang và gạch dưới (tối đa 40)";
        if (!DB.equals(store) && !CHROME.equals(store)) return "store phải là db hoặc chrome";
        return null;
    }

    private static String key(String store, String runId) { return store + ":" + runId; }

    private static String playground(String runId) { return "_playground/" + runId; }

    private static String notesPath(String runId) { return SourceStore.NOTES_DIR + "playground-" + runId + ".md"; }

    private static ResponseEntity<String> error(int status, String message) {
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body("{\"error\":\"" + message.replace("\"", "'") + "\"}");
    }
}
