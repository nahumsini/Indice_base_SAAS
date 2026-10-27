import { useEffect, useRef } from "react";
// Arm only for an explicit correction link; ordinary focus does not reload drafts.
export function useContactCorrectionReturn(onReturn: (id: number) => void) {
  const pending = useRef<number | null>(null);
  const callback = useRef(onReturn);
  callback.current = onReturn;
  useEffect(() => {
    const returned = () => {
      if (document.visibilityState === "hidden" || pending.current === null) return;
      const id = pending.current;
      pending.current = null;
      callback.current(id);
    };
    window.addEventListener("focus", returned);
    document.addEventListener("visibilitychange", returned);
    return () => {
      window.removeEventListener("focus", returned);
      document.removeEventListener("visibilitychange", returned);
    };
  }, []);
  return (id: number) => { pending.current = id; };
}
