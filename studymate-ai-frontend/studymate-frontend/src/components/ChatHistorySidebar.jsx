import { useState, useMemo } from "react";
import { useSession } from "../context/SessionContext";

function groupSessions(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "Last 7 days": [], Earlier: [] };
  for (const s of sessions) {
    const d = new Date(s.last_active_at || s.created_at);
    if (d >= today) groups.Today.push(s);
    else if (d >= yesterday) groups.Yesterday.push(s);
    else if (d >= lastWeek) groups["Last 7 days"].push(s);
    else groups.Earlier.push(s);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

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

  const groups = useMemo(() => groupSessions(sessions), [sessions]);

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
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed sm:static inset-y-0 left-0 z-30 flex w-72 sm:w-56 flex-col
          border-r border-line bg-surface shadow-xl
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          sm:translate-x-0 sm:h-auto
        `}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-3">
          <button
            type="button"
            onClick={createNewSession}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New chat
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-line/50 transition-colors sm:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {fetchingSessions && (
            <div className="flex flex-col items-center gap-2 py-10">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[11px] text-ink-muted">Loading...</span>
            </div>
          )}

          {!fetchingSessions && sessions.length === 0 && (
            <div className="py-10 px-4 text-center">
              <p className="text-xs text-ink-muted">No conversations yet</p>
            </div>
          )}

          {!fetchingSessions && groups.map(([groupName, groupItems]) => (
            <div key={groupName}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted/40">
                {groupName}
              </div>
              {groupItems.map((s) => (
                <div
                  key={s.id}
                  className={`group mx-1.5 mb-0.5 rounded-lg px-2 py-2 cursor-pointer transition-colors ${
                    s.id === sessionId
                      ? "bg-accent/10 ring-1 ring-accent/20"
                      : "hover:bg-line/40"
                  }`}
                  onClick={() => { if (s.id !== sessionId) { switchSession(s.id); onClose(); } }}
                >
                  <div className="flex items-start justify-between gap-1">
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
                          className="w-full rounded border border-accent bg-surface px-1.5 py-0.5 text-xs text-ink outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <p className="truncate text-xs font-medium text-ink leading-tight">{s.title}</p>
                      )}
                      <p className="truncate text-[10px] text-ink-muted/50 mt-0.5 leading-tight">
                        {s.last_preview || `${s.message_count || 0} msgs`}
                      </p>
                    </div>

                    {s.id === sessionId && renaming !== s.id && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-line/50 transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>

                        {menuOpen === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-6 z-20 w-36 rounded-xl border border-line bg-surface py-1 shadow-lg animate-fade-in">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRenameStart(s); }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-line/40"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/5"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          ))}
        </div>

        <div className="shrink-0 border-t border-line px-3 py-2 text-center text-[10px] text-ink-muted/30">
          {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
        </div>
      </aside>
    </>
  );
}