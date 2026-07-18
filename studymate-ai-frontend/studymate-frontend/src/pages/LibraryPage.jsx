import FileUploader from "../components/FileUploader";
import ErrorBanner from "../components/ErrorBanner";
import { CardSkeleton } from "../components/LoadingSkeleton";
import { useUpload } from "../hooks/useUpload";

export default function LibraryPage() {
  const { documents, isLoadingList, listError, uploads, upload, refreshList } = useUpload();

  const handleFiles = (files) => {
    files.forEach((file) => upload(file));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
      <div className="mb-6">
        <h1 className="font-display text-xl text-ink">Library</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Upload teacher notes and textbooks (PDF, DOCX, or TXT) so answers and study notes can be
          grounded in them.
        </p>
      </div>

      <div className="animate-fade-in">
        <FileUploader onFiles={handleFiles} />
      </div>

      {uploads.length > 0 && (
        <div className="mt-5 space-y-2 animate-fade-slide-in">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  u.status === "done" ? "bg-accent/10" : u.status === "error" ? "bg-danger/10" : "bg-ink-muted/10"
                }`}>
                  {u.status === "done" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : u.status === "error" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                </div>
                <span className="truncate text-ink font-medium">{u.filename}</span>
              </div>
              {u.status === "uploading" && (
                <div className="ml-4 flex w-28 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-muted w-8 text-right">{u.progress}%</span>
                </div>
              )}
              {u.status === "done" && <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">Ingested</span>}
              {u.status === "error" && <span className="shrink-0 text-xs text-danger">{u.error}</span>}
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 font-display text-lg text-ink">Uploaded documents</h2>

      <div className="mt-3 space-y-3">
        {listError && <ErrorBanner message={listError} onRetry={refreshList} />}

        {isLoadingList && !listError && (
          <div className="space-y-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {!isLoadingList && !listError && documents.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
            <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
          </div>
        )}

        {!isLoadingList && documents.length > 0 && (
          <div className="divide-y divide-line rounded-xl border border-line bg-surface shadow-sm overflow-hidden">
            {documents.map((doc) => (
              <div key={doc.filename} className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent/3 transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{doc.filename}</p>
                  <p className="text-xs text-ink-muted">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} · {doc.page_count} page
                    {doc.page_count === 1 ? "" : "s"} · {doc.chunk_count} chunks indexed
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
