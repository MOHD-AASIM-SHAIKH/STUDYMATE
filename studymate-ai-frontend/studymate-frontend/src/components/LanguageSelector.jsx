import { LANGUAGES } from "../context/SessionContext";

export default function LanguageSelector({ value, onChange, id = "language-select" }) {
  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-ink-muted">
        Language
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
