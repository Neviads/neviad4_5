package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.codegen.CodeAgentService;
import com.neviad.beneviadsystem.service.agent.codegen.CodeLayer;
import com.neviad.beneviadsystem.service.agent.impl.ScenarioAgent;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Runs the code agent on the copy of {@code neviadlike_structure} that the browser of the live code session {@code runId} holds.
 * Takes minutes (the agent reads, writes and may need several rounds), so callers must not use a short timeout.
 */
@RestController
@RequestMapping("/api/v1/codeagent")
public class CodeAgentController {
    private static final Pattern RUN_ID = Pattern.compile("[A-Za-z0-9_-]{1,40}");
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z][A-Za-z0-9_]{0,39}");
    private static final int MAX_OBJECTS = 4;

    private final CodeAgentService service;

    public CodeAgentController(CodeAgentService service) {
        this.service = service;
    }

    /** {@code layer} is engine, renderer or experiment; the layers before it must already be in the copy. */
    @PostMapping("/{layer}")
    public CodeAgentService.Result run(@PathVariable String layer, @RequestBody CodeAgentService.Request body) {
        return service.run(CodeLayer.parse(layer), checked(body));
    }

    /** The request with every list present, or an IllegalArgumentException saying what is wrong with it. */
    static CodeAgentService.Request checked(CodeAgentService.Request body) {
        if (body == null) throw new IllegalArgumentException("Thiếu nội dung yêu cầu.");
        if (body.runId() == null || !RUN_ID.matcher(body.runId()).matches()) throw new IllegalArgumentException("runId chỉ gồm chữ, số, gạch ngang và gạch dưới (tối đa 40).");
        if (body.request() == null || body.request().isBlank() || body.request().length() > 3000) throw new IllegalArgumentException("request phải có từ 1 đến 3000 ký tự.");
        if (body.scenario() == null || blank(body.scenario().summary()) || blank(body.scenario().layout())) throw new IllegalArgumentException("Thiếu kịch bản (cần tóm tắt và bố cục).");
        if (body.objects() == null || body.objects().isEmpty() || body.objects().size() > MAX_OBJECTS) throw new IllegalArgumentException("Cần từ 1 đến " + MAX_OBJECTS + " vật.");
        ScenarioAgent.Scenario s = body.scenario();
        ScenarioAgent.Scenario scenario = new ScenarioAgent.Scenario(s.summary(), orEmpty(s.formulas()), orEmpty(s.phases()), s.layout(),
                orEmpty(s.adjustable()), orEmpty(s.observable()), orEmpty(s.assumptions()), orEmpty(s.objectGeometry()), orEmpty(s.workedExamples()),
                s.view(), orEmpty(s.phenomena()));
        List<CodeAgentService.ObjectInfo> objects = body.objects().stream().map(o -> {
            if (o == null || o.id() == null || !IDENTIFIER.matcher(o.id()).matches()) throw new IllegalArgumentException("id của vật phải là định danh ASCII.");
            if (blank(o.file()) || !o.file().startsWith("objects/") || !o.file().endsWith(".ts")) throw new IllegalArgumentException("file của vật " + o.id() + " phải nằm ở objects/*.ts.");
            if (blank(o.functionName())) throw new IllegalArgumentException("Thiếu tên hàm của vật " + o.id() + ".");
            return new CodeAgentService.ObjectInfo(o.id(), o.title() == null ? o.id() : o.title(), o.file(), o.functionName(), o.notes());
        }).toList();
        return new CodeAgentService.Request(body.runId(), body.slug(), body.request().trim(), scenario, objects);
    }

    private static boolean blank(String text) { return text == null || text.isBlank(); }

    private static <T> List<T> orEmpty(List<T> list) { return list == null ? List.of() : list; }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", exception.getMessage() == null ? "Yêu cầu không hợp lệ" : exception.getMessage()));
    }
}
