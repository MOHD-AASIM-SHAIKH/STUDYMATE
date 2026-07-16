import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useHistory } from "../hooks/useHistory";

export default function HistoryPage() {
  const { history, isLoading, error, refresh, hasSession } = useHistory();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
      <h1 className="font-display text-xl text-ink">History</h1>
      <p className="mt-1 text-sm text-ink-muted">Revisit past questions and answers from this session.</p>

      <div className="mt-5">
        {!hasSession && (
          <p className="text-sm text-ink-muted">
            No session yet — ask a question in Chat to start building your history.
          </p>
        )}

        {hasSession && error && <ErrorBanner message={error} onRetry={refresh} />}

        {hasSession && isLoading && !error && (
          <div className="rounded-card border border-line bg-surface p-5">
            <LoadingSkeleton lines={4} />
          </div>
        )}

        {hasSession && !isLoading && !error && history.length === 0 && (
          <p className="text-sm text-ink-muted">No questions asked yet in this session.</p>
        )}

        {hasSession && !isLoading && history.length > 0 && (
          <ul className="space-y-3">
            {history.map((item) => (
              <li key={item.id} className="rounded-card border border-line bg-surface p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono">
                    {item.difficulty_level} · {item.language}
                  </span>
                </div>
                <p className="font-medium text-ink">{item.question}</p>
                <div className="prose-studymate mt-2 font-display text-[15px] text-ink-muted">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
