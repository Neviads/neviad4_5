package com.neviad.beneviadsystem.service.agent.draft;

import com.neviad.beneviadsystem.presentation.dto.simulation.RunDraft;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CodeDraftStreamerTest {
    private final List<RunDraft> events = new ArrayList<>();

    private String text() { return events.stream().filter(e -> RunDraft.DELTA.equals(e.type())).map(RunDraft::text).reduce("", String::concat); }

    @Test
    void streamsTheContentOfAWriteFileCallWithItsPath() {
        var streamer = new CodeDraftStreamer("r1", events::add);
        streamer.onToolCallStarted("write_file");
        streamer.onToolArgumentsDelta("write_file", "{\"path\":\"engines/a/a.ts\",\"con");
        streamer.onToolArgumentsDelta("write_file", "tent\":\"let x = 1;\\nlet y");
        streamer.onToolArgumentsDelta("write_file", " = 2;\"}");
        streamer.onToolCallFinished("write_file");

        assertThat(events.getFirst().type()).isEqualTo(RunDraft.START);
        assertThat(text()).isEqualTo("let x = 1;\nlet y = 2;");
        assertThat(events.getLast().path()).isEqualTo("engines/a/a.ts");
        assertThat(events).extracting(RunDraft::seq).isSorted();
    }

    @Test
    void ignoresOtherTools() {
        var streamer = new CodeDraftStreamer("r1", events::add);
        streamer.onToolCallStarted("read_file");
        streamer.onToolArgumentsDelta("read_file", "{\"path\":\"a.ts\"}");
        streamer.onToolCallFinished("read_file");

        assertThat(events).isEmpty();
    }

    @Test
    void streamsTheToolsItWasGiven() {
        var streamer = new CodeDraftStreamer("r1", events::add, Set.of("create_file"));
        streamer.onToolCallStarted("create_file");
        streamer.onToolArgumentsDelta("create_file", "{\"path\":\"b.ts\",\"content\":\"ok\"}");
        streamer.onToolCallFinished("create_file");

        assertThat(text()).isEqualTo("ok");
    }

    @Test
    void streamsOnlyTheReplacementOfAnEditFileCall() {
        var streamer = new CodeDraftStreamer("r1", events::add, CodeDraftStreamer.CODE_AGENT_TOOLS, true);
        streamer.onToolCallStarted("edit_file");
        streamer.onToolArgumentsDelta("edit_file", "{\"path\":\"engines/a/a.ts\",\"expectedText\":\"old code\",\"repla");
        streamer.onToolArgumentsDelta("edit_file", "cement\":\"new code\"}");
        streamer.onToolCallFinished("edit_file");

        assertThat(text()).isEqualTo("new code");
        assertThat(events).extracting(RunDraft::tool).containsOnly("edit_file");
        assertThat(events.getLast().type()).isEqualTo(RunDraft.END);
        assertThat(events.getLast().path()).isEqualTo("engines/a/a.ts");
    }

    @Test
    void tellsWhichToolAWholeFileCameFrom() {
        var streamer = new CodeDraftStreamer("r1", events::add, CodeDraftStreamer.CODE_AGENT_TOOLS, false);
        streamer.onToolCallStarted("write_file");
        streamer.onToolArgumentsDelta("write_file", "{\"path\":\"a.ts\",\"content\":\"x\"}");
        streamer.onToolCallFinished("write_file");

        assertThat(events).extracting(RunDraft::tool).containsOnly("write_file");
    }

    @Test
    void putsTheTitleOfTheObjectOnEveryEvent() {
        var streamer = new CodeDraftStreamer("r1", events::add, CodeDraftStreamer.CODE_AGENT_TOOLS, true, "Pit-tông nhỏ");
        streamer.onToolCallStarted("write_file");
        streamer.onToolArgumentsDelta("write_file", "{\"path\":\"_drawn/a.ts\",\"content\":\"x\"}");
        streamer.onToolCallFinished("write_file");

        assertThat(events).extracting(RunDraft::title).containsOnly("Pit-tông nhỏ");
    }

    @Test
    void neverPublishesAHalfWrittenPathWhenTheCodeComesFirst() {
        var streamer = new CodeDraftStreamer("r1", events::add, CodeDraftStreamer.CODE_AGENT_TOOLS, true);
        streamer.onToolCallStarted("write_file");
        streamer.onToolArgumentsDelta("write_file", "{\"content\":\"let x = 1;\",\"path\":\"_drawn/con-lac-don-28");
        streamer.onToolCallFinished("write_file");
        assertThat(events.stream().filter(e -> RunDraft.DELTA.equals(e.type()))).extracting(RunDraft::path).containsOnly("");

        events.clear();
        var whole = new CodeDraftStreamer("r1", events::add, CodeDraftStreamer.CODE_AGENT_TOOLS, true);
        whole.onToolCallStarted("write_file");
        whole.onToolArgumentsDelta("write_file", "{\"content\":\"let x = 1;\",\"path\":\"_drawn/con-lac-don-28");
        whole.onToolArgumentsDelta("write_file", "3c.ts\"}");
        whole.onToolCallFinished("write_file");
        assertThat(events.getLast().type()).isEqualTo(RunDraft.END);
        assertThat(events.getLast().path()).isEqualTo("_drawn/con-lac-don-283c.ts");
    }

    @Test
    void aFixedPathIsOnEveryEventFromTheStart() {
        var streamer = new CodeDraftStreamer("r1", events::add, CodeDraftStreamer.CODE_AGENT_TOOLS, true, "Con lắc", "_drawn/a.ts");
        streamer.onToolCallStarted("write_file");
        streamer.onToolArgumentsDelta("write_file", "{\"content\":\"x\"}");
        streamer.onToolCallFinished("write_file");
        assertThat(events).extracting(RunDraft::path).containsOnly("_drawn/a.ts");
    }

    @Test
    void endsTheFileOnlyWhenAsked() {
        var plain = new CodeDraftStreamer("r1", events::add);
        plain.onToolCallStarted("write_file");
        plain.onToolArgumentsDelta("write_file", "{\"path\":\"a.ts\",\"content\":\"x\"}");
        plain.onToolCallFinished("write_file");
        assertThat(events).extracting(RunDraft::type).doesNotContain(RunDraft.END);

        events.clear();
        var announcing = new CodeDraftStreamer("r1", events::add, CodeDraftStreamer.WRITE_FILE, true);
        announcing.onToolCallStarted("write_file");
        announcing.onToolArgumentsDelta("write_file", "{\"path\":\"a.ts\",\"content\":\"x\"}");
        announcing.onToolCallFinished("write_file");
        assertThat(events).extracting(RunDraft::type).containsExactly(RunDraft.START, RunDraft.DELTA, RunDraft.END);
        assertThat(events.getLast().path()).isEqualTo("a.ts");
    }

    @Test
    void abortDropsTheDraft() {
        var streamer = new CodeDraftStreamer("r1", events::add);
        streamer.onToolCallStarted("write_file");
        streamer.onToolArgumentsDelta("write_file", "{\"path\":\"a.ts\",\"content\":\"par");
        streamer.onStreamAborted();
        streamer.onToolArgumentsDelta("write_file", "tial");

        assertThat(events.getLast().type()).isEqualTo(RunDraft.ABORT);
        assertThat(events.stream().filter(e -> RunDraft.DELTA.equals(e.type()))).isEmpty();
    }
}
