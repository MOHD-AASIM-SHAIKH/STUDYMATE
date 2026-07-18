from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session as DBSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AuthError, DuplicateEmailError
from app.db.sqlite_client import TokenBlacklist, User, cleanup_expired_blacklist
from app.models.schemas import UserPublic

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, settings: Settings) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid4()),
        "type": "access",
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str, settings: Settings) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid4()),
        "type": "refresh",
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, settings: Settings) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise AuthError("Invalid or expired token.")


def _blacklist_token(db: DBSession, jti: str, token_type: str, expires_at: datetime) -> None:
    entry = TokenBlacklist(
        jti=jti,
        token_type=token_type,
        expires_at=expires_at,
    )
    db.add(entry)
    db.commit()


def _is_token_blacklisted(db: DBSession, jti: str) -> bool:
    return db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first() is not None


def verify_refresh_token(token: str, settings: Settings, db: DBSession) -> dict:
    payload = decode_token(token, settings)
    if payload.get("type") != "refresh":
        raise AuthError("Invalid token type.")

    jti = payload.get("jti")
    if jti and _is_token_blacklisted(db, jti):
        raise AuthError("Refresh token has been revoked.")

    return payload


def revoke_refresh_token(token: str, settings: Settings, db: DBSession) -> None:
    payload = decode_token(token, settings)
    jti = payload.get("jti")
    if jti:
        exp_ts = payload.get("exp")
        expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)
        _blacklist_token(db, jti, "refresh", expires_at)


def rotate_refresh_token(
    old_token: str, settings: Settings, db: DBSession
) -> tuple[str, str, dict]:
    payload = verify_refresh_token(old_token, settings, db)

    jti = payload.get("jti")
    if jti:
        exp_ts = payload.get("exp")
        expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)
        _blacklist_token(db, jti, "refresh", expires_at)

    cleanup_expired_blacklist(db)

    user_id = payload.get("sub")
    new_access = create_access_token(user_id, settings)
    new_refresh = create_refresh_token(user_id, settings)
    return new_access, new_refresh, payload


def get_user_by_email(db: DBSession, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: DBSession, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def register_user(db: DBSession, email: str, password: str, display_name: str) -> User:
    existing = get_user_by_email(db, email)
    if existing:
        raise DuplicateEmailError("An account with this email already exists.")
    user = User(
        id=str(uuid4()),
        email=email,
        display_name=display_name,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    return user


def authenticate_user(db: DBSession, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise AuthError("Invalid email or password.")
    return user


def user_to_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at,
    )
