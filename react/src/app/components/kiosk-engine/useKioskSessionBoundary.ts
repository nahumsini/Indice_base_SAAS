import { useEffect, useState } from 'react';

type Options = {
  active: boolean;
  expiresAt?: string | null;
  inactivityTimeoutSeconds: number;
  onExpire: () => void;
};

export function useKioskSessionBoundary({ active, expiresAt, inactivityTimeoutSeconds, onExpire }: Options) {
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [isSessionExpiring, setIsSessionExpiring] = useState(false);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setIsSessionExpiring(false);
      return;
    }
    const inactivityMs = Math.max(30, inactivityTimeoutSeconds) * 1000;
    const identityExpiry = expiresAt ? new Date(expiresAt).getTime() : Number.POSITIVE_INFINITY;
    let expiryTimer = 0;
    let warningTimer = 0;
    const schedule = () => {
      window.clearTimeout(expiryTimer);
      window.clearTimeout(warningTimer);
      setIsSessionExpiring(false);
      const remainingIdentityMs = Math.max(0, identityExpiry - Date.now());
      const expiryMs = Number.isFinite(remainingIdentityMs)
        ? Math.min(inactivityMs, remainingIdentityMs)
        : inactivityMs;
      warningTimer = window.setTimeout(() => setIsSessionExpiring(true), Math.max(0, expiryMs - 30_000));
      expiryTimer = window.setTimeout(onExpire, expiryMs);
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, schedule, { passive: true }));
    schedule();
    return () => {
      window.clearTimeout(expiryTimer);
      window.clearTimeout(warningTimer);
      events.forEach(event => window.removeEventListener(event, schedule));
    };
  }, [active, expiresAt, inactivityTimeoutSeconds, onExpire]);

  return { isOnline, isSessionExpiring };
}
