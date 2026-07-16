"""
SQLite persistence for sessions & Q&A history.

Uses SQLAlchemy so swapping to Postgres later is just a connection-string
change (set SQLITE_DB_PATH-equivalent env var to a postgres:// DSN and add
the driver to requirements.txt — no model/query code changes needed).
"""
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


class StudentSession(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True)  # UUID
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_active_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    history = relationship("QAHistory", back_populates="session", cascade="all, delete-orphan")


class QAHistory(Base):
    __tablename__ = "qa_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    difficulty_level = Column(String(20), nullable=False)
    language = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("StudentSession", back_populates="history")


class DocumentMetadata(Base):
    __tablename__ = "document_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), unique=True, nullable=False)
    filename = Column(String(255), nullable=False)
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


_engine = None
_SessionLocal: Optional[sessionmaker] = None


def _init_engine():
    global _engine, _SessionLocal
    settings = get_settings()
    db_path = Path(settings.sqlite_db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    _engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=_engine)
    _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


def get_db() -> Session:
    """FastAPI dependency: yields a DB session, closed after the request."""
    if _SessionLocal is None:
        _init_engine()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
