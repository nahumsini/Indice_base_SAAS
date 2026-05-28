import type { AuthSessionResponse } from './auth.types';

let cachedAuthSession: AuthSessionResponse | null | undefined;
let cachedCsrfToken: string | null = null;

export const getCachedAuthSession = () => cachedAuthSession;

export const setCachedAuthSession = (
  session: AuthSessionResponse | null | undefined,
) => {
  cachedAuthSession = session;
};

export const setCachedCsrfToken = (csrfToken: string | null | undefined) => {
  cachedCsrfToken = csrfToken?.trim() || null;
};

export const getCachedCsrfToken = () => (
  cachedAuthSession?.csrfToken ?? cachedCsrfToken
);
