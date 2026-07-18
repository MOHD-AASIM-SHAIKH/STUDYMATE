"""
LLM provider abstraction.

`LLMProvider` is the interface every backend must implement. `GroqProvider`
is the active implementation today (free tier, hosted). `OllamaProvider` is
a ready-to-fill stub — swapping providers is a one-line config change
(LLM_PROVIDER=ollama) with no changes to calling code (retrieval_service,
routers, etc. only ever talk to `LLMProvider`).
"""
from abc import ABC, abstractmethod
from typing import Generator, Optional

from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import Settings, get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class LLMProvider(ABC):
    """Interface all LLM backends must implement."""

    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        """Return the model's text completion for the given prompts."""
        raise NotImplementedError

    def generate_stream(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.2
    ) -> Generator[str, None, None]:
        """Yield text chunks as they are generated. Default falls back to
        non-streaming for providers that don't implement streaming."""
        yield self.generate(system_prompt, user_prompt, temperature)


class GroqProvider(LLMProvider):
    def __init__(self, settings: Settings):
        if not settings.groq_api_key:
            logger.warning("GROQ_API_KEY is not set — Groq calls will fail until it is configured.")
        self._client = Groq(api_key=settings.groq_api_key)
        self._model = settings.llm_model
        self._timeout = settings.llm_timeout_seconds

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        try:
            completion = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=1500,
                timeout=self._timeout,
            )
            return completion.choices[0].message.content or ""
        except Exception as exc:
            logger.error("Groq API call failed", extra={"ctx": {"error": str(exc)}})
            raise LLMProviderError("The AI provider failed to respond. Please try again shortly.") from exc

    def generate_stream(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.2
    ) -> Generator[str, None, None]:
        try:
            stream = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=1500,
                timeout=self._timeout,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            logger.error("Groq streaming API call failed", extra={"ctx": {"error": str(exc)}})
            raise LLMProviderError("The AI provider failed to respond. Please try again shortly.") from exc


class OllamaProvider(LLMProvider):
    """Local Ollama backend — drop-in replacement for GroqProvider.

    Left intentionally minimal since it's not the active provider today;
    fill in once a local Ollama server is available in the deployment
    environment. Uses the standard Ollama HTTP API (/api/chat).
    """

    def __init__(self, settings: Settings):
        self._base_url = settings.ollama_base_url.rstrip("/")
        self._model = settings.ollama_model
        self._timeout = settings.llm_timeout_seconds

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        import httpx

        try:
            resp = httpx.post(
                f"{self._base_url}/api/chat",
                json={
                    "model": self._model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "options": {"temperature": temperature},
                    "stream": False,
                },
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return resp.json().get("message", {}).get("content", "")
        except Exception as exc:
            logger.error("Ollama API call failed", extra={"ctx": {"error": str(exc)}})
            raise LLMProviderError("The local AI provider failed to respond.") from exc


_provider_instance: Optional[LLMProvider] = None


def get_llm_provider() -> LLMProvider:
    """FastAPI dependency provider — returns a singleton based on config."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    settings = get_settings()
    if settings.llm_provider == "ollama":
        _provider_instance = OllamaProvider(settings)
    else:
        _provider_instance = GroqProvider(settings)
    return _provider_instance
