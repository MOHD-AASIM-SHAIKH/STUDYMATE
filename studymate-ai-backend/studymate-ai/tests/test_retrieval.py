"""Unit tests for RetrievalService.retrieve() — chunk storage & similarity filtering."""


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
                "section_title": "",
                "chunk_index": 0,
            }
        ],
    )


def test_retrieve_returns_relevant_chunk(retrieval_service, chroma_client, embedding_service):
    _seed_chunk(
        chroma_client,
        embedding_service,
        "Mitochondria are the powerhouse of the cell and generate ATP through respiration.",
        "biology_notes.pdf",
        3,
    )
    _seed_chunk(
        chroma_client,
        embedding_service,
        "The French Revolution began in 1789 and reshaped European politics.",
        "history_notes.pdf",
        1,
    )

    results = retrieval_service.retrieve("What is the function of mitochondria?", top_k=2)

    assert len(results) >= 1
    top = results[0]
    assert top.filename == "biology_notes.pdf"
    assert top.page_number == 3
    assert 0.0 <= top.similarity_score <= 1.0


def test_retrieve_filters_out_low_similarity(retrieval_service, chroma_client, embedding_service, settings):
    _seed_chunk(
        chroma_client,
        embedding_service,
        "The mitochondria is the powerhouse of the cell.",
        "biology_notes.pdf",
        3,
    )

    # An unrelated, very-high threshold effectively guarantees filtering.
    original_threshold = settings.similarity_threshold
    try:
        settings.similarity_threshold = 0.99
        results = retrieval_service.retrieve("What year did World War I start?", top_k=2)
        assert results == []
    finally:
        settings.similarity_threshold = original_threshold


def test_retrieve_empty_store_returns_no_chunks(retrieval_service):
    results = retrieval_service.retrieve("Any question at all")
    assert results == []
