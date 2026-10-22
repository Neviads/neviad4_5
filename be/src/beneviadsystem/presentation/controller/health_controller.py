from fastapi import APIRouter, Depends

from beneviadsystem.config.container import Container
from beneviadsystem.presentation.dto.health_response import HealthResponse

from .dependencies import container

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("", response_model=HealthResponse, summary="Get application health")
def health(app: Container = Depends(container)) -> HealthResponse:
    return HealthResponse.of(app.health_service.get_health())
