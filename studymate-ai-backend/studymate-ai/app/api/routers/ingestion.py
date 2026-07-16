from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, UploadFile, File
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_document_service_dep
from app.core.config import Settings, get_settings
from app.core.exceptions import UnsupportedFileTypeError
from app.core.logging_config import get_logger
from app.core.security import limiter
from app.db.sqlite_client import DocumentMetadata, get_db
from app.models.schemas import DocumentInfo, DocumentListResponse, IngestionResponse
from app.services.document_service import DocumentService
from app.utils.text_extraction import SUPPORTED_EXTENSIONS

router = APIRouter(prefix="/ingest", tags=["ingestion"])
logger = get_logger(__name__)


@router.post("", response_model=IngestionResponse)
@limiter.limit(lambda: get_settings().rate_limit_ingest)
def ingest_document(
    request: Request,
    file: UploadFile = File(...),
    document_service: DocumentService = Depends(get_document_service_dep),
    settings: Settings = Depends(get_settings),
    db: DBSession = Depends(get_db),
) -> IngestionResponse:
    """Upload a teacher-provided PDF/DOCX/TXT file. It is parsed, chunked,
    embedded, and stored in the vector store for later retrieval."""
    filename = file.filename or "unnamed"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileTypeError(
            f"Unsupported file type '{ext}'. Supported types: {sorted(SUPPORTED_EXTENSIONS)}"
        )

    file_bytes = file.file.read()
    logger.info(f"Received upload '{filename}' ({len(file_bytes)} bytes)")

    result = document_service.ingest(file_bytes, filename)

    db_meta = DocumentMetadata(
        document_id=result.document_id,
        filename=result.filename,
        page_count=result.page_count,
        chunk_count=result.chunks_created,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(db_meta)
    db.commit()

    return result


@router.get("/documents", response_model=DocumentListResponse)
def list_ingested_documents(
    db: DBSession = Depends(get_db),
) -> DocumentListResponse:
    """List all previously ingested documents with metadata."""
    rows = (
        db.query(DocumentMetadata)
        .order_by(DocumentMetadata.uploaded_at.desc())
        .all()
    )
    return DocumentListResponse(
        documents=[
            DocumentInfo(
                document_id=r.document_id,
                filename=r.filename,
                page_count=r.page_count,
                chunk_count=r.chunk_count,
                uploaded_at=r.uploaded_at,
            )
            for r in rows
        ]
    )
