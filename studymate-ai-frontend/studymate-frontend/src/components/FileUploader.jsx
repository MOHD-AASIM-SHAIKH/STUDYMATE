import { useCallback, useRef, useState } from "react";

const ACCEPTED = ".pdf,.docx,.txt";

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
      aria-label="Upload teacher notes or textbook (PDF, DOCX, or TXT)"
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
      className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isDragging ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-accent/60"
      }`}
    >
      <p className="font-display text-lg text-ink">Drop teacher notes here</p>
      <p className="mt-1 text-sm text-ink-muted">or click to browse — PDF, DOCX, or TXT</p>
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
