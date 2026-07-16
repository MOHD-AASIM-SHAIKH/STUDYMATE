"""
Session management.

Design: the backend issues an opaque UUID session_id on a student's first
request (when the client sends none). The client is expected to persist and
resend that id on subsequent requests. No login/auth is implemented here —
this keeps the assignment friction-free for students while still giving
each browser/device its own isolated history. Swapping in real auth later
just means mapping an authenticated user_id to sessions instead of trusting
the client-supplied id.
"""
import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session as DBSession

from app.core.exceptions import SessionNotFoundError
from app.db.sqlite_client import QAHistory, StudentSession
from app.models.schemas import QAHistoryItem


class SessionService:
    def __init__(self, db: DBSession):
        self._db = db

    def get_or_create(self, session_id: str | None, user_id: str | None = None) -> str:
        if session_id:
            existing = self._db.get(StudentSession, session_id)
            if existing:
                existing.last_active_at = datetime.now(timezone.utc)
                self._db.commit()
                return existing.id
            new_session = StudentSession(id=session_id, user_id=user_id or "")
            self._db.add(new_session)
            self._db.commit()
            return new_session.id

        new_id = str(uuid.uuid4())
        self._db.add(StudentSession(id=new_id, user_id=user_id or ""))
        self._db.commit()
        return new_id

    def require_existing(self, session_id: str) -> StudentSession:
        session = self._db.get(StudentSession, session_id)
        if not session:
            raise SessionNotFoundError(f"No session found with id '{session_id}'.")
        return session

    def record_qa(
        self, session_id: str, question: str, answer: str, difficulty_level: str, language: str
    ) -> None:
        entry = QAHistory(
            session_id=session_id,
            question=question,
            answer=answer,
            difficulty_level=difficulty_level,
            language=language,
        )
        self._db.add(entry)
        self._db.commit()

    def get_history(self, session_id: str, limit: int = 20) -> List[QAHistoryItem]:
        self.require_existing(session_id)
        rows = (
            self._db.query(QAHistory)
            .filter(QAHistory.session_id == session_id)
            .order_by(QAHistory.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            QAHistoryItem(
                id=r.id,
                question=r.question,
                answer=r.answer,
                difficulty_level=r.difficulty_level,
                language=r.language,
                created_at=r.created_at,
            )
            for r in reversed(rows)
        ]


def get_session_service(db: DBSession) -> SessionService:  # pragma: no cover - overridden by DI wiring
    return SessionService(db)
