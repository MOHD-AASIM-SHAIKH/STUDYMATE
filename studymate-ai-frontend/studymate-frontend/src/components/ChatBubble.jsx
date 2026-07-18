import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitation from "./SourceCitation";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function ChatBubble({ message }) {
  const isStudent = message.role === "student";

  if (isStudent) {
    return (
      <div className="flex justify-end animate-fade-slide-in">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-[15px] leading-relaxed text-white shadow-sm sm:max-w-[70%]">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex justify-start animate-fade-slide-in">
        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-danger/25 bg-danger-soft px-4 py-3 text-[15px] text-danger shadow-sm sm:max-w-[70%]">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-70">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Error
          </div>
          {message.error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-slide-in">
      <div className="max-w-[90%] sm:max-w-[75%]">
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 shadow-sm">
          {message.content ? (
            <div className="prose-studymate font-display text-[15.5px] text-ink">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : message.streaming && (
            <div className="flex items-center gap-1 py-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
            </div>
          )}
          {message.streaming && message.content && (
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse-soft bg-accent align-text-bottom" />
          )}
        </div>

        {message.images && message.images.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {message.images.map((imgUrl, idx) => (
              <a
                key={idx}
                href={`${BASE_URL}${imgUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow hover:shadow-card-hover"
              >
                <img
                  src={`${BASE_URL}${imgUrl}`}
                  alt={`Source material image ${idx + 1}`}
                  className="h-auto w-full object-contain"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {message.sufficientContext && !message.streaming && <SourceCitation sources={message.sources} />}
        {message.sufficientContext === false && !message.streaming && (
          <p className="mt-1.5 text-xs text-ink-muted">
            No matching material found in your uploaded notes for this question.
          </p>
        )}
      </div>
    </div>
  );
}
