import {
  getCachedCsrfToken,
  setCachedAuthSession,
} from '../../../react/src/app/api/authSessionStore';
import type {
  AuthResult,
  DemoSession,
  HumanChallenge,
  HumanChallengePurpose,
  LoginPayload,
  RegisterPayload,
} from './authTypes';

type BackendSession = {
  user: {
    id: number;
    name: string;
    email?: string;
    role: DemoSession['role'];
    module_slugs: string[];
    tab_permission_keys: string[];
    tab_permissions_configured: boolean;
  };
  company: { id: number; name?: string; slug?: string };
  csrfToken: string;
};

class ApiRequestError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

const mapSession = (session: BackendSession): DemoSession => ({
  userName: session.user.name,
  email: session.user.email ?? '',
  companyName: session.company.name ?? 'Indice Demo',
  companySlug: session.company.slug ?? normalizeCompanySlug(session.company.name ?? 'Indice Demo'),
  role: session.user.role,
  issuedAt: new Date().toISOString(),
});

const requestJson = async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message ?? payload?.error?.message ?? 'Request failed.';
    throw new ApiRequestError(message, payload?.code);
  }
  return payload as T;
};

export function normalizeCompanySlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const demoAuthApi = {
  getChallenge(purpose: HumanChallengePurpose) {
    return requestJson<HumanChallenge>(`/api/v1/auth/challenge/${purpose}`);
  },

  async getSession() {
    try {
      const session = await requestJson<BackendSession>('/api/v1/auth/me');
      setCachedAuthSession(session);
      return mapSession(session);
    } catch {
      setCachedAuthSession(null);
      return null;
    }
  },

  async login(payload: LoginPayload): Promise<AuthResult> {
    let result: AuthResult & { session?: BackendSession };
    try {
      result = await requestJson<AuthResult & { session?: BackendSession }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'unknown_company') {
        return { kind: 'unknown-company', companySlug: normalizeCompanySlug(payload.company) };
      }
      throw error;
    }

    if (result.kind === 'authenticated' && result.session) {
      setCachedAuthSession(result.session);
      return { kind: 'authenticated', session: mapSession(result.session) };
    }
    return result;
  },

  async register(payload: RegisterPayload): Promise<DemoSession> {
    const result = await requestJson<{ kind: 'authenticated'; session: BackendSession }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setCachedAuthSession(result.session);
    return mapSession(result.session);
  },

  async logout() {
    await requestJson('/api/v1/auth/logout', {
      method: 'POST',
      headers: getCachedCsrfToken() ? { 'X-CSRF-Token': getCachedCsrfToken()! } : {},
    }).catch(() => undefined);
    setCachedAuthSession(null);
  },
};
