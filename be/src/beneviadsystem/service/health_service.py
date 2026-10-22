from beneviadsystem.domain.model.application_health import ApplicationHealth


class HealthService:
    def get_health(self) -> ApplicationHealth:
        return ApplicationHealth("UP", "be-neviad-system")
