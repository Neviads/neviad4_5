import pytest
from fastapi.testclient import TestClient

from beneviadsystem.config.container import Container
from beneviadsystem.config.settings import Settings
from beneviadsystem.main import create_app


def settings(**values) -> Settings:
    """Settings that never read the developer's .env, with no database and no AI key."""
    defaults = {"db_url": "", "app_ai_openai_api_key": "", "app_ai_deepseek_api_key": "", "flyway_enabled": False}
    return Settings(_env_file=None, **{**defaults, **values})


@pytest.fixture
def client_for():
    """A test client over the real application, with the given parts of the container replaced."""
    clients = []

    def make(settings_values: dict | None = None, **overrides) -> TestClient:
        config = settings(**(settings_values or {}))
        client = TestClient(create_app(config, Container(config, **overrides)), raise_server_exceptions=False)
        clients.append(client)
        return client

    yield make
    for client in clients:
        client.close()


class Recorder:
    """A stand-in agent: records its calls and answers with a fixed value or raises a fixed error."""

    def __init__(self, answer=None, failure=None):
        self.calls, self.answer, self.failure = [], answer, failure

    def __call__(self, *args):
        self.calls.append(args)
        if self.failure is not None:
            raise self.failure
        return self.answer
