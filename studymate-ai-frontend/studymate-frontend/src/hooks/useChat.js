import { useCallback, useRef, useState } from "react";
import { askQuestion, askQuestionStream } from "../api/endpoints";
import { useSession } from "../context/SessionContext";

export function useChat() {
  const { sessionId, setSessionId, difficultyLevel, language, addMessage, updateLastMessage, replaceMessages, messages } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const currentMsgIdRef = useRef(null);

  const streamAnswer = useCallback(
    (question, beforeSend) => {
      const msgId = crypto.randomUUID();
      currentMsgIdRef.current = msgId;
      addMessage({ id: msgId, role: "assistant", content: "", sources: [], images: [], sufficientContext: true, streaming: true });

      let fullContent = "";
      let metaData = null;

      beforeSend?.();

      abortRef.current = askQuestionStream({
        question,
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
    },
    [sessionId, setSessionId, difficultyLevel, language, addMessage, updateLastMessage]
  );

  const doSend = useCallback(
    async (question, { stream = true } = {}) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setError(null);
      setIsSending(true);

      if (stream) {
        addMessage({ role: "student", content: trimmed });
        streamAnswer(trimmed);
      } else {
        try {
          addMessage({ role: "student", content: trimmed });
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
    [sessionId, setSessionId, difficultyLevel, language, addMessage, streamAnswer]
  );

  const sendMessage = useCallback(
    (question) => doSend(question, { stream: true }),
    [doSend]
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

  const regenerate = useCallback(
    (message) => {
      const msgIdx = messages.findIndex((m) => m.id === message.id);
      if (msgIdx < 1) return;
      const studentMsg = messages[msgIdx - 1];
      if (studentMsg?.role !== "student") return;
      doSend(studentMsg.content, { stream: true });
    },
    [messages, doSend]
  );

  const editMessage = useCallback(
    (index, newQuestion) => {
      const trimmed = newQuestion.trim();
      if (!trimmed) return;

      setError(null);
      setIsSending(true);

      const before = messages.slice(0, index);
      replaceMessages([...before, { id: crypto.randomUUID(), role: "student", content: trimmed, createdAt: new Date() }]);
      streamAnswer(trimmed, () => {
        if (!sessionId) setSessionId(sessionId);
      });
    },
    [messages, sessionId, replaceMessages, streamAnswer, setSessionId]
  );

  return { sendMessage, cancelStream, isSending, error, regenerate, editMessage };
}
