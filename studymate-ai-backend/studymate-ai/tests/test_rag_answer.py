"""Unit tests for RetrievalService.answer_question() — grounded answers,
mandatory citations, and the 'not enough information' fallback. The Groq
API is always mocked here so tests never burn real quota."""
from app.models.schemas import DifficultyLevel


def _seed_chunk(chroma_client, embedding_service, text: str, filename: str, page: int):
    vector = embedding_service.embed_one(text)
    chroma_client.add(
        ids=[f"{filename}::{page}"],
        embeddings=[vector],
        documents=[text],
        metadatas=[
            {
                "document_id": "doc-1",
                "source_filename": filename,
                "page_number": page,
                "section_title": "Cell Biology",
                "chunk_index": 0,
            }
        ],
    )


def test_answer_question_uses_llm_and_returns_sources(
    retrieval_service, chroma_client, embedding_service, mock_llm_provider
):
    _seed_chunk(
        chroma_client,
        embedding_service,
        "Mitochondria are the powerhouse of the cell and generate ATP.",
        "biology_notes.pdf",
        3,
    )

    result = retrieval_service.answer_question(
        question="What do mitochondria do?",
        difficulty_level=DifficultyLevel.beginner,
        language="English",
    )

    assert result.sufficient_context is True
    assert "powerhouse" in result.answer.lower()
    assert len(result.sources) == 1
    assert result.sources[0].filename == "biology_notes.pdf"
    assert result.sources[0].page_number == 3
    mock_llm_provider.generate.assert_called_once()

    # The system prompt sent to the LLM must actually contain the retrieved
    # context and question — i.e. the grounding contract is respected.
    _, kwargs = mock_llm_provider.generate.call_args
    assert "RETRIEVED CONTEXT" in kwargs["system_prompt"]
    assert "What do mitochondria do?" in kwargs["system_prompt"]


def test_answer_question_returns_no_context_message_when_store_empty(
    retrieval_service, mock_llm_provider
):
    result = retrieval_service.answer_question(
        question="What is quantum entanglement?",
        difficulty_level=DifficultyLevel.exam_level,
        language="English",
    )

    assert result.sufficient_context is False
    assert result.sources == []
    assert "not enough information" in result.answer.lower()
    # LLM should never be called when there's no usable context to ground it.
    mock_llm_provider.generate.assert_not_called()


def test_answer_question_respects_language_and_difficulty_in_prompt(
    retrieval_service, chroma_client, embedding_service, mock_llm_provider
):
    _seed_chunk(
        chroma_client,
        embedding_service,
        "Photosynthesis converts light energy into chemical energy in plants.",
        "biology_notes.pdf",
        10,
    )

    retrieval_service.answer_question(
        question="Explain photosynthesis",
        difficulty_level=DifficultyLevel.exam_level,
        language="Spanish",
    )

    _, kwargs = mock_llm_provider.generate.call_args
    assert "Spanish" in kwargs["system_prompt"]
    assert "exam-level" in kwargs["system_prompt"]
