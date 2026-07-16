from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.db.chroma_client import ChromaClient, get_chroma_client
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check(
    settings: Settings = Depends(get_settings),
    chroma_client: ChromaClient = Depends(get_chroma_client),
) -> HealthResponse:
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        vector_store_ready=chroma_client.is_ready(),
        llm_provider=settings.llm_provider,
    )
