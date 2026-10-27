import { useEffect, useRef, useState } from "react";

/** A read is armed only by an explicit opportunity link and waits for a visible return. */
export function useOpportunityReturn(onReturn: (contactId: number, signal: AbortSignal) => Promise<void>, available: boolean) {
  const pending = useRef<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const callback = useRef(onReturn);
  callback.current = onReturn;
  const [returned, setReturned] = useState<{ contactId: number } | null>(null);
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== "hidden" && pending.current !== null) setReturned({ contactId: pending.current });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!returned || !available || pending.current === null || document.visibilityState === "hidden") return;
    const contactId = pending.current;
    pending.current = null;
    setReturned(null);
    const controller = new AbortController();
    request.current = controller;
    // The caller owns feedback and busy state. Unmount aborts the read rather than replacing drafts.
    void callback.current(contactId, controller.signal);
  }, [returned, available]);
  return {
    markOpened: (contactId: number) => { pending.current = contactId; setReturned(null); },
    retry: (contactId: number) => { pending.current = contactId; setReturned({ contactId }); },
  };
}
