from fastapi import APIRouter, Depends

from app.api.deps import get_session_service_dep
from app.models.schemas import SessionHistoryResponse
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/{session_id}/history", response_model=SessionHistoryResponse)
def get_session_history(
    session_id: str,
    limit: int = 20,
    session_service: SessionService = Depends(get_session_service_dep),
) -> SessionHistoryResponse:
    """Return a student's recent Q&A history for a session so they can
    revisit past answers."""
    history = session_service.get_history(session_id, limit=limit)
    return SessionHistoryResponse(session_id=session_id, history=history)
