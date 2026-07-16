import { useCallback, useState } from "react";
import { askQuestion } from "../api/endpoints";
import { useSession } from "../context/SessionContext";

export function useChat() {
  const { sessionId, setSessionId, difficultyLevel, language, addMessage } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (question) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setError(null);
      addMessage({ role: "student", content: trimmed });
      setIsSending(true);

      try {
        const result = await askQuestion({
          question: trimmed,
          difficultyLevel,
          language,
          sessionId,
        });

        if (!sessionId) setSessionId(result.session_id);

        addMessage({
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          sufficientContext: result.sufficient_context,
          cached: result.cached,
        });
      } catch (err) {
        setError(err.message || "Couldn't generate an answer. Please try again.");
        addMessage({
          role: "assistant",
          content: null,
          error: err.message || "Couldn't generate an answer. Please try again.",
        });
      } finally {
        setIsSending(false);
      }
    },
    [sessionId, setSessionId, difficultyLevel, language, addMessage]
  );

  return { sendMessage, isSending, error };
}
