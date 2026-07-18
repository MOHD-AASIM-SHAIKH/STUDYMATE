import { useCallback, useRef, useState } from "react";

const ACCEPTED = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.bmp,.tiff";

export default function FileUploader({ onFiles }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload teacher notes or textbook (PDF, DOCX, TXT, or image)"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all ${
        isDragging
          ? "border-accent bg-accent/5 shadow-glow scale-[1.01]"
          : "border-line bg-surface hover:border-accent/50 hover:bg-accent/3"
      }`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-line/50 bg-paper">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="font-display text-lg text-ink">Drop teacher notes here</p>
      <p className="mt-1 text-sm text-ink-muted">or click to browse — PDF, DOCX, TXT, or images</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
