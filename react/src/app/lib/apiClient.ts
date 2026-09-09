import {
  expireCachedAuthSession,
  getCachedCsrfToken,
  setCachedAuthSession,
  setCachedCsrfToken,
} from '../api/authSessionStore';
import type { AuthSessionResponse } from '../api/auth.types';

export class ApiClientError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

const normalizeEnvUrl = (value: unknown) => (
  typeof value === 'string' ? value.trim().replace(/\/+$/, '') : ''
);

const apiBaseUrl = normalizeEnvUrl(import.meta.env.VITE_API_BASE_URL);
const AUTH_ME_PATH = '/api/v1/auth/me';
const AUTH_CSRF_PATH = '/api/v1/auth/csrf';
const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type ApiClientRequestInit = RequestInit & {
  csrf?: boolean;
};

export const buildApiUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
};

const normalizeMethod = (method?: string) => (method ?? 'GET').toUpperCase();

const defaultRequestCache = (method: string): RequestCache | undefined => (
  method === 'GET' || method === 'HEAD' ? 'no-store' : undefined
);

const buildHeaders = (
  method: string,
  initHeaders?: HeadersInit,
  body?: BodyInit | null,
  includeCsrf = mutationMethods.has(method),
) => {
  const headers = new Headers(initHeaders);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const isFormBody =
    typeof FormData !== 'undefined' && body instanceof FormData;
  const isSearchParamsBody =
    typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;

  if (body && !isFormBody && !isSearchParamsBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (includeCsrf) {
    const csrfToken = getCachedCsrfToken();
    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  return headers;
};

const parsePayload = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json')
    ? response.json().catch(() => null)
    : response.text().catch(() => null);
};

const messageFromPayload = (payload: unknown) => (
  typeof payload === 'object' && payload !== null
    ? (
      (payload as { error?: { message?: string }; message?: string }).error?.message
      ?? (payload as { error?: { message?: string }; message?: string }).message
      ?? ''
    )
    : ''
);

const codeFromPayload = (payload: unknown) => (
  typeof payload === 'object' && payload !== null
    ? (
      (payload as { code?: string; error?: { code?: string } }).error?.code
      ?? (payload as { code?: string }).code
    )
    : undefined
);

const cacheCsrfTokenFromPayload = (payload: unknown) => {
  const csrfToken = typeof payload === 'object' && payload !== null
    ? (payload as { csrfToken?: unknown }).csrfToken
    : null;
  if (typeof csrfToken === 'string') {
    setCachedCsrfToken(csrfToken);
  }
};

const fetchCsrfToken = async () => {
  const response = await fetch(buildApiUrl(AUTH_CSRF_PATH), {
    cache: 'no-store',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  const payload = await parsePayload(response);

  if (response.ok) {
    cacheCsrfTokenFromPayload(payload);
    return getCachedCsrfToken();
  }

  return null;
};

const isInvalidCsrfError = (status: number, payload: unknown) => (
  status === 403 && /csrf/i.test(messageFromPayload(payload))
);

const refreshAuthSession = async () => {
  const response = await fetch(buildApiUrl(AUTH_ME_PATH), {
    cache: 'no-store',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  const payload = await parsePayload(response);

  if (response.ok) {
    setCachedAuthSession(payload as AuthSessionResponse);
    return payload as AuthSessionResponse;
  }

  if (response.status === 401) {
    expireCachedAuthSession();
  }

  return null;
};

export async function apiClient<T = unknown>(
  path: string,
  init: ApiClientRequestInit = {},
): Promise<T> {
  const { csrf = false, ...requestInit } = init;
  const method = normalizeMethod(init.method);
  const includeCsrf = csrf || mutationMethods.has(method);
  if (includeCsrf && !getCachedCsrfToken()) {
    await fetchCsrfToken();
  }
  const execute = () => fetch(buildApiUrl(path), {
    credentials: 'include',
    cache: defaultRequestCache(method),
    ...requestInit,
    headers: buildHeaders(method, requestInit.headers, requestInit.body, includeCsrf),
  });
  let response = await execute();
  let payload = await parsePayload(response);

  if (!response.ok && isInvalidCsrfError(response.status, payload) && includeCsrf) {
    const session = await refreshAuthSession();
    if (!session?.csrfToken) {
      await fetchCsrfToken();
    }
    if (getCachedCsrfToken()) {
      response = await execute();
      payload = await parsePayload(response);
    }
  }

  if (response.status === 401) {
    expireCachedAuthSession();
  }

  if (response.status === 403 && !isInvalidCsrfError(response.status, payload)) {
    await refreshAuthSession();
  }

  if (response.status === 402 && codeFromPayload(payload) === 'PAYMENT_REQUEST_OVERDUE') {
    await refreshAuthSession().catch(() => null);
  }

  if (!response.ok) {
    const message = messageFromPayload(payload) || response.statusText;
    const code = codeFromPayload(payload);

    throw new ApiClientError(message || 'Request failed', response.status, code, payload);
  }

  cacheCsrfTokenFromPayload(payload);
  return payload as T;
}

export async function requestText(path: string, init: ApiClientRequestInit = {}) {
  const { csrf = false, ...requestInit } = init;
  const method = normalizeMethod(init.method);
  const includeCsrf = csrf || mutationMethods.has(method);
  if (includeCsrf && !getCachedCsrfToken()) {
    await fetchCsrfToken();
  }
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    cache: defaultRequestCache(method),
    ...requestInit,
    headers: buildHeaders(method, requestInit.headers, requestInit.body, includeCsrf),
  });

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      expireCachedAuthSession();
    } else if (response.status === 403) {
      await refreshAuthSession();
    } else if (response.status === 402) {
      try {
        if (codeFromPayload(JSON.parse(text)) === 'PAYMENT_REQUEST_OVERDUE') {
          await refreshAuthSession().catch(() => null);
        }
      } catch { /* Preserve the original response when its body is not JSON. */ }
    }
    throw new ApiClientError(response.statusText || 'Request failed', response.status, undefined, text);
  }

  return text;
}

export const toFormUrlEncoded = (values: Record<string, string>) => {
  const body = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    body.set(key, value);
  });

  return body;
};
