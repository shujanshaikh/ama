import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/trpc";

interface UseChatSnapshotOptions {
  chatId: string | null;
  status: string;
}

export function useChatSnapshot({ chatId, status }: UseChatSnapshotOptions) {
  const [latestSnapshot, setLatestSnapshot] = useState<{
    projectId: string;
    hash: string;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const fetchSnapshot = useCallback(() => {
    if (!chatId) return;
    api
      .getLatestSnapshot(chatId)
      .then((snap) => setLatestSnapshot(snap ?? null))
      .catch(() => setLatestSnapshot(null));
  }, [chatId]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // Refetch snapshot when AI finishes streaming
  const previousStatusRef = useRef(status);
  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (
      (prevStatus === "streaming" || prevStatus === "submitted") &&
      status === "ready"
    ) {
      fetchSnapshot();
    }
  }, [status, fetchSnapshot]);

  const canUndo =
    !!latestSnapshot &&
    status !== "streaming" &&
    status !== "submitted" &&
    !isUndoing;

  const handleUndo = useCallback(async () => {
    if (!chatId || !latestSnapshot) return;
    setIsUndoing(true);
    try {
      const result = await api.undo(chatId);
      if (result.success) {
        fetchSnapshot();
      } else {
        console.error("[undo] Failed:", result.error);
      }
    } catch (error) {
      console.error("[undo] Error:", error);
    } finally {
      setIsUndoing(false);
    }
  }, [chatId, latestSnapshot, fetchSnapshot]);

  const handleAcceptAll = useCallback(async () => {
    if (!chatId || !latestSnapshot) return;
    setIsAccepting(true);
    try {
      const result = await api.undo(chatId, true);
      if (result.success) {
        fetchSnapshot();
      }
    } catch (error) {
      console.error("[accept] Error:", error);
    } finally {
      setIsAccepting(false);
    }
  }, [chatId, latestSnapshot, fetchSnapshot]);

  const resetSnapshot = useCallback(() => {
    setLatestSnapshot(null);
  }, []);

  return {
    latestSnapshot,
    canUndo,
    isUndoing,
    isAccepting,
    handleUndo,
    handleAcceptAll,
    fetchSnapshot,
    resetSnapshot,
  };
}
