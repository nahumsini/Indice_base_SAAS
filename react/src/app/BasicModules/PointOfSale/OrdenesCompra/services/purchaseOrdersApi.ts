import { apiClient } from '../../../../lib/apiClient';
import type { PosContextResponse } from '../../Sale/services/posBackendApi';
import type {
  ProductSupplierListResponse,
  ProductSupplier,
  ProviderListResponse,
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  PurchaseOrderListResponse,
  PurchaseOrderReceivePayload,
  PurchaseOrderStatus,
  SupplierInvoice,
  SupplierInvoiceListResponse,
  SupplierInvoicePayload,
  SupplierInvoiceStatus,
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
    providerId?: number | 'ALL';
    warehouseId?: number | 'ALL';
    dateFrom?: string;
    dateTo?: string;
  }) {
    return apiClient<PurchaseOrderListResponse>(`${posBasePath}/purchase-orders${buildQuery({
      status: filters.status === 'ALL' ? undefined : filters.status,
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
