export function LineSkeleton({ width = "100%" }) {
  return <div className="skeleton h-4 animate-shimmer rounded" style={{ width }} />;
}

export default function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <LineSkeleton key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-sm" role="status" aria-label="Loading">
      <div className="skeleton mb-2 h-4 w-2/3 animate-shimmer rounded" />
      <div className="skeleton h-3 w-1/3 animate-shimmer rounded" />
    </div>
  );
}

export function LoadingDots({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
        <span className="ml-1 text-sm text-ink-muted">{label}</span>
      </div>
    </div>
  );
}
