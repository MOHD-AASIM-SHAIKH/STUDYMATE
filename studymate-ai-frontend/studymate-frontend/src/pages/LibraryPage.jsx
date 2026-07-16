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
      <h1 className="font-display text-xl text-ink">Library</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Upload teacher notes and textbooks (PDF, DOCX, or TXT) so answers and study notes can be
        grounded in them.
      </p>

      <div className="mt-5">
        <FileUploader onFiles={handleFiles} />
      </div>

      {uploads.length > 0 && (
        <ul className="mt-4 space-y-2">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3 text-sm"
            >
              <span className="truncate text-ink">{u.filename}</span>
              {u.status === "uploading" && (
                <div className="ml-4 flex w-32 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-muted">{u.progress}%</span>
                </div>
              )}
              {u.status === "done" && <span className="text-xs font-medium text-accent">Ingested</span>}
              {u.status === "error" && <span className="text-xs text-danger">{u.error}</span>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-display text-lg text-ink">Uploaded documents</h2>

      <div className="mt-3">
        {listError && <ErrorBanner message={listError} onRetry={refreshList} />}

        {isLoadingList && !listError && (
          <div className="space-y-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {!isLoadingList && !listError && documents.length === 0 && (
          <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
        )}

        {!isLoadingList && documents.length > 0 && (
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {documents.map((doc) => (
              <li key={doc.filename} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{doc.filename}</p>
                  <p className="text-xs text-ink-muted">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} · {doc.page_count} page
                    {doc.page_count === 1 ? "" : "s"} · {doc.chunk_count} chunks indexed
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
