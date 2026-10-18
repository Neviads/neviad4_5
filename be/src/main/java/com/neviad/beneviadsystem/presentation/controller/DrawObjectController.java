package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.SourceLibraryService;
import com.neviad.beneviadsystem.service.agent.codegen.OverlayCodeStore;
import com.neviad.beneviadsystem.service.agent.impl.DrawObjectAgent;
import com.neviad.beneviadsystem.service.agent.impl.LiteSpecAgent;
import com.neviad.beneviadsystem.service.agent.impl.ScenarioAgent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;


/**
 * Writes one smart object from a drawing request (the output of the lite spec) with the draw-object skill. The agent works on the copy of the
 * tree that the browser of the live code session {@code runId} holds.
 */
@RestController
@RequestMapping("/api/v1/draw-object")
public class DrawObjectController {
    public record DrawObjectBody(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{1,40}") String runId, @NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 4000) String request,
                                 @Size(max = 2000) String hint,
                                 ScenarioAgent.ObjectGeometry geometry,
                                 @Size(max = 2000) String view,
                                 @Size(max = 20) List<LiteSpecAgent.FramePart> frame,
                                 @Size(max = 2000) String style) { }

    /** The same request without a browser session: the template is read from the database and what the agent writes stays in memory. */
    public record HeadlessBody(@NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 4000) String request, @Size(max = 2000) String hint,
                               ScenarioAgent.ObjectGeometry geometry, @Size(max = 2000) String view,
                               @Size(max = 20) List<LiteSpecAgent.FramePart> frame, @Size(max = 2000) String style) { }

    private final DrawObjectAgent agent;
    private final SourceLibraryService sourceLibrary;
    private final boolean headlessEnabled;

    @Autowired
    public DrawObjectController(DrawObjectAgent agent, SourceLibraryService sourceLibrary,
                                @Value("${app.draw-object.headless-enabled:false}") boolean headlessEnabled) {
        this.agent = agent;
        this.sourceLibrary = sourceLibrary;
        this.headlessEnabled = headlessEnabled;
    }

    /** Takes minutes (the agent reads, writes and checks, round trips to the browser included), so callers must not use a short timeout. */
    @PostMapping
    public DrawObjectAgent.DrawObjectResult execute(@Valid @RequestBody DrawObjectBody body) {
        return agent.generate(new DrawObjectAgent.DrawObjectRequest(body.title().trim(), body.request().trim(), (body.hint() == null ? "" : body.hint().trim()), false, body.geometry(), body.view(), body.frame(), body.style()), body.runId());
    }

    /**
     * Draws one object with the very same agent, prompt, check and model, but without the page: the template is
     * read from the database and every file the agent writes stays in memory, so the repository is left untouched. It exists to draw the same object
     * from a fixed input and compare versions of the agent; it calls the real model, so it is off unless {@code app.draw-object.headless-enabled}.
     */
    @PostMapping("/headless")
    public ResponseEntity<DrawObjectAgent.DrawObjectResult> headless(@Valid @RequestBody HeadlessBody body) {
        if (!headlessEnabled) return ResponseEntity.notFound().build();
        DrawObjectAgent.DrawObjectRequest request = new DrawObjectAgent.DrawObjectRequest(body.title().trim(), body.request().trim(),
                body.hint() == null ? "" : body.hint().trim(), false, body.geometry(), body.view(), body.frame(), body.style());
        String runId = "headless-" + UUID.randomUUID().toString().substring(0, 8);
        return ResponseEntity.ok(agent.generate(request, runId, new OverlayCodeStore(sourceLibrary.templateStore())));
    }
}
