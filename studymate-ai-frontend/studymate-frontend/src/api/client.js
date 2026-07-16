/**
 * Centralized Axios instance. Every API call in the app goes through this
 * client so the base URL and error handling stay in one place.
 *
 * Backend contract assumed (see README.md "Backend API contract" section
 * for the full field-by-field shape):
 *   POST   /ingest              (multipart/form-data: file)   -> IngestionResponse
 *   GET    /ingest/documents                                  -> DocumentListResponse
 *   POST   /qa                  (json)                        -> QAResponse
 *   POST   /notes                (json)                       -> StudyNoteResponse
 *   GET    /sessions/:id/history?limit=                       -> SessionHistoryResponse
 *   GET    /health                                             -> HealthResponse
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!BASE_URL && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_API_BASE_URL is not set. Copy .env.example to .env and point it at your backend."
  );
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
  headers: {
    Accept: "application/json",
  },
});

/**
 * Normalizes every error into a consistent shape so components never need
 * to know whether it came from the network, a 4xx/5xx, or a timeout.
 */
export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? null;
    this.code = code ?? "unknown_error";
    this.details = details ?? {};
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Backend returns { error: { code, message, details } } per its
      // consistent JSON error contract.
      const payload = error.response.data?.error;
      return Promise.reject(
        new ApiError(payload?.message || "The server returned an error.", {
          status: error.response.status,
          code: payload?.code,
          details: payload?.details,
        })
      );
    }
    if (error.code === "ECONNABORTED") {
      return Promise.reject(
        new ApiError("The request timed out. Please try again.", { code: "timeout" })
      );
    }
    return Promise.reject(
      new ApiError("Couldn't reach the server. Check your connection and try again.", {
        code: "network_error",
      })
    );
  }
);
