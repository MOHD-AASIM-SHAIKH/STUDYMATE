import { useState } from "react";
import { useSession } from "../context/SessionContext";

export default function ChatHistorySidebar({ open, onClose }) {
  const {
    sessions,
    sessionId,
    switchSession,
    deleteSession,
    renameSession,
    createNewSession,
    fetchingSessions,
  } = useSession();

  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);

  const handleRenameStart = (s) => {
    setRenaming(s.id);
    setRenameValue(s.title);
    setMenuOpen(null);
  };

  const handleRenameSubmit = (id) => {
    if (renameValue.trim()) {
      renameSession(id, renameValue.trim());
    }
    setRenaming(null);
  };

  const handleDelete = (id) => {
    setMenuOpen(null);
    deleteSession(id);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/20 sm:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`${
          open ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-line bg-surface shadow-lg transition-transform duration-300 sm:static sm:translate-x-0 sm:shadow-none`}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-3">
          <button
            type="button"
            onClick={createNewSession}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-accent hover:text-white hover:border-accent transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New chat
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line/50 sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {fetchingSessions && (
            <div className="flex items-center justify-center py-8">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
            </div>
          )}

          {!fetchingSessions && sessions.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-ink-muted">No conversations yet</p>
              <p className="mt-1 text-xs text-ink-muted/70">Start a new chat to begin</p>
            </div>
          )}

          {!fetchingSessions && sessions.map((s) => (
            <div
              key={s.id}
              className={`group relative mx-2 mb-0.5 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                s.id === sessionId ? "bg-accent/10" : "hover:bg-line/40"
              }`}
              onClick={() => {
                if (s.id !== sessionId) switchSession(s.id);
                onClose();
              }}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  {renaming === s.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(s.id);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="w-full rounded border border-accent bg-surface px-1.5 py-0.5 text-sm text-ink outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                  )}
                  <p className="truncate text-xs text-ink-muted/70 mt-0.5">
                    {s.last_preview || `${s.message_count} messages`}
                  </p>
                </div>

                {s.id === sessionId && renaming !== s.id && (
                  <div className="relative shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === s.id ? null : s.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-line/60 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    {menuOpen === s.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-line bg-surface py-1 shadow-card-lg">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRenameStart(s); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-line/50"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-danger/5"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-3 py-2 text-[10px] text-ink-muted/50 text-center">
          {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
        </div>
      </aside>
    </>
  );
}
