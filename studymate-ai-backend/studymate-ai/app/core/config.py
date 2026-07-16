"""
Centralized application configuration.

All configuration is loaded from environment variables (via a .env file in
development). Nothing sensitive is ever hardcoded here — see .env.example
for the full list of variables a deployment needs to provide.
"""
from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- LLM provider ---
    llm_provider: str = Field(default="groq")  # "groq" | "ollama"
    groq_api_key: str = Field(default="")
    llm_model: str = Field(default="llama-3.3-70b-versatile")
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="llama3.1")
    llm_timeout_seconds: int = Field(default=30)
    llm_max_retries: int = Field(default=2)

    # --- Embeddings ---
    embedding_model: str = Field(default="all-MiniLM-L6-v2")

    # --- Vector store ---
    chroma_persist_dir: str = Field(default="./storage/chroma")
    chroma_collection_name: str = Field(default="studymate_docs")

    # --- SQLite ---
    sqlite_db_path: str = Field(default="./storage/studymate.db")

    # --- Retrieval ---
    retrieval_top_k: int = Field(default=4)
    similarity_threshold: float = Field(default=0.35)
    chunk_size_tokens: int = Field(default=500)
    chunk_overlap_tokens: int = Field(default=50)

    # --- App ---
    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")
    allowed_origins: str = Field(default="http://localhost:5173")
    ingested_docs_dir: str = Field(default="./ingested_docs")
    max_upload_size_mb: int = Field(default=25)

    # --- Rate limiting ---
    rate_limit_qa: str = Field(default="10/minute")
    rate_limit_ingest: str = Field(default="5/minute")
    rate_limit_default: str = Field(default="60/minute")

    # --- Auth / JWT ---
    jwt_secret_key: str = Field(default="change-me-in-production-use-a-long-random-string")
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_token_expire_minutes: int = Field(default=60)
    jwt_refresh_token_expire_days: int = Field(default=7)

    # --- Cache ---
    response_cache_size: int = Field(default=256)

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @field_validator("similarity_threshold")
    @classmethod
    def _validate_threshold(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("similarity_threshold must be between 0 and 1")
        return v


@lru_cache
def get_settings() -> Settings:
    """Settings are cached so the .env file is only parsed once per process."""
    return Settings()
