package com.neviad.beneviadsystem.infrastructure.ai;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Canonical strict schemas used by every model-produced JSON envelope. */
public final class StructuredOutputSchemaRegistry {
    public static final StructuredOutputSpec GENERIC = strict("neviad_generic_json", object(
            properties("value", string()), List.of("value")));
    public static final StructuredOutputSpec RUNTIME_MODULE_STATUS = strict("neviad_runtime_module_status", object(
            properties("status", Map.of("type", "string", "enum", List.of("ok"))), List.of("status")));

    /** Lite spec: ask about the look, refuse, or one drawing request per apparatus (title, prose, frame of visible parts, hint) and the agreed style; no physics. */
    public static final StructuredOutputSpec LITE_SPEC_RESPONSE = strict("neviad_lite_spec", object(
            properties("status", enumValues("READY", "NEEDS_CLARIFICATION", "UNSUPPORTED"), "phenomenon", string(), "reason", nullable(string()),
                    "question", nullable(question()), "style", string(),
                    "objects", array(object(properties("id", string(), "title", string(), "request", string(),
                                    "frame", array(object(properties("name", string(), "shape", string(), "position", string(), "proportion", string()),
                                            List.of("name", "shape", "position", "proportion"))),
                                    "hint", string(), "reference", nullable(string())),
                            List.of("id", "title", "request", "frame", "hint", "reference")))),
            List.of("status", "phenomenon", "reason", "question", "style", "objects")));

    /** Experiments of the library the teacher's request already is: ids from the catalog sent with the request, best first, each with a short reason. */
    public static final StructuredOutputSpec EXPERIMENT_MATCH_RESPONSE = strict("neviad_experiment_match", object(
            properties("matches", array(object(properties("id", string(), "reason", string()), List.of("id", "reason")))),
            List.of("matches")));

    /**
     * One smart object written with the draw-object skill. Not strict on purpose: the self tests name inputs and outputs as free
     * keys (`set`, `expect`), which a strict schema cannot express. The backend checks the answer itself, field by field.
     */
    public static final StructuredOutputSpec DRAW_OBJECT_RESPONSE = new StructuredOutputSpec("neviad_draw_object", object(
            properties("name", string(), "shape", string(), "anchor", string(),
                    "ports", array(openObject()), "joints", array(openObject()), "partAnchors", array(Map.of("anyOf", List.of(string(), openObject()))),
                    "inputs", array(openObject()), "outputs", array(openObject()),
                    "selfTests", array(openObject()), "parts", array(string()), "notes", string(), "code", string()),
            List.of("name", "shape", "anchor", "ports", "inputs", "outputs", "selfTests", "code")), false);

    /** Scenario of an experiment in plain prose: formulas, phases over time, layout, what students adjust and watch. */
    public static final StructuredOutputSpec SCENARIO_RESPONSE = strict("neviad_scenario", object(
            properties("summary", string(), "formulas", array(string()),
                    "phases", array(object(properties("name", string(), "description", string()), List.of("name", "description"))),
                    "layout", string(), "view", string(), "adjustable", array(string()), "observable", array(string()), "assumptions", array(string()),
                    "workedExamples", array(object(properties("text", string(), "expression", string(), "unit", string()), List.of("text", "expression", "unit"))),
                    "objectGeometry", array(object(properties("objectId", string(), "width", number(), "height", number(), "anchor", string(),
                            "points", array(object(properties("name", string(), "description", string()), List.of("name", "description"))),
                            "parts", array(object(properties("name", string(), "motion", string(), "axis", string(), "min", number(), "max", number(),
                                    "description", string()), List.of("name", "motion", "axis", "min", "max", "description")))),
                            List.of("objectId", "width", "height", "anchor", "points", "parts"))),
                    "phenomena", array(object(properties("name", string(), "description", string(), "from", string(), "appearance", string()),
                            List.of("name", "description", "from", "appearance")))),
            List.of("summary", "formulas", "phases", "layout", "view", "adjustable", "observable", "assumptions", "workedExamples",
                    "objectGeometry", "phenomena")));

    /** How a machine splits into parts and how the parts attach; not strict (open objects), the backend checks it field by field. */
    public static final StructuredOutputSpec ASSEMBLY_PLAN_RESPONSE = new StructuredOutputSpec("neviad_assembly_plan", object(
            properties("input", openObject(), "root", string(), "components", array(openObject()), "attachments", array(openObject())),
            List.of("input", "root", "components", "attachments")), false);

    /** Step 1 of the drawing judge: what the real object looks like from the scene's view, fixed before any picture is seen. */
    public static final StructuredOutputSpec DRAW_CRITERIA_RESPONSE = strict("neviad_drawing_criteria", object(
            properties("view", string(),
                    "ratios", array(object(properties("name", string(), "expected", number()), List.of("name", "expected"))),
                    "features", array(string()), "viewRules", array(string())),
            List.of("view", "ratios", "features", "viewRules")));

    /** Step 2 of the drawing judge: what it measured and saw on the picture; the backend, not the judge, decides the pass. */
    public static final StructuredOutputSpec DRAW_VERDICT_RESPONSE = strict("neviad_drawing_verdict", object(
            properties("ratios", array(object(properties("name", string(), "observed", number()), List.of("name", "observed"))),
                    "features", array(object(properties("feature", string(), "present", booleanValue(), "note", string()), List.of("feature", "present", "note"))),
                    "viewOk", booleanValue(), "viewProblems", array(string()), "defects", array(string()),
                    "score", number(), "pass", booleanValue(), "summary", string()),
            List.of("ratios", "features", "viewOk", "viewProblems", "defects", "score", "pass", "summary")));

    /** Final answer of a code agent; the backend never trusts it over what the session recorded. */
    public static final StructuredOutputSpec CODE_AGENT_RESULT = strict("neviad_simulation_result", object(
            properties("status", enumValues("PASSED", "FAILED"), "summary", string()), List.of("status", "summary")));

    private StructuredOutputSchemaRegistry() { }

    public static StructuredOutputSpec strict(String name, Map<String, Object> schema) {
        return StructuredOutputSpec.strict(name, schema);
    }

    private static Map<String, Object> object(Map<String, Object> properties, List<String> required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);
        schema.put("additionalProperties", false);
        return schema;
    }

    private static Map<String, Object> properties(Object... entries) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < entries.length; index += 2) {
            result.put((String) entries[index], entries[index + 1]);
        }
        return result;
    }

    /** An object whose keys are not fixed (not valid in a strict schema). */
    private static Map<String, Object> openObject() {
        return Map.of("type", "object", "additionalProperties", true);
    }

    private static Map<String, Object> string() {
        return Map.of("type", "string");
    }

    private static Map<String, Object> number() {
        return Map.of("type", "number");
    }

    private static Map<String, Object> booleanValue() {
        return Map.of("type", "boolean");
    }

    private static Map<String, Object> enumValues(String... values) {
        return Map.of("type", "string", "enum", List.of(values));
    }

    private static Map<String, Object> nullable(Map<String, Object> value) {
        return Map.of("anyOf", List.of(value, Map.of("type", "null")));
    }

    private static Map<String, Object> array(Map<String, Object> items) {
        return Map.of("type", "array", "items", items);
    }

    private static Map<String, Object> question() {
        return object(properties("topic", string(), "text", string(), "suggestions", array(string())),
                List.of("topic", "text", "suggestions"));
    }
}
