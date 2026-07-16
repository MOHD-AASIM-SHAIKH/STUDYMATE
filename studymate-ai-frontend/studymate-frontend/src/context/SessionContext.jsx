import { createContext, useContext, useMemo, useState, useCallback } from "react";

const SessionContext = createContext(null);

export const LANGUAGES = [
  { code: "English", label: "English" },
  { code: "Spanish", label: "Español" },
  { code: "Hindi", label: "हिन्दी" },
  { code: "French", label: "Français" },
];

export function SessionProvider({ children }) {
  // Everything here is in-memory (component state) for this browser tab.
  // The backend also issues/accepts a session_id, so a refresh simply
  // starts a fresh session rather than losing any server-side data.
  const [sessionId, setSessionId] = useState(null);
  const [difficultyLevel, setDifficultyLevel] = useState("beginner");
  const [language, setLanguage] = useState("English");
  const [messages, setMessages] = useState([]); // { id, role, content, sources, sufficientContext, createdAt }

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), createdAt: new Date(), ...message }]);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
  }, []);

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
    }),
    [sessionId, difficultyLevel, language, messages, addMessage, resetChat]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
