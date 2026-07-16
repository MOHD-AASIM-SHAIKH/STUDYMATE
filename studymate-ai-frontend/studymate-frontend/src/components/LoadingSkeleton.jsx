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
    <div className="rounded-card border border-line bg-surface p-4" role="status" aria-label="Loading">
      <div className="skeleton mb-2 h-4 w-2/3 animate-shimmer rounded" />
      <div className="skeleton h-3 w-1/3 animate-shimmer rounded" />
    </div>
  );
}
