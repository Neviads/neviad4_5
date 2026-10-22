import threading

from beneviadsystem.infrastructure.messaging.messaging_template import MessagingTemplate
from beneviadsystem.service.agent.tools.livecode.live_code_bridge import LiveCodeBridge
from beneviadsystem.service.agent.tools.livecode.live_code_message_handler import LiveCodeMessageHandler
from beneviadsystem.service.agent.tools.livecode.live_code_protocol import Call, LiveCodeProtocol, Result
from beneviadsystem.service.agent.tools.livecode.stomp_live_code_bridge import StompLiveCodeBridge


class Template(MessagingTemplate):
    def __init__(self, on_send=None, failure=None):
        self.sent: list[tuple[str, object]] = []
        self.on_send, self.failure = on_send, failure

    def convert_and_send(self, destination, payload):
        if self.failure:
            raise self.failure
        self.sent.append((destination, payload))
        if self.on_send:
            self.on_send(payload)


def later(action):
    threading.Thread(target=action).start()


def test_completes_the_matching_call_and_publishes_to_the_run_topic():
    template = Template()
    bridge = StompLiveCodeBridge(template)
    template.on_send = lambda call: later(lambda: bridge.complete(Result(call.call_id, call.run_id, True, {"content": "export const x = 1;"}, "ok")))

    result = bridge.call("run-1", LiveCodeProtocol.OP_FS_READ, {"path": "engines/x/engine.ts"}, 2.0)

    assert isinstance(bridge, LiveCodeBridge)
    assert result.ok
    assert result.get("content") == "export const x = 1;"
    destination, sent = template.sent[0]
    assert destination == "/topic/agents/livecode/run-1"
    assert isinstance(sent, Call) and sent.op == "fsRead"
    assert bridge.pending_count() == 0


def test_ignores_a_result_from_a_different_run():
    template = Template()
    bridge = StompLiveCodeBridge(template)
    accepted = []
    template.on_send = lambda call: accepted.append(bridge.complete(Result(call.call_id, "another-run", True, {}, "spoof")))

    result = bridge.call("run-1", LiveCodeProtocol.OP_FS_READ, {}, 0.2)

    assert accepted == [False]
    assert not result.ok
    assert result.message.startswith(LiveCodeProtocol.ERROR_TIMEOUT)


def test_times_out_as_a_failed_result_and_cleans_up():
    bridge = StompLiveCodeBridge(Template())

    result = bridge.call("run-1", LiveCodeProtocol.OP_FS_LIST, {}, 0.1)

    assert not result.ok
    assert result.message.startswith(LiveCodeProtocol.ERROR_TIMEOUT)
    assert bridge.pending_count() == 0


def test_reports_transport_errors_instead_of_raising():
    bridge = StompLiveCodeBridge(Template(failure=RuntimeError("broker down")))

    result = bridge.call("run-1", LiveCodeProtocol.OP_FS_READ, {}, 1.0)

    assert not result.ok
    assert result.message.startswith(LiveCodeProtocol.ERROR_BRIDGE)
    assert bridge.pending_count() == 0


def test_unknown_or_malformed_results_are_rejected():
    bridge = StompLiveCodeBridge(Template())

    assert not bridge.complete(None)
    assert not bridge.complete(Result(None, "run-1", True, {}, None))
    assert not bridge.complete(Result("nope", "run-1", True, {}, None))


def test_message_handler_hands_results_from_the_wire_to_the_bridge():
    template = Template()
    bridge = StompLiveCodeBridge(template)
    handler = LiveCodeMessageHandler(bridge)
    template.on_send = lambda call: later(lambda: handler.result(
        {"callId": call.call_id, "runId": call.run_id, "ok": True, "data": {"path": "engines/x/engine.ts"}, "message": "ok"}))

    result = bridge.call("run-9", LiveCodeProtocol.OP_FS_WRITE, {"path": "engines/x/engine.ts", "content": "x"}, 2.0)

    assert result.ok
    assert result.get("path") == "engines/x/engine.ts"


def test_a_call_goes_on_the_wire_with_the_field_names_the_frontend_reads():
    from beneviadsystem.domain.model.base import to_jsonable

    assert to_jsonable(Call("c1", "run-1", "fsRead", {"path": "a.ts"})) == {"callId": "c1", "runId": "run-1", "op": "fsRead", "args": {"path": "a.ts"}}
