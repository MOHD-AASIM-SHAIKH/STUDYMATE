"""Generates flashcards from retrieved context — questions on the front,
answers on the back, grounded entirely in the student's own material."""
import json
import re
from typing import List, Optional

from app.core.logging_config import Timer, get_logger
from app.models.schemas import Flashcard, QAHistoryItem, SourceCitation
from app.services.llm_service import LLMProvider
from app.services.retrieval_service import RetrievalService

logger = get_logger(__name__)

FLASHCARD_SYSTEM_PROMPT_TEMPLATE = """You are StudyMate AI, generating flashcards to help a student study.

=== RETRIEVED CONTEXT ===
{retrieved_chunks}
=== END CONTEXT ===

{history_block}
TOPIC: {topic}
Number of cards: {count}
Difficulty level: {difficulty_level}
Response language: {language}

Generate exactly {count} flashcards as a JSON array. Each flashcard must have:
- "front": a concise question, term, or prompt
- "back": a clear answer or definition
- "topic": the specific subtopic this card belongs to

Respond with ONLY the JSON array, no extra text or markdown formatting.
Example:
[
  {{"front": "What is X?", "back": "X is ...", "topic": "Subtopic name"}},
  {{"front": "Define Y", "back": "Y refers to ...", "topic": "Subtopic name"}}
]

Rules:
- If the provided context above has enough material, use it to make flashcards grounded in the student's materials.
- If the context is insufficient, you MAY generate flashcards from general knowledge to help the student learn. \
Prefer to use the context when available.
- Vary the topics across the cards — do NOT repeat the same subtopic for every card. Cover different aspects of the topic.
- "beginner": simple language, definitions, basic concepts.
- "exam-level": precise terminology, formulas, detailed explanations.
- Respond in the specified language regardless of source language.
- Never invent citations — if using general knowledge, set "topic" to "General Knowledge".
"""

FALLBACK_FLASHCARD_PROMPT_TEMPLATE = """You are StudyMate AI, generating flashcards to help a student study \
a topic using your general knowledge (no specific source material was available).

TOPIC: {topic}
Number of cards: {count}
Difficulty level: {difficulty_level}
Response language: {language}

Generate exactly {count} flashcards as a JSON array. Each flashcard must have:
- "front": a concise question, term, or prompt
- "back": a clear answer or definition
- "topic": the specific subtopic this card belongs to

Respond with ONLY the JSON array, no extra text or markdown formatting.
Rules:
- Cover different aspects of the topic — do NOT repeat the same subtopic.
- Vary the topics across cards.
- Set "topic" to the specific subtopic for each card.
- If you cannot generate meaningful cards on this topic, respond with []."""


class FlashcardService:
    def __init__(self, retrieval_service: RetrievalService, llm_provider: LLMProvider):
        self._retrieval = retrieval_service
        self._llm = llm_provider

    def generate(
        self,
        topic: Optional[str],
        history: List[QAHistoryItem],
        count: int,
        difficulty_level: str,
        language: str,
    ) -> tuple[List[Flashcard], List[SourceCitation], bool]:
        query = topic or self._topic_from_history(history)
        if not query:
            return [], [], False

        chunks = self._retrieval.retrieve(query, top_k=8)

        if not chunks:
            fallback_prompt = FALLBACK_FLASHCARD_PROMPT_TEMPLATE.format(
                topic=query,
                count=count,
                difficulty_level=difficulty_level,
                language=language,
            )
            with Timer(logger, "Flashcard fallback LLM generation (no context)"):
                raw = self._llm.generate(
                    system_prompt=fallback_prompt,
                    user_prompt=f"Generate {count} flashcards on: {query}",
                    temperature=0.7,
                )
            flashcards = self._parse_flashcards(raw.strip())
            if not flashcards:
                return [], [], False
            return flashcards, [], False

        retrieved_text = self._retrieval._format_chunks_for_prompt(chunks)
        history_block = self._format_history(history)

        system_prompt = FLASHCARD_SYSTEM_PROMPT_TEMPLATE.format(
            retrieved_chunks=retrieved_text,
            history_block=history_block,
            topic=query,
            count=count,
            difficulty_level=difficulty_level,
            language=language,
        )

        with Timer(logger, "Flashcard LLM generation"):
            raw = self._llm.generate(
                system_prompt=system_prompt,
                user_prompt=f"Generate {count} flashcards on: {query}",
                temperature=0.7,
            )

        flashcards = self._parse_flashcards(raw.strip())
        if not flashcards:
            return [], [], False

        sources = [
            SourceCitation(
                filename=c.filename,
                page_number=c.page_number,
                section_title=c.section_title,
                similarity_score=c.similarity_score,
            )
            for c in chunks
        ]
        return flashcards, sources, True

    @staticmethod
    def _parse_flashcards(raw: str) -> List[Flashcard]:
        json_match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if not json_match:
            return []
        try:
            data = json.loads(json_match.group())
            return [Flashcard(**item) for item in data if isinstance(item, dict)]
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    @staticmethod
    def _topic_from_history(history: List[QAHistoryItem]) -> Optional[str]:
        if not history:
            return None
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


def get_flashcard_service(
    retrieval_service: RetrievalService = None, llm_provider: LLMProvider = None
) -> FlashcardService:
    return FlashcardService(retrieval_service, llm_provider)
