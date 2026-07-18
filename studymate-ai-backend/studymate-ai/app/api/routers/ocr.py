import threading

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user
from app.core.config import Settings, get_settings
from app.core.exceptions import UnsupportedFileTypeError
from app.core.logging_config import get_logger
from app.core.security import limiter
from app.db.sqlite_client import User
from app.models.schemas import OcrResponse, OcrTaskResponse, OcrTaskStatusResponse
from app.services.ocr_service import get_ocr_service, get_task_manager, process_ocr_ingest_task
from app.utils.text_extraction import IMAGE_EXTENSIONS

router = APIRouter(prefix="/ocr", tags=["ocr"])
logger = get_logger(__name__)

IMAGE_AND_PDF = IMAGE_EXTENSIONS | {".pdf"}


@router.post("", response_model=OcrResponse)
@limiter.limit(lambda: get_settings().rate_limit_ingest)
def ocr_image(
    request: Request,
    file: UploadFile = File(...),
):
    """Quick OCR: upload an image (PNG, JPG, BMP, TIFF) and return extracted text."""
    _validate_upload(file, IMAGE_EXTENSIONS)
    image_bytes = file.file.read()
    ocr = get_ocr_service()
    text = ocr.extract_text(image_bytes)
    return OcrResponse(text=text, pages=1)


@router.post("/ingest", response_model=OcrTaskResponse)
def ocr_and_ingest(
    request: Request,
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    current_user: User = Depends(get_current_user),
) -> OcrTaskResponse:
    """Upload an image or scanned PDF → async OCR → chunk → embed → store.

    Returns a task_id immediately. Poll GET /ocr/status/{task_id} for progress.
    When status is "done", the document is queryable in chat.
    """
    _validate_upload(file, IMAGE_AND_PDF)
    file_bytes = file.file.read()
    logger.info(f"OCR + ingest queued for '{file.filename}' ({len(file_bytes)} bytes)")

    task_mgr = get_task_manager()
    task_id = task_mgr.create_task(file_bytes, file.filename or "unnamed", current_user.id)

    thread = threading.Thread(
        target=process_ocr_ingest_task,
        args=(task_id, file_bytes, file.filename or "unnamed", current_user.id),
        daemon=True,
    )
    thread.start()

    return OcrTaskResponse(task_id=task_id)


@router.get("/status/{task_id}", response_model=OcrTaskStatusResponse)
def get_ocr_status(task_id: str):
    """Poll the progress of an OCR + ingest task."""
    task_mgr = get_task_manager()
    task = task_mgr.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="OCR task not found")
    return OcrTaskStatusResponse(
        task_id=task.task_id,
        status=task.status,
        progress=task.progress,
        current_page=task.current_page,
        total_pages=task.total_pages,
        ocr_text_preview=task.ocr_text_preview,
        error=task.error,
        result=task.result,
    )


def _validate_upload(file: UploadFile, allowed_exts: set) -> None:
    ext = _get_ext(file.filename or "unnamed")
    if ext not in allowed_exts:
        raise UnsupportedFileTypeError(
            f"Unsupported file type '{ext}'. Supported: {sorted(allowed_exts)}"
        )


def _get_ext(filename: str) -> str:
    idx = filename.rfind(".")
    if idx == -1:
        return ""
    return filename[idx:].lower()
