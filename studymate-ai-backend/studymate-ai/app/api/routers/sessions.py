from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user, get_session_service_dep
from app.core.exceptions import AuthError
from app.db.sqlite_client import StudentSession, User, get_db
from app.models.schemas import SessionHistoryResponse
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/{session_id}/history", response_model=SessionHistoryResponse)
def get_session_history(
    session_id: str,
    limit: int = 20,
    session_service: SessionService = Depends(get_session_service_dep),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SessionHistoryResponse:
    """Return a student's recent Q&A history for a session so they can
    revisit past answers."""
    sess = db.get(StudentSession, session_id)
    if sess and sess.user_id != current_user.id:
        raise AuthError("You do not have access to this session.")
    history = session_service.get_history(session_id, limit=limit)
    return SessionHistoryResponse(session_id=session_id, history=history)
