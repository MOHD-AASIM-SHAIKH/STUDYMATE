import { useEffect, useRef, useState } from "react";
import ChatBubble from "../components/ChatBubble";
import DifficultyToggle from "../components/DifficultyToggle";
import LanguageSelector from "../components/LanguageSelector";
import { useChat } from "../hooks/useChat";
import { useSession } from "../context/SessionContext";

export default function ChatPage() {
  const { messages, difficultyLevel, setDifficultyLevel, language, setLanguage, isLoadingHistory } = useSession();
  const { sendMessage, cancelStream, isSending } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const question = input;
    setInput("");
    sendMessage(question);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pb-24 pt-4 sm:pb-4 sm:pt-6">
      <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl text-ink">Ask about your course material</h1>
          <p className="text-sm text-ink-muted">Answers are grounded only in what your teacher has uploaded.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DifficultyToggle value={difficultyLevel} onChange={setDifficultyLevel} />
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-2 scroll-smooth">
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
              <span className="ml-1 text-sm text-ink-muted">Restoring your conversation...</span>
            </div>
          </div>
        )}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </div>
            <p className="font-display text-lg text-ink">No questions yet</p>
            <p className="mt-1 text-sm text-ink-muted">Ask something from your uploaded notes to get started.</p>
          </div>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        {isSending && !messages.some((m) => m.streaming) && (
          <div className="flex justify-start animate-fade-slide-in">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">Ask a question</label>
        <div className="relative flex-1">
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your notes..."
            className="max-h-32 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 pr-12 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:shadow-glow transition-all shadow-sm"
          />
        </div>
        {isSending ? (
          <button
            type="button"
            onClick={cancelStream}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger text-white hover:bg-danger/90 transition-all shadow-sm"
            title="Stop generating"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            title="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
