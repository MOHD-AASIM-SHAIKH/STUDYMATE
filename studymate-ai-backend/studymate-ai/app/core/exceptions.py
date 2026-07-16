"""
Custom exception hierarchy + FastAPI exception handlers.

Goal: every error the client sees is a consistent JSON shape, and no raw
stack traces or internal details ever leak out.
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class StudyMateError(Exception):
    """Base class for all application-raised errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "internal_error"

    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)


class DocumentParsingError(StudyMateError):
    status_code = 422
    error_code = "document_parsing_error"


class UnsupportedFileTypeError(StudyMateError):
    status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    error_code = "unsupported_file_type"


class FileTooLargeError(StudyMateError):
    status_code = 413
    error_code = "file_too_large"


class InsufficientContextError(StudyMateError):
    """Raised internally when retrieval finds nothing usable — usually caught
    and converted into a normal (non-error) 'not enough information' response
    rather than surfaced as an HTTP error, but kept here for completeness."""

    status_code = status.HTTP_200_OK
    error_code = "insufficient_context"


class LLMProviderError(StudyMateError):
    status_code = status.HTTP_502_BAD_GATEWAY
    error_code = "llm_provider_error"


class SessionNotFoundError(StudyMateError):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "session_not_found"


class VectorStoreError(StudyMateError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "vector_store_error"


def _error_response(status_code: int, error_code: str, message: str, details: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": error_code,
                "message": message,
                "details": details or {},
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StudyMateError)
    async def studymate_error_handler(request: Request, exc: StudyMateError) -> JSONResponse:
        logger.warning(
            f"Handled application error: {exc.error_code}",
            extra={"ctx": {"path": str(request.url), "message": exc.message}},
        )
        return _error_response(exc.status_code, exc.error_code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return _error_response(
            422,
            "validation_error",
            "Request validation failed.",
            {"errors": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception on {request.url}")
        return _error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "internal_error",
            "An unexpected error occurred. Please try again later.",
        )
