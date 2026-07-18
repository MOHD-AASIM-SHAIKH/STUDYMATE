"""
Core RAG orchestration: retrieve relevant chunks, build the grounded system
prompt, call the LLM, and attach source citations pulled straight from chunk
metadata (never invented by the model).
"""
from dataclasses import dataclass
from typing import Generator, List, Optional

from app.core.config import Settings, get_settings
from app.core.logging_config import Timer, get_logger
from app.db.chroma_client import ChromaClient
from app.models.schemas import QAHistoryItem, SourceCitation
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMProvider

logger = get_logger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are StudyMate AI, an academic assistant that helps students understand their \
coursework. Answer ONLY using the retrieved context below, which comes from the \
student's own teacher notes or textbook. Do not use outside knowledge or guess.

=== RETRIEVED CONTEXT ===
{retrieved_chunks}
=== END CONTEXT ===

{conversation_history}STUDENT QUESTION: {user_question}
Difficulty level: {difficulty_level}
Response language: {language}

Rules:
- If context is insufficient, say so clearly instead of guessing.
- Always end with a "Source:" line citing filename + page/section from metadata.
- "beginner": simple language, short sentences, analogies, no jargon.
- "exam-level": precise terminology, exam-style structure, key definitions/formulas.
- Respond in the specified language regardless of question language.
- Never invent citations.
- Use the conversation history to understand follow-up questions (e.g., "explain in detail" refers to the previous topic).
"""

NO_CONTEXT_MESSAGE_TEMPLATE = (
    "I don't have enough information in the provided teacher notes/textbook to answer "
    "this question. Please ask your teacher, or upload material that covers this topic."
)


@dataclass
class RetrievedChunk:
    text: str
    filename: str
    page_number: Optional[int]
    section_title: Optional[str]
    similarity_score: float  # 0..1, higher = more similar
    document_id: str = ""
    images: str = ""  # comma-separated image filenames


@dataclass
class RAGResult:
    answer: str
    sources: List[SourceCitation]
    images: List[str]
    sufficient_context: bool


class RetrievalService:
    def __init__(
        self,
        chroma_client: ChromaClient,
        embedding_service: EmbeddingService,
        llm_provider: LLMProvider,
        settings: Settings,
    ):
        self._chroma = chroma_client
        self._embeddings = embedding_service
        self._llm = llm_provider
        self._settings = settings

    def retrieve(self, query: str, top_k: Optional[int] = None) -> List[RetrievedChunk]:
        k = top_k or self._settings.retrieval_top_k
        query_embedding = self._embeddings.embed_one(query)

        with Timer(logger, "Vector store retrieval"):
            results = self._chroma.query(query_embedding, top_k=k)

        chunks: List[RetrievedChunk] = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for doc, meta, distance in zip(docs, metas, distances):
            # Chroma cosine "distance" -> similarity = 1 - distance (with hnsw:space=cosine)
            similarity = max(0.0, 1.0 - distance)
            if similarity < self._settings.similarity_threshold:
                continue
            page_number = meta.get("page_number")
            chunks.append(
                RetrievedChunk(
                    text=doc,
                    filename=meta.get("source_filename", "unknown"),
                    page_number=page_number if page_number and page_number > 0 else None,
                    section_title=meta.get("section_title") or None,
                    similarity_score=round(similarity, 4),
                    document_id=meta.get("document_id", ""),
                    images=meta.get("images", ""),
                )
            )

        logger.info(
            "Retrieval complete",
            extra={"ctx": {"query_len": len(query), "hits": len(chunks), "requested_k": k}},
        )
        return chunks

    def answer_question(
        self,
        question: str,
        difficulty_level: str,
        language: str,
        top_k: Optional[int] = None,
        history: Optional[List[QAHistoryItem]] = None,
        display_question: Optional[str] = None,
    ) -> RAGResult:
        chunks = self.retrieve(question, top_k=top_k)

        if not chunks:
            return RAGResult(answer=NO_CONTEXT_MESSAGE_TEMPLATE, sources=[], images=[], sufficient_context=False)

        retrieved_text = self._format_chunks_for_prompt(chunks)
        history_text = self._format_history_for_prompt(history or [])
        user_question = display_question or question
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            retrieved_chunks=retrieved_text,
            conversation_history=history_text,
            user_question=user_question,
            difficulty_level=difficulty_level,
            language=language,
        )

        with Timer(logger, "LLM generation"):
            raw_answer = self._llm.generate(system_prompt=system_prompt, user_prompt=user_question)

        image_base = "/ingest/images"
        all_images = []
        for c in chunks:
            if c.images:
                for img_name in c.images.split(","):
                    if img_name.strip():
                        all_images.append(f"{image_base}/{c.document_id}/{img_name.strip()}")

        sources = [
            SourceCitation(
                filename=c.filename,
                page_number=c.page_number,
                section_title=c.section_title,
                similarity_score=c.similarity_score,
            )
            for c in chunks
        ]
        return RAGResult(answer=raw_answer.strip(), sources=sources, images=all_images, sufficient_context=True)

    def answer_question_stream(
        self,
        question: str,
        difficulty_level: str,
        language: str,
        top_k: Optional[int] = None,
        history: Optional[List[QAHistoryItem]] = None,
        display_question: Optional[str] = None,
    ) -> Generator[tuple[str, Optional[dict]], None, None]:
        """Like answer_question but yields (token, meta) tuples.
        The first yield has meta with sources/images; subsequent yields have
        meta=None and the text token."""
        chunks = self.retrieve(question, top_k=top_k)

        if not chunks:
            yield ("", {"sources": [], "images": [], "sufficient_context": False})
            return

        retrieved_text = self._format_chunks_for_prompt(chunks)
        history_text = self._format_history_for_prompt(history or [])
        user_question = display_question or question
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            retrieved_chunks=retrieved_text,
            conversation_history=history_text,
            user_question=user_question,
            difficulty_level=difficulty_level,
            language=language,
        )

        image_base = "/ingest/images"
        all_images = []
        for c in chunks:
            if c.images:
                for img_name in c.images.split(","):
                    if img_name.strip():
                        all_images.append(f"{image_base}/{c.document_id}/{img_name.strip()}")

        sources = [
            SourceCitation(
                filename=c.filename,
                page_number=c.page_number,
                section_title=c.section_title,
                similarity_score=c.similarity_score,
            )
            for c in chunks
        ]

        meta = {
            "sources": [s.model_dump() for s in sources],
            "images": all_images,
            "sufficient_context": True,
        }

        # Yield meta first (token="")
        yield ("", meta)

        with Timer(logger, "LLM streaming generation"):
            for token in self._llm.generate_stream(system_prompt=system_prompt, user_prompt=user_question):
                yield (token, None)

    @staticmethod
    def _format_history_for_prompt(history: List[QAHistoryItem]) -> str:
        if not history:
            return ""
        lines = ["=== RECENT CONVERSATION ==="]
        for item in history:
            lines.append(f"Student: {item.question}")
            lines.append(f"Assistant: {item.answer}")
        lines.append("=== END CONVERSATION ===\n")
        return "\n".join(lines) + "\n"

    @staticmethod
    def _format_chunks_for_prompt(chunks: List[RetrievedChunk]) -> str:
        parts = []
        for i, c in enumerate(chunks, start=1):
            loc = c.filename
            if c.page_number:
                loc += f", page {c.page_number}"
            if c.section_title:
                loc += f", section '{c.section_title}'"
            parts.append(f"[Chunk {i} | Source: {loc}]\n{c.text}")
        return "\n\n".join(parts)


def get_retrieval_service(
    chroma_client: ChromaClient = None,
    embedding_service: EmbeddingService = None,
    llm_provider: LLMProvider = None,
    settings: Settings = None,
) -> RetrievalService:  # pragma: no cover - overridden by DI wiring
    return RetrievalService(chroma_client, embedding_service, llm_provider, settings)
