"""The real server and a STOMP client acting as the browser's copy of the tree. Covers the JSON wire contract, the destination names and,
above all, large replies: a browser answering fsRead sends the whole file in one WebSocket message, and the server must not close for it."""
import json
import threading
import time

import pytest
from websockets.exceptions import InvalidStatus
from websockets.sync.client import connect

from beneviadsystem.infrastructure.messaging.stomp_frame import StompFrame, StompFrameReader
from beneviadsystem.service.agent.tools.livecode.live_code_protocol import LiveCodeProtocol
from beneviadsystem.service.agent.tools.livecode.stomp_live_code_bridge import TOPIC_PREFIX

PATH = "engines/x/engine.ts"


class Browser:
    """Subscribes like the frontend bridge does and answers every call from files in memory."""

    def __init__(self, url: str, origin: str = "http://localhost:3000"):
        self.files: dict[str, str] = {}
        self.ops: list[str] = []
        self._connection = connect(url, subprotocols=["v12.stomp", "v11.stomp", "v10.stomp"], origin=origin, max_size=8 * 1024 * 1024)
        self.socket = self._connection.__enter__()
        self.reader = StompFrameReader()
        self.frames: list[StompFrame] = []
        self.send(StompFrame("CONNECT", {"accept-version": "1.2,1.1,1.0", "heart-beat": "10000,10000"}))
        self.connected = self.next_frame()
        self.listening = threading.Thread(target=self._listen, daemon=True)

    def send(self, frame: StompFrame) -> None:
        self.socket.send(frame.encode().decode("utf-8"))

    def next_frame(self) -> StompFrame:
        while not self.frames:
            self.frames.extend(self.reader.feed(self._receive()))
        return self.frames.pop(0)

    def _receive(self) -> bytes:
        message = self.socket.recv()
        return message.encode("utf-8") if isinstance(message, str) else message

    def subscribe(self, destination: str, sub_id: str = "sub-0") -> None:
        self.send(StompFrame("SUBSCRIBE", {"id": sub_id, "destination": destination}))

    def answer_calls_of(self, run_id: str) -> None:
        self.subscribe(TOPIC_PREFIX + run_id)
        self.listening.start()

    def _listen(self) -> None:
        try:
            while True:
                frame = self.next_frame()
                if frame.command != "MESSAGE":
                    continue
                call = json.loads(frame.body)
                self.ops.append(call["op"])
                path = call["args"].get("path")
                if call["op"] == LiveCodeProtocol.OP_FS_READ and path in self.files:
                    result = {"callId": call["callId"], "runId": call["runId"], "ok": True, "data": {"content": self.files[path]}, "message": None}
                elif call["op"] == LiveCodeProtocol.OP_FS_WRITE:
                    self.files[path] = call["args"]["content"]
                    result = {"callId": call["callId"], "runId": call["runId"], "ok": True, "data": {"path": path}, "message": None}
                else:
                    result = {"callId": call["callId"], "runId": call["runId"], "ok": False, "data": {}, "message": f"NOT_FOUND: {path}"}
                body = json.dumps(result, ensure_ascii=False).encode("utf-8")
                self.send(StompFrame("SEND", {"destination": "/app/agents/livecode/result", "content-type": "application/json"}, body))
        except Exception:  # the socket closed at the end of the test
            return

    def close(self) -> None:
        self._connection.__exit__(None, None, None)


@pytest.fixture
def browser(live_server):
    opened = []

    def open_browser(**kwargs):
        b = Browser(live_server.ws_url, **kwargs)
        opened.append(b)
        return b

    yield open_browser
    for b in opened:
        b.close()


def wait_until_answered(bridge, run_id):
    """No subscription receipt, so probe until the browser answers (anything but TIMEOUT)."""
    deadline = time.monotonic() + 10
    while True:
        probe = bridge.call(run_id, LiveCodeProtocol.OP_FS_READ, {"path": PATH}, 0.3)
        if probe.message is None or not probe.message.startswith(LiveCodeProtocol.ERROR_TIMEOUT):
            return
        assert time.monotonic() < deadline, "browser subscription did not become active"


def test_connect_negotiates_stomp_1_2_without_heartbeats(browser):
    connected = browser().connected

    assert connected.command == "CONNECTED"
    assert connected.headers["version"] == "1.2"
    assert connected.headers["heart-beat"] == "0,0"


def test_write_and_read_travel_over_real_stomp(live_server, browser):
    b = browser()
    b.answer_calls_of("rt-1")
    bridge = live_server.container.live_code_bridge
    wait_until_answered(bridge, "rt-1")
    source = "export const vậnTốc = 1;"

    written = bridge.call("rt-1", LiveCodeProtocol.OP_FS_WRITE, {"path": PATH, "content": source}, 5)
    read = bridge.call("rt-1", LiveCodeProtocol.OP_FS_READ, {"path": PATH}, 5)

    assert written.ok, written.message
    assert read.get("content") == source
    assert bridge.pending_count() == 0


def test_a_reply_above_twenty_kilobytes_does_not_close_the_socket(live_server, browser):
    b = browser()
    b.answer_calls_of("rt-large")
    bridge = live_server.container.live_code_bridge
    wait_until_answered(bridge, "rt-large")
    source = "/*" + "đ" * 60_000 + "*/"
    b.files[PATH] = source

    read = bridge.call("rt-large", LiveCodeProtocol.OP_FS_READ, {"path": PATH}, 5)

    assert read.ok, read.message
    assert len(read.get("content")) == len(source)
    assert bridge.call("rt-large", LiveCodeProtocol.OP_FS_READ, {"path": PATH}, 5).ok


def test_a_run_with_no_browser_connected_fails_fast_as_timeout_not_a_hang(live_server):
    read = live_server.container.live_code_bridge.call("rt-nobody", LiveCodeProtocol.OP_FS_READ, {"path": PATH}, 0.3)

    assert not read.ok
    assert read.message.startswith(LiveCodeProtocol.ERROR_TIMEOUT)


def test_another_runs_browser_cannot_answer_my_calls(live_server, browser):
    b = browser()
    b.answer_calls_of("rt-a")
    bridge = live_server.container.live_code_bridge
    wait_until_answered(bridge, "rt-a")
    b.ops.clear()

    read = bridge.call("rt-b", LiveCodeProtocol.OP_FS_READ, {"path": PATH}, 0.5)

    assert not read.ok
    assert b.ops == []


def test_agent_steps_reach_the_activity_topic_as_json(live_server, browser):
    from beneviadsystem.service.agent.codegen.agent_steps import AgentSteps

    b = browser()
    b.subscribe("/topic/agents/activity/run-7", "sub-1")
    b.send(StompFrame("SUBSCRIBE", {"id": "sub-x", "destination": "/topic/other", "receipt": "r-1"}))
    assert b.next_frame().command == "RECEIPT"

    AgentSteps(live_server.container.agent_activity_publisher, "run-7", "engine", "ENGINE").whole("STARTED", True, "bắt đầu")
    message = b.next_frame()

    assert message.command == "MESSAGE"
    assert message.headers["destination"] == "/topic/agents/activity/run-7"
    assert message.headers["subscription"] == "sub-1"
    assert message.headers["content-type"].startswith("application/json")
    activity = json.loads(message.body)
    assert {k: activity[k] for k in ("runId", "agent", "tool", "phase", "success", "message")} == {
        "runId": "run-7", "agent": "engine", "tool": "agent", "phase": "STARTED", "success": True, "message": "bắt đầu"}


def test_a_page_from_another_origin_cannot_open_the_socket(live_server):
    with pytest.raises(InvalidStatus):
        Browser(live_server.ws_url, origin="http://evil.example")
