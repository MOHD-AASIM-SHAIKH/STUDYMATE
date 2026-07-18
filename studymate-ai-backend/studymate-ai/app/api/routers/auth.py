from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session as DBSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.exceptions import AuthError
from app.core.security import limiter
from app.db.sqlite_client import User, get_db
from app.models.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_user_by_id,
    register_user,
    revoke_refresh_token,
    rotate_refresh_token,
    user_to_public,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    user = register_user(db, payload.email, payload.password, payload.display_name)
    access_token = create_access_token(user.id, get_settings())
    refresh_token = create_refresh_token(user.id, get_settings())
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_to_public(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(
    request: Request,
    payload: LoginRequest,
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    access_token = create_access_token(user.id, get_settings())
    refresh_token = create_refresh_token(user.id, get_settings())
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_to_public(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    payload: RefreshRequest,
    db: DBSession = Depends(get_db),
) -> TokenResponse:
    settings = get_settings()
    access_token, refresh_token, token_data = rotate_refresh_token(
        payload.refresh_token, settings, db
    )

    user_id = token_data.get("sub")
    user = get_user_by_id(db, user_id)
    if not user:
        raise AuthError("User not found.")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_to_public(user),
    )


@router.post("/logout", status_code=204)
def logout(
    payload: RefreshRequest,
    db: DBSession = Depends(get_db),
) -> None:
    settings = get_settings()
    revoke_refresh_token(payload.refresh_token, settings, db)


@router.get("/me", response_model=UserPublic)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserPublic:
    return user_to_public(current_user)
