import { useEffect, useRef, useState } from 'react';

const DEFAULT_TAB_LOADING_DURATION_MS = 700;

const getNow = () => (
  typeof performance !== 'undefined' ? performance.now() : Date.now()
);

const getRemainingDuration = (startedAt: number, minimumDurationMs: number) => (
  Math.max(0, minimumDurationMs - (getNow() - startedAt))
);

export function useDeferredTabChange<T extends string>(
  activeTab: T,
  commitTabChange: (nextTab: T) => void,
  minimumDurationMs = DEFAULT_TAB_LOADING_DURATION_MS,
) {
  const [isTabLoading, setIsTabLoading] = useState(false);
  const loadingStartedAtRef = useRef(0);
  const loadingTimeoutRef = useRef<number | null>(null);
  const pendingAnimationFrameCleanupRef = useRef<(() => void) | null>(null);

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const clearPendingAnimationFrame = () => {
    pendingAnimationFrameCleanupRef.current?.();
    pendingAnimationFrameCleanupRef.current = null;
  };

  const finishLoadingAfterMinimum = () => {
    if (typeof window === 'undefined') {
      setIsTabLoading(false);
      return;
    }

    clearLoadingTimeout();
    loadingTimeoutRef.current = window.setTimeout(() => {
      setIsTabLoading(false);
      loadingTimeoutRef.current = null;
    }, getRemainingDuration(loadingStartedAtRef.current, minimumDurationMs));
  };

  const runAfterNextPaint = (callback: () => void) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      callback();
      return;
    }

    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        pendingAnimationFrameCleanupRef.current = null;
        callback();
      });
    });

    pendingAnimationFrameCleanupRef.current = () => {
      window.cancelAnimationFrame(firstFrameId);

      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  };

  const changeTab = (nextTab: T) => {
    if (nextTab === activeTab) {
      return;
    }

    clearPendingAnimationFrame();
    clearLoadingTimeout();
    loadingStartedAtRef.current = getNow();
    setIsTabLoading(true);

    runAfterNextPaint(() => {
      try {
        commitTabChange(nextTab);
      } finally {
        finishLoadingAfterMinimum();
      }
    });
  };

  useEffect(() => () => {
    clearPendingAnimationFrame();
    clearLoadingTimeout();
  }, []);

  return {
    changeTab,
    isTabLoading,
  };
}
