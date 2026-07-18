import { apiClient } from '../../../../lib/apiClient';
import type { PosContextResponse } from '../../Sale/services/posBackendApi';
import type {
  ProductSupplierListResponse,
  ProductSupplier,
  ProviderListResponse,
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  PurchaseOrderListResponse,
  PurchaseOrderOrigin,
  PurchaseOrderReceivePayload,
  PurchaseOrderStatus,
  SupplierInvoice,
  SupplierInvoiceDocumentUploadPayload,
  SupplierInvoiceListResponse,
  SupplierInvoicePayload,
  SupplierInvoiceStatus,
  SupplierPortalAccess,
  SupplierPortalAccessListResponse,
  SupplierPortalAccessPinPayload,
  SupplierPortalAccessPayload,
  SupplierPortalAccessStatus,
  SupplierPortalAccessStatusPayload,
  SupplierPortalKioskAuditEvent,
  SupplierPortalKioskConfigurationPayload,
  SupplierPortalKioskDefinition,
  SupplierPortalKioskGrant,
  SupplierPortalBootstrapResponse,
  SupplierPortalContextResponse,
  SupplierPortalDocumentRegistrationPayload,
  SupplierPortalDocumentRegistrationResponse,
  SupplierPortalDocumentUploadPayload,
  SupplierPortalDocumentUploadResponse,
  SupplierPortalInvoiceReceipt,
  SupplierPortalInvoicePayload,
  SupplierPortalSessionCredentials,
  SupplierPortalSessionResponse,
  SupplierPortalSubmissionReceipt,
  SupplierPortalSubmissionPayload,
  SupplierSubmission,
  SupplierSubmissionPayload,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionListResponse,
  SupplierSubmissionReviewPayload,
  SupplierSubmissionStatus,
} from '../types/purchaseOrder.types';

const posBasePath = '/api/v1/pos';
const supplierPortalAdminV2BasePath = '/api/v2/procurement/kiosks';
type SupplierPortalAccessWire = Omit<SupplierPortalAccess, 'status'> & {
  status: SupplierPortalAccessStatus | 'PAUSED';
};

type KioskV2Envelope<T> = {
  data: T;
  meta: { requestId: string };
};

type SupplierPortalKioskDefinitionWire = {
  id: number;
  company_id: number;
  owner_module: string;
  kiosk_type: string;
  legacy_reference_id: number;
  code: string;
  name: string;
  description?: string | null;
  status: SupplierPortalAccessStatus;
  access_level: string;
  access_methods?: string[];
  unit_id?: number | null;
  unit_name?: string | null;
  business_id?: number | null;
  business_name?: string | null;
  location_id?: number | null;
  expires_at?: string | null;
  public_token_hint?: string | null;
  configuration_version?: number;
  adapter_version?: number;
  last_activity_at?: string | null;
  risk_signals?: string[];
};

type SupplierPortalKioskGrantWire = {
  id: number;
  identity_type: string;
  identity_id: number;
  capability_key: string;
  status: 'ACTIVE' | 'REVOKED';
  source: string;
  created_at: string;
};

type SupplierPortalKioskAuditEventWire = {
  event_id: string;
  request_id?: string;
  action_id?: string;
  session_id?: string;
  event_type: string;
  outcome: string;
  actor_type?: string;
  actor_id?: number;
  capability?: string;
  module_reference?: string;
  module_record_type?: string;
  module_record_id?: number;
  source?: string;
  created_at: string;
};

const normalizeSupplierPortalStatus = (status: unknown): SupplierPortalAccessStatus => {
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'PAUSED' || status === 'DISABLED') return 'DISABLED';
  if (status === 'EXPIRED' || status === 'REVOKED') return status;
  return 'DISABLED';
};

const normalizeSupplierPortalAccess = (access: SupplierPortalAccessWire): SupplierPortalAccess => ({
  ...access,
  status: normalizeSupplierPortalStatus(access.status),
});

const normalizeSupplierPortalKiosk = (
  kiosk: SupplierPortalKioskDefinitionWire,
): SupplierPortalKioskDefinition => ({
  id: kiosk.id,
  companyId: kiosk.company_id,
  ownerModule: kiosk.owner_module,
  kioskType: kiosk.kiosk_type,
  legacyReferenceId: kiosk.legacy_reference_id,
  code: kiosk.code,
  name: kiosk.name,
  description: kiosk.description,
  status: normalizeSupplierPortalStatus(kiosk.status),
  accessLevel: kiosk.access_level,
  accessMethods: kiosk.access_methods ?? [],
  unitId: kiosk.unit_id,
  unitName: kiosk.unit_name,
  businessId: kiosk.business_id,
  businessName: kiosk.business_name,
  locationId: kiosk.location_id,
  expiresAt: kiosk.expires_at,
  publicTokenHint: kiosk.public_token_hint,
  configurationVersion: kiosk.configuration_version ?? 0,
  adapterVersion: kiosk.adapter_version ?? 0,
  lastActivityAt: kiosk.last_activity_at,
  riskSignals: kiosk.risk_signals ?? [],
});

const normalizeSupplierPortalGrant = (grant: SupplierPortalKioskGrantWire): SupplierPortalKioskGrant => ({
  id: grant.id,
  identityType: grant.identity_type,
  identityId: grant.identity_id,
  capabilityKey: grant.capability_key,
  status: grant.status,
  source: grant.source,
  createdAt: grant.created_at,
});

const normalizeSupplierPortalAuditEvent = (
  event: SupplierPortalKioskAuditEventWire,
): SupplierPortalKioskAuditEvent => ({
  eventId: event.event_id,
  requestId: event.request_id,
  actionId: event.action_id,
  sessionId: event.session_id,
  eventType: event.event_type,
  outcome: event.outcome,
  actorType: event.actor_type,
  actorId: event.actor_id,
  capability: event.capability,
  moduleReference: event.module_reference,
  moduleRecordType: event.module_record_type,
  moduleRecordId: event.module_record_id,
  source: event.source,
  createdAt: event.created_at,
});

const kioskSessionHeaders = (
  session: SupplierPortalSessionCredentials,
  idempotencyKey?: string,
) => {
  const headers = new Headers({
    Authorization: `Bearer ${session.sessionToken}`,
    'X-CSRF-Token': session.csrfToken,
    'X-Kiosk-CSRF': session.csrfToken,
    'X-Kiosk-Session': session.sessionToken,
  });
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);
  return headers;
};

const buildQuery = (params: Record<string, string | number | undefined | null>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const purchaseOrdersApi = {
  context() {
    return apiClient<PosContextResponse>(`${posBasePath}/context`);
  },

  providers() {
    return apiClient<ProviderListResponse>('/api/v1/finance/providers');
  },

  productSuppliers() {
    return apiClient<ProductSupplierListResponse>(`${posBasePath}/product-suppliers`);
  },

  upsertProductSupplier(payload: {
    productId: number;
    providerId: number;
    providerSku?: string | null;
    costAmount: number;
    currencyCode: string;
    leadTimeDays?: number | null;
    minimumOrderQuantity: number;
    preferred?: boolean;
    active?: boolean;
    notes?: string | null;
  }) {
    return apiClient<ProductSupplier>(`${posBasePath}/product-suppliers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listOrders(filters: {
    status?: PurchaseOrderStatus | 'ALL';
    origin?: PurchaseOrderOrigin | 'ALL';
    providerId?: number | 'ALL';
    warehouseId?: number | 'ALL';
    dateFrom?: string;
    dateTo?: string;
  }) {
    return apiClient<PurchaseOrderListResponse>(`${posBasePath}/purchase-orders${buildQuery({
      status: filters.status === 'ALL' ? undefined : filters.status,
      origin: filters.origin === 'ALL' ? undefined : filters.origin,
      providerId: filters.providerId === 'ALL' ? undefined : filters.providerId,
      warehouseId: filters.warehouseId === 'ALL' ? undefined : filters.warehouseId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    })}`);
  },

  getOrder(orderId: number) {
    return apiClient<PurchaseOrder>(`${posBasePath}/purchase-orders/${orderId}`);
  },

  createOrder(payload: PurchaseOrderCreatePayload) {
    return apiClient<PurchaseOrder>(`${posBasePath}/purchase-orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listSupplierPortalAccess() {
    const response = await apiClient<Omit<SupplierPortalAccessListResponse, 'items'> & {
      items: SupplierPortalAccessWire[];
    }>(`${posBasePath}/supplier-portal-access`);
    return { ...response, items: response.items.map(normalizeSupplierPortalAccess) };
  },

  async createSupplierPortalAccess(payload: SupplierPortalAccessPayload) {
    const response = await apiClient<SupplierPortalAccessWire>(`${posBasePath}/supplier-portal-access`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSupplierPortalAccess(response);
  },

  async updateSupplierPortalAccessStatus(accessId: number, payload: SupplierPortalAccessStatusPayload) {
    const response = await apiClient<SupplierPortalAccessWire>(`${posBasePath}/supplier-portal-access/${accessId}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSupplierPortalAccess(response);
  },

  async changeSupplierPortalAccessPin(accessId: number, payload: SupplierPortalAccessPinPayload) {
    const response = await apiClient<SupplierPortalAccessWire>(`${posBasePath}/supplier-portal-access/${accessId}/pin`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSupplierPortalAccess(response);
  },

  async listSupplierPortalKiosks() {
    const response = await apiClient<KioskV2Envelope<{ items: SupplierPortalKioskDefinitionWire[] }>>(
      supplierPortalAdminV2BasePath,
    );
    return response.data.items.map(normalizeSupplierPortalKiosk);
  },

  async updateSupplierPortalKiosk(
    kioskId: number,
    payload: SupplierPortalKioskConfigurationPayload,
  ) {
    const response = await apiClient<KioskV2Envelope<SupplierPortalKioskDefinitionWire>>(
      `${supplierPortalAdminV2BasePath}/${kioskId}`,
      { method: 'PUT', body: JSON.stringify(payload) },
    );
    return normalizeSupplierPortalKiosk(response.data);
  },

  async deleteSupplierPortalKiosk(kioskId: number, reason?: string) {
    const response = await apiClient<KioskV2Envelope<{ deleted: boolean }>>(
      `${supplierPortalAdminV2BasePath}/${kioskId}`,
      { method: 'DELETE', body: JSON.stringify({ reason: reason?.trim() ?? '' }) },
    );
    return response.data;
  },

  async listSupplierPortalKioskGrants(kioskId: number) {
    const response = await apiClient<KioskV2Envelope<{ items: SupplierPortalKioskGrantWire[] }>>(
      `${supplierPortalAdminV2BasePath}/${kioskId}/grants`,
    );
    return response.data.items.map(normalizeSupplierPortalGrant);
  },

  async listSupplierPortalKioskAudit(kioskId: number) {
    const response = await apiClient<KioskV2Envelope<{ items: SupplierPortalKioskAuditEventWire[] }>>(
      `${supplierPortalAdminV2BasePath}/${kioskId}/audit`,
    );
    return response.data.items.map(normalizeSupplierPortalAuditEvent);
  },

  action(orderId: number, action: 'request' | 'approve' | 'send' | 'cancel', note?: string) {
    return apiClient<PurchaseOrder>(`${posBasePath}/purchase-orders/${orderId}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ note: note ?? null }),
    });
  },

  receive(orderId: number, payload: PurchaseOrderReceivePayload) {
    return apiClient<PurchaseOrder>(`${posBasePath}/purchase-orders/${orderId}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listSupplierSubmissions(filters: {
    status?: SupplierSubmissionStatus | 'ALL';
    providerId?: number | 'ALL';
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    return apiClient<SupplierSubmissionListResponse>(`${posBasePath}/supplier-submissions${buildQuery({
      status: filters.status === 'ALL' ? undefined : filters.status,
      providerId: filters.providerId === 'ALL' ? undefined : filters.providerId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    })}`);
  },

  getSupplierSubmission(submissionId: number) {
    return apiClient<SupplierSubmission>(`${posBasePath}/supplier-submissions/${submissionId}`);
  },

  createSupplierSubmission(payload: SupplierSubmissionPayload) {
    return apiClient<SupplierSubmission>(`${posBasePath}/supplier-submissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  reviewSupplierSubmission(submissionId: number, payload: SupplierSubmissionReviewPayload) {
    return apiClient<SupplierSubmission>(`${posBasePath}/supplier-submissions/${submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  convertSupplierSubmission(submissionId: number, payload: SupplierSubmissionConvertPayload) {
    return apiClient<PurchaseOrder>(`${posBasePath}/supplier-submissions/${submissionId}/convert-to-purchase-order`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listSupplierInvoices(filters: {
    status?: SupplierInvoiceStatus | 'ALL';
    providerId?: number | 'ALL';
  } = {}) {
    return apiClient<SupplierInvoiceListResponse>(`${posBasePath}/supplier-invoices${buildQuery({
      status: filters.status === 'ALL' ? undefined : filters.status,
      providerId: filters.providerId === 'ALL' ? undefined : filters.providerId,
    })}`);
  },

  submitSupplierInvoice(payload: SupplierInvoicePayload) {
    return apiClient<SupplierInvoice>(`${posBasePath}/supplier-invoices`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  reviewSupplierInvoice(invoiceId: number, status: SupplierInvoiceStatus, reviewNote?: string) {
    return apiClient<SupplierInvoice>(`${posBasePath}/supplier-invoices/${invoiceId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewNote: reviewNote ?? null }),
    });
  },

  presignSupplierInvoiceDocument(payload: SupplierInvoiceDocumentUploadPayload) {
    return apiClient<SupplierPortalDocumentUploadResponse>(`${posBasePath}/supplier-invoices/presign-upload`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async uploadDocument(
    uploadUrl: string,
    file: File,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('No se pudo subir el documento del proveedor.');
    }
  },
};

export const supplierPortalPublicApi = {
  async bootstrap(portalCode: string) {
    const response = await apiClient<Omit<SupplierPortalBootstrapResponse, 'status'> & { status: SupplierPortalAccessStatus | 'PAUSED' }>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/bootstrap`,
    );
    return { ...response, status: normalizeSupplierPortalStatus(response.status) };
  },

  async authenticate(portalCode: string, pin: string, csrfToken: string) {
    const response = await apiClient<Partial<SupplierPortalSessionResponse> & {
      context?: SupplierPortalContextResponse;
      kioskSessionId?: string;
      kioskSessionToken?: string;
    } & Partial<SupplierPortalContextResponse>>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/authenticate`,
      {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ pin }),
      },
    );
    const context = response.context ?? (
      Array.isArray(response.catalogProducts) ? response as SupplierPortalContextResponse : null
    );
    const sessionId = response.kioskSessionId ?? response.sessionId;
    const sessionToken = response.kioskSessionToken ?? response.sessionToken;
    if (!context || normalizeSupplierPortalStatus(context.status) !== 'ACTIVE' || !sessionId || !sessionToken || !response.csrfToken) {
      throw new Error('SUPPLIER_PORTAL_INVALID_SESSION');
    }
    return {
      context: { ...context, status: normalizeSupplierPortalStatus(context.status) },
      csrfToken: response.csrfToken,
      expiresAt: response.expiresAt ?? null,
      sessionId,
      sessionToken,
    } satisfies SupplierPortalSessionResponse;
  },

  async context(portalCode: string, session: SupplierPortalSessionCredentials) {
    const response = await apiClient<SupplierPortalContextResponse>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/context`,
      {
        method: 'POST',
        headers: kioskSessionHeaders(session),
      },
    );
    return { ...response, status: normalizeSupplierPortalStatus(response.status) };
  },

  logout(portalCode: string, session: SupplierPortalSessionCredentials) {
    return apiClient<{ closed?: boolean; loggedOut?: boolean }>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/logout`,
      {
        method: 'POST',
        headers: kioskSessionHeaders(session),
        keepalive: true,
      },
    );
  },

  async submit(
    portalCode: string,
    session: SupplierPortalSessionCredentials,
    idempotencyKey: string,
    payload: SupplierPortalSubmissionPayload,
  ) {
    const response = await apiClient<SupplierPortalSubmissionReceipt>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/submissions`,
      {
        method: 'POST',
        headers: kioskSessionHeaders(session, idempotencyKey),
        body: JSON.stringify(payload),
      },
    );
    return {
      submissionNumber: response.submissionNumber,
      status: response.status,
      submittedAt: response.submittedAt ?? null,
    } satisfies SupplierPortalSubmissionReceipt;
  },

  presignInvoiceDocument(
    portalCode: string,
    session: SupplierPortalSessionCredentials,
    idempotencyKey: string,
    payload: SupplierPortalDocumentUploadPayload,
  ) {
    return apiClient<SupplierPortalDocumentUploadResponse>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/invoices/presign-upload`,
      {
        method: 'POST',
        headers: kioskSessionHeaders(session, idempotencyKey),
        body: JSON.stringify(payload),
      },
    );
  },

  registerInvoiceDocument(
    portalCode: string,
    session: SupplierPortalSessionCredentials,
    idempotencyKey: string,
    payload: SupplierPortalDocumentRegistrationPayload,
  ) {
    return apiClient<SupplierPortalDocumentRegistrationResponse>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/invoices/register-upload`,
      {
        method: 'POST',
        headers: kioskSessionHeaders(session, idempotencyKey),
        body: JSON.stringify(payload),
      },
    );
  },

  async uploadDocument(
    uploadUrl: string,
    file: File,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('SUPPLIER_PORTAL_DOCUMENT_UPLOAD_FAILED');
    }
  },

  async submitInvoice(
    portalCode: string,
    session: SupplierPortalSessionCredentials,
    idempotencyKey: string,
    payload: SupplierPortalInvoicePayload,
  ) {
    const response = await apiClient<SupplierPortalInvoiceReceipt>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/invoices`,
      {
        method: 'POST',
        headers: kioskSessionHeaders(session, idempotencyKey),
        body: JSON.stringify(payload),
      },
    );
    return {
      invoiceNumber: response.invoiceNumber,
      status: response.status,
      createdAt: response.createdAt ?? null,
    } satisfies SupplierPortalInvoiceReceipt;
  },
};
