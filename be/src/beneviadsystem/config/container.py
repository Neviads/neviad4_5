from __future__ import annotations

import logging
from functools import cached_property

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.config.ai_client_config import AiClientConfig
from beneviadsystem.infrastructure.messaging.stomp_broker import StompBroker
from beneviadsystem.infrastructure.persistence.database import Database
from beneviadsystem.infrastructure.persistence.source_file_repository import SourceFileRepository
from beneviadsystem.service.agent.codegen.code_agent_service import CodeAgentService
from beneviadsystem.service.agent.codegen.stomp_agent_activity_publisher import StompAgentActivityPublisher
from beneviadsystem.service.agent.draft.code_draft_publisher import CodeDraftPublisher
from beneviadsystem.service.agent.impl.assembly_agent import AssemblyAgent
from beneviadsystem.service.agent.impl.assembly_planner import AssemblyPlanner
from beneviadsystem.service.agent.impl.draw_object_agent import DrawObjectAgent
from beneviadsystem.service.agent.impl.experiment_match_agent import ExperimentMatchAgent
from beneviadsystem.service.agent.impl.lite_spec_agent import LiteSpecAgent
from beneviadsystem.service.agent.impl.model_draw_object_judge import ModelDrawObjectJudge
from beneviadsystem.service.agent.impl.node_assembly_validator import NodeAssemblyValidator
from beneviadsystem.service.agent.impl.node_draw_object_validator import NodeDrawObjectValidator
from beneviadsystem.service.agent.impl.scenario_agent import ScenarioAgent
from beneviadsystem.service.agent.tools.livecode.live_code_message_handler import RESULT_DESTINATION, LiveCodeMessageHandler
from beneviadsystem.service.agent.tools.livecode.stomp_live_code_bridge import StompLiveCodeBridge
from beneviadsystem.service.health_service import HealthService
from beneviadsystem.service.object_library_service import ObjectLibraryService
from beneviadsystem.service.source_library_service import SourceLibraryService

from .settings import Settings

log = logging.getLogger(__name__)


class Container:
    """The application's object graph (what the Spring context was): every service is built once, on first use, from the settings. Any of
    them can be handed in ready-made, by keyword, which is how the tests replace an agent or a store."""

    def __init__(self, settings: Settings, **overrides):
        self.settings = settings
        unknown = [name for name in overrides if not isinstance(getattr(type(self), name, None), cached_property)]
        if unknown:
            raise TypeError(f"unknown container entries: {unknown}")
        self.__dict__.update(overrides)

    # infrastructure
    @cached_property
    def ai_client(self) -> AiClient:
        return AiClientConfig.ai_client(self.settings)

    @cached_property
    def database(self) -> Database | None:
        if not self.settings.db_url.strip():
            log.warning("DB_URL is not set: the endpoints that read stored sources will fail until it is.")
            return None
        return Database(self.settings.db_url, self.settings.db_username, self.settings.db_password)

    @cached_property
    def stomp_broker(self) -> StompBroker:
        broker = StompBroker(self.settings.allowed_origins())
        # Resolved when the first result arrives: the handler needs the bridge, and the bridge needs this broker.
        broker.register(RESULT_DESTINATION, lambda payload: self.live_code_message_handler.result(payload))
        return broker

    @cached_property
    def source_file_repository(self) -> SourceFileRepository:
        return SourceFileRepository(self.database)

    # services
    @cached_property
    def health_service(self) -> HealthService:
        return HealthService()

    @cached_property
    def source_library_service(self) -> SourceLibraryService:
        return SourceLibraryService(self.source_file_repository)

    @cached_property
    def object_library_service(self) -> ObjectLibraryService:
        return ObjectLibraryService(self.source_library_service)

    @cached_property
    def live_code_bridge(self) -> StompLiveCodeBridge:
        return StompLiveCodeBridge(self.stomp_broker)

    @cached_property
    def live_code_message_handler(self) -> LiveCodeMessageHandler:
        return LiveCodeMessageHandler(self.live_code_bridge)

    @cached_property
    def agent_activity_publisher(self) -> StompAgentActivityPublisher:
        return StompAgentActivityPublisher(self.stomp_broker)

    @cached_property
    def code_draft_publisher(self) -> CodeDraftPublisher:
        return CodeDraftPublisher(self.stomp_broker)

    # agents
    @cached_property
    def experiment_match_agent(self) -> ExperimentMatchAgent:
        return ExperimentMatchAgent(self.ai_client)

    @cached_property
    def lite_spec_agent(self) -> LiteSpecAgent:
        return LiteSpecAgent(self.ai_client, self.object_library_service, self.agent_activity_publisher)

    @cached_property
    def scenario_agent(self) -> ScenarioAgent:
        return ScenarioAgent(self.ai_client)

    @cached_property
    def draw_object_validator(self) -> NodeDrawObjectValidator:
        return NodeDrawObjectValidator.from_settings(self.settings)

    @cached_property
    def draw_object_judge(self) -> ModelDrawObjectJudge:
        return ModelDrawObjectJudge(self.ai_client)

    @cached_property
    def draw_object_agent(self) -> DrawObjectAgent:
        return DrawObjectAgent.over_bridge(self.ai_client, self.draw_object_validator, self.live_code_bridge, self.agent_activity_publisher,
                                           self.settings.app_ai_openai_agent_draw_object_reasoning_effort, self.code_draft_publisher,
                                           self.draw_object_judge)

    @cached_property
    def assembly_validator(self) -> NodeAssemblyValidator:
        return NodeAssemblyValidator.from_settings(self.settings)

    @cached_property
    def assembly_agent(self) -> AssemblyAgent:
        return AssemblyAgent(AssemblyPlanner(self.ai_client), self.draw_object_agent, self.assembly_validator)

    @cached_property
    def code_agent_service(self) -> CodeAgentService:
        return CodeAgentService.over_bridge(self.ai_client, self.live_code_bridge, self.agent_activity_publisher, self.code_draft_publisher)

    @cached_property
    def code_tools_debug_controller(self):
        from beneviadsystem.presentation.controller.code_tools_debug_controller import CodeToolsDebugController

        return CodeToolsDebugController(self.source_library_service, self.live_code_bridge)
