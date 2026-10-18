package com.neviad.beneviadsystem.service.agent.tools.objects;

import com.neviad.beneviadsystem.service.ObjectLibraryServiceTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ObjectLibraryToolsTest {
    private final List<ToolCallback> tools = ObjectLibraryTools.of(ObjectLibraryServiceTest.library(
            Map.of("luc-ke.ts", ObjectLibraryServiceTest.object("Lực kế", "Lực kế lò xo")), ObjectLibraryServiceTest.CATALOG));

    private ToolCallback tool(String name) {
        return tools.stream().filter(t -> t.getToolDefinition().name().equals(name)).findFirst().orElseThrow();
    }

    /** OpenAI rejects a function whose object schema has no properties ("object schema missing properties"). */
    @Test
    void everyToolInputHasAtLeastOneProperty() throws Exception {
        for (ToolCallback tool : tools) {
            JsonNode schema = new ObjectMapper().readTree(tool.getToolDefinition().inputSchema());
            assertThat(schema.path("properties").size()).as(tool.getToolDefinition().name()).isGreaterThan(0);
        }
    }

    @Test
    void getObjectsReturnsTheFullSummaryOfEachIdAndNamesTheUnknownOnes() {
        assertThat(tools).extracting(t -> t.getToolDefinition().name()).containsExactly("get_objects");
        assertThat(tool("get_objects").call("{\"ids\":[\"luc-ke.ts\"]}")).contains("luc-ke.ts").contains("needle").contains("cần cân điện tử có số đọc");
        assertThat(tool("get_objects").call("{\"ids\":[\"luc-ke.ts\",\"khong-co.ts\"]}")).contains("luc-ke.ts").contains("not in the library: khong-co.ts");
        assertThat(tool("get_objects").call("{\"ids\":[]}")).contains("ids (from the index of the library) are required");
    }
}
