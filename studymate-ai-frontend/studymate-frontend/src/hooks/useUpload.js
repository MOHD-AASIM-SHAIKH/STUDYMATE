import { useCallback, useEffect, useRef, useState } from "react";
import { getOcrStatus, listDocuments, ocrIngest, uploadDocument } from "../api/endpoints";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".bmp", ".tiff"];
const PDF_EXTENSION = ".pdf";

function hasExtension(file, exts) {
  const name = file.name || "";
  const idx = name.lastIndexOf(".");
  if (idx === -1) return false;
  return exts.includes(name.slice(idx).toLowerCase());
}

const POLL_INTERVAL = 2000;

export function useUpload() {
  const [documents, setDocuments] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [uploads, setUploads] = useState([]); // { id, filename, progress, status, error, ocrPreview, ... }
  const [listError, setListError] = useState(null);
  const pollTimers = useRef({});

  const refreshList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      setListError(err.message || "Couldn't load your uploaded documents.");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Cleanup poll timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(clearInterval);
    };
  }, []);

  const startPolling = useCallback((uploadId, taskId) => {
    const poll = async () => {
      try {
        const status = await getOcrStatus(taskId);
        setUploads((prev) =>
          prev.map((u) => {
            if (u.id !== uploadId) return u;
            const progress = status.progress || 0;
            const pageInfo = status.total_pages > 0
              ? `${status.current_page}/${status.total_pages}`
              : null;
            return {
              ...u,
              progress,
              pageInfo,
              ocrPreview: status.ocr_text_preview || u.ocrPreview,
              status: status.status === "done" ? "done"
                    : status.status === "error" ? "error"
                    : status.status === "ocr_processing" || status.status === "ingesting" ? "ocr_processing"
                    : "ocr_processing",
              error: status.error || u.error,
            };
          })
        );

        if (status.status === "done" || status.status === "error") {
          clearInterval(pollTimers.current[uploadId]);
          delete pollTimers.current[uploadId];
          if (status.status === "done") {
            await refreshList();
          }
        }
      } catch {
        clearInterval(pollTimers.current[uploadId]);
        delete pollTimers.current[uploadId];
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId ? { ...u, status: "error", error: "Status check failed." } : u
          )
        );
      }
    };

    pollTimers.current[uploadId] = setInterval(poll, POLL_INTERVAL);
    poll(); // fire immediately
  }, [refreshList]);

  const upload = useCallback(
    async (file) => {
      const id = crypto.randomUUID();
      const isPdf = hasExtension(file, [PDF_EXTENSION]);
      const isImage = hasExtension(file, IMAGE_EXTENSIONS);
      const entry = { id, filename: file.name, progress: 0, status: "uploading", ocrPreview: null, pageInfo: null };
      setUploads((prev) => [...prev, entry]);

      try {
        if (isPdf || isImage) {
          // Async OCR flow
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "ocr_processing", progress: 5 } : u)));
          const result = await ocrIngest(file, (pct) => {
            setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: Math.round(pct * 0.1) } : u)));
          });
          startPolling(id, result.task_id);
        } else {
          // Sync upload for DOCX/TXT
          await uploadDocument(file, (progress) => {
            setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
          });
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "done", progress: 100 } : u)));
          await refreshList();
        }
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "error", error: err.message || "Upload failed." } : u
          )
        );
      }
    },
    [refreshList, startPolling]
  );

  return { documents, isLoadingList, listError, uploads, upload, refreshList };
}
