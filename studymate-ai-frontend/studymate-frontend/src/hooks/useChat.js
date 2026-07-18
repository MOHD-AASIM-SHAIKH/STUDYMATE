import { useCallback, useRef, useState } from "react";
import { askQuestion, askQuestionStream } from "../api/endpoints";
import { useSession } from "../context/SessionContext";

export function useChat() {
  const { sessionId, setSessionId, difficultyLevel, language, addMessage, updateLastMessage, messages } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const currentMsgIdRef = useRef(null);

  const sendMessage = useCallback(
    async (question, { stream = true } = {}) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setError(null);
      addMessage({ role: "student", content: trimmed });
      setIsSending(true);

      if (stream) {
        // Add a placeholder assistant message that will be filled as tokens arrive
        const msgId = crypto.randomUUID();
        currentMsgIdRef.current = msgId;
        addMessage({ id: msgId, role: "assistant", content: "", sources: [], images: [], sufficientContext: true, streaming: true });

        let fullContent = "";
        let metaData = null;

        abortRef.current = askQuestionStream({
          question: trimmed,
          difficultyLevel,
          language,
          sessionId,
          onToken: (token) => {
            fullContent += token;
            updateLastMessage(msgId, { content: fullContent });
          },
          onMeta: (meta) => {
            metaData = meta;
            if (!sessionId) setSessionId(meta.session_id);
          },
          onDone: () => {
            setIsSending(false);
            updateLastMessage(msgId, {
              content: fullContent,
              streaming: false,
              sources: metaData?.sources || [],
              images: metaData?.images || [],
              sufficientContext: metaData?.sufficient_context ?? true,
            });
          },
          onError: (errMsg) => {
            setIsSending(false);
            updateLastMessage(msgId, {
              content: null,
              streaming: false,
              error: errMsg || "Couldn't generate an answer. Please try again.",
            });
            setError(errMsg);
          },
        });
      } else {
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
            images: result.images || [],
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
      }
    },
    [sessionId, setSessionId, difficultyLevel, language, addMessage, updateLastMessage]
  );

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsSending(false);
    }
    if (currentMsgIdRef.current) {
      updateLastMessage(currentMsgIdRef.current, { streaming: false });
      currentMsgIdRef.current = null;
    }
  }, [updateLastMessage]);

  return { sendMessage, cancelStream, isSending, error };
}
