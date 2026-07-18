import { apiClient } from "./client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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

/** POST /qa/stream (SSE) */
export function askQuestionStream({ question, difficultyLevel, language, sessionId, topK, onToken, onMeta, onDone, onError }) {
  const controller = new AbortController();
  const token = localStorage.getItem("studymate_access_token") || "";

  fetch(`${BASE_URL}/qa/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      difficulty_level: difficultyLevel,
      language,
      session_id: sessionId || null,
      top_k: topK ?? null,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        onError?.(errBody?.error?.message || `Server error ${response.status}`);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: meta")) {
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token !== undefined) {
                onToken?.(data.token);
              } else if (data.done) {
                onDone?.();
              } else if (data.session_id) {
                onMeta?.(data);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError?.(err.message || "Failed to connect to stream");
      }
    });

  return controller;
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

/** POST /flashcards */
export async function generateFlashcards({ topic, sessionId, count, difficultyLevel, language }) {
  const { data } = await apiClient.post("/flashcards", {
    topic: topic || null,
    session_id: sessionId || null,
    count: count || 5,
    difficulty_level: difficultyLevel,
    language,
  });
  return data;
}

/** POST /quiz */
export async function generateQuiz({ topic, sessionId, count = 5, difficultyLevel = "beginner", language = "English" }) {
  const { data } = await apiClient.post("/quiz", {
    topic: topic || null,
    session_id: sessionId || null,
    count,
    difficulty_level: difficultyLevel,
    language,
  });
  return data;
}

/** GET /sessions */
export async function listSessions() {
  const { data } = await apiClient.get("/sessions");
  return data.sessions;
}

/** GET /sessions/:id/history */
export async function getSessionHistory(sessionId, limit = 50) {
  const { data } = await apiClient.get(`/sessions/${encodeURIComponent(sessionId)}/history`, {
    params: { limit },
  });
  return data;
}

/** DELETE /sessions/:id */
export async function deleteSession(sessionId) {
  const { data } = await apiClient.delete(`/sessions/${encodeURIComponent(sessionId)}`);
  return data;
}

/** PATCH /sessions/:id */
export async function renameSession(sessionId, title) {
  const { data } = await apiClient.patch(`/sessions/${encodeURIComponent(sessionId)}`, { title });
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

/** POST /ocr — quick OCR (returns extracted text) */
export async function ocrImage(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/ocr", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return data; // { text, pages }
}

/** POST /ocr/ingest — OCR then chunk/embed/store (async, returns task_id) */
export async function ocrIngest(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/ocr/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return data; // { task_id, status }
}

/** GET /ocr/status/:taskId — poll async OCR task progress */
export async function getOcrStatus(taskId) {
  const { data } = await apiClient.get(`/ocr/status/${encodeURIComponent(taskId)}`);
  return data; // { task_id, status, progress, current_page, total_pages, ocr_text_preview, error, result }
}

/** GET /health */
export async function getHealth() {
  const { data } = await apiClient.get("/health");
  return data;
}
