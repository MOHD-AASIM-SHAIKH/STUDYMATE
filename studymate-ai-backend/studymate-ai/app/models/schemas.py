"""Pydantic request/response models for all API endpoints."""
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class DifficultyLevel(str, Enum):
    beginner = "beginner"
    exam_level = "exam-level"


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------
class ChunkMetadata(BaseModel):
    source_filename: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    chunk_index: int


class IngestionResponse(BaseModel):
    document_id: str
    filename: str
    chunks_created: int
    page_count: int = 0
    status: str = "ingested"


class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    uploaded_at: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentInfo]


# ---------------------------------------------------------------------------
# Q&A
# ---------------------------------------------------------------------------
class QARequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    difficulty_level: str = Field(default="beginner", max_length=50)
    language: str = Field(default="English", max_length=50)
    session_id: Optional[str] = Field(
        default=None, description="If omitted, a new session is created and returned."
    )
    top_k: Optional[int] = Field(default=None)

    @field_validator("question")
    @classmethod
    def _strip_question(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("question must not be empty")
        return v


class SourceCitation(BaseModel):
    filename: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    similarity_score: float


class QAResponse(BaseModel):
    session_id: str
    answer: str
    sources: List[SourceCitation]
    sufficient_context: bool
    difficulty_level: str
    language: str
    cached: bool = False
    latency_ms: float


# ---------------------------------------------------------------------------
# Study note generation
# ---------------------------------------------------------------------------
class StudyNoteRequest(BaseModel):
    topic: Optional[str] = Field(default=None, max_length=300)
    session_id: Optional[str] = Field(
        default=None, description="If provided, recent Q&A history from this session is used as additional context."
    )
    difficulty_level: str = Field(default="beginner", max_length=50)
    language: str = Field(default="English", max_length=50)

    @field_validator("topic")
    @classmethod
    def _require_topic_or_session(cls, v, info):
        return v


class StudyNoteResponse(BaseModel):
    markdown: str
    sources: List[SourceCitation]
    sufficient_context: bool


# ---------------------------------------------------------------------------
# Sessions / history
# ---------------------------------------------------------------------------
class QAHistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    difficulty_level: str
    language: str
    created_at: datetime


class SessionHistoryResponse(BaseModel):
    session_id: str
    history: List[QAHistoryItem]


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    environment: str
    vector_store_ready: bool
    llm_provider: str
