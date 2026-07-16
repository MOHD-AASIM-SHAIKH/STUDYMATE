const OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "exam-level", label: "Exam-level" },
];

export default function DifficultyToggle({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Difficulty level"
      className="inline-flex rounded-full border border-line bg-surface p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
