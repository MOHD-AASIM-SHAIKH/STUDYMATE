export default function SourceCitation({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Sources for this answer">
      {sources.map((s, i) => (
        <div
          key={`${s.filename}-${s.page_number ?? "na"}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-line/60 bg-surface/60 px-2.5 py-1 text-[11px] font-mono text-ink-muted shadow-sm"
        >
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-accent-soft/20 text-[8px] font-bold text-accent-soft">
            {i + 1}
          </span>
          <span className="text-ink font-medium max-w-[120px] truncate">{s.filename}</span>
          {s.page_number != null && <span className="opacity-60">· p.{s.page_number}</span>}
          {s.section_title && <span className="hidden sm:inline opacity-60">· {s.section_title}</span>}
          <span className="opacity-50">· {Math.round(s.similarity_score * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
