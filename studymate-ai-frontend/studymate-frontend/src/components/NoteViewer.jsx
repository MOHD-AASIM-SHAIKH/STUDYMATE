import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitation from "./SourceCitation";

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportMarkdown(note) {
  downloadFile(`${slug(note.topic)}.md`, note.markdown, "text/markdown");
}

async function exportPdf(note) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 56;
  const maxWidth = 500;

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text(note.topic || "Study Note", marginX, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = note.markdown.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (y > 780) {
      doc.addPage();
      y = 56;
    }
    if (!line) {
      y += 10;
      continue;
    }
    if (line.startsWith("# ")) {
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      const wrapped = doc.splitTextToSize(line.replace(/^#\s+/, ""), maxWidth);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    } else if (line.startsWith("## ") || line.startsWith("### ")) {
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      const wrapped = doc.splitTextToSize(line.replace(/^#{2,3}\s+/, ""), maxWidth);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const wrapped = doc.splitTextToSize(`•  ${line.slice(2)}`, maxWidth - 12);
      doc.text(wrapped, marginX + 12, y);
      y += wrapped.length * 14;
    } else {
      const wrapped = doc.splitTextToSize(line, maxWidth);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 14;
    }
  }

  doc.save(`${slug(note.topic)}.pdf`);
}

function safeExportPdf(note) {
  exportPdf(note).catch(() => {
    // eslint-disable-next-line no-alert
    alert("Couldn't generate the PDF. Please try again.");
  });
}

function slug(text) {
  return (text || "study-note")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "study-note";
}

export default function NoteViewer({ note }) {
  if (!note) return null;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-sm animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h2 className="font-display text-lg text-ink">Generated study note</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportMarkdown(note)}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent transition-all"
          >
            Download .md
          </button>
          <button
            type="button"
            onClick={() => safeExportPdf(note)}
            className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent/90 transition-all shadow-sm"
          >
            Download .pdf
          </button>
        </div>
      </div>

      {note.sufficientContext === false ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-ink-muted/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-ink-muted">
            Not enough material was found to generate a note on this topic. Try uploading more source
            documents or a different topic.
          </p>
        </div>
      ) : (
        <>
          <div className="prose-studymate font-display text-[15.5px] text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.markdown}</ReactMarkdown>
          </div>
          <div className="mt-4 pt-3 border-t border-line">
            <SourceCitation sources={note.sources} />
          </div>
        </>
      )}
    </div>
  );
}
