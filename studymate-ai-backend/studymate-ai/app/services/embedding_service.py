"""Local embedding generation via sentence-transformers (no API key, no cost)."""
from functools import lru_cache
from typing import List, Optional

from sentence_transformers import SentenceTransformer

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    _instance: Optional["EmbeddingService"] = None

    def __init__(self) -> None:
        settings = get_settings()
        logger.info(f"Loading embedding model '{settings.embedding_model}' (first load may take a moment)...")
        self._model = SentenceTransformer(settings.embedding_model)

    @classmethod
    def get_instance(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        vectors = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return vectors.tolist()

    def embed_one(self, text: str) -> List[float]:
        return self.embed([text])[0]


def get_embedding_service() -> EmbeddingService:
    """FastAPI dependency provider."""
    return EmbeddingService.get_instance()
