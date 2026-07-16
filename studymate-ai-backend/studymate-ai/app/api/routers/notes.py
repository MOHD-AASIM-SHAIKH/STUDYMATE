from fastapi import APIRouter, Depends, Request

from app.api.deps import get_notes_service_dep, get_session_service_dep
from app.core.config import get_settings
from app.core.security import limiter
from app.models.schemas import StudyNoteRequest, StudyNoteResponse
from app.services.notes_service import NotesService
from app.services.session_service import SessionService

router = APIRouter(prefix="/notes", tags=["study-notes"])


@router.post("", response_model=StudyNoteResponse)
@limiter.limit(lambda: get_settings().rate_limit_default)
def generate_study_note(
    request: Request,
    payload: StudyNoteRequest,
    notes_service: NotesService = Depends(get_notes_service_dep),
    session_service: SessionService = Depends(get_session_service_dep),
) -> StudyNoteResponse:
    """Generate a structured Markdown study note from a topic and/or a
    session's recent Q&A history, grounded in the same retrieved context."""
    history = []
    if payload.session_id:
        history = session_service.get_history(payload.session_id)

    markdown, sources, sufficient = notes_service.generate(
        topic=payload.topic,
        history=history,
        difficulty_level=payload.difficulty_level,
        language=payload.language,
    )
    return StudyNoteResponse(markdown=markdown, sources=sources, sufficient_context=sufficient)
