"""StudyMate AI — FastAPI application entrypoint."""
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routers import health, ingestion, notes, qa, sessions
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging, get_logger
from app.core.security import limiter
from app.db.chroma_client import ChromaClient
from app.services.document_service import DocumentService
from app.services.embedding_service import EmbeddingService

settings = get_settings()
configure_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="StudyMate AI",
    description="A RAG chatbot that answers student questions using only teacher-provided material.",
    version="1.0.0",
)

# --- Rate limiting ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS (env-driven, never "*") ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# --- Consistent JSON error responses ---
register_exception_handlers(app)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        f"{request.method} {request.url.path} -> {response.status_code}",
        extra={"ctx": {"duration_ms": duration_ms}},
    )
    return response


# --- Routers ---
app.include_router(health.router)
app.include_router(ingestion.router)
app.include_router(qa.router)
app.include_router(notes.router)
app.include_router(sessions.router)


@app.on_event("startup")
def on_startup() -> None:
    logger.info(
        "StudyMate AI starting up",
        extra={"ctx": {"environment": settings.environment, "llm_provider": settings.llm_provider}},
    )
    try:
        chroma_client = ChromaClient.get_instance()
        embedding_service = EmbeddingService.get_instance()
        doc_service = DocumentService(chroma_client, embedding_service, settings)
        doc_service.rebuild_index_from_disk_if_empty()
    except Exception as exc:  # pragma: no cover - startup should never crash the app
        logger.error(f"Startup index rebuild failed: {exc}")
