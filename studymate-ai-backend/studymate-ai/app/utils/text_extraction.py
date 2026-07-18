"""Extracts text (with page numbers / section titles where available) from
PDF, DOCX, and TXT files."""
import imghdr
import io
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import pdfplumber
from docx import Document as DocxDocument

from app.core.exceptions import DocumentParsingError, UnsupportedFileTypeError

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}

# Matches lines that look like headings, e.g. "1. Introduction", "Chapter 2:", "## Title"
_HEADING_RE = re.compile(r"^(#{1,3}\s+.+|chapter\s+\w+.*|\d+(\.\d+)*\s+[A-Z].{0,80})$", re.IGNORECASE)

IMAGES_DIR = "extracted_images"


@dataclass
class ExtractedPage:
    text: str
    page_number: Optional[int]
    section_title: Optional[str]
    images: List[dict] = field(default_factory=list)


def extract_text(file_bytes: bytes, filename: str) -> List[ExtractedPage]:
    ext = _get_extension(filename)
    if ext == ".pdf":
        return _extract_pdf(file_bytes)
    if ext == ".docx":
        return _extract_docx(file_bytes)
    if ext == ".txt":
        return _extract_txt(file_bytes)
    raise UnsupportedFileTypeError(
        f"Unsupported file type '{ext}'. Supported types: {sorted(SUPPORTED_EXTENSIONS)}"
    )


def _get_extension(filename: str) -> str:
    idx = filename.rfind(".")
    if idx == -1:
        raise UnsupportedFileTypeError("File has no extension.")
    return filename[idx:].lower()


def _extract_pdf(file_bytes: bytes) -> List[ExtractedPage]:
    pages: List[ExtractedPage] = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if not text.strip():
                    text = ""
                section_title = _guess_section_title(text) if text.strip() else None

                # Extract images from this page
                page_images = []
                for img_idx, img in enumerate(page.images):
                    try:
                        stream = img.get("stream")
                        if stream and hasattr(stream, "get_data"):
                            img_bytes = stream.get_data()
                            ext = _guess_image_ext(img_bytes, img.get("name", ""))
                            if ext:
                                page_images.append({
                                    "filename": f"page{i}_img{img_idx}.{ext}",
                                    "page_number": i,
                                    "image_bytes": img_bytes,
                                })
                    except Exception:
                        continue

                pages.append(
                    ExtractedPage(
                        text=text,
                        page_number=i,
                        section_title=section_title,
                        images=page_images,
                    )
                )
    except Exception as exc:
        raise DocumentParsingError(f"Failed to parse PDF: {exc}") from exc

    if not pages:
        raise DocumentParsingError("No extractable text found in PDF (it may be a scanned/image-only PDF).")
    return pages


def _guess_image_ext(image_bytes: bytes, name_hint: str) -> Optional[str]:
    """Determine image extension from magic bytes or filename hint."""
    if name_hint:
        ext = name_hint.rsplit(".", 1)[-1].lower()
        if ext in ("png", "jpg", "jpeg", "gif", "bmp", "tiff"):
            return "jpg" if ext in ("jpg", "jpeg") else ext
    try:
        fmt = imghdr.what(None, h=image_bytes[:32])
        if fmt:
            return fmt
    except Exception:
        pass
    # Fallback: check magic bytes
    if image_bytes[:4] == b"\x89PNG":
        return "png"
    if image_bytes[:2] in (b"\xff\xd8",):
        return "jpg"
    if image_bytes[:2] == b"BM":
        return "bmp"
    return None


def _extract_docx(file_bytes: bytes) -> List[ExtractedPage]:
    import io

    try:
        doc = DocxDocument(io.BytesIO(file_bytes))
    except Exception as exc:
        raise DocumentParsingError(f"Failed to parse DOCX: {exc}") from exc

    pages: List[ExtractedPage] = []
    current_section: Optional[str] = None
    buffer: List[str] = []

    def flush():
        if buffer:
            pages.append(
                ExtractedPage(text="\n".join(buffer), page_number=None, section_title=current_section)
            )
            buffer.clear()

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        is_heading = para.style.name.lower().startswith("heading") if para.style else False
        if is_heading:
            flush()
            current_section = text
        else:
            buffer.append(text)
    flush()

    if not pages:
        raise DocumentParsingError("No extractable text found in DOCX.")
    return pages


def _extract_txt(file_bytes: bytes) -> List[ExtractedPage]:
    try:
        text = file_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        raise DocumentParsingError(f"Failed to decode TXT file: {exc}") from exc

    if not text.strip():
        raise DocumentParsingError("TXT file is empty.")

    section_title = _guess_section_title(text)
    return [ExtractedPage(text=text, page_number=None, section_title=section_title)]


def _guess_section_title(text: str) -> Optional[str]:
    for line in text.splitlines()[:5]:
        line = line.strip()
        if line and _HEADING_RE.match(line):
            return line[:120]
    return None
