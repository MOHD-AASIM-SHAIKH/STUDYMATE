"""Handles the ingestion pipeline: parse -> chunk -> embed -> store."""
import uuid
from pathlib import Path
from typing import List

from app.core.config import Settings, get_settings
from app.core.exceptions import FileTooLargeError
from app.core.logging_config import Timer, get_logger
from app.db.chroma_client import ChromaClient
from app.models.schemas import IngestionResponse
from app.services.embedding_service import EmbeddingService
from app.utils.chunking import chunk_text
from app.utils.text_extraction import IMAGES_DIR, extract_text

logger = get_logger(__name__)


class DocumentService:
    def __init__(
        self,
        chroma_client: ChromaClient,
        embedding_service: EmbeddingService,
        settings: Settings,
    ):
        self._chroma = chroma_client
        self._embeddings = embedding_service
        self._settings = settings

    def ingest(self, file_bytes: bytes, filename: str) -> IngestionResponse:
        max_bytes = self._settings.max_upload_size_mb * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise FileTooLargeError(
                f"File exceeds the {self._settings.max_upload_size_mb}MB upload limit."
            )

        with Timer(logger, f"Text extraction for {filename}"):
            pages = extract_text(file_bytes, filename)

        document_id = str(uuid.uuid4())
        all_ids: List[str] = []
        all_texts: List[str] = []
        all_metadatas: List[dict] = []

        # Save extracted images for this document
        saved_images = self._save_extracted_images(document_id, pages)

        running_index = 0
        for page in pages:
            chunks = chunk_text(
                page.text,
                chunk_size_tokens=self._settings.chunk_size_tokens,
                overlap_tokens=self._settings.chunk_overlap_tokens,
                page_number=page.page_number,
                section_title=page.section_title,
                start_index=running_index,
            )
            # Get image filenames for this page
            page_image_files = [
                img["filename"] for img in saved_images
                if img["page_number"] == page.page_number
            ]
            for chunk in chunks:
                all_ids.append(f"{document_id}::{chunk.chunk_index}")
                all_texts.append(chunk.text)
                all_metadatas.append(
                    {
                        "document_id": document_id,
                        "source_filename": filename,
                        "page_number": chunk.page_number if chunk.page_number is not None else -1,
                        "section_title": chunk.section_title or "",
                        "chunk_index": chunk.chunk_index,
                        "images": ",".join(page_image_files) if page_image_files else "",
                    }
                )
                running_index += 1

        page_count = len(pages)

        if not all_texts:
            logger.warning(f"No chunks produced for {filename}")
            return IngestionResponse(document_id=document_id, filename=filename, chunks_created=0, page_count=page_count)

        with Timer(logger, f"Embedding {len(all_texts)} chunks for {filename}"):
            embeddings = self._embeddings.embed(all_texts)

        with Timer(logger, f"Writing chunks to vector store for {filename}"):
            self._chroma.add(ids=all_ids, embeddings=embeddings, documents=all_texts, metadatas=all_metadatas)

        # Persist a copy for cold-start rebuilds (Render free tier disks aren't
        # guaranteed persistent — see README for the rebuild-on-boot fallback).
        self._save_backup_copy(file_bytes, filename)

        logger.info(
            f"Ingested '{filename}'",
            extra={"ctx": {"document_id": document_id, "chunks": len(all_texts)}},
        )
        return IngestionResponse(document_id=document_id, filename=filename, chunks_created=len(all_texts), page_count=page_count)

    def rebuild_index_from_disk_if_empty(self) -> None:
        """Cold-start fallback for ephemeral disks (e.g. Render free tier
        without a persistent volume): if the vector store is empty but
        previously-ingested files still exist on disk, re-ingest them so the
        chatbot doesn't come up with an empty knowledge base."""
        if self._chroma.count() > 0:
            return

        docs_dir = Path(self._settings.ingested_docs_dir)
        if not docs_dir.exists():
            return

        files = [f for f in docs_dir.iterdir() if f.is_file() and f.suffix.lower() in {".pdf", ".docx", ".txt"}]
        if not files:
            return

        logger.info(f"Vector store empty on startup — rebuilding index from {len(files)} file(s) on disk.")
        for f in files:
            try:
                self.ingest(f.read_bytes(), f.name)
            except Exception as exc:  # pragma: no cover - best-effort
                logger.warning(f"Failed to re-ingest '{f.name}' during startup rebuild: {exc}")

    def _save_extracted_images(self, document_id: str, pages) -> List[dict]:
        saved = []
        images_dir = Path(self._settings.chroma_persist_dir).parent / IMAGES_DIR / document_id
        images_dir.mkdir(parents=True, exist_ok=True)
        for page in pages:
            for img in page.images:
                try:
                    img_path = images_dir / img["filename"]
                    img_path.write_bytes(img["image_bytes"])
                    saved.append({
                        "filename": img["filename"],
                        "page_number": img["page_number"],
                    })
                except Exception as exc:
                    logger.warning(f"Failed to save image {img['filename']}: {exc}")
        if saved:
            logger.info(f"Saved {len(saved)} image(s) for document {document_id}")
        return saved

    def _save_backup_copy(self, file_bytes: bytes, filename: str) -> None:

        try:
            out_dir = Path(self._settings.ingested_docs_dir)
            out_dir.mkdir(parents=True, exist_ok=True)
            safe_name = Path(filename).name
            (out_dir / safe_name).write_bytes(file_bytes)
        except Exception as exc:  # pragma: no cover - best-effort, non-fatal
            logger.warning(f"Could not save backup copy of {filename}: {exc}")


def get_document_service(
    chroma_client: ChromaClient = None,  # populated via Depends in api/deps.py
    embedding_service: EmbeddingService = None,
    settings: Settings = None,
) -> DocumentService:  # pragma: no cover - overridden by DI wiring
    return DocumentService(chroma_client, embedding_service, settings or get_settings())
