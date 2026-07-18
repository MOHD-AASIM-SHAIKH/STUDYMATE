import { LANGUAGES } from "../context/SessionContext";

export default function LanguageSelector({ value, onChange, id = "language-select" }) {
  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-ink-muted">
        Language
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-full border border-line bg-surface px-3 py-1.5 pr-8 text-sm text-ink shadow-sm focus:border-accent focus:shadow-glow transition-shadow"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
