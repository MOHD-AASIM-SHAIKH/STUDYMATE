# StudyMate AI — Backend

A production-structured FastAPI backend for a RAG (Retrieval-Augmented Generation)
chatbot that answers student questions **only** from teacher-provided
notes/textbooks, plus a structured Markdown study-note generator. Built entirely
on free tiers: Groq (LLM), local `sentence-transformers` (embeddings), and
ChromaDB (vector store).

## Features

- **Document ingestion** — upload PDF / DOCX / TXT teacher material; it's parsed,
  chunked (~500 tokens, 50-token overlap), embedded locally, and stored in ChromaDB
  with `source_filename`, `page_number`, and `section_title` metadata.
- **Grounded Q&A** — retrieves top-k relevant chunks, builds a strict grounded
  prompt, calls Groq (Llama 3.3 70B), and returns an answer **with a source
  citation**. If retrieved context is below a similarity threshold, it returns a
  clear "not enough information" response instead of letting the LLM guess.
- **Structured study notes** — generates a Markdown study note (headings, bullets,
  summary) from a topic and/or a session's recent Q&A history, grounded in the
  same retrieved context.
- **Multi-language** — every answer/note is generated in the requested
  `language`, regardless of the question's language.
- **Sessions & history** — the backend issues a session id on first use (or
  accepts a client-supplied one) and stores recent Q&A in SQLite, swappable for
  Postgres later by changing the connection string.
- Rate limiting (`slowapi`), in-memory LRU response caching, structured JSON
  logging, env-driven CORS, consistent JSON error responses, and pytest unit
  tests with the Groq call mocked.

## Architecture

```
app/
  core/        # config (pydantic-settings), logging, custom exceptions, rate limiter
  models/      # Pydantic request/response schemas
  services/    # llm_service, embedding_service, retrieval_service, document_service,
               # notes_service, session_service, cache_service
  db/          # ChromaDB + SQLite (SQLAlchemy) clients
  api/
    deps.py    # FastAPI dependency-injection wiring
    routers/   # ingestion, qa, notes, sessions, health
  utils/       # chunking, text extraction
  main.py      # app entrypoint
tests/         # pytest, Groq mocked
```

Services are wired via FastAPI `Depends(...)` (see `app/api/deps.py`) rather than
global singletons — routers never instantiate services directly.

### `LLMProvider` abstraction

`app/services/llm_service.py` defines an `LLMProvider` interface with a
`generate(system_prompt, user_prompt, temperature)` method. `GroqProvider` is the
active implementation. An `OllamaProvider` stub is included — switching to a local
Ollama model later is a **one-line config change** (`LLM_PROVIDER=ollama`), with
zero changes to routers or retrieval logic, since they only ever depend on the
`LLMProvider` interface.

## API Endpoints

| Method | Path                          | Description                                   |
|--------|-------------------------------|------------------------------------------------|
| POST   | `/ingest`                     | Upload a PDF/DOCX/TXT file for ingestion       |
| POST   | `/qa`                         | Ask a grounded question                        |
| POST   | `/notes`                      | Generate a Markdown study note                 |
| GET    | `/sessions/{session_id}/history` | Get recent Q&A history for a session        |
| GET    | `/health`                     | Health check (for Render uptime monitoring)    |
| GET    | `/docs`                       | Interactive Swagger UI (auto-generated)        |

Example `POST /qa` request:

```json
{
  "question": "What is the function of mitochondria?",
  "difficulty_level": "beginner",
  "language": "English",
  "session_id": null
}
```

Response:

```json
{
  "session_id": "3f1b...e2",
  "answer": "Mitochondria are the powerhouse of the cell...\nSource: biology_notes.pdf, page 3",
  "sources": [
    {"filename": "biology_notes.pdf", "page_number": 3, "section_title": "Cell Biology", "similarity_score": 0.81}
  ],
  "sufficient_context": true,
  "difficulty_level": "beginner",
  "language": "English",
  "cached": false,
  "latency_ms": 842.3
}
```

If `session_id` is omitted, the backend creates one and returns it — persist it
client-side and send it back on later requests to keep history/session context.

## Environment Variables

See `.env.example` for the full list. Key ones:

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your free Groq API key (never commit this) |
| `LLM_PROVIDER` | `groq` (default) or `ollama` |
| `LLM_MODEL` | Defaults to `llama-3.3-70b-versatile` |
| `EMBEDDING_MODEL` | Defaults to `all-MiniLM-L6-v2` (local, free) |
| `CHROMA_PERSIST_DIR` | Where ChromaDB persists to disk |
| `SQLITE_DB_PATH` | SQLite file path for sessions/history |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |
| `RETRIEVAL_TOP_K`, `SIMILARITY_THRESHOLD` | Retrieval tuning |
| `RATE_LIMIT_QA`, `RATE_LIMIT_INGEST`, `RATE_LIMIT_DEFAULT` | e.g. `10/minute` |

## Run Locally

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and set GROQ_API_KEY (get a free key at https://console.groq.com)

uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for the interactive API explorer.

## Run Tests

```bash
pytest
```

The Groq API is mocked in `tests/conftest.py` (`mock_llm_provider` fixture), so
tests never burn real API quota. Chroma/SQLite are pointed at an isolated temp
directory for the test session.

## Deploy to Render (free tier)

1. Push this repo to GitHub.
2. In Render: **New → Web Service**, connect the repo, choose **Docker** as the
   environment (the included `Dockerfile` will be used automatically).
3. Add environment variables from `.env.example` in the Render dashboard
   (at minimum `GROQ_API_KEY`; set `ALLOWED_ORIGINS` to your frontend's URL once
   deployed, and `ENVIRONMENT=production`).
4. (Optional, recommended) Add a **persistent disk** mounted at `/app/storage` so
   ChromaDB/SQLite survive restarts. Render's free tier does not include a
   persistent disk — see the next section for the fallback if you skip this.
5. Deploy. Render sets `$PORT` automatically; the Dockerfile's `CMD` already
   reads it.

### Cold start / persistence fallback

If you're on Render's free tier without a persistent disk, `storage/` is wiped on
every restart. To avoid coming up with an empty knowledge base:

- Every successful `/ingest` call also saves a copy of the raw file to
  `ingested_docs/` (see `DocumentService._save_backup_copy`).
- On startup, `DocumentService.rebuild_index_from_disk_if_empty()` checks whether
  the vector store is empty and, if so, re-ingests every file found in
  `ingested_docs/` — so the app self-heals after a cold start, at the cost of a
  slower first boot.
- For a real production deployment, add a persistent disk (or move ChromaDB to a
  hosted vector DB) instead of relying on this fallback.

## Notes on scope / next steps

- **Auth**: session ids are currently unauthenticated (server-issued or
  client-supplied UUIDs) to keep the API frictionless for students. Swapping in
  real login is isolated to `SessionService` — map an authenticated `user_id` to
  sessions instead of trusting the client-supplied id.
- **Swapping SQLite → Postgres**: change `SQLITE_DB_PATH` usage in
  `app/db/sqlite_client.py` to a Postgres DSN and add `psycopg2-binary` to
  `requirements.txt` — no model or query changes needed (pure SQLAlchemy).
- **Swapping Groq → Ollama**: set `LLM_PROVIDER=ollama` and `OLLAMA_BASE_URL` /
  `OLLAMA_MODEL`; no application code changes required.
