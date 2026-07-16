"""
Structured logging configuration.

Uses stdlib logging with a JSON-ish formatter so logs are easy to parse in
Render's log viewer / any log aggregator, without pulling in extra deps.
"""
import json
import logging
import sys
import time
from typing import Any, Dict

from app.core.config import get_settings


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Allow callers to attach structured context via `extra={"ctx": {...}}`
        if hasattr(record, "ctx"):
            payload["ctx"] = record.ctx
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    settings = get_settings()
    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())

    # Avoid duplicate handlers on reload
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)

    # Quiet down noisy third-party loggers
    for noisy in ("uvicorn.access", "httpx", "sentence_transformers", "chromadb"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


class Timer:
    """Small context manager for measuring/logging latency of a code block."""

    def __init__(self, logger: logging.Logger, label: str):
        self.logger = logger
        self.label = label
        self.start = 0.0
        self.elapsed_ms = 0.0

    def __enter__(self) -> "Timer":
        self.start = time.perf_counter()
        return self

    def __exit__(self, *exc) -> None:
        self.elapsed_ms = (time.perf_counter() - self.start) * 1000
        self.logger.info(
            f"{self.label} completed",
            extra={"ctx": {"latency_ms": round(self.elapsed_ms, 2)}},
        )
