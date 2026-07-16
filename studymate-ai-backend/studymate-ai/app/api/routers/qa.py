import json
import time

from fastapi import APIRouter, Depends, Request

from app.api.deps import (
    get_cache_dep,
    get_current_user,
    get_retrieval_service_dep,
    get_session_service_dep,
)
from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.core.security import limiter
from app.db.chroma_client import ChromaClient
from app.db.sqlite_client import User
from app.models.schemas import QARequest, QAResponse, SourceCitation
from app.services.cache_service import LRUCache
from app.services.retrieval_service import RetrievalService
from app.services.session_service import SessionService

router = APIRouter(prefix="/qa", tags=["question-answering"])
logger = get_logger(__name__)


@router.post("", response_model=QAResponse)
@limiter.limit(lambda: get_settings().rate_limit_qa)
def ask_question(
    request: Request,
    payload: QARequest,
    retrieval_service: RetrievalService = Depends(get_retrieval_service_dep),
    session_service: SessionService = Depends(get_session_service_dep),
    cache: LRUCache = Depends(get_cache_dep),
    current_user: User = Depends(get_current_user),
) -> QAResponse:
    """Answer a student's question using ONLY retrieved teacher-provided
    material, with a mandatory source citation."""
    start = time.perf_counter()
    session_id = session_service.get_or_create(payload.session_id, user_id=current_user.id)

    chroma: ChromaClient = ChromaClient.get_instance()
    cache_key = cache.make_key(
        payload.question.strip().lower(),
        payload.difficulty_level,
        payload.language.lower(),
        str(chroma.count()),
    )
    cached_raw = cache.get(cache_key)
    if cached_raw:
        cached = json.loads(cached_raw)
        session_service.record_qa(
            session_id, payload.question, cached["answer"], payload.difficulty_level, payload.language
        )
        return QAResponse(
            session_id=session_id,
            answer=cached["answer"],
            sources=[SourceCitation(**s) for s in cached["sources"]],
            sufficient_context=cached["sufficient_context"],
            difficulty_level=payload.difficulty_level,
            language=payload.language,
            cached=True,
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
        )

    result = retrieval_service.answer_question(
        question=payload.question,
        difficulty_level=payload.difficulty_level,
        language=payload.language,
        top_k=payload.top_k,
    )

    cache.set(
        cache_key,
        json.dumps(
            {
                "answer": result.answer,
                "sources": [s.model_dump() for s in result.sources],
                "sufficient_context": result.sufficient_context,
            }
        ),
    )

    session_service.record_qa(
        session_id, payload.question, result.answer, payload.difficulty_level, payload.language
    )

    return QAResponse(
        session_id=session_id,
        answer=result.answer,
        sources=result.sources,
        sufficient_context=result.sufficient_context,
        difficulty_level=payload.difficulty_level,
        language=payload.language,
        cached=False,
        latency_ms=round((time.perf_counter() - start) * 1000, 2),
    )
