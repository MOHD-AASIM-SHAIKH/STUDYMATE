"""
Central dependency-injection wiring.

Every router pulls services via `Depends(...)` from here rather than
importing/instantiating them directly. Expensive singletons (embedding
model, Chroma client, LLM client) are created once and reused; per-request
resources (DB session) are created fresh each request.
"""
from typing import Generator

from fastapi import Depends, Header
from sqlalchemy.orm import Session as DBSession

from app.core.config import Settings, get_settings
from app.db.chroma_client import ChromaClient, get_chroma_client
from app.db.sqlite_client import get_db
from app.services.cache_service import LRUCache, get_cache_service
from app.services.document_service import DocumentService
from app.services.embedding_service import EmbeddingService, get_embedding_service
from app.services.llm_service import LLMProvider, get_llm_provider
from app.services.notes_service import NotesService
from app.services.retrieval_service import RetrievalService
from app.services.session_service import SessionService


def get_document_service_dep(
    chroma_client: ChromaClient = Depends(get_chroma_client),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    settings: Settings = Depends(get_settings),
) -> DocumentService:
    return DocumentService(chroma_client, embedding_service, settings)


def get_retrieval_service_dep(
    chroma_client: ChromaClient = Depends(get_chroma_client),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    llm_provider: LLMProvider = Depends(get_llm_provider),
    settings: Settings = Depends(get_settings),
) -> RetrievalService:
    return RetrievalService(chroma_client, embedding_service, llm_provider, settings)


def get_notes_service_dep(
    retrieval_service: RetrievalService = Depends(get_retrieval_service_dep),
    llm_provider: LLMProvider = Depends(get_llm_provider),
) -> NotesService:
    return NotesService(retrieval_service, llm_provider)


def get_session_service_dep(db: DBSession = Depends(get_db)) -> SessionService:
    return SessionService(db)


def get_cache_dep() -> LRUCache:
    return get_cache_service()


def get_current_user(
    authorization: str = Header(...),
    db: DBSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> "User":  # noqa: F821
    from app.core.exceptions import AuthError
    from app.services.auth_service import decode_token, get_user_by_id

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AuthError("Invalid authorization header. Use: Bearer <token>")

    payload = decode_token(token, settings)
    if payload.get("type") != "access":
        raise AuthError("Invalid token type.")

    user_id = payload.get("sub")
    user = get_user_by_id(db, user_id)
    if not user:
        raise AuthError("User not found.")
    return user
