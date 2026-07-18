import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { getSessionHistory, listSessions, deleteSession as apiDelete, renameSession as apiRename } from "../api/endpoints";
import { useAuth } from "./AuthContext";

const SessionContext = createContext(null);

export const LANGUAGES = [
  { code: "English", label: "English" },
  { code: "Spanish", label: "Español" },
  { code: "Hindi", label: "हिन्दी" },
  { code: "French", label: "Français" },
];

const SESSION_KEY = "studymate_session_id";
const DIFFICULTY_KEY = "studymate_difficulty";
const LANGUAGE_KEY = "studymate_language";

function getFromStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : fallback;
  } catch {
    return fallback;
  }
}

function setToStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
  }
}

export function SessionProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sessionId, setSessionIdState] = useState(() => getFromStorage(SESSION_KEY, null));
  const [difficultyLevel, setDifficultyLevelState] = useState(() => getFromStorage(DIFFICULTY_KEY, "beginner"));
  const [language, setLanguageState] = useState(() => getFromStorage(LANGUAGE_KEY, "English"));
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const sessionErrorTimer = useRef(null);

  const showError = useCallback((msg) => {
    setSessionError(msg);
    if (sessionErrorTimer.current) clearTimeout(sessionErrorTimer.current);
    sessionErrorTimer.current = setTimeout(() => setSessionError(null), 5000);
  }, []);

  const clearSessionError = useCallback(() => {
    setSessionError(null);
    if (sessionErrorTimer.current) {
      clearTimeout(sessionErrorTimer.current);
      sessionErrorTimer.current = null;
    }
  }, []);

  const setSessionId = useCallback((id) => {
    setSessionIdState(id);
    if (id) {
      setToStorage(SESSION_KEY, id);
    } else {
      removeFromStorage(SESSION_KEY);
    }
  }, []);

  const setDifficultyLevel = useCallback((level) => {
    setDifficultyLevelState(level);
    setToStorage(DIFFICULTY_KEY, level);
  }, []);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    setToStorage(LANGUAGE_KEY, lang);
  }, []);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), createdAt: new Date(), ...message }]);
  }, []);

  const updateLastMessage = useCallback((id, updates) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, [setSessionId]);

  const replaceMessages = useCallback((newMessages) => {
    setMessages(newMessages);
  }, []);

  const createNewSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, [setSessionId]);

  const switchSession = useCallback(async (id) => {
    if (id === sessionId) return;
    setIsLoadingHistory(true);
    try {
      const data = await getSessionHistory(id, 50);
      const restored = [];
      for (const item of data.history) {
        restored.push({
          id: crypto.randomUUID(),
          role: "student",
          content: item.question,
          createdAt: new Date(item.created_at),
        });
        restored.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: item.answer,
          sources: [],
          sufficientContext: true,
          createdAt: new Date(item.created_at),
        });
      }
      setMessages(restored);
      setSessionId(id);
    } catch {
      setMessages([]);
      showError("Failed to load session history.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sessionId, setSessionId, showError]);

  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) return;
    setFetchingSessions(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch {
      showError("Failed to load sessions.");
    } finally {
      setFetchingSessions(false);
    }
  }, [isAuthenticated, showError]);

  const deleteSession = useCallback(async (id) => {
    try {
      await apiDelete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        resetChat();
      }
    } catch {
      showError("Failed to delete session.");
    }
  }, [sessionId, resetChat, showError]);

  const renameSession = useCallback(async (id, title) => {
    try {
      await apiRename(id, title);
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    } catch {
      showError("Failed to rename session.");
    }
  }, [showError]);

  // Fetch sessions when auth is ready
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [authLoading, isAuthenticated, fetchSessions]);

  // Restore session history when sessionId is set (from storage or login)
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !sessionId) {
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    getSessionHistory(sessionId, 50)
      .then((data) => {
        const restored = [];
        for (const item of data.history) {
          restored.push({
            id: crypto.randomUUID(),
            role: "student",
            content: item.question,
            createdAt: new Date(item.created_at),
          });
          restored.push({
            id: crypto.randomUUID(),
            role: "assistant",
            content: item.answer,
            sources: [],
            sufficientContext: true,
            createdAt: new Date(item.created_at),
          });
        }
        setMessages(restored);
      })
      .catch(() => {
        setSessionId(null);
        setMessages([]);
      })
      .finally(() => setIsLoadingHistory(false));
  }, [authLoading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh session list after messages change (auto-title)
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (messages.length > 0 && messages.some((m) => m.role === "assistant" && m.content && !m.streaming)) {
      fetchSessions();
    }
  }, [messages, isAuthenticated, authLoading, fetchSessions]);

  const value = useMemo(
    () => ({
      sessionId,
      setSessionId,
      difficultyLevel,
      setDifficultyLevel,
      language,
      setLanguage,
      messages,
      addMessage,
      updateLastMessage,
      replaceMessages,
      resetChat,
      isLoadingHistory,
      sessions,
      fetchingSessions,
      switchSession,
      createNewSession,
      deleteSession,
      renameSession,
      fetchSessions,
      sessionError,
      clearSessionError,
    }),
    [sessionId, difficultyLevel, language, messages, addMessage, updateLastMessage, resetChat, isLoadingHistory, sessions, fetchingSessions, switchSession, createNewSession, deleteSession, renameSession, fetchSessions, sessionError, clearSessionError]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
