import { useEffect, useRef } from "react";

export function useAutoResume(
  status: string,
  reload: () => void,
  isLoading: boolean,
) {
  const hasTriedResume = useRef(false);

  useEffect(() => {
    if (status === "error" && !isLoading && !hasTriedResume.current) {
      hasTriedResume.current = true;
      reload();
    }
  }, [status, isLoading, reload]);

  useEffect(() => {
    hasTriedResume.current = false;
  }, []);
}
