import type { AuthSessionResponse } from './auth.types';

let cachedAuthSession: AuthSessionResponse | null | undefined;
let cachedCsrfToken: string | null = null;
const authenticationExpiredListeners = new Set<() => void>();
const authorizationChangedListeners = new Set<() => void>();
let authorizationRevision = 0;

const sortedStrings = (values: string[] | undefined) => [...(values ?? [])].sort();

const authorizationFingerprint = (
  session: AuthSessionResponse | null | undefined,
) => {
  if (session === undefined) return 'unknown';
  if (session === null) return 'anonymous';

  return JSON.stringify({
    userId: session.user?.id ?? null,
    userRole: session.user?.role ?? null,
    moduleSlugs: sortedStrings(session.user?.module_slugs),
    tabPermissionKeys: sortedStrings(session.user?.tab_permission_keys),
    tabPermissionsConfigured: Boolean(session.user?.tab_permissions_configured),
    companyId: session.company?.id ?? null,
    companyRole: session.company?.role ?? null,
    companyActive: session.company?.active ?? false,
    commercialAccountType: session.company?.commercial_account_type ?? null,
    scope: session.company?.scope ?? null,
    subscriptionStatus: session.company?.subscription?.status ?? null,
    subscriptionAccessAllowed: session.company?.subscription?.access_allowed ?? null,
    demoMode: session.demoMode === true,
  });
};

const notifyAuthorizationChanged = () => {
  authorizationRevision += 1;
  authorizationChangedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One UI subscriber must not prevent the remaining subscribers from reacting.
    }
  });
};

export const getCachedAuthSession = () => cachedAuthSession;

export const setCachedAuthSession = (
  session: AuthSessionResponse | null | undefined,
) => {
  const previousFingerprint = authorizationFingerprint(cachedAuthSession);
  cachedAuthSession = session;
  if (session === null) {
    cachedCsrfToken = null;
  }
  if (previousFingerprint !== authorizationFingerprint(session)) {
    notifyAuthorizationChanged();
  }
};

export const getAuthorizationRevision = () => authorizationRevision;

export const subscribeToAuthorizationChanged = (listener: () => void) => {
  authorizationChangedListeners.add(listener);
  return () => {
    authorizationChangedListeners.delete(listener);
  };
};

export const clearBrowserLocalStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.clear();
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }
};

export const expireCachedAuthSession = () => {
  const hadAuthenticatedSession = cachedAuthSession != null;
  clearBrowserLocalStorage();
  setCachedAuthSession(null);

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
