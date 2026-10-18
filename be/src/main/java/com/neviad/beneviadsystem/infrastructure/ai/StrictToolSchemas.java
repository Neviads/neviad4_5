package com.neviad.beneviadsystem.infrastructure.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

/**
 * Makes a JSON schema acceptable for OpenAI strict function calling: every object closes
 * {@code additionalProperties} and lists all of its properties as required, recursively.
 */
public final class StrictToolSchemas {
    private StrictToolSchemas() { }

    public static void strictify(JsonNode schema) {
        if (!(schema instanceof ObjectNode object)) return;
        if ("object".equals(object.path("type").asText())
                || object.get("properties") instanceof ObjectNode) {
            object.put("additionalProperties", false);
            if (object.get("properties") instanceof ObjectNode properties) {
                ArrayNode required = JsonNodeFactory.instance.arrayNode();
                properties.fieldNames().forEachRemaining(required::add);
                object.set("required", required);
                properties.elements().forEachRemaining(StrictToolSchemas::strictify);
            }
        }
        if (schema.get("items") != null) strictify(schema.get("items"));
        if (schema.get("additionalItems") != null) strictify(schema.get("additionalItems"));
        for (String branch : List.of("anyOf", "oneOf", "allOf", "prefixItems")) {
            JsonNode branches = schema.get(branch);
            if (branches != null && branches.isArray()) branches.forEach(StrictToolSchemas::strictify);
        }
    }
}
