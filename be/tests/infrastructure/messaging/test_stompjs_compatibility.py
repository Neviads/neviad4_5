"""The frontend's own STOMP client (@stomp/stompjs from fe/node_modules, run by Node) against the real server: it connects, receives
a live-code call, answers it through /app, and receives an agent step."""
import json
import shutil
import subprocess
import threading
import time

import pytest

from beneviadsystem.config.settings import REPOSITORY_ROOT
from beneviadsystem.service.agent.codegen.agent_steps import AgentSteps
from beneviadsystem.service.agent.tools.livecode.live_code_protocol import LiveCodeProtocol

FE = REPOSITORY_ROOT / "fe"

SCRIPT = r"""
const { Client } = require('@stomp/stompjs');
const client = new Client({ brokerURL: process.argv[1], reconnectDelay: 0, debug: () => undefined });
client.onConnect = () => {
  client.subscribe('/topic/agents/livecode/js-run', (message) => {
    const call = JSON.parse(message.body);
    client.publish({ destination: '/app/agents/livecode/result',
                     body: JSON.stringify({ callId: call.callId, runId: call.runId, ok: true, data: { content: 'từ stompjs: ' + call.args.path }, message: null }) });
  });
  client.subscribe('/topic/agents/activity/js-run', (message) => {
    console.log(JSON.stringify({ activity: JSON.parse(message.body) }));
    client.deactivate().then(() => process.exit(0));
  });
  console.log(JSON.stringify({ connected: true }));
};
client.onStompError = (frame) => { console.log(JSON.stringify({ error: frame.headers.message })); process.exit(1); };
client.activate();
setTimeout(() => { console.log(JSON.stringify({ error: 'timeout' })); process.exit(2); }, 15000);
"""


@pytest.fixture
def stompjs():
    if shutil.which("node") is None or not (FE / "node_modules/@stomp/stompjs").is_dir():
        pytest.skip("cần node và fe/node_modules/@stomp/stompjs")


def test_the_frontend_stomp_client_talks_to_the_python_broker(live_server, stompjs):
    process = subprocess.Popen(["node", "-e", SCRIPT, live_server.ws_url], cwd=FE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    lines: list[dict] = []
    reader = threading.Thread(target=lambda: lines.extend(json.loads(line) for line in process.stdout if line.strip().startswith("{")), daemon=True)
    reader.start()
    try:
        deadline = time.monotonic() + 15
        while not any(line.get("connected") for line in lines):
            assert process.poll() is None, process.stderr.read()
            assert time.monotonic() < deadline, "stompjs did not connect"
            time.sleep(0.05)
        bridge = live_server.container.live_code_bridge
        result = bridge.call("js-run", LiveCodeProtocol.OP_FS_READ, {"path": "README.md"}, 5)
        while not result.ok and time.monotonic() < deadline:  # the subscription may land just after CONNECTED
            result = bridge.call("js-run", LiveCodeProtocol.OP_FS_READ, {"path": "README.md"}, 1)

        assert result.ok, result.message
        assert result.get("content") == "từ stompjs: README.md"

        AgentSteps(live_server.container.agent_activity_publisher, "js-run", "engine", "ENGINE").whole("FINISHED", True, "xong")
        assert process.wait(timeout=15) == 0
        reader.join(timeout=5)
        activity = next(line["activity"] for line in lines if "activity" in line)
        assert (activity["runId"], activity["phase"], activity["message"]) == ("js-run", "FINISHED", "xong")
    finally:
        if process.poll() is None:
            process.kill()
