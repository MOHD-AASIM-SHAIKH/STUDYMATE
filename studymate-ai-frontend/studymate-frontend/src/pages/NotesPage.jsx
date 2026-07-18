import { useState } from "react";
import DifficultyToggle from "../components/DifficultyToggle";
import LanguageSelector from "../components/LanguageSelector";
import NoteViewer from "../components/NoteViewer";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useNotes } from "../hooks/useNotes";
import { useSession } from "../context/SessionContext";

export default function NotesPage() {
  const { difficultyLevel, setDifficultyLevel, language, setLanguage, sessionId, messages } = useSession();
  const { note, generate, isGenerating, error } = useNotes();
  const [topic, setTopic] = useState("");

  const hasConversation = messages.some((m) => m.role === "assistant" && m.content);

  const handleSubmit = (e) => {
    e.preventDefault();
    generate({ topic: topic.trim(), useSessionHistory: !topic.trim() && Boolean(sessionId) });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
      <div className="mb-6">
        <h1 className="font-display text-xl text-ink">Study notes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Generate a structured, exportable note from a topic, or from your current chat&apos;s questions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4">
          <label htmlFor="topic" className="mb-1.5 block text-sm font-medium text-ink">Topic</label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              hasConversation
                ? "Leave blank to summarize your current chat instead"
                : "e.g. Cellular respiration"
            }
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:shadow-glow transition-all"
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <DifficultyToggle value={difficultyLevel} onChange={setDifficultyLevel} />
          <LanguageSelector value={language} onChange={setLanguage} id="notes-language-select" />
        </div>

        <button
          type="submit"
          disabled={isGenerating || (!topic.trim() && !sessionId)}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isGenerating ? "Generating..." : "Generate note"}
        </button>
        {!topic.trim() && !sessionId && (
          <p className="mt-2 text-xs text-ink-muted">
            Enter a topic, or ask a question in Chat first to summarize that conversation.
          </p>
        )}
      </form>

      <div className="mt-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        {isGenerating && !error && (
          <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
            <LoadingSkeleton lines={5} />
          </div>
        )}
        {!isGenerating && note && <NoteViewer note={note} />}
      </div>
    </div>
  );
}
