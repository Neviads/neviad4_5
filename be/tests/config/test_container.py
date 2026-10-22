"""The object graph the application runs with, built from the settings alone (what the Spring context did)."""
import pytest

from beneviadsystem.config.container import Container
from beneviadsystem.infrastructure.ai.fallback_ai_client import FallbackAiClient
from beneviadsystem.infrastructure.ai.unavailable_ai_client import UnavailableAiClient
from beneviadsystem.service.agent.impl.node_assembly_validator import NodeAssemblyValidator
from beneviadsystem.service.agent.impl.node_draw_object_validator import NodeDrawObjectValidator
from beneviadsystem.service.agent.tools.livecode.stomp_live_code_bridge import StompLiveCodeBridge
from tests.presentation.conftest import settings


def test_every_service_and_agent_can_be_built_from_the_settings():
    container = Container(settings())

    for name in ("health_service", "source_library_service", "object_library_service", "experiment_match_agent", "lite_spec_agent", "scenario_agent",
                 "draw_object_agent", "assembly_agent", "code_agent_service", "code_tools_debug_controller"):
        assert getattr(container, name) is getattr(container, name), name
    assert isinstance(container.ai_client, UnavailableAiClient)
    assert container.database is None
    assert isinstance(container.live_code_bridge, StompLiveCodeBridge)
    assert isinstance(container.draw_object_validator, NodeDrawObjectValidator)
    assert isinstance(container.assembly_validator, NodeAssemblyValidator)


def test_a_provider_key_gives_the_fallback_client():
    assert isinstance(Container(settings(app_ai_openai_api_key="k")).ai_client, FallbackAiClient)


def test_the_bridge_and_its_message_handler_share_the_broker():
    container = Container(settings())

    assert container.live_code_message_handler.result({"callId": "nope", "runId": "r", "ok": True}) is False
    assert container.agent_activity_publisher is container.agent_activity_publisher


def test_a_part_can_be_handed_in_but_not_one_that_does_not_exist():
    agent = object()

    assert Container(settings(), scenario_agent=agent).scenario_agent is agent
    with pytest.raises(TypeError):
        Container(settings(), scenario_agnet=agent)
