export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-full border border-danger/40 px-3 py-1 text-xs font-medium hover:bg-danger/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
