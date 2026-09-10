import { apiClient, ApiClientError, buildApiUrl } from '../lib/apiClient';
import type {
  PublicTaskKioskAssignmentOption,
  PublicTaskKioskTask,
} from '../BasicModules/ProcessesTasks/Kiosk/processTaskKioskApi';
import type {
  PublicPettyCashFund,
  PublicPettyCashHistory,
  PublicPettyCashReceipt,
} from '../BasicModules/PettyCash/Kiosk/pettyCashKioskApi';
import type {
  SelfServiceBootstrap,
} from '../BasicModules/PointOfSale/SelfServiceKiosk/selfServiceKioskApi';
import type {
  RestaurantWorkspace,
} from '../BasicModules/PointOfSale/RestaurantKiosk/restaurantKioskApi';
import type {
  PublicKioskBootstrapResponse as PublicAttendanceKioskBootstrap,
  PublicKioskDayActivity,
} from './humanResources';
import {
  completeKioskIdempotentOperation,
  executeKioskMutationWithMismatchRecovery,
} from '../components/kiosk-engine/kioskIdempotency';

interface Envelope<T> {
  data: T;
  meta: { requestId: string; kioskSessionId?: string; capability?: string };
}

export type MultiKioskStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'REVOKED';
export type MultiKioskAudience = 'EMPLOYEE' | 'PROVIDER';

export interface MultiKioskSummary {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: MultiKioskStatus;
  audience_type?: MultiKioskAudience;
  allow_provider_registration?: boolean;
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
  /** Native employee tools published by the company launcher. */
  tool_count?: number;
  /** Legacy response field retained for wire compatibility; company Multi-kiosks do not assign people. */
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
  location_id?: number;
  location_name?: string;
  cash_register_id?: number;
  cash_register_name?: string;
  access_level: string;
  /** Optional policy metadata. The backend remains authoritative when omitted. */
  required_tab_scope?: string;
  required_tab_scopes?: string[];
  employee_center_supported?: boolean;
  workspace_kind?: string;
  audience_policy?: string;
  readiness?: string;
  availability?: string;
}

export interface MultiKioskCatalogTool {
  key: string;
  /** Transitional wire alias; API adapters normalize it into `key`. */
  tool_key?: string;
  name: string;
  description: string;
  owner_module: string;
  module_slug: string;
  kiosk_type: string;
  workspace_kind: string;
  audience_policy: string;
  readiness: string;
  required_tab_scopes: string[];
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
  /** Safe readiness metadata used only to explain access in the admin UI. */
  tab_scopes?: string[];
  tab_scopes_unrestricted?: boolean;
  access_issues?: string[];
  effective_access?: boolean;
}

export interface MultiKioskDetail extends MultiKioskSummary {
  tools?: Array<MultiKioskCatalogTool & { sort_order: number }>;
  tool_keys?: string[];
  legacy_kiosk_definition_ids?: number[];
  /** Legacy compositions remain readable while they are migrated to native tools. */
  kiosks?: Array<MultiKioskCatalogKiosk & { sort_order: number }>;
}

export interface MultiKioskPayload {
  name: string;
  description: string;
  theme_key: string;
  default_locale: string;
  unit_id: number | null;
  business_id: number | null;
  expires_at: string | null;
  tool_keys: string[];
  legacy_kiosk_definition_ids?: number[];
  audience_type: MultiKioskAudience;
  allow_provider_registration: boolean;
}

export interface ProviderCenterAccessItem {
  provider_id: number;
  name: string;
  email: string;
  provider_status: 'ACTIVE' | 'INACTIVE' | string;
  unit_id?: number | null;
  unit_name: string;
  business_id?: number | null;
  business_name: string;
  scope_ready: boolean;
  pin_ready: boolean;
  credential_status: string;
  credential_created_at: string;
  credential_rotated_at: string;
}

export interface ProviderCenterIssuedPin {
  provider_id: number;
  provider_name: string;
  pin: string;
  pin_ready: true;
  shown_once: true;
  assignment_mode?: 'GENERATED' | 'MANUAL';
}

const adminBase = '/api/v2/kiosk-center/multi-kiosks';

type MultiKioskCatalogToolWire = Omit<MultiKioskCatalogTool, 'key'> & { key?: string };

const normalizeSummary = <T extends MultiKioskSummary>(item: T): T => ({
  ...item,
  tool_count: item.tool_count ?? item.kiosk_count ?? 0,
});

const normalizeCatalogTool = (tool: MultiKioskCatalogToolWire): MultiKioskCatalogTool | null => {
  const key = (tool.key ?? tool.tool_key ?? '').trim();
  return key ? { ...tool, key } : null;
};

const normalizeDetail = (detail: MultiKioskDetail): MultiKioskDetail => ({
  ...normalizeSummary(detail),
  tools: detail.tools
    ?.map(tool => {
      const normalized = normalizeCatalogTool(tool);
      return normalized ? { ...normalized, sort_order: tool.sort_order } : null;
    })
    .filter((tool): tool is MultiKioskCatalogTool & { sort_order: number } => tool !== null),
});

export const multiKioskAdminApi = {
  async list(signal?: AbortSignal) {
    const response = await apiClient<Envelope<{ items: MultiKioskSummary[] }>>(adminBase, { signal });
    return response.data.items.map(normalizeSummary);
  },
  async catalog(signal?: AbortSignal) {
    const response = await apiClient<Envelope<{
      tools?: MultiKioskCatalogToolWire[];
      provider_tools?: MultiKioskCatalogToolWire[];
      kiosks?: MultiKioskCatalogKiosk[];
      employees: MultiKioskCatalogEmployee[];
    }>>(`${adminBase}/catalog`, { signal });
    return {
      employees: response.data.employees,
      tools: (response.data.tools ?? [])
        .map(normalizeCatalogTool)
        .filter((tool): tool is MultiKioskCatalogTool => tool !== null),
      providerTools: (response.data.provider_tools ?? [])
        .map(normalizeCatalogTool)
        .filter((tool): tool is MultiKioskCatalogTool => tool !== null),
      kiosks: response.data.kiosks ?? [],
    };
  },
  async detail(id: number, signal?: AbortSignal) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}`, { signal });
    return normalizeDetail(response.data);
  },
  async create(payload: MultiKioskPayload) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(adminBase, {
      method: 'POST', body: JSON.stringify(payload),
    });
    return normalizeDetail(response.data);
  },
  async update(id: number, payload: MultiKioskPayload) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}`, {
      method: 'PUT', body: JSON.stringify(payload),
    });
    return normalizeDetail(response.data);
  },
  async rotateLink(id: number) {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}/rotate-link`, {
      method: 'POST', body: JSON.stringify({}),
    });
    return normalizeDetail(response.data);
  },
  async transition(id: number, action: 'enable' | 'disable' | 'revoke') {
    const response = await apiClient<Envelope<MultiKioskDetail>>(`${adminBase}/${id}/${action}`, {
      method: 'POST', body: JSON.stringify({}),
    });
    return normalizeDetail(response.data);
  },
  async providerAccesses(id: number, signal?: AbortSignal) {
    const response = await apiClient<Envelope<{ items: ProviderCenterAccessItem[] }>>(
      `${adminBase}/${id}/providers`, { signal },
    );
    return response.data.items;
  },
  async issueProviderPin(id: number, providerId: number) {
    const response = await apiClient<Envelope<ProviderCenterIssuedPin>>(
      `${adminBase}/${id}/providers/${providerId}/pin`, {
        method: 'POST', body: JSON.stringify({}),
      },
    );
    return response.data;
  },
  async updateProviderPin(id: number, providerId: number, pin: string) {
    const response = await apiClient<Envelope<ProviderCenterIssuedPin>>(
      `${adminBase}/${id}/providers/${providerId}/pin`, {
        method: 'PUT', body: JSON.stringify({ pin }),
      },
    );
    return response.data;
  },
  async revokeProviderPin(id: number, providerId: number) {
    const response = await apiClient<Envelope<{ provider_id: number; pin_ready: false; success: true }>>(
      `${adminBase}/${id}/providers/${providerId}/revoke`, {
        method: 'POST', body: JSON.stringify({}),
      },
    );
    return response.data;
  },
};

export interface MultiKioskCard {
  id: number;
  /** Stable native tool identity; numeric id remains the opaque launch handle. */
  tool_key?: string;
  name: string;
  module: string;
  module_slug: string;
  kiosk_type: string;
  workspace_kind?: string;
  purpose: string;
  availability: 'AVAILABLE' | 'VERIFICATION_REQUIRED';
  primary_action: 'OPEN';
  scope?: { unit_id?: number | string; business_id?: number | string; location_id?: number | string };
}

export interface MultiKioskBootstrap {
  name: string;
  description: string;
  company_name: string;
  theme_key: string;
  locale: string;
  access_methods: string[];
  csrf_token: string;
  audience_type: MultiKioskAudience;
  allow_provider_registration: boolean;
}

export interface MultiKioskMobileSession {
  session_id?: string;
  session_token?: string;
  expires_at: string;
  identity?: { type: 'EMPLOYEE' | 'PROVIDER'; id: number; name: string };
  employee?: { name: string };
  provider?: { id: number; name: string };
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

export interface MultiKioskEmployeeIdentity {
  id: number;
  user_id?: number;
  user_code?: string;
  full_name: string;
  name?: string;
  position_title?: string;
  department?: string;
}

export interface MultiKioskEmployeeWorkspaceBootstrap extends Partial<PublicPettyCashHistory> {
  kiosk?: {
    id?: number;
    code?: string;
    name?: string;
    currencyCode?: string;
    accessType?: string;
    status?: string;
  };
  kiosk_device?: PublicAttendanceKioskBootstrap['kiosk_device'];
  kiosk_type?: PublicAttendanceKioskBootstrap['kiosk_type'];
  location?: PublicAttendanceKioskBootstrap['location'];
  scope_label?: string;
  user?: MultiKioskEmployeeIdentity;
  tasks?: PublicTaskKioskTask[];
  assignment_options?: PublicTaskKioskAssignmentOption;
  today_activity?: PublicKioskDayActivity;
  identity_evidence_required?: boolean;
  fund?: PublicPettyCashFund;
  recent_receipts?: PublicPettyCashReceipt[];
  inactivity_timeout_seconds?: number;
  authentication?: 'ENGINE_PIN_SESSION' | string;
  providers?: Array<{ id: number; name: string }>;
  code?: string;
  name?: string;
  companyName?: string;
  unitName?: string;
  businessName?: string;
  warehouseName?: string;
  cashRegisterName?: string;
  currencyCode?: string;
  showStock?: boolean;
  customerNameRequired?: boolean;
  maxItemsPerTicket?: number;
  preticketTtlMinutes?: number;
  fulfillmentPolicy?: SelfServiceBootstrap['fulfillmentPolicy'];
  items?: SelfServiceBootstrap['items'];
  kioskType?: SelfServiceBootstrap['kioskType'] | RestaurantWorkspace['kioskType'];
  availabilityState?: SelfServiceBootstrap['availabilityState'];
  sourceRegisterOpen?: boolean;
  discountRules?: SelfServiceBootstrap['discountRules'];
  kioskId?: number;
  ecosystemName?: string;
  areaName?: string;
  status?: string;
  userCompanyId?: number;
  canEditFloorPlan?: boolean;
  tables?: RestaurantWorkspace['tables'];
  orders?: RestaurantWorkspace['orders'] | Array<Record<string, unknown>>;
  catalog?: RestaurantWorkspace['catalog'];
  kitchenItems?: RestaurantWorkspace['kitchenItems'];
  provider?: Record<string, unknown>;
  contact_required?: boolean;
  quote_requests?: Array<Record<string, unknown>>;
  submissions?: Array<Record<string, unknown>>;
  catalog_products?: Array<Record<string, unknown>>;
  invoices?: Array<Record<string, unknown>>;
  payables?: Array<Record<string, unknown>>;
  lane?: string;
  privacy?: Record<string, unknown>;
  invoices_with_purchase_order?: Array<Record<string, unknown>>;
  payables_without_purchase_order?: Array<Record<string, unknown>>;
  purchase_order_payment_tracking?: Array<Record<string, unknown>>;
}

export interface MultiKioskChildWorkspace {
  kiosk: MultiKioskCard;
  session: { id: string; expires_at: string; capabilities: string[] };
  experience_status: 'READY' | 'SPECIALIZED_VERIFICATION_REQUIRED';
  message?: string;
  bootstrap?: MultiKioskEmployeeWorkspaceBootstrap;
}

const publicBase = (token: string) => `/api/v2/multi-kiosks/public/${encodeURIComponent(token)}`;
const publicRequestTimeoutMs = 15_000;
const multiSessionKey = (token: string) => `indice.multi-kiosk.${token}.session`;
const childSessionKey = (token: string, kioskId: number) => `indice.multi-kiosk.${token}.child.${kioskId}`;
const childSessionPrefix = (token: string) => `indice.multi-kiosk.${token}.child.`;
const publicCsrfKey = (token: string) => `indice.multi-kiosk.${token}.csrf`;

const readStored = (key: string) => {
  try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; }
};
const writeStored = (key: string, value: string) => {
  try { sessionStorage.setItem(key, value); } catch { /* browser binding still applies */ }
};
const removeStored = (key: string) => {
  try { sessionStorage.removeItem(key); } catch { /* no-op */ }
};

const removeStoredByPrefix = (prefix: string) => {
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(prefix)));
    keys.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // A hardened browser can deny storage enumeration. Component state is still reset by the caller.
  }
};

async function publicRequest<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, publicRequestTimeoutMs);

  try {
    const response = await fetch(buildApiUrl(path), {
      credentials: 'include',
      cache: init.method && init.method !== 'GET' ? undefined : 'no-store',
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    const payload = await response.json().catch(() => null) as Envelope<T> | { error?: { code?: string; message?: string } } | null;
    if (!response.ok) {
      const error = payload && 'error' in payload ? payload.error : undefined;
      throw new ApiClientError(error?.message || response.statusText || 'Request failed', response.status, error?.code, payload);
    }
    return (payload as Envelope<T>).data;
  } catch (error) {
    if (timedOut) {
      throw new ApiClientError('The request timed out.', 408, 'REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

const loadPublicBootstrap = async (token: string, signal?: AbortSignal) => {
  const bootstrap = await publicRequest<MultiKioskBootstrap>(publicBase(token), { signal });
  writeStored(publicCsrfKey(token), bootstrap.csrf_token);
  return bootstrap;
};

const withPublicCsrfRecovery = async <T>(
  token: string,
  fallbackCsrfToken: string,
  request: (csrfToken: string) => Promise<T>,
) => {
  const currentCsrfToken = readStored(publicCsrfKey(token)) || fallbackCsrfToken;
  try {
    return await request(currentCsrfToken);
  } catch (failure) {
    if (!(failure instanceof ApiClientError) || failure.code !== 'KIOSK_CSRF_INVALID') throw failure;
    const refreshed = await loadPublicBootstrap(token);
    return request(refreshed.csrf_token);
  }
};

export const multiKioskMobileSession = {
  get: (token: string) => readStored(multiSessionKey(token)),
  set: (token: string, value: string) => writeStored(multiSessionKey(token), value),
  clear: (token: string) => removeStored(multiSessionKey(token)),
  childGet: (token: string, kioskId: number) => readStored(childSessionKey(token, kioskId)),
  childSet: (token: string, kioskId: number, value: string) => writeStored(childSessionKey(token, kioskId), value),
  childClear: (token: string, kioskId: number) => removeStored(childSessionKey(token, kioskId)),
  clearAuthority: (token: string) => {
    removeStored(multiSessionKey(token));
    removeStoredByPrefix(childSessionPrefix(token));
  },
};

export const isMultiKioskAuthorizationFailure = (error: unknown) => (
  error instanceof ApiClientError && (error.status === 401 || error.status === 403)
);

/**
 * A child kiosk can disappear from the employee's effective catalogue while the
 * parent Multi-kiosk session remains valid (for example after a permission or
 * composition change). Treat that as child authority loss, not as a reason to
 * discard the employee's shared-device session.
 */
export const isMultiKioskChildAuthorityLoss = (error: unknown) => (
  error instanceof ApiClientError
  && error.status === 404
  && error.code === 'KIOSK_NOT_AVAILABLE'
);

export const multiKioskPublicApi = {
  bootstrap: loadPublicBootstrap,
  async authenticate(token: string, pin: string, csrfToken: string, providerName?: string) {
    const data = await withPublicCsrfRecovery(token, csrfToken, currentCsrfToken => (
      publicRequest<MultiKioskMobileSession>(`${publicBase(token)}/sessions`, {
        method: 'POST', headers: { 'X-CSRF-Token': currentCsrfToken }, body: JSON.stringify({
          pin,
          ...(providerName ? { provider_name: providerName } : {}),
        }),
      })
    ));
    if (data.session_token) multiKioskMobileSession.set(token, data.session_token);
    return data;
  },
  registerProvider(token: string, payload: {
    name: string;
    legal_name?: string;
    tax_id?: string;
    email: string;
    phone?: string;
    contact_name: string;
    notes?: string;
  }, csrfToken: string) {
    return withPublicCsrfRecovery(token, csrfToken, currentCsrfToken => (
      publicRequest<{ status: string; message: string }>(`${publicBase(token)}/provider-registrations`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': currentCsrfToken },
        body: JSON.stringify(payload),
      })
    ));
  },
  session: (token: string, signal?: AbortSignal) => publicRequest<MultiKioskMobileSession>(
    `${publicBase(token)}/session`,
    { headers: { 'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token) }, signal },
  ),
  signOut: (token: string, csrfToken: string) => withPublicCsrfRecovery(
    token,
    csrfToken,
    currentCsrfToken => publicRequest<{ signed_out: boolean }>(
      `${publicBase(token)}/session`,
      { method: 'DELETE', headers: {
        'X-CSRF-Token': currentCsrfToken,
        'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token),
      } },
    ),
  ),
  async launch(token: string, kioskId: number, csrfToken: string, signal?: AbortSignal) {
    const data = await withPublicCsrfRecovery(token, csrfToken, currentCsrfToken => (
      publicRequest<MultiKioskChildLaunch>(`${publicBase(token)}/kiosks/${kioskId}/sessions`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': currentCsrfToken, 'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token) },
        body: JSON.stringify({}),
        signal,
      })
    ));
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
  async action<T>(token: string, kioskId: number, capability: string, payload: Record<string, unknown>, csrfToken: string) {
    // The operation namespace contains no public/session token or payload data.
    const operation = `multi-kiosk:child:${kioskId}:action:${capability}`;
    const result = await executeKioskMutationWithMismatchRecovery({
      operation,
      payload,
      request: (idempotencyKey) => withPublicCsrfRecovery(token, csrfToken, currentCsrfToken => (
        publicRequest<T>(
          `${publicBase(token)}/kiosks/${kioskId}/actions/${encodeURIComponent(capability)}`,
          { method: 'POST', headers: {
            'X-CSRF-Token': currentCsrfToken,
            'X-Multi-Kiosk-Session-Token': multiKioskMobileSession.get(token),
            'X-Kiosk-Session-Token': multiKioskMobileSession.childGet(token, kioskId),
            'Idempotency-Key': idempotencyKey,
          }, body: JSON.stringify(payload) },
        )
      )),
    });
    completeKioskIdempotentOperation(operation);
    return result;
  },
};
