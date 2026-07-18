import json
import re
from typing import List, Optional

from app.core.logging_config import Timer, get_logger
from app.models.schemas import QAHistoryItem, QuizQuestion, SourceCitation
from app.services.llm_service import LLMProvider
from app.services.retrieval_service import RetrievalService

logger = get_logger(__name__)

QUIZ_SYSTEM_PROMPT_TEMPLATE = """You are StudyMate AI, generating a multiple-choice quiz to help a student test \
their knowledge based ONLY on the retrieved context below (their teacher notes/textbook). \
Do not use outside knowledge or guess.

=== RETRIEVED CONTEXT ===
{retrieved_chunks}
=== END CONTEXT ===

TOPIC: {topic}
Number of questions: {count}
Difficulty level: {difficulty_level}
Response language: {language}

Generate exactly {count} multiple-choice questions as a JSON array. Each question must have:
- "question": the question text
- "options": an array of exactly 4 answer choices
- "correct_index": the 0-based index of the correct answer in the options array
- "explanation": a brief explanation of why this is the correct answer
- "topic": the specific subtopic this question tests

Respond with ONLY the JSON array, no extra text or markdown formatting.
Example:
[
  {{
    "question": "What is the powerhouse of the cell?",
    "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
    "correct_index": 1,
    "explanation": "Mitochondria generate most of the cell's ATP through cellular respiration.",
    "topic": "Cell Biology"
  }}
]

Rules:
- If context is insufficient, respond with [] (empty array).
- "beginner": basic recall questions.
- "exam-level": application and analysis questions requiring deeper understanding.
- Respond in the specified language regardless of source language.
- Never invent information — every question must come from the provided context.
- Ensure exactly one correct answer per question.
"""


class QuizService:
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
    ) -> tuple[List[QuizQuestion], List[SourceCitation], bool]:
        query = topic or self._topic_from_history(history)
        if not query:
            return [], [], False

        chunks = self._retrieval.retrieve(query, top_k=8)
        if not chunks:
            return [], [], False

        retrieved_text = self._retrieval._format_chunks_for_prompt(chunks)

        system_prompt = QUIZ_SYSTEM_PROMPT_TEMPLATE.format(
            retrieved_chunks=retrieved_text,
            topic=query,
            count=count,
            difficulty_level=difficulty_level,
            language=language,
        )

        with Timer(logger, "Quiz LLM generation"):
            raw = self._llm.generate(
                system_prompt=system_prompt,
                user_prompt=f"Generate {count} quiz questions on: {query}",
                temperature=0.3,
            )

        questions = self._parse_questions(raw.strip())
        if not questions:
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
        return questions, sources, True

    @staticmethod
    def _parse_questions(raw: str) -> List[QuizQuestion]:
        json_match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if not json_match:
            return []
        try:
            data = json.loads(json_match.group())
            return [QuizQuestion(**item) for item in data if isinstance(item, dict)]
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    @staticmethod
    def _topic_from_history(history: List[QAHistoryItem]) -> Optional[str]:
        if not history:
            return None
        return history[-1].question


def get_quiz_service(
    retrieval_service: RetrievalService = None, llm_provider: LLMProvider = None
) -> QuizService:
    return QuizService(retrieval_service, llm_provider)
