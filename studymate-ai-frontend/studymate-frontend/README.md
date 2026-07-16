# StudyMate AI — Frontend

A React + Vite frontend for StudyMate AI: a calm, textbook-inspired interface for
asking grounded questions, uploading course material, and generating exportable
study notes.

## Design

Light/dark themes built around a "notebook and chalkboard" palette (sage paper,
ink-green text, muted forest-green accent, amber highlighter-tab accent) with a
serif display face (Source Serif 4) for headings/answers and a grotesk (Inter)
for UI chrome, plus a monospace face (IBM Plex Mono) for citations — so a source
citation always *reads* like an index card, distinct from the AI's prose above
it. Theme is in-memory only per the brief (no localStorage/sessionStorage).

## Stack

React 18 + Vite, Tailwind CSS, React Router, Axios, react-markdown + remark-gfm,
jsPDF (lazy-loaded only when exporting a PDF, to keep the main bundle lean).

## Project structure

```
src/
  api/        # client.js (axios instance + error normalization), endpoints.js
  context/    # SessionContext (session id, difficulty, language, chat state),
              # ThemeContext (light/dark, in-memory)
  hooks/      # useChat, useUpload, useNotes, useHistory
  components/ # ChatBubble, SourceCitation, DifficultyToggle, LanguageSelector,
              # FileUploader, NoteViewer, Nav, ThemeToggle, LoadingSkeleton, ErrorBanner
  pages/      # ChatPage, LibraryPage, NotesPage, HistoryPage
```

## Backend API contract this frontend expects

This matches the StudyMate AI FastAPI backend exactly (see its README for full
schemas). If you point this at a different backend, match this shape:

| Method | Path | Request body | Response |
|---|---|---|---|
| `POST` | `/qa` | `{question, difficulty_level, language, session_id, top_k}` | `{session_id, answer, sources[], sufficient_context, difficulty_level, language, cached, latency_ms}` |
| `POST` | `/notes` | `{topic, session_id, difficulty_level, language}` | `{markdown, sources[], sufficient_context}` |
| `POST` | `/ingest` | multipart `file` | `{document_id, filename, chunks_created, status}` |
| `GET` | `/ingest/documents` | — | `{documents: [{filename, uploaded_at, page_count, chunk_count}]}` |
| `GET` | `/sessions/{id}/history?limit=` | — | `{session_id, history: [{id, question, answer, difficulty_level, language, created_at}]}` |
| `GET` | `/health` | — | `{status, environment, vector_store_ready, llm_provider}` |

`source` objects: `{filename, page_number, section_title, similarity_score}`.

Errors are expected as `{error: {code, message, details}}` with a non-2xx status
— the Axios interceptor in `src/api/client.js` reads exactly this shape.

`difficulty_level` is one of `"beginner"` / `"exam-level"`. `language` is a
free-text string (`"English"`, `"Spanish"`, etc.) — see `LANGUAGES` in
`src/context/SessionContext.jsx` to add more.

## Environment variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend, no trailing slash (e.g. `http://localhost:8000` locally, your Render URL in production) |

Copy `.env.example` to `.env` and set it before running.

## Run locally

```bash
npm install
cp .env.example .env
# edit .env: VITE_API_BASE_URL=http://localhost:8000  (or wherever your backend runs)
npm run dev
```

Visit `http://localhost:5173`.

**Make sure the backend's CORS is configured to allow this origin** — set
`ALLOWED_ORIGINS=http://localhost:5173` (comma-separate more if needed) in the
backend's `.env`, then restart it.

## Build & lint

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
npm run lint
```

## Deploy to Vercel (free tier)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. Framework preset: **Vite**.
3. Set the environment variable `VITE_API_BASE_URL` to your deployed backend's
   URL (e.g. your Render service URL) in Vercel's project settings.
4. Deploy. `vercel.json` is included so client-side routes (`/library`,
   `/notes`, `/history`) resolve correctly on refresh/direct navigation.
5. Once deployed, add the Vercel URL to the backend's `ALLOWED_ORIGINS` and
   redeploy the backend so CORS allows it.

## Notes on scope

- No auth/login is implemented (matches the backend, which issues anonymous
  session ids). If you add auth later, gate `SessionContext` behind it.
- The Library page's document list relies on a `GET /ingest/documents` endpoint
  that was added to the backend alongside this frontend — if you're using an
  older copy of the backend, add that endpoint or the Library list will show
  an error banner (with a Retry button) instead of crashing.
