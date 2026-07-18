import { useCallback, useState } from "react";
import { generateFlashcards } from "../api/endpoints";
import { useSession } from "../context/SessionContext";

export function useFlashcards() {
  const { sessionId, difficultyLevel, language } = useSession();
  const [flashcards, setFlashcards] = useState(null);
  const [sources, setSources] = useState([]);
  const [sufficientContext, setSufficientContext] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(
    async ({ topic, count }) => {
      setError(null);
      setIsGenerating(true);
      try {
        const result = await generateFlashcards({
          topic: topic || null,
          sessionId: sessionId || null,
          count: count || 5,
          difficultyLevel,
          language,
        });
        setFlashcards(result.flashcards);
        setSources(result.sources || []);
        setSufficientContext(result.sufficient_context);
      } catch (err) {
        setError(err.message || "Couldn't generate flashcards. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    },
    [sessionId, difficultyLevel, language]
  );

  return { flashcards, sources, sufficientContext, generate, isGenerating, error };
}
