import { useEffect, useMemo } from 'react';
import { productAnalyticsApi, type ProductAnalyticsEventType } from '../api/productAnalytics';

const HEARTBEAT_SECONDS = 30;

const createUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const sessionKeyFor = (userId: number) => {
  const storageKey = `indice.analytics.app.session.${userId}`;
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = createUuid();
  window.sessionStorage.setItem(storageKey, created);
  return created;
};

const deviceType = (): 'DESKTOP' | 'TABLET' | 'MOBILE' => {
  if (window.innerWidth < 768) return 'MOBILE';
  if (window.innerWidth < 1100) return 'TABLET';
  return 'DESKTOP';
};

export function ProductAnalyticsTracker({
  userId,
  routeKey,
  sectionKey,
  locale,
}: {
  userId?: number;
  routeKey?: string;
  sectionKey?: string;
  locale?: string;
}) {
  const sessionKey = useMemo(
    () => (userId && typeof window !== 'undefined' ? sessionKeyFor(userId) : ''),
    [userId],
  );

  useEffect(() => {
    if (!sessionKey || !routeKey) return;

    const observe = (eventType: ProductAnalyticsEventType, activeSeconds?: number) => {
      void productAnalyticsApi.collectApp({
        sessionKey,
        eventType,
        routeKey,
        sectionKey,
        activeSeconds,
        locale,
        deviceType: deviceType(),
      }).catch(() => {
        // Product analytics must never interrupt the user's operational work.
      });
    };

    observe('PAGE_VIEW');
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        observe('ACTIVE_TIME', HEARTBEAT_SECONDS);
      }
    }, HEARTBEAT_SECONDS * 1000);

    return () => window.clearInterval(intervalId);
  }, [locale, routeKey, sectionKey, sessionKey]);

  return null;
}
