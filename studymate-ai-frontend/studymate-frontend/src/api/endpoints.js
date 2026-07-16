import { apiClient } from "./client";

/** POST /qa */
export async function askQuestion({ question, difficultyLevel, language, sessionId, topK }) {
  const { data } = await apiClient.post("/qa", {
    question,
    difficulty_level: difficultyLevel,
    language,
    session_id: sessionId || null,
    top_k: topK ?? null,
  });
  return data;
}

/** POST /notes */
export async function generateNote({ topic, sessionId, difficultyLevel, language }) {
  const { data } = await apiClient.post("/notes", {
    topic: topic || null,
    session_id: sessionId || null,
    difficulty_level: difficultyLevel,
    language,
  });
  return data;
}

/** GET /sessions/:id/history */
export async function getSessionHistory(sessionId, limit = 50) {
  const { data } = await apiClient.get(`/sessions/${encodeURIComponent(sessionId)}/history`, {
    params: { limit },
  });
  return data;
}

/** POST /ingest (multipart) */
export async function uploadDocument(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return data;
}

/** GET /ingest/documents */
export async function listDocuments() {
  const { data } = await apiClient.get("/ingest/documents");
  return data.documents;
}

/** GET /health */
export async function getHealth() {
  const { data } = await apiClient.get("/health");
  return data;
}
