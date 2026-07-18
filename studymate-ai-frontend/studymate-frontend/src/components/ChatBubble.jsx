import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitation from "./SourceCitation";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function ChatBubble({ message }) {
  const isStudent = message.role === "student";

  if (isStudent) {
    return (
      <div className="flex justify-end animate-fade-slide-in">
        <div className="max-w-[85%] rounded-card rounded-tr-sm bg-accent px-4 py-2.5 text-[15px] leading-relaxed text-white sm:max-w-[70%]">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex justify-start animate-fade-slide-in">
        <div className="max-w-[85%] rounded-card rounded-tl-sm border border-danger/30 bg-danger/10 px-4 py-2.5 text-[15px] text-danger sm:max-w-[70%]">
          {message.error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-slide-in">
      <div className="max-w-[90%] sm:max-w-[75%]">
        <div className="rounded-card rounded-tl-sm border border-line bg-surface px-4 py-3">
          <div className="prose-studymate font-display text-[15.5px] text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ""}</ReactMarkdown>
          </div>
          {message.streaming && (
            <span className="inline-block h-3 w-1.5 animate-pulse bg-accent align-middle" />
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
                className="block overflow-hidden rounded-lg border border-line bg-surface"
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
