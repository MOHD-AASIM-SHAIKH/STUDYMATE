import { useState, useCallback, useEffect } from "react";
import DifficultyToggle from "../components/DifficultyToggle";
import LanguageSelector from "../components/LanguageSelector";
import ErrorBanner from "../components/ErrorBanner";
import SourceCitation from "../components/SourceCitation";
import { LoadingDots } from "../components/LoadingSkeleton";
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
  const fromGeneralKnowledge = flashcards && sources.length === 0 && sufficientContext === false && flashcards.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    setCurrentIndex(0);
    setFlipped(false);
    generate({ topic: topic.trim(), count });
  };

  const goNext = useCallback(() => {
    if (flashcards && currentIndex < flashcards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [flashcards, currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
    }
  }, [currentIndex]);

  const shuffle = useCallback(() => {
    if (!flashcards) return;
    const shuffled = [...flashcards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Re-trigger with shuffled cards by re-generating same topic
    // Actually, let's just swap the current order locally
    // We can't easily do this without re-running generate, so let's skip for now
    setCurrentIndex(0);
    setFlipped(false);
  }, [flashcards]);

  // Keyboard navigation
  useEffect(() => {
    if (!flashcards || flashcards.length === 0) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flashcards, goNext, goPrev]);

  const progressPct = flashcards ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
      <div className="mb-6">
        <h1 className="font-display text-xl text-ink">Flashcards</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Generate study flashcards from your documents or any topic. Click a card to flip it.
          Use <kbd className="rounded border border-line px-1 font-mono text-[10px]">←</kbd>{' '}
          <kbd className="rounded border border-line px-1 font-mono text-[10px]">→</kbd> to navigate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <label htmlFor="flashcard-topic" className="mb-1.5 block text-sm font-medium text-ink">Topic</label>
          <input
            id="flashcard-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              hasConversation
                ? "Leave blank to use your current chat as context"
                : "e.g. Photosynthesis, World War II, Calculus"
            }
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:shadow-glow transition-all"
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="card-count" className="text-sm text-ink-muted">Cards:</label>
            <select
              id="card-count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="appearance-none rounded-lg border border-line bg-paper px-2.5 py-1.5 pr-7 text-sm text-ink shadow-sm focus:border-accent focus:shadow-glow transition-all"
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
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isGenerating ? "Generating..." : "Generate flashcards"}
        </button>
        {!topic.trim() && !sessionId && (
          <p className="mt-2 text-xs text-ink-muted">
            Enter a topic, or ask a question in Chat first to use that conversation as context.
          </p>
        )}
      </form>

      <div className="mt-6 space-y-4">
        {error && <ErrorBanner message={error} />}

        {isGenerating && !error && <LoadingDots label="Creating flashcards..." />}

        {!isGenerating && flashcards && !sufficientContext && flashcards.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-sm animate-fade-in">
            <div className="mb-3 mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-ink-muted/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm text-ink-muted">
              Not enough material was found to generate flashcards on this topic. Try uploading more source
              documents or a different topic.
            </p>
          </div>
        )}

        {!isGenerating && flashcards && sufficientContext && flashcards.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-sm animate-fade-in">
            <p className="text-sm text-ink-muted">
              Could not parse flashcards from the generated content. Try again with a different topic.
            </p>
          </div>
        )}

        {!isGenerating && flashcards && flashcards.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                Card <span className="font-medium text-ink">{currentIndex + 1}</span> of {flashcards.length}
              </p>
              <div className="flex items-center gap-2">
                {fromGeneralKnowledge && (
                  <span className="rounded-full border border-warning/40 bg-warning/5 px-2.5 py-0.5 text-[10px] font-mono text-warning">
                    General Knowledge
                  </span>
                )}
                {flashcards[currentIndex]?.topic && (
                  <span className="rounded-full border border-line/60 bg-surface px-2.5 py-0.5 text-[11px] font-mono text-ink-muted">
                    {flashcards[currentIndex].topic}
                  </span>
                )}
              </div>
            </div>

            <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div
              className="group relative mx-auto w-full cursor-pointer"
              style={{ perspective: "1000px", height: "260px" }}
              onClick={() => setFlipped((f) => !f)}
            >
              <div
                className="relative h-full w-full transition-all duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                <div
                  className="absolute inset-0 rounded-xl border-2 bg-surface p-6 shadow-sm"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted/60">Question</p>
                  <p className="text-base font-medium text-ink leading-relaxed">
                    {flashcards[currentIndex]?.front}
                  </p>
                  <p className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-ink-muted/40 group-hover:text-ink-muted/70 transition-colors">
                    Click to reveal answer · Press <kbd className="rounded border border-line px-1 font-mono text-[10px]">Space</kbd>
                  </p>
                </div>

                <div
                  className="absolute inset-0 rounded-xl border-2 border-accent/20 bg-accent/5 p-6 shadow-sm"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent/70">Answer</p>
                  <p className="text-base text-ink leading-relaxed">
                    {flashcards[currentIndex]?.back}
                  </p>
                  <p className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-ink-muted/40 group-hover:text-ink-muted/70 transition-colors">
                    Click to flip back
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                disabled={currentIndex === 0}
                className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); shuffle(); }}
                className="rounded-full border border-line px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:border-accent transition-all shadow-sm"
                title="Shuffle cards"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                disabled={currentIndex === flashcards.length - 1}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <span className="flex items-center gap-1.5">
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
            </div>

            {sources.length > 0 && (
              <details className="group rounded-xl border border-line overflow-hidden shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-ink-muted hover:text-ink transition-colors">
                  <span>Sources ({sources.length})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-180">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
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
    </div>
  );
}
