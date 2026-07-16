import { useCallback, useState } from "react";
import { generateNote } from "../api/endpoints";
import { useSession } from "../context/SessionContext";

export function useNotes() {
  const { sessionId, setSessionId, difficultyLevel, language } = useSession();
  const [note, setNote] = useState(null); // { markdown, sources, sufficientContext, topic }
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(
    async ({ topic, useSessionHistory }) => {
      setError(null);
      setIsGenerating(true);
      try {
        const result = await generateNote({
          topic: topic || null,
          sessionId: useSessionHistory ? sessionId : null,
          difficultyLevel,
          language,
        });
        setNote({
          markdown: result.markdown,
          sources: result.sources,
          sufficientContext: result.sufficient_context,
          topic: topic || "Recent conversation",
        });
      } catch (err) {
        setError(err.message || "Couldn't generate the study note. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    },
    [sessionId, difficultyLevel, language]
  );

  return { note, generate, isGenerating, error, hasSession: Boolean(sessionId), setSessionId };
}
