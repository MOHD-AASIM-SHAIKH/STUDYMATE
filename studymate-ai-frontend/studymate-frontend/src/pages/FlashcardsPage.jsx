import { useState } from "react";
import DifficultyToggle from "../components/DifficultyToggle";
import LanguageSelector from "../components/LanguageSelector";
import ErrorBanner from "../components/ErrorBanner";
import SourceCitation from "../components/SourceCitation";
import { useFlashcards } from "../hooks/useFlashcards";
import { useSession } from "../context/SessionContext";

export default function FlashcardsPage() {
  const { difficultyLevel, setDifficultyLevel, language, setLanguage, sessionId, messages } = useSession();
  const { flashcards, sources, sufficientContext, generate, isGenerating, error } = useFlashcards();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const hasConversation = messages.some((m) => m.role === "assistant" && m.content);

  const handleSubmit = (e) => {
    e.preventDefault();
    setCurrentIndex(0);
    setFlipped(false);
    generate({ topic: topic.trim(), count });
  };

  const handleFlip = () => setFlipped((f) => !f);

  const goNext = () => {
    if (currentIndex < (flashcards?.length || 0) - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
      <h1 className="font-display text-xl text-ink">Flashcards</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Generate study flashcards from your documents. Click a card to flip it.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4 rounded-card border border-line bg-surface p-4">
        <div>
          <label htmlFor="flashcard-topic" className="mb-1 block text-sm font-medium text-ink">Topic</label>
          <input
            id="flashcard-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              hasConversation
                ? "Leave blank to use your current chat as context"
                : "e.g. Photosynthesis"
            }
            className="w-full rounded-card border border-line bg-paper px-3 py-2 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="card-count" className="text-sm text-ink-muted">Cards:</label>
            <select
              id="card-count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-card border border-line bg-paper px-2 py-1.5 text-sm text-ink"
            >
              {[3, 5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <DifficultyToggle value={difficultyLevel} onChange={setDifficultyLevel} />
          <LanguageSelector value={language} onChange={setLanguage} id="flashcard-lang" />
        </div>

        <button
          type="submit"
          disabled={isGenerating || (!topic.trim() && !sessionId)}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isGenerating ? "Generating..." : "Generate flashcards"}
        </button>
        {!topic.trim() && !sessionId && (
          <p className="text-xs text-ink-muted">
            Enter a topic, or ask a question in Chat first to use that conversation as context.
          </p>
        )}
      </form>

      <div className="mt-6">
        {error && <ErrorBanner message={error} />}

        {isGenerating && !error && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
              <span className="ml-1 text-sm text-ink-muted">Creating flashcards...</span>
            </div>
          </div>
        )}

        {!isGenerating && flashcards && !sufficientContext && (
          <div className="rounded-card border border-line bg-surface p-6 text-center">
            <p className="text-sm text-ink-muted">
              Not enough material was found to generate flashcards on this topic. Try uploading more source
              documents or a different topic.
            </p>
          </div>
        )}

        {!isGenerating && flashcards && sufficientContext && flashcards.length === 0 && (
          <div className="rounded-card border border-line bg-surface p-6 text-center">
            <p className="text-sm text-ink-muted">
              Could not parse flashcards from the generated content. Try again with a different topic.
            </p>
          </div>
        )}

        {!isGenerating && flashcards && sufficientContext && flashcards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                Card {currentIndex + 1} of {flashcards.length}
              </p>
              <p className="text-xs text-ink-muted">{flashcards[currentIndex]?.topic}</p>
            </div>

            <button
              type="button"
              onClick={handleFlip}
              className="w-full cursor-pointer text-left"
            >
              <div className="relative min-h-[200px] w-full">
                <div
                  className={`w-full rounded-card border-2 bg-surface p-6 shadow-sm transition-all duration-300 ${
                    flipped
                      ? "border-accent/40"
                      : "border-line hover:border-accent/20"
                  }`}
                >
                  {flipped ? (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">Answer</p>
                      <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap">
                        {flashcards[currentIndex]?.back}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">Question</p>
                      <p className="text-[15px] text-ink font-medium leading-relaxed">
                        {flashcards[currentIndex]?.front}
                      </p>
                      <p className="mt-4 text-xs text-ink-muted">Click anywhere to flip</p>
                    </div>
                  )}
                </div>
              </div>
            </button>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-30"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={currentIndex === flashcards.length - 1}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-30"
              >
                Next
              </button>
            </div>

            {sources.length > 0 && (
              <details className="rounded-card border border-line">
                <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink">
                  Sources ({sources.length})
                </summary>
                <div className="border-t border-line px-4 py-3">
                  <SourceCitation sources={sources} />
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
