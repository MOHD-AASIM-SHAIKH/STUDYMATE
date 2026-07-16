"""Simple in-memory LRU cache for repeated identical Q&A requests.

Keyed on (question, difficulty_level, language, corpus size) so the cache
naturally invalidates itself when new documents are ingested (corpus size
changes) without needing an explicit invalidation call.
"""
import hashlib
import threading
from collections import OrderedDict
from typing import Optional

from app.core.config import get_settings


class LRUCache:
    def __init__(self, max_size: int):
        self._max_size = max_size
        self._store: "OrderedDict[str, str]" = OrderedDict()
        self._lock = threading.Lock()

    @staticmethod
    def make_key(*parts: str) -> str:
        raw = "||".join(parts)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Optional[str]:
        with self._lock:
            if key not in self._store:
                return None
            self._store.move_to_end(key)
            return self._store[key]

    def set(self, key: str, value: str) -> None:
        with self._lock:
            self._store[key] = value
            self._store.move_to_end(key)
            if len(self._store) > self._max_size:
                self._store.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


_cache_instance: Optional[LRUCache] = None


def get_cache_service() -> LRUCache:
    """FastAPI dependency provider."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = LRUCache(max_size=get_settings().response_cache_size)
    return _cache_instance
