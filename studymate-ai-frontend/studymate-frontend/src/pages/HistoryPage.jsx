import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useHistory } from "../hooks/useHistory";

export default function HistoryPage() {
  const { history, isLoading, error, refresh, hasSession } = useHistory();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
      <div className="mb-6">
        <h1 className="font-display text-xl text-ink">History</h1>
        <p className="mt-1 text-sm text-ink-muted">Revisit past questions and answers from this session.</p>
      </div>

      <div className="space-y-4">
        {!hasSession && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
            <p className="text-sm text-ink-muted">
              No session yet — ask a question in Chat to start building your history.
            </p>
          </div>
        )}

        {hasSession && error && <ErrorBanner message={error} onRetry={refresh} />}

        {hasSession && isLoading && !error && (
          <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
            <LoadingSkeleton lines={4} />
          </div>
        )}

        {hasSession && !isLoading && !error && history.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
            <p className="text-sm text-ink-muted">No questions asked yet in this session.</p>
          </div>
        )}

        {hasSession && !isLoading && history.length > 0 && (
          <div className="space-y-3">
            {history.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-xl border border-line bg-surface p-5 shadow-sm animate-fade-slide-in"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span className="rounded-full border border-line/60 px-2 py-0.5 font-mono text-[10px]">
                    {item.difficulty_level} · {item.language}
                  </span>
                </div>
                <div className="mb-3 rounded-lg bg-accent/5 px-3.5 py-2.5 border border-accent/10">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent/70 mb-0.5">Question</p>
                  <p className="text-sm font-medium text-ink">{item.question}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted/70 mb-1">Answer</p>
                  <div className="prose-studymate font-display text-[15px] text-ink-muted">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
