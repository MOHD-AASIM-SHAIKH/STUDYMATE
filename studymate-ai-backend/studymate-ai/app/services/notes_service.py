"""Generates structured Markdown study notes from retrieved context, either
around a topic or from a session's recent Q&A history."""
from typing import List, Optional

from app.core.logging_config import Timer, get_logger
from app.models.schemas import QAHistoryItem, SourceCitation
from app.services.llm_service import LLMProvider
from app.services.retrieval_service import RetrievalService

logger = get_logger(__name__)

NOTES_SYSTEM_PROMPT_TEMPLATE = """You are StudyMate AI, generating a well-organized study note for a student, \
based ONLY on the retrieved context below (their teacher notes/textbook) and, if provided, \
their recent question history on this topic. Do not use outside knowledge or guess.

=== RETRIEVED CONTEXT ===
{retrieved_chunks}
=== END CONTEXT ===

{history_block}
TOPIC: {topic}
Difficulty level: {difficulty_level}
Response language: {language}

Produce the study note as clean Markdown with:
- A clear title (H1)
- Organized headings/subheadings (H2/H3) grouping related ideas
- Bullet points for key facts, definitions, or steps
- A short "Summary" section at the end
- A final "Source:" line citing filename + page/section from metadata

Rules:
- If context is insufficient, say so clearly instead of guessing.
- "beginner": simple language, short sentences, analogies, no jargon.
- "exam-level": precise terminology, key definitions/formulas, exam-style structure.
- Respond in the specified language regardless of source language.
- Never invent citations.
"""

NO_CONTEXT_NOTE = (
    "# Not Enough Information\n\n"
    "There isn't enough material in the provided teacher notes/textbook to generate "
    "a study note on this topic. Try a different topic or upload more source material."
)


class NotesService:
    def __init__(self, retrieval_service: RetrievalService, llm_provider: LLMProvider):
        self._retrieval = retrieval_service
        self._llm = llm_provider

    def generate(
        self,
        topic: Optional[str],
        history: List[QAHistoryItem],
        difficulty_level: str,
        language: str,
    ) -> tuple[str, List[SourceCitation], bool]:
        query = topic or self._topic_from_history(history)
        if not query:
            return NO_CONTEXT_NOTE, [], False

        chunks = self._retrieval.retrieve(query)
        if not chunks:
            return NO_CONTEXT_NOTE, [], False

        retrieved_text = self._retrieval._format_chunks_for_prompt(chunks)
        history_block = self._format_history(history)

        system_prompt = NOTES_SYSTEM_PROMPT_TEMPLATE.format(
            retrieved_chunks=retrieved_text,
            history_block=history_block,
            topic=query,
            difficulty_level=difficulty_level,
            language=language,
        )

        with Timer(logger, "Study note LLM generation"):
            markdown = self._llm.generate(system_prompt=system_prompt, user_prompt=f"Generate notes on: {query}")

        sources = [
            SourceCitation(
                filename=c.filename,
                page_number=c.page_number,
                section_title=c.section_title,
                similarity_score=c.similarity_score,
            )
            for c in chunks
        ]
        return markdown.strip(), sources, True

    @staticmethod
    def _topic_from_history(history: List[QAHistoryItem]) -> Optional[str]:
        if not history:
            return None
        # Use the most recent question as the implicit topic.
        return history[-1].question

    @staticmethod
    def _format_history(history: List[QAHistoryItem]) -> str:
        if not history:
            return ""
        lines = ["=== RECENT Q&A HISTORY (for additional context only) ==="]
        for item in history[-5:]:
            lines.append(f"Q: {item.question}\nA: {item.answer}")
        lines.append("=== END HISTORY ===\n")
        return "\n".join(lines)


def get_notes_service(
    retrieval_service: RetrievalService = None, llm_provider: LLMProvider = None
) -> NotesService:  # pragma: no cover - overridden by DI wiring
    return NotesService(retrieval_service, llm_provider)
