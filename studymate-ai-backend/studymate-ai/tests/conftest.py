import os
import shutil
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Point config at an isolated temp dir BEFORE any app module is imported,
# so tests never touch real storage/ or burn real API quota.
_TMP_DIR = tempfile.mkdtemp(prefix="studymate_test_")
os.environ["CHROMA_PERSIST_DIR"] = str(Path(_TMP_DIR) / "chroma")
os.environ["SQLITE_DB_PATH"] = str(Path(_TMP_DIR) / "test.db")
os.environ["INGESTED_DOCS_DIR"] = str(Path(_TMP_DIR) / "ingested_docs")
os.environ["GROQ_API_KEY"] = "test-key-not-real"
os.environ["ENVIRONMENT"] = "test"

from app.core.config import get_settings  # noqa: E402
from app.db.chroma_client import ChromaClient  # noqa: E402
from app.services.embedding_service import EmbeddingService  # noqa: E402
from app.services.llm_service import LLMProvider  # noqa: E402
from app.services.retrieval_service import RetrievalService  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def cleanup_tmp_dir():
    yield
    shutil.rmtree(_TMP_DIR, ignore_errors=True)


@pytest.fixture(scope="session")
def settings():
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture(scope="session")
def embedding_service():
    return EmbeddingService.get_instance()


@pytest.fixture()
def chroma_client(settings):
    # Fresh collection per test to avoid cross-test pollution.
    client = ChromaClient.get_instance()
    try:
        client._client.delete_collection(settings.chroma_collection_name)
    except Exception:
        pass
    ChromaClient._instance = None
    return ChromaClient.get_instance()


@pytest.fixture()
def mock_llm_provider() -> LLMProvider:
    """A fake LLMProvider that never calls the real Groq API."""
    provider = MagicMock(spec=LLMProvider)
    provider.generate.return_value = (
        "Mitochondria are the powerhouse of the cell.\nSource: biology_notes.pdf, page 3"
    )
    return provider


@pytest.fixture()
def retrieval_service(chroma_client, embedding_service, mock_llm_provider, settings):
    return RetrievalService(chroma_client, embedding_service, mock_llm_provider, settings)
