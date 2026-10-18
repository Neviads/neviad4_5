package com.neviad.beneviadsystem.service.agent.tools.objects;

import com.neviad.beneviadsystem.infrastructure.ai.ToolSchemaLock;
import com.neviad.beneviadsystem.service.ObjectLibraryService;
import com.neviad.beneviadsystem.service.ObjectLibraryService.Summary;
import com.neviad.beneviadsystem.service.agent.codegen.AgentActivity;
import com.neviad.beneviadsystem.service.agent.codegen.AgentSteps;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.function.Function;

/**
 * The read-only tool over the library of drawn objects, for an agent that already has the library's index ({@link ObjectLibraryService#index()})
 * in its prompt: it asks for the full summary (size, moving parts, points, useWhen, avoidWhen) of the objects it is weighing, by {@code id}.
 * Never source; the agent names what it picked by {@code id} and the backend checks that id.
 */
public final class ObjectLibraryTools {
    /** Most ids one call may ask for. */
    static final int MAX_IDS = 10;

    public record GetInput(List<String> ids) { }
    public record ObjectsResult(boolean success, int total, List<Summary> objects, String message) { }

    private ObjectLibraryTools() { }

    public static List<ToolCallback> of(ObjectLibraryService library) {
        return of(library, null);
    }

    /** Same tool; each call is reported to {@code steps} (started, then finished with what it found) so the frontend can show it. {@code null} reports nothing. */
    public static List<ToolCallback> of(ObjectLibraryService library, AgentSteps steps) {
        return ToolSchemaLock.build(() -> build(library, steps));
    }

    private static List<ToolCallback> build(ObjectLibraryService library, AgentSteps steps) {
        ToolCallback get = FunctionToolCallback.builder("get_objects", (Function<GetInput, ObjectsResult>) input -> {
                    List<String> ids = input == null || input.ids() == null ? List.of()
                            : new ArrayList<>(new LinkedHashSet<>(input.ids().stream().filter(id -> id != null && !id.isBlank()).map(String::trim).toList()));
                    if (ids.isEmpty()) return failed("ids (from the index of the library) are required");
                    if (ids.size() > MAX_IDS) return failed("at most " + MAX_IDS + " ids per call");
                    started(steps, "Xem chi tiết " + ids.size() + " vật trong kho");
                    ObjectsResult result;
                    try {
                        List<Summary> found = new ArrayList<>();
                        List<String> missing = new ArrayList<>();
                        for (String id : ids) library.find(id).ifPresentOrElse(found::add, () -> missing.add(id));
                        result = new ObjectsResult(true, found.size(), found,
                                missing.isEmpty() ? "" : "not in the library: " + String.join(", ", missing) + " (use the ids exactly as the index writes them)");
                    } catch (RuntimeException failure) {
                        result = failed(failure.getMessage());
                    }
                    finished(steps, result.success(), result.success() ? result.total() + " vật" : result.message());
                    return result;
                })
                .description("Get the full summary of some ready-made objects of the library, by the ids of its index: size in metres, anchor, "
                        + "moving parts with their ranges, named points, useWhen (when to pick it) and avoidWhen (when NOT to pick it). "
                        + "Call it for the candidates you consider before naming one as reference. Input: {ids: up to " + MAX_IDS + " ids, e.g. [\"can-don.ts\"]}.")
                .inputType(GetInput.class)
                .build();
        return List.of(get);
    }

    private static void started(AgentSteps steps, String message) {
        if (steps != null) steps.tool("get_objects", AgentActivity.STARTED, true, message);
    }

    private static void finished(AgentSteps steps, boolean success, String message) {
        if (steps != null) steps.tool("get_objects", AgentActivity.FINISHED, success, message);
    }

    private static ObjectsResult failed(String message) {
        return new ObjectsResult(false, 0, List.of(), message);
    }
}
