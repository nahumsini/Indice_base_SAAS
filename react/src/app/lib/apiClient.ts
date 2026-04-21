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

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_BACKEND_URL ??
  ''
).replace(/\/+$/, '');

export const buildApiUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
};

const buildHeaders = (initHeaders?: HeadersInit, body?: BodyInit | null) => {
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

  return headers;
};

export async function apiClient<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    ...init,
    headers: buildHeaders(init.headers, init.body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null
        ? (
          (payload as { error?: { message?: string }; message?: string }).error?.message
          ?? (payload as { error?: { message?: string }; message?: string }).message
          ?? response.statusText
        )
        : response.statusText;
    const code =
      typeof payload === 'object' && payload !== null
        ? (payload as { error?: { code?: string } }).error?.code
        : undefined;

    throw new ApiClientError(message || 'Request failed', response.status, code, payload);
  }

  return payload as T;
}

export async function requestText(path: string, init: RequestInit = {}) {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    ...init,
    headers: buildHeaders(init.headers, init.body),
  });

  const text = await response.text();

  if (!response.ok) {
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
