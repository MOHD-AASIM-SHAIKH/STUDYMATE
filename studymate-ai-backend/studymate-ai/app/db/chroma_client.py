"""
ChromaDB persistence layer.

Wrapped behind a small class so the rest of the app never touches the
chromadb client directly — this keeps a future swap (e.g. to a hosted
vector DB) contained to one file.
"""
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings
from app.core.exceptions import VectorStoreError
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ChromaClient:
    _instance: Optional["ChromaClient"] = None

    def __init__(self) -> None:
        settings = get_settings()
        persist_dir = Path(settings.chroma_persist_dir)
        persist_dir.mkdir(parents=True, exist_ok=True)

        try:
            self._client = chromadb.PersistentClient(
                path=str(persist_dir),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_or_create_collection(
                name=settings.chroma_collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Failed to initialize ChromaDB", extra={"ctx": {"error": str(exc)}})
            raise VectorStoreError("Could not initialize vector store.") from exc

        self._cached_count: Optional[int] = None
        self._count_ts: float = 0.0

    @classmethod
    def get_instance(cls) -> "ChromaClient":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def add(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        try:
            self._collection.add(
                ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas
            )
        except Exception as exc:
            raise VectorStoreError("Failed to write chunks to vector store.") from exc

    def query(
        self, query_embedding: List[float], top_k: int, where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        try:
            return self._collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            raise VectorStoreError("Failed to query vector store.") from exc

    def count(self) -> int:
        try:
            return self._collection.count()
        except Exception:
            return 0

    def get_cached_count(self) -> int:
        now = time.time()
        if self._cached_count is None or now - self._count_ts > 30:
            self._cached_count = self.count()
            self._count_ts = now
        return self._cached_count

    def is_ready(self) -> bool:
        try:
            self._collection.count()
            return True
        except Exception:
            return False


def get_chroma_client() -> ChromaClient:
    """FastAPI dependency provider."""
    return ChromaClient.get_instance()
