"""OCR service using EasyOCR for printed text from scanned documents."""
import io
import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class OcrService:
    """EasyOCR reader for extracting text from images. Initialized eagerly."""

    def __init__(self, languages: Optional[List[str]] = None, gpu: bool = False):
        self._languages = languages or ["en"]
        self._gpu = gpu
        self._reader = None

    def ensure_ready(self):
        """Download models and initialize the reader (slow first call)."""
        if self._reader is not None:
            return
        import os
        os.environ["PYTHONIOENCODING"] = "utf-8"
        import easyocr
        logger.info(
            "Initializing EasyOCR reader",
            extra={"ctx": {"languages": self._languages, "gpu": self._gpu}},
        )
        self._reader = easyocr.Reader(self._languages, gpu=self._gpu, verbose=False)
        logger.info("EasyOCR reader ready")

    def _ensure_reader(self):
        if self._reader is None:
            self.ensure_ready()

    def extract_text(self, image_bytes: bytes) -> str:
        """Run OCR on raw image bytes and return extracted text."""
        self._ensure_reader()
        image_np = self._bytes_to_numpy(image_bytes)
        results = self._reader.readtext(image_np)
        lines = [r[1] for r in results]
        return "\n".join(lines)

    def extract_text_from_pil(self, pil_image: Image.Image) -> str:
        """Run OCR on a PIL Image and return extracted text."""
        self._ensure_reader()
        image_np = np.array(pil_image.convert("RGB"))
        results = self._reader.readtext(image_np)
        lines = [r[1] for r in results]
        return "\n".join(lines)

    @staticmethod
    def _bytes_to_numpy(image_bytes: bytes) -> np.ndarray:
        try:
            pil_image = Image.open(io.BytesIO(image_bytes))
            return np.array(pil_image.convert("RGB"))
        except Exception as exc:
            raise ValueError(f"Failed to decode image bytes: {exc}") from exc


_instance: Optional[OcrService] = None


def get_ocr_service() -> OcrService:
    global _instance
    if _instance is None:
        _instance = OcrService()
    return _instance


# ---------------------------------------------------------------------------
# Background async OCR task management
# ---------------------------------------------------------------------------

@dataclass
class OcrTask:
    task_id: str
    user_id: str
    filename: str
    file_bytes: bytes = field(repr=False)
    status: str = "queued"  # queued | ocr_processing | ingesting | done | error
    progress: int = 0
    current_page: int = 0
    total_pages: int = 0
    ocr_text_preview: str = ""
    error: Optional[str] = None
    result: Optional[dict] = None
    created_at: float = 0.0


class OcrTaskManager:
    """Thread-safe in-memory store for background OCR tasks."""

    def __init__(self):
        self._tasks: dict[str, OcrTask] = {}
        self._lock = threading.Lock()

    def create_task(self, file_bytes: bytes, filename: str, user_id: str) -> str:
        task_id = str(uuid.uuid4())
        task = OcrTask(
            task_id=task_id,
            user_id=user_id,
            filename=filename,
            file_bytes=file_bytes,
            created_at=time.time(),
        )
        with self._lock:
            self._tasks[task_id] = task
        return task_id

    def get_task(self, task_id: str) -> Optional[OcrTask]:
        with self._lock:
            return self._tasks.get(task_id)

    def update_task(self, task_id: str, **kwargs):
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                for k, v in kwargs.items():
                    setattr(task, k, v)


_task_manager: Optional[OcrTaskManager] = None


def get_task_manager() -> OcrTaskManager:
    global _task_manager
    if _task_manager is None:
        _task_manager = OcrTaskManager()
    return _task_manager


def process_ocr_ingest_task(task_id: str, file_bytes: bytes, filename: str, user_id: str):
    """Run OCR + ingestion in a background thread (called by POST /ocr/ingest).

    Handles both scanned PDFs (page-by-page OCR) and single images (fast path).
    Also handles text-based PDFs (fast path via pdfplumber, skips OCR).
    """
    from app.core.config import get_settings
    from app.db.chroma_client import ChromaClient
    from app.db.sqlite_client import DocumentMetadata, get_db
    from app.services.document_service import DocumentService
    from app.services.embedding_service import EmbeddingService
    from app.utils.text_extraction import IMAGE_EXTENSIONS

    settings = get_settings()
    chroma = ChromaClient.get_instance()
    embedding = EmbeddingService.get_instance()
    doc_service = DocumentService(chroma, embedding, settings)
    task_mgr = get_task_manager()
    ocr = get_ocr_service()

    try:
        raw_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        ext = f".{raw_ext}" if raw_ext else ""
        full_text: str = ""

        if ext == ".pdf":
            # Step 1: try pdfplumber (fast, for text-based PDFs)
            import io as _io
            import pdfplumber

            has_text = False
            pages_text: list[str] = []
            with pdfplumber.open(_io.BytesIO(file_bytes)) as pdf:
                total_pages = len(pdf.pages)
                task_mgr.update_task(task_id, total_pages=total_pages)
                for i, page in enumerate(pdf.pages, start=1):
                    t = page.extract_text() or ""
                    pages_text.append(t)
                    if t.strip():
                        has_text = True
                    task_mgr.update_task(task_id, current_page=i, progress=int(i / total_pages * 30))

            if has_text:
                full_text = "\n\n".join(pages_text)
                task_mgr.update_task(task_id, progress=30)
                logger.info(f"Text-based PDF detected — skipped OCR for '{filename}'")
            else:
                # Step 2: scanned PDF — OCR page by page
                task_mgr.update_task(task_id, status="ocr_processing", progress=30)

                import fitz
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                total_pages = doc.page_count
                task_mgr.update_task(task_id, total_pages=total_pages)

                all_text_parts = []
                for i in range(total_pages):
                    page = doc[i]
                    mat = fitz.Matrix(1.5, 1.5)
                    pix = page.get_pixmap(matrix=mat)
                    img_bytes = pix.tobytes("png")
                    page_text = ocr.extract_text(img_bytes)
                    all_text_parts.append(page_text)

                    pct = 30 + int((i + 1) / total_pages * 50)
                    task_mgr.update_task(task_id, current_page=i + 1, progress=pct)
                    if (i + 1) % 5 == 0 or i == 0 or i == total_pages - 1:
                        logger.info(f"OCR progress: page {i+1}/{total_pages} for '{filename}'")

                doc.close()
                full_text = "\n\n".join(all_text_parts)

        elif ext in IMAGE_EXTENSIONS:
            # Single image — fast path
            task_mgr.update_task(task_id, status="ocr_processing", total_pages=1, progress=10)
            full_text = ocr.extract_text(file_bytes)
            task_mgr.update_task(task_id, current_page=1, progress=60)

        else:
            raise ValueError(f"Unsupported file type: .{ext}")

        preview = full_text[:300] + ("..." if len(full_text) > 300 else "")

        # Phase 2: Ingest into vector store
        task_mgr.update_task(task_id, status="ingesting", progress=85, ocr_text_preview=preview)

        ocr_bytes = full_text.encode("utf-8")
        base_name = filename.rsplit(".", 1)[0] if "." in filename else filename
        txt_filename = f"{base_name}.txt"
        result = doc_service.ingest(ocr_bytes, txt_filename)

        # Phase 3: Save metadata to SQLite
        db_session = next(get_db())
        try:
            db_meta = DocumentMetadata(
                document_id=result.document_id,
                user_id=user_id,
                filename=result.filename,
                page_count=result.page_count,
                chunk_count=result.chunks_created,
                uploaded_at=datetime.now(timezone.utc),
            )
            db_session.add(db_meta)
            db_session.commit()
        finally:
            db_session.close()

        task_mgr.update_task(
            task_id,
            status="done",
            progress=100,
            result=result.model_dump(mode="json"),
        )
        logger.info(f"OCR ingest complete for '{filename}' ({result.chunks_created} chunks)")

    except Exception as exc:
        logger.error(f"OCR ingest task failed for '{filename}': {exc}")
        task_mgr.update_task(task_id, status="error", error=str(exc))
