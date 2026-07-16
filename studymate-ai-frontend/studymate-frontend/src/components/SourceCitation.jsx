/**
 * The visual signature of the app: every grounded answer gets a citation
 * rendered like a library index-card tab, complete with a folded-corner
 * accent. It's deliberately distinct from the answer prose above it so a
 * student can tell at a glance what's AI-generated vs. sourced.
 */
export default function SourceCitation({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2" aria-label="Sources for this answer">
      {sources.map((s, i) => (
        <div
          key={`${s.filename}-${s.page_number ?? "na"}-${i}`}
          className="relative flex items-center gap-2 rounded-[4px] border border-line bg-surface pl-3 pr-3 py-1.5 text-xs font-mono text-ink-muted"
          style={{
            clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
          }}
        >
          <span
            className="absolute right-0 top-0 h-0 w-0 border-b-[10px] border-l-[10px] border-b-paper border-l-transparent"
            aria-hidden="true"
          />
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-soft" aria-hidden="true" />
          <span className="text-ink">{s.filename}</span>
          {s.page_number != null && <span>· p.{s.page_number}</span>}
          {s.section_title && <span className="hidden sm:inline">· {s.section_title}</span>}
          <span className="text-ink-muted/70">· {Math.round(s.similarity_score * 100)}% match</span>
        </div>
      ))}
    </div>
  );
}
