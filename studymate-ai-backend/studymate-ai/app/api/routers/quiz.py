from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user, get_quiz_service_dep, get_session_service_dep
from app.core.config import get_settings
from app.core.exceptions import AuthError
from app.core.security import limiter
from app.db.sqlite_client import StudentSession, User, get_db
from app.models.schemas import QuizRequest, QuizResponse
from app.services.quiz_service import QuizService
from app.services.session_service import SessionService

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("", response_model=QuizResponse)
@limiter.limit(lambda: get_settings().rate_limit_default)
def generate_quiz(
    request: Request,
    payload: QuizRequest,
    quiz_service: QuizService = Depends(get_quiz_service_dep),
    session_service: SessionService = Depends(get_session_service_dep),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> QuizResponse:
    history = []
    if payload.session_id:
        sess = db.get(StudentSession, payload.session_id)
        if sess and sess.user_id != current_user.id:
            raise AuthError("You do not have access to this session.")
        history = session_service.get_history(payload.session_id)

    questions, sources, sufficient = quiz_service.generate(
        topic=payload.topic,
        history=history,
        count=payload.count,
        difficulty_level=payload.difficulty_level,
        language=payload.language,
    )
    return QuizResponse(questions=questions, sources=sources, sufficient_context=sufficient)
