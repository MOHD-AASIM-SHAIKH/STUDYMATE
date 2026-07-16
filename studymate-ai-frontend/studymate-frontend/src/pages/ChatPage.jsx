import { useEffect, useRef, useState } from "react";
import ChatBubble from "../components/ChatBubble";
import DifficultyToggle from "../components/DifficultyToggle";
import LanguageSelector from "../components/LanguageSelector";
import { useChat } from "../hooks/useChat";
import { useSession } from "../context/SessionContext";

export default function ChatPage() {
  const { messages, difficultyLevel, setDifficultyLevel, language, setLanguage, isLoadingHistory } = useSession();
  const { sendMessage, isSending } = useChat();
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

      <div className="flex-1 space-y-4 overflow-y-auto py-2">
        {isLoadingHistory && (
          <div className="mt-16 flex justify-center">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
              <span className="ml-1 text-sm text-ink-muted">Restoring your conversation...</span>
            </div>
          </div>
        )}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="mt-16 text-center text-ink-muted">
            <p className="font-display text-lg text-ink">No questions yet</p>
            <p className="mt-1 text-sm">Ask something from your uploaded notes to get started.</p>
          </div>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-card rounded-tl-sm border border-line bg-surface px-4 py-3">
              <TypingDot delay="0ms" />
              <TypingDot delay="150ms" />
              <TypingDot delay="300ms" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Ask a question
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask a question about your notes..."
          className="max-h-32 flex-1 resize-none rounded-card border border-line bg-surface px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function TypingDot({ delay }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted"
      style={{ animationDelay: delay }}
    />
  );
}
