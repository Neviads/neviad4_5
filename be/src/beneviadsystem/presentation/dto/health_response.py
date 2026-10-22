from beneviadsystem.domain.model.application_health import ApplicationHealth
from beneviadsystem.domain.model.base import CamelModel


class HealthResponse(CamelModel):
    status: str
    service: str

    @classmethod
    def of(cls, health: ApplicationHealth) -> "HealthResponse":
        return cls(status=health.status, service=health.service)
