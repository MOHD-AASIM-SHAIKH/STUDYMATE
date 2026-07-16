import { useCallback, useEffect, useState } from "react";
import { listDocuments, uploadDocument } from "../api/endpoints";

export function useUpload() {
  const [documents, setDocuments] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [uploads, setUploads] = useState([]); // { id, filename, progress, status, error }
  const [listError, setListError] = useState(null);

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

  const upload = useCallback(
    async (file) => {
      const id = crypto.randomUUID();
      setUploads((prev) => [...prev, { id, filename: file.name, progress: 0, status: "uploading" }]);

      try {
        await uploadDocument(file, (progress) => {
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
        });
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "done", progress: 100 } : u)));
        await refreshList();
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "error", error: err.message || "Upload failed." } : u
          )
        );
      }
    },
    [refreshList]
  );

  return { documents, isLoadingList, listError, uploads, upload, refreshList };
}
