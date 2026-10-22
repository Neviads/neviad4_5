import threading
import time

import pytest
import uvicorn

from beneviadsystem.config.container import Container
from beneviadsystem.main import create_app
from tests.presentation.conftest import settings


class LiveServer:
    def __init__(self, container: Container, port: int):
        self.container = container
        self.port = port

    @property
    def ws_url(self) -> str:
        return f"ws://127.0.0.1:{self.port}/ws"


@pytest.fixture
def live_server():
    """The real application on a free port, served by uvicorn in a thread, with no database and no AI key."""
    config = settings()
    container = Container(config)
    server = uvicorn.Server(uvicorn.Config(create_app(config, container), host="127.0.0.1", port=0, log_level="warning", ws_max_size=4 * 1024 * 1024))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 10
    while not server.started:
        assert time.monotonic() < deadline, "the server did not start"
        time.sleep(0.02)
    port = server.servers[0].sockets[0].getsockname()[1]
    yield LiveServer(container, port)
    server.should_exit = True
    thread.join(timeout=10)
