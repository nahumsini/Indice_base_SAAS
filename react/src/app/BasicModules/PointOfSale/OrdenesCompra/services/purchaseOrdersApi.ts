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
  SupplierInvoiceListResponse,
  SupplierInvoicePayload,
  SupplierInvoiceStatus,
  SupplierPortalAccess,
  SupplierPortalAccessListResponse,
  SupplierPortalAccessPayload,
  SupplierPortalContextResponse,
  SupplierPortalDocumentUploadPayload,
  SupplierPortalDocumentUploadResponse,
  SupplierPortalInvoicePayload,
  SupplierPortalSubmissionPayload,
  SupplierSubmission,
  SupplierSubmissionPayload,
  SupplierSubmissionConvertPayload,
  SupplierSubmissionListResponse,
  SupplierSubmissionReviewPayload,
  SupplierSubmissionStatus,
} from '../types/purchaseOrder.types';

const posBasePath = '/api/v1/pos';

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

  listSupplierPortalAccess() {
    return apiClient<SupplierPortalAccessListResponse>(`${posBasePath}/supplier-portal-access`);
  },

  createSupplierPortalAccess(payload: SupplierPortalAccessPayload) {
    return apiClient<SupplierPortalAccess>(`${posBasePath}/supplier-portal-access`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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
};

export const supplierPortalPublicApi = {
  authenticate(portalCode: string, pin: string) {
    return apiClient<SupplierPortalContextResponse>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/authenticate`,
      {
        method: 'POST',
        body: JSON.stringify({ pin }),
      },
    );
  },

  submit(portalCode: string, payload: SupplierPortalSubmissionPayload) {
    return apiClient<SupplierSubmission>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/submissions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  presignInvoiceDocument(portalCode: string, payload: SupplierPortalDocumentUploadPayload) {
    return apiClient<SupplierPortalDocumentUploadResponse>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/invoices/presign-upload`,
      {
        method: 'POST',
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
      throw new Error('No se pudo subir el documento del proveedor.');
    }
  },

  submitInvoice(portalCode: string, payload: SupplierPortalInvoicePayload) {
    return apiClient<SupplierInvoice>(
      `${posBasePath}/public/supplier-portal/${encodeURIComponent(portalCode)}/invoices`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};
