import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { to: "/", label: "Chat", icon: ChatIcon },
  { to: "/library", label: "Library", icon: LibraryIcon },
  { to: "/notes", label: "Notes", icon: NotesIcon },
  { to: "/history", label: "History", icon: HistoryIcon },
];

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Main navigation"
        className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface p-4 sm:flex"
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="font-display text-xl font-semibold text-ink">StudyMate</span>
          <span className="rounded-full bg-accent-soft/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-ink-muted">
            AI
          </span>
        </div>

        {user && (
          <div className="mb-4 rounded-card border border-line bg-paper px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.display_name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
        )}

        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-accent text-white" : "text-ink-muted hover:bg-line/50 hover:text-ink"
                  }`
                }
              >
                <item.icon />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-2 px-2 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Theme</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-danger/10 hover:text-danger transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:hidden">
        <div className="min-w-0 flex-1">
          <span className="font-display text-lg font-semibold text-ink">StudyMate AI</span>
          {user && <span className="ml-2 text-xs text-ink-muted">{user.display_name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="text-xs text-ink-muted hover:text-danger transition-colors"
          >
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface sm:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? "text-accent" : "text-ink-muted"
              }`
            }
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}
function NotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 106 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
