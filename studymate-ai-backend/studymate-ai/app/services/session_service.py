import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.core.exceptions import AuthError, SessionNotFoundError
from app.db.sqlite_client import QAHistory, StudentSession
from app.models.schemas import QAHistoryItem, SessionListItem


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
        self._auto_title(session_id, question)

    def _auto_title(self, session_id: str, question: str) -> None:
        session = self._db.get(StudentSession, session_id)
        if not session or session.title:
            return
        title = question.strip()[:80]
        if not title:
            return
        session.title = title
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

    def list_user_sessions(self, user_id: str) -> List[SessionListItem]:
        rows = (
            self._db.query(
                StudentSession.id,
                StudentSession.title,
                StudentSession.created_at,
                StudentSession.last_active_at,
                func.count(QAHistory.id).label("msg_count"),
                func.substr(func.coalesce(QAHistory.question, ""), 1, 60).label("last_preview"),
            )
            .outerjoin(QAHistory, StudentSession.id == QAHistory.session_id)
            .filter(StudentSession.user_id == user_id)
            .group_by(StudentSession.id)
            .order_by(StudentSession.last_active_at.desc())
            .all()
        )
        return [
            SessionListItem(
                id=r.id,
                title=r.title or "New chat",
                created_at=r.created_at,
                last_active_at=r.last_active_at,
                message_count=r.msg_count or 0,
                last_preview=r.last_preview or None,
            )
            for r in rows
        ]

    def delete_session(self, session_id: str, user_id: str) -> None:
        session = self._db.get(StudentSession, session_id)
        if not session:
            raise SessionNotFoundError(f"No session found with id '{session_id}'.")
        if session.user_id != user_id:
            raise AuthError("You do not have access to this session.")
        self._db.delete(session)
        self._db.commit()

    def rename_session(self, session_id: str, title: str, user_id: str) -> StudentSession:
        session = self._db.get(StudentSession, session_id)
        if not session:
            raise SessionNotFoundError(f"No session found with id '{session_id}'.")
        if session.user_id != user_id:
            raise AuthError("You do not have access to this session.")
        session.title = title.strip()[:200]
        self._db.commit()
        return session


def get_session_service(db: DBSession) -> SessionService:
    return SessionService(db)
