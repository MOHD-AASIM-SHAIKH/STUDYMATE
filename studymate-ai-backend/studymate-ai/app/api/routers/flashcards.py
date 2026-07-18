from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user, get_flashcard_service_dep, get_session_service_dep
from app.core.config import get_settings
from app.core.exceptions import AuthError
from app.core.security import limiter
from app.db.sqlite_client import StudentSession, User, get_db
from app.models.schemas import FlashcardRequest, FlashcardResponse
from app.services.flashcard_service import FlashcardService
from app.services.session_service import SessionService

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.post("", response_model=FlashcardResponse)
@limiter.limit(lambda: get_settings().rate_limit_default)
def generate_flashcards(
    request: Request,
    payload: FlashcardRequest,
    flashcard_service: FlashcardService = Depends(get_flashcard_service_dep),
    session_service: SessionService = Depends(get_session_service_dep),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> FlashcardResponse:
    """Generate flashcards from a topic and/or a session's recent Q&A history."""
    history = []
    if payload.session_id:
        sess = db.get(StudentSession, payload.session_id)
        if sess and sess.user_id != current_user.id:
            raise AuthError("You do not have access to this session.")
        history = session_service.get_history(payload.session_id)

    flashcards, sources, sufficient = flashcard_service.generate(
        topic=payload.topic,
        history=history,
        count=payload.count,
        difficulty_level=payload.difficulty_level,
        language=payload.language,
    )
    return FlashcardResponse(flashcards=flashcards, sources=sources, sufficient_context=sufficient)
