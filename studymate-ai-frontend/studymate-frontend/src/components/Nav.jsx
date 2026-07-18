import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { to: "/", label: "Chat", icon: ChatIcon },
  { to: "/flashcards", label: "Flashcards", icon: FlashcardIcon },
  { to: "/quiz", label: "Quiz", icon: QuizIcon },
  { to: "/library", label: "Library", icon: LibraryIcon },
  { to: "/notes", label: "Notes", icon: NotesIcon },
];

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface/80 backdrop-blur-sm p-4 sm:flex"
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white text-sm font-bold">
            S
          </div>
          <div>
            <span className="font-display text-lg font-semibold text-ink">StudyMate</span>
            <span className="ml-1.5 rounded-full bg-accent-soft/20 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-ink-muted">
              AI
            </span>
          </div>
        </div>

        {user && (
          <div className="mb-4 rounded-card border border-line bg-paper/80 px-3 py-2.5">
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
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-accent text-white shadow-sm"
                      : "text-ink-muted hover:bg-accent/8 hover:text-ink"
                  }`
                }
              >
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-3 px-2 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Theme</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-xs font-medium text-ink-muted hover:bg-danger-soft hover:text-danger transition-all"
          >
            Sign out
          </button>
        </div>
      </nav>

      <header className="flex items-center justify-between border-b border-line bg-surface/80 backdrop-blur-sm px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white text-xs font-bold">
            S
          </div>
          <span className="font-display text-base font-semibold text-ink">StudyMate</span>
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

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface/90 backdrop-blur-sm sm:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-accent" : "text-ink-muted"
              }`
            }
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
function FlashcardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h6M7 17h3" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}
function NotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  );
}
