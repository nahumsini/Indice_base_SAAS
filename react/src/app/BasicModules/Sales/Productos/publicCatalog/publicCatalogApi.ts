import { apiClient } from '../../../../lib/apiClient';
import type { PublicCatalogConfig, PublicCatalogItem, PublicCatalogContactMethod } from './types/publicCatalogTypes';
import type { DiscountRuleWire } from '../../../PointOfSale/shared/commercial/discounts/services/discountRulesApi';

type AdminCatalog = {
  id: number;
  companyId: number;
  companyName: string;
  unitId: number;
  businessId: number;
  code: string;
  name: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  contactCtaLabel: string;
  contactMethod: PublicCatalogContactMethod;
  contactValue?: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'EXPIRED';
  expiresAt?: string | null;
  publicTokenHint: string;
  publicToken?: string | null;
  publicUrl?: string | null;
  showPrices: boolean;
  showWholesalePrices: boolean;
  showStockStatus: boolean;
  showItemTypeBadges: boolean;
  showCategories: boolean;
  allowCart: boolean;
  allowPurchaseRequest: boolean;
  productIds: number[];
  version: number;
  updatedAt: string;
};

export type PublicCatalogBootstrap = {
  code: string;
  companyName: string;
  unitName: string;
  businessName: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  contactCtaLabel: string;
  contactMethod: PublicCatalogContactMethod;
  contactValue?: string | null;
  showPrices: boolean;
  showWholesalePrices: boolean;
  showStockStatus: boolean;
  showItemTypeBadges: boolean;
  showCategories: boolean;
  allowCart: boolean;
  allowPurchaseRequest: boolean;
  submissionPolicy: 'REVIEW_REQUIRED';
  items: Array<{
    id: number;
    name: string;
    sku?: string | null;
    type?: PublicCatalogItem['type'] | null;
    category?: PublicCatalogItem['category'];
    description?: string | null;
    thumbnailUrl?: string | null;
    thumbnailAlt?: string | null;
    images?: Array<{
      url: string;
      alt?: string | null;
    }>;
    publicPrice?: number | string | null;
    wholesalePrice?: number | string | null;
    wholesaleMinQuantity?: number | string | null;
    currency?: string | null;
    usesInventory: boolean;
    publicInventoryStatus?: PublicCatalogItem['publicInventoryStatus'] | null;
    readyForSales: boolean;
  }>;
  discountRules: DiscountRuleWire[];
  csrfToken: string;
};

export type PublicCatalogRequestResult = {
  id: number;
  catalogId: number;
  requestNumber: string;
  status: 'SUBMITTED' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  customerName: string;
  contact: string;
  preferredContactMethod: PublicCatalogContactMethod;
  message?: string | null;
  currencyCode: string;
  itemCount: number;
  estimatedTotal: number | string;
  subtotalAmount?: number | string;
  discountAmount?: number | string;
  discountRuleId?: number | null;
  createdAt: string;
  items: Array<{
    productId: number;
    sku?: string | null;
    productName: string;
    quantity: number | string;
    unitPrice: number | string;
    lineTotal: number | string;
    discountAmount?: number | string;
    discountRuleId?: number | null;
  }>;
};

export type PublicCatalogSubmission = {
  reference: string;
  requestNumber: string;
  status: 'SUBMITTED';
  submissionPolicy: 'REVIEW_REQUIRED';
  currencyCode: string;
  itemCount: number;
  estimatedTotal?: number | string | null;
};

export type PublicCatalogRequestList = {
  items: PublicCatalogRequestResult[];
  count: number;
};

type PublicCatalogLinkResponse = {
  publicUrl: string;
  publicTokenHint: string;
  version: number;
};

type EngineEnvelope<T> = { data: T; meta?: { requestId?: string } };
const adminPath = '/api/v1/sales/public-catalogs';

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const toPublicCatalogConfig = (catalog: AdminCatalog): PublicCatalogConfig => ({
  id: String(catalog.id),
  backendId: catalog.id,
  version: catalog.version,
  companyName: catalog.companyName,
  unitId: catalog.unitId,
  businessId: catalog.businessId,
  title: catalog.title,
  description: catalog.description ?? '',
  coverImageUrl: catalog.coverImageUrl ?? '',
  contactCtaLabel: catalog.contactCtaLabel,
  contactMethod: catalog.contactMethod,
  contactValue: catalog.contactValue ?? '',
  showPrices: catalog.showPrices,
  showWholesalePrices: catalog.showWholesalePrices,
  showStockStatus: catalog.showStockStatus,
  showItemTypeBadges: catalog.showItemTypeBadges,
  showCategories: catalog.showCategories,
  allowCart: catalog.allowCart,
  allowPurchaseRequest: catalog.allowPurchaseRequest,
  showOnlinePaymentComingSoon: false,
  selectedCategoryIds: [],
  selectedProductIds: catalog.productIds.map(String),
  status: catalog.status === 'ACTIVE'
    ? 'active'
    : catalog.status === 'REVOKED'
      ? 'revoked'
      : catalog.status === 'EXPIRED'
        ? 'expired'
      : 'disabled',
  publicAccessToken: catalog.publicToken ?? undefined,
  publicUrl: catalog.publicUrl
    ? new URL(catalog.publicUrl, typeof window === 'undefined' ? 'http://localhost' : window.location.origin).toString()
    : undefined,
  publicTokenHint: catalog.publicTokenHint,
  expiresAt: toLocalDateTimeInput(catalog.expiresAt),
  updatedAt: catalog.updatedAt,
});

const payload = (config: PublicCatalogConfig, products: Array<{ id: string; backendId?: number }>) => ({
  unitId: config.unitId,
  businessId: config.businessId,
  name: config.title,
  title: config.title,
  description: config.description,
  coverImageUrl: config.coverImageUrl || null,
  contactCtaLabel: config.contactCtaLabel,
  contactMethod: config.contactMethod,
  contactValue: config.contactValue || null,
  expiresAt: config.expiresAt ? new Date(config.expiresAt).toISOString() : null,
  showPrices: config.showPrices,
  showWholesalePrices: config.showWholesalePrices,
  showStockStatus: config.showStockStatus,
  showItemTypeBadges: config.showItemTypeBadges,
  showCategories: config.showCategories,
  allowCart: config.allowCart,
  allowPurchaseRequest: config.allowPurchaseRequest,
  productIds: config.selectedProductIds.map((id) => {
    const product = products.find((candidate) => candidate.id === id);
    return product?.backendId ?? Number(id);
  }).filter((id) => Number.isFinite(id) && id > 0),
  version: config.version,
});

export const publicCatalogApi = {
  async listAdmin() {
    const response = await apiClient<AdminCatalog[]>(adminPath);
    return response.map(toPublicCatalogConfig);
  },

  async createAdmin(config: PublicCatalogConfig, products: Array<{ id: string; backendId?: number }>) {
    const response = await apiClient<AdminCatalog>(adminPath, {
      method: 'POST',
      body: JSON.stringify(payload(config, products)),
    });
    return toPublicCatalogConfig(response);
  },

  async updateAdmin(config: PublicCatalogConfig, products: Array<{ id: string; backendId?: number }>) {
    const response = await apiClient<AdminCatalog>(`${adminPath}/${config.backendId}`, {
      method: 'PUT',
      body: JSON.stringify(payload(config, products)),
    });
    return toPublicCatalogConfig(response);
  },

  async rotateLink(catalogId: number) {
    const response = await apiClient<AdminCatalog>(`${adminPath}/${catalogId}/rotate-link`, {
      method: 'POST', body: JSON.stringify({}),
    });
    return toPublicCatalogConfig(response);
  },

  async revealLink(catalogId: number) {
    const response = await apiClient<PublicCatalogLinkResponse>(`${adminPath}/${catalogId}/link`, {
      method: 'POST', body: JSON.stringify({}),
    });
    return {
      ...response,
      publicUrl: new URL(
        response.publicUrl,
        typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
      ).toString(),
    };
  },

  deleteAdmin(catalogId: number, reason = 'Eliminación definitiva desde Ventas') {
    return apiClient<{ deleted: boolean }>(`${adminPath}/${catalogId}`, {
      method: 'DELETE',
      body: JSON.stringify({ status: 'REVOKED', reason }),
    });
  },

  async transition(catalogId: number, status: 'ACTIVE' | 'DISABLED' | 'REVOKED') {
    const response = await apiClient<AdminCatalog>(`${adminPath}/${catalogId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason: 'Administración desde Ventas' }),
    });
    return toPublicCatalogConfig(response);
  },

  async bootstrap(token: string) {
    const response = await apiClient<EngineEnvelope<PublicCatalogBootstrap>>(
      `/api/v2/kiosks/public/${encodeURIComponent(token)}/bootstrap`,
    );
    return response.data;
  },

  async submitRequest(token: string, csrfToken: string, request: {
    customerName: string;
    contact: string;
    preferredContactMethod: PublicCatalogContactMethod;
    message: string;
    items: Array<{ productId: number; quantity: number }>;
  }, idempotencyKey: string = crypto.randomUUID()) {
    const response = await apiClient<EngineEnvelope<PublicCatalogSubmission>>(
      `/api/v2/kiosks/public/${encodeURIComponent(token)}/actions/sales.catalog.request.create@1`,
      {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken, 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(request),
      },
    );
    return response.data;
  },

  listRequests(status?: PublicCatalogRequestResult['status']) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient<PublicCatalogRequestList>(`${adminPath}/requests${query}`);
  },

  reviewRequest(
    requestId: number,
    status: 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED',
    note = '',
  ) {
    return apiClient<PublicCatalogRequestResult>(`${adminPath}/requests/${requestId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  },
};
