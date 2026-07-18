import { useEffect, useState } from 'react';

type KioskSessionBoundaryOptions = {
  active: boolean;
  expiresAt?: string | null;
  inactivityTimeoutSeconds: number;
  onExpire: () => void;
};

export function useKioskSessionBoundary({
  active,
  expiresAt,
  inactivityTimeoutSeconds,
  onExpire,
}: KioskSessionBoundaryOptions) {
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
    const identityExpiresAt = expiresAt ? new Date(expiresAt).getTime() : Number.POSITIVE_INFINITY;
    let expiryTimer = 0;
    let warningTimer = 0;

    const schedule = () => {
      window.clearTimeout(expiryTimer);
      window.clearTimeout(warningTimer);
      setIsSessionExpiring(false);
      const identityExpiryMs = Math.max(0, identityExpiresAt - Date.now());
      const resetAfterMs = Number.isFinite(identityExpiryMs)
        ? Math.min(inactivityMs, identityExpiryMs)
        : inactivityMs;
      warningTimer = window.setTimeout(
        () => setIsSessionExpiring(true),
        Math.max(0, resetAfterMs - 30_000),
      );
      expiryTimer = window.setTimeout(onExpire, resetAfterMs);
    };

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, schedule, { passive: true }));
    schedule();

    return () => {
      window.clearTimeout(expiryTimer);
      window.clearTimeout(warningTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, schedule));
    };
  }, [active, expiresAt, inactivityTimeoutSeconds, onExpire]);

  return { isOnline, isSessionExpiring };
}
