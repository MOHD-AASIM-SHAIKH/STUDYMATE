"""Token-aware text chunking with overlap, using tiktoken for accurate counts."""
from dataclasses import dataclass
from typing import List, Optional

import tiktoken

_ENCODING = tiktoken.get_encoding("cl100k_base")


@dataclass
class TextChunk:
    text: str
    chunk_index: int
    page_number: Optional[int] = None
    section_title: Optional[str] = None


def chunk_text(
    text: str,
    chunk_size_tokens: int = 500,
    overlap_tokens: int = 50,
    page_number: Optional[int] = None,
    section_title: Optional[str] = None,
    start_index: int = 0,
) -> List[TextChunk]:
    """Splits text into overlapping chunks measured in tokens (not characters),
    which keeps chunk sizes consistent regardless of how dense the prose is."""
    text = text.strip()
    if not text:
        return []

    tokens = _ENCODING.encode(text)
    if len(tokens) <= chunk_size_tokens:
        return [TextChunk(text=text, chunk_index=start_index, page_number=page_number, section_title=section_title)]

    chunks: List[TextChunk] = []
    step = max(chunk_size_tokens - overlap_tokens, 1)
    idx = start_index
    for start in range(0, len(tokens), step):
        window = tokens[start : start + chunk_size_tokens]
        if not window:
            continue
        chunk_str = _ENCODING.decode(window).strip()
        if chunk_str:
            chunks.append(
                TextChunk(
                    text=chunk_str,
                    chunk_index=idx,
                    page_number=page_number,
                    section_title=section_title,
                )
            )
            idx += 1
        if start + chunk_size_tokens >= len(tokens):
            break
    return chunks
