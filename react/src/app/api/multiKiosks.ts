import { apiClient, ApiClientError, buildApiUrl } from '../lib/apiClient';
import type {
  PublicTaskKioskAssignmentOption,
  PublicTaskKioskTask,
} from '../BasicModules/ProcessesTasks/Kiosk/processTaskKioskApi';

interface Envelope<T> {
  data: T;
  meta: { requestId: string; kioskSessionId?: string; capability?: string };
}

export type MultiKioskStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'REVOKED';

export interface MultiKioskSummary {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: MultiKioskStatus;
  unit_id?: number;
  unit_name?: string;
  business_id?: number;
  business_name?: string;
  theme_key: string;
  default_locale: string;
  expires_at?: string;
  public_token_hint: string;
  access_path?: string;
  configuration_version: number;
  kiosk_count: number;
  employee_count: number;
  updated_at: string;
}

export interface MultiKioskCatalogKiosk {
  id: number;
  name: string;
  owner_module: string;
  module_slug: string;
  kiosk_type: string;
  unit_id?: number;
  unit_name?: string;
  business_id?: number;
  business_name?: string;
  access_level: string;
}

export interface MultiKioskCatalogEmployee {
  user_company_id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  unit_id?: number;
  unit_name?: string;
  business_id?: number;
  business_name?: string;
  module_slugs: string[];
  pin_ready: boolean;
}

export interface MultiKioskDetail extends MultiKioskSummary {
  kiosks: Array<MultiKioskCatalogKiosk & { sort_order: number }>;
  employees: Array<Pick<MultiKioskCatalogEmployee, 'user_company_id' | 'user_id' | 'name' | 'email'>>;
}

export interface MultiKioskPayload {
  name: string;
  description: string;
  theme_key: string;
  default_locale: string;
  unit_id: number | null;
  business_id: number | null;
  expires_at: string | null;
  kiosk_definition_ids: number[];
  employee_ids: number[];
}

const adminBase = '/api/v2/kiosk-center/multi-kiosks';

export const multiKioskAdminApi = {
  async list(signal?: AbortSignal) {
    const response = await apiClient<Envelope<{ items: MultiKioskSummary[] }>>(adminBase, { signal });
    return response.data.items;
  },
  async catalog(signal?: AbortSignal) {
    const response = await apiClient<Envelope<{
      kiosks: MultiKioskCatalogKiosk[];
      employees: MultiKioskCatalogEmployee[];
    }>>(`${adminBase}/catalog`, { signal });
    return response.data;
  },
  async detail(id: number, signal?: AbortSignal) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}`, { signal });
    return response.data;
  },
  async create(payload: MultiKioskPayload) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(adminBase, {
      method: 'POST', body: JSON.stringify(payload),
    });
    return response.data;
  },
  async update(id: number, payload: MultiKioskPayload) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}`, {
      method: 'PUT', body: JSON.stringify(payload),
    });
    return response.data;
  },
  async rotateLink(id: number) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}/rotate-link`, {
      method: 'POST', body: JSON.stringify({}),
    });
    return response.data;
  },
  async transition(id: number, action: 'enable' | 'disable' | 'revoke') {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}/${action}`, {
      method: 'POST', body: JSON.stringify({}),
    });
    return response.data;
  },
};

export interface MultiKioskCard {
  id: number;
  name: string;
  module: string;
  module_slug: string;
  kiosk_type: string;
  purpose: string;
  availability: 'AVAILABLE' | 'VERIFICATION_REQUIRED';
  primary_action: 'OPEN';
}

export interface MultiKioskBootstrap {
  name: string;
  description: string;
  company_name: string;
  theme_key: string;
  locale: string;
  access_methods: string[];
  csrf_token: string;
}

export interface MultiKioskMobileSession {
  session_id?: string;
  session_token?: string;
  expires_at: string;
  employee: { name: string };
  multi_kiosk: { id: number; name: string; description: string; company_name: string; theme_key: string };
  kiosks: MultiKioskCard[];
}

export interface MultiKioskChildLaunch {
  kiosk_session_id: string;
  kiosk_session_token: string;
  expires_at: string;
  granted_capabilities: string[];
  experience_status: 'READY' | 'SPECIALIZED_VERIFICATION_REQUIRED';
  workspace: { owner_module: string; kiosk_definition_id: number; channel: string };
}

export interface MultiKioskChildWorkspace {
  kiosk: MultiKioskCard;
  session: { id: string; expires_at: string; capabilities: string[] };
  experience_status: 'READY' | 'SPECIALIZED_VERIFICATION_REQUIRED';
  message?: string;
  bootstrap?: {
    kiosk?: { id: number; code: string; name: string };
    scope_label?: string;
    user?: { id: number; user_id: number; full_name: string };
    tasks?: PublicTaskKioskTask[];
    assignment_options?: PublicTaskKioskAssignmentOption;
    inactivity_timeout_seconds?: number;
    authentication?: string;
  };
}

const publicBase = (token: string) => `/api/v2/multi-kiosks/public/${encodeURIComponent(token)}`;
const multiSessionKey = (token: string) => `indice.multi-kiosk.${token}.session`;
const childSessionKey = (token: string, kioskId: number) => `indice.multi-kiosk.${token}.child.${kioskId}`;

const readStored = (key: string) => {
  try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; }
};
const writeStored = (key: string, value: string) => {
  try { sessionStorage.setItem(key, value); } catch { /* browser binding still applies */ }
};
const removeStored = (key: string) => {
  try { sessionStorage.removeItem(key); } catch { /* no-op */ }
};

async function publicRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    cache: init.method && init.method !== 'GET' ? undefined : 'no-store',
    ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  const payload = await response.json().catch(() => null) as Envelope<T> | { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    const error = payload && 'error' in payload ? payload.error : undefined;
    throw new ApiClientError(error?.message || response.statusText || 'Request failed', response.status, error?.code, payload);
  }
  return (payload as Envelope<T>).data;
}

export const multiKioskMobileSession = {
  get: (token: string) => readStored(multiSessionKey(token)),
  set: (token: string, value: string) => writeStored(multiSessionKey(token), value),
  clear: (token: string) => removeStored(multiSessionKey(token)),
  childGet: (token: string, kioskId: number) => readStored(childSessionKey(token, kioskId)),
  childSet: (token: string, kioskId: number, value: string) => writeStored(childSessionKey(token, kioskId), value),
  childClear: (token: string, kioskId: number) => removeStored(childSessionKey(token, kioskId)),
};

export const multiKioskPublicApi = {
  bootstrap: (token: string, signal?: AbortSignal) => publicRequest<MultiKioskBootstrap>(publicBase(token), { signal }),
  async authenticate(token: string, pin: string, csrfToken: string) {
    const data = await publicRequest<MultiKioskMobileSession>(`${publicBase(token)}/sessions`, {
      method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ pin }),
    });
    if (data.session_token) multiKioskMobileSession.set(token, data.session_token);
    return data;
  },
  session: (token: string, signal?: AbortSignal) => publicRequest<MultiKioskMobileSession>(
    `${publicBase(token)}/session`,
    { headers: { 'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token) }, signal },
  ),
  async launch(token: string, kioskId: number, csrfToken: string) {
    const data = await publicRequest<MultiKioskChildLaunch>(`${publicBase(token)}/kiosks/${kioskId}/sessions`, {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken, 'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token) },
      body: JSON.stringify({}),
    });
    multiKioskMobileSession.childSet(token, kioskId, data.kiosk_session_token);
    return data;
  },
  workspace: (token: string, kioskId: number, signal?: AbortSignal) => publicRequest<MultiKioskChildWorkspace>(
    `${publicBase(token)}/kiosks/${kioskId}/workspace`,
    { headers: {
      'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token),
      'X-Kiosk-Session-Token': multiKioskMobileSession.childGet(token, kioskId),
    }, signal },
  ),
  action: <T>(token: string, kioskId: number, capability: string, payload: Record<string, unknown>, csrfToken: string) => publicRequest<T>(
    `${publicBase(token)}/kiosks/${kioskId}/actions/${encodeURIComponent(capability)}`,
    { method: 'POST', headers: {
      'X-CSRF-Token': csrfToken,
      'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token),
      'X-Kiosk-Session-Token': multiKioskMobileSession.childGet(token, kioskId),
      'Idempotency-Key': crypto.randomUUID(),
    }, body: JSON.stringify(payload) },
  ),
};
