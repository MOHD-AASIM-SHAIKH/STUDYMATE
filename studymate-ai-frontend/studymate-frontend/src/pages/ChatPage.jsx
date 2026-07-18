import { useCallback, useEffect, useRef, useState } from "react";
import ChatBubble from "../components/ChatBubble";
import ChatHistorySidebar from "../components/ChatHistorySidebar";
import DifficultyToggle from "../components/DifficultyToggle";
import LanguageSelector from "../components/LanguageSelector";
import { useChat } from "../hooks/useChat";
import { useSession } from "../context/SessionContext";
import { ocrImage, ocrIngest } from "../api/endpoints";

export default function ChatPage() {
  const { messages, difficultyLevel, setDifficultyLevel, language, setLanguage, isLoadingHistory, sessionId } = useSession();
  const { sendMessage, cancelStream, isSending, regenerate, editMessage } = useChat();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [ocrText, setOcrText] = useState(null); // { filename, text }
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrIngesting, setOcrIngesting] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const ocrInputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const handleSubmit = useCallback((text) => {
    const q = (text || input).trim();
    if (!q || isSending) return;
    setInput("");
    sendMessage(q);
  }, [input, isSending, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEditStart = (index, currentQuestion) => {
    setEditingIndex(index);
    setEditValue(currentQuestion);
  };

  const handleEditSubmit = () => {
    if (editValue.trim() && editingIndex !== null) {
      editMessage(editingIndex, editValue.trim());
    }
    setEditingIndex(null);
    setEditValue("");
  };

  const handleOcrFile = async (file) => {
    if (!file) return;
    setOcrLoading(true);
    setOcrText(null);
    try {
      const result = await ocrImage(file);
      setOcrText({ filename: file.name, text: result.text });
    } catch (err) {
      console.error("OCR failed:", err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcrIngest = async () => {
    if (!ocrText) return;
    setOcrIngesting(true);
    try {
      await ocrIngest(new File([ocrText.text], `${ocrText.filename.replace(/\.[^.]+$/, "")}.txt`, { type: "text/plain" }));
      setOcrText(null);
    } catch (err) {
      console.error("OCR ingest failed:", err);
    } finally {
      setOcrIngesting(false);
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;
    const text = messages.map((m) => {
      const role = m.role === "student" ? "You" : "StudyMate";
      return `**${role}**: ${m.content || "(thinking...)"}`;
    }).join("\n\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studymate-chat-${sessionId?.slice(0, 8) || "export"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        handleExport();
      }
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
      if (e.key === "ArrowUp" && !input && messages.length > 0) {
        const lastStudent = [...messages].reverse().find((m) => m.role === "student");
        if (lastStudent) {
          setInput(lastStudent.content);
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen, input, messages]);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <ChatHistorySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2 sm:hidden shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line/50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-display text-sm font-semibold text-ink">StudyMate</span>
          <button
            type="button"
            onClick={handleExport}
            disabled={messages.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line/50 disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden px-4 pt-3 pb-2 sm:px-6 sm:pt-4">
          <div className="mb-3 flex shrink-0 items-center justify-between sm:mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line/50 transition-colors"
                title="Toggle sidebar (Cmd+K)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div>
                <h1 className="font-display text-xl text-ink">Chat</h1>
                <p className="text-xs text-ink-muted hidden sm:block">Ask questions grounded in your course material</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={messages.length === 0}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:border-accent disabled:opacity-30 transition-all shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          </div>

          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 border-b border-line pb-3 sm:mb-4 sm:gap-3 sm:pb-4">
            <DifficultyToggle value={difficultyLevel} onChange={setDifficultyLevel} />
            <LanguageSelector value={language} onChange={setLanguage} />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4" style={{ scrollBehavior: "smooth" }}>
            {isLoadingHistory && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
                  <span className="ml-1 text-sm text-ink-muted">Restoring...</span>
                </div>
              </div>
            )}
            {!isLoadingHistory && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                </div>
                <p className="font-display text-base text-ink">No questions yet</p>
                <p className="mt-1 text-xs text-ink-muted text-center">Ask a question, say hi, or ask for study advice to get started.</p>
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={m.id} className="group relative">
                <ChatBubble message={m} />
                {!m.streaming && m.role === "assistant" && m.content && !m.error && (
                  <div className="mt-1 flex items-center gap-2 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => regenerate(m)} className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-ink-muted hover:text-ink hover:bg-line/40 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                      </svg>
                      Regenerate
                    </button>
                  </div>
                )}
                {!m.streaming && m.role === "student" && m.content && (
                  <div className="mt-1 flex items-center gap-2 justify-end pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleEditStart(idx, m.content)} className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-ink-muted hover:text-ink hover:bg-line/40 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                )}
                {editingIndex === idx && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSubmit();
                        if (e.key === "Escape") { setEditingIndex(null); setEditValue(""); }
                      }}
                      className="flex-1 rounded-lg border border-accent bg-surface px-3 py-2 text-sm text-ink outline-none shadow-sm"
                      autoFocus
                    />
                    <button type="button" onClick={handleEditSubmit} className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white">Save</button>
                    <button type="button" onClick={() => { setEditingIndex(null); setEditValue(""); }} className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-muted">Cancel</button>
                  </div>
                )}
              </div>
            ))}
            {isSending && !messages.some((m) => m.streaming) && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {ocrText && (
            <div className="shrink-0 rounded-xl border border-accent/30 bg-accent/5 p-3 animate-fade-slide-in">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-accent">{ocrText.filename}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setInput((prev) => (prev ? prev + "\n\n" : "") + ocrText.text); setOcrText(null); }}
                    className="rounded px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/10 transition-colors"
                  >
                    Use in chat
                  </button>
                  <button
                    type="button"
                    onClick={handleOcrIngest}
                    disabled={ocrIngesting}
                    className="rounded px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/10 transition-colors disabled:opacity-40"
                  >
                    {ocrIngesting ? "Saving..." : "Save to library"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcrText(null)}
                    className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:text-ink hover:bg-line/40 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-2 text-xs text-ink leading-relaxed max-h-32 overflow-y-auto border border-line/50">
                {ocrText.text}
              </p>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="mt-3 flex shrink-0 items-end gap-1.5 sm:gap-2">
            <input
              ref={ocrInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.bmp,.tiff"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOcrFile(f); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => ocrInputRef.current?.click()}
              disabled={ocrLoading}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted hover:text-ink hover:border-accent/50 disabled:opacity-30 transition-all"
              title="OCR a scanned image"
            >
              {ocrLoading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="40" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </button>
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question... (↑ to edit last)"
                className="max-h-28 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 pr-12 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:shadow-glow transition-all shadow-sm"
              />
            </div>
            {isSending ? (
              <button type="button" onClick={cancelStream} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger text-white hover:bg-danger/90 transition-all shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </form>

          <div className="mt-2 text-center text-[10px] text-ink-muted/40 shrink-0 hidden sm:block">
            <kbd className="rounded border border-line px-1 font-mono text-[9px]">Cmd+K</kbd> sidebar ·{" "}
            <kbd className="rounded border border-line px-1 font-mono text-[9px]">Cmd+E</kbd> export ·{" "}
            <kbd className="rounded border border-line px-1 font-mono text-[9px]">↑</kbd> edit
          </div>
        </div>
      </div>
    </div>
  );
}