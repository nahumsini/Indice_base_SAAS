import type { AuthSessionResponse } from './auth.types';

let cachedAuthSession: AuthSessionResponse | null | undefined;
let cachedCsrfToken: string | null = null;
const authenticationExpiredListeners = new Set<() => void>();

export const getCachedAuthSession = () => cachedAuthSession;

export const setCachedAuthSession = (
  session: AuthSessionResponse | null | undefined,
) => {
  cachedAuthSession = session;
  if (session === null) {
    cachedCsrfToken = null;
  }
};

export const expireCachedAuthSession = () => {
  const hadAuthenticatedSession = cachedAuthSession != null;
  cachedAuthSession = null;
  cachedCsrfToken = null;

  if (!hadAuthenticatedSession) {
    return;
  }

  authenticationExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One UI subscriber must not prevent the remaining subscribers from reacting.
    }
  });
};

export const subscribeToAuthenticationExpired = (listener: () => void) => {
  authenticationExpiredListeners.add(listener);
  return () => {
    authenticationExpiredListeners.delete(listener);
  };
};

export const setCachedCsrfToken = (csrfToken: string | null | undefined) => {
  cachedCsrfToken = csrfToken?.trim() || null;
};

export const getCachedCsrfToken = () => (
  cachedAuthSession?.csrfToken ?? cachedCsrfToken
);
