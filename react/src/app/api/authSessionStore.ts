import type { AuthSessionResponse } from './auth.types';

let cachedAuthSession: AuthSessionResponse | null | undefined;

export const getCachedAuthSession = () => cachedAuthSession;

export const setCachedAuthSession = (
  session: AuthSessionResponse | null | undefined,
) => {
  cachedAuthSession = session;
};

export const getCachedCsrfToken = () => (
  cachedAuthSession?.csrfToken ?? null
);
