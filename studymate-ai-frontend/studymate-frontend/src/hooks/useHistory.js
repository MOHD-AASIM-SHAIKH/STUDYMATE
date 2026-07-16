import { useCallback, useEffect, useState } from "react";
import { getSessionHistory } from "../api/endpoints";
import { useSession } from "../context/SessionContext";

export function useHistory() {
  const { sessionId } = useSession();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setHistory([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSessionHistory(sessionId);
      setHistory(result.history);
    } catch (err) {
      setError(err.message || "Couldn't load your history.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, isLoading, error, refresh, hasSession: Boolean(sessionId) };
}
