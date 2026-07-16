import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { getSessionHistory } from "../api/endpoints";
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
    // localStorage may be unavailable
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

export function SessionProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sessionId, setSessionIdState] = useState(() => getFromStorage(SESSION_KEY, null));
  const [difficultyLevel, setDifficultyLevelState] = useState(() => getFromStorage(DIFFICULTY_KEY, "beginner"));
  const [language, setLanguageState] = useState(() => getFromStorage(LANGUAGE_KEY, "English"));
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Persist to localStorage whenever state changes
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

  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, [setSessionId]);

  // Wait for auth to be ready, then restore session history from the backend
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
        // Session expired or invalid — start fresh
        setSessionId(null);
        setMessages([]);
      })
      .finally(() => setIsLoadingHistory(false));
  }, [authLoading, isAuthenticated, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      resetChat,
      isLoadingHistory,
    }),
    [sessionId, difficultyLevel, language, messages, addMessage, resetChat, isLoadingHistory]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
