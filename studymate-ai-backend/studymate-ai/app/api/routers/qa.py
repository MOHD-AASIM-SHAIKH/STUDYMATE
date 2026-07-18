import json
import time

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

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
from app.models.schemas import (
    QARequest,
    QAResponse,
    SourceCitation,
)
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
            images=cached.get("images", []),
            sufficient_context=cached["sufficient_context"],
            difficulty_level=payload.difficulty_level,
            language=payload.language,
            cached=True,
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
        )

    history = session_service.get_history(session_id, limit=5)

    # For follow-up questions, combine the last question with the current one
    # so retrieval finds relevant chunks even for vague follow-ups like "explain in detail"
    retrieval_query = payload.question
    if history:
        last_q = history[-1].question
        if len(payload.question.split()) < 5:  # short follow-up
            retrieval_query = f"{last_q} {payload.question}"

    result = retrieval_service.answer_question(
        question=retrieval_query,
        display_question=payload.question,
        difficulty_level=payload.difficulty_level,
        language=payload.language,
        top_k=payload.top_k,
        history=history,
    )

    cache.set(
        cache_key,
        json.dumps(
            {
                "answer": result.answer,
                "sources": [s.model_dump() for s in result.sources],
                "images": result.images,
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
        images=result.images,
        sufficient_context=result.sufficient_context,
        difficulty_level=payload.difficulty_level,
        language=payload.language,
        cached=False,
        latency_ms=round((time.perf_counter() - start) * 1000, 2),
    )


@router.post("/stream")
def ask_question_stream(
    request: Request,
    payload: QARequest,
    retrieval_service: RetrievalService = Depends(get_retrieval_service_dep),
    session_service: SessionService = Depends(get_session_service_dep),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Stream the answer token-by-token via Server-Sent Events."""
    session_id = session_service.get_or_create(payload.session_id, user_id=current_user.id)
    history = session_service.get_history(session_id, limit=5)

    retrieval_query = payload.question
    if history:
        last_q = history[-1].question
        if len(payload.question.split()) < 5:
            retrieval_query = f"{last_q} {payload.question}"

    def event_stream():
        full_answer_parts = []
        meta = {}
        meta_sent = False

        for token, chunk_meta in retrieval_service.answer_question_stream(
            question=retrieval_query,
            display_question=payload.question,
            difficulty_level=payload.difficulty_level,
            language=payload.language,
            top_k=payload.top_k,
            history=history,
        ):
            if chunk_meta:
                meta = chunk_meta
                meta["session_id"] = session_id
                yield f"event: meta\ndata: {json.dumps(meta)}\n\n"
                meta_sent = True

            if token:
                full_answer_parts.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

        if not meta_sent:
            meta = {
                "session_id": session_id,
                "sources": [],
                "images": [],
                "sufficient_context": False,
                "difficulty_level": payload.difficulty_level,
                "language": payload.language,
            }
            yield f"event: meta\ndata: {json.dumps(meta)}\n\n"

        full_answer = "".join(full_answer_parts)
        if full_answer:
            session_service.record_qa(
                session_id, payload.question, full_answer, payload.difficulty_level, payload.language
            )

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")



