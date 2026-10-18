import { useEffect, useRef, useState } from 'react';

/** Browser fullscreen is transient; browser controls and Esc remain the source of truth. */
export function useKanbanFullscreen(onChange: (fullscreen: boolean) => void) {
  const rootRef = useRef<HTMLElement>(null);
  const ownedElement = useRef<HTMLElement | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    mounted.current = true;
    const synchronize = () => {
      const active = rootRef.current !== null && document.fullscreenElement === rootRef.current;
      onChange(active);
      if (active) setFailed(false);
    };
    document.addEventListener('fullscreenchange', synchronize);
    return () => {
      mounted.current = false;
      document.removeEventListener('fullscreenchange', synchronize);
      // Navigation must never leave the monitor in this workspace or close another owner.
      if (ownedElement.current && document.fullscreenElement === ownedElement.current) {
        void document.exitFullscreen().catch(() => {});
      }
      onChange(false);
    };
  }, [onChange]);

  const change = async (enter: boolean) => {
    const element = rootRef.current;
    if (!element || busy.current) return;
    busy.current = true;
    setPending(true);
    setFailed(false);
    try {
      if (enter) {
        ownedElement.current = element;
        await element.requestFullscreen();
        // A request can finish after the user has already navigated away.
        if (!mounted.current && document.fullscreenElement === element) await document.exitFullscreen();
      } else if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      }
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return { rootRef, pending, failed,
    toggle: () => change(document.fullscreenElement !== rootRef.current),
    exit: () => change(false),
  };
}
