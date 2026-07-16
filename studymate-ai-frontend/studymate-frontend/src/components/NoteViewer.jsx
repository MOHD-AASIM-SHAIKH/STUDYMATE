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
    <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <h2 className="font-display text-lg text-ink">Generated study note</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportMarkdown(note)}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent"
          >
            Download .md
          </button>
          <button
            type="button"
            onClick={() => safeExportPdf(note)}
            className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Download .pdf
          </button>
        </div>
      </div>

      {note.sufficientContext === false ? (
        <p className="text-sm text-ink-muted">
          Not enough material was found to generate a note on this topic. Try uploading more source
          documents or a different topic.
        </p>
      ) : (
        <>
          <div className="prose-studymate font-display text-[15.5px] text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.markdown}</ReactMarkdown>
          </div>
          <SourceCitation sources={note.sources} />
        </>
      )}
    </div>
  );
}
