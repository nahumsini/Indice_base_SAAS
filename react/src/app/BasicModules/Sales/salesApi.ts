import { endpoints } from '../../api/endpoints';
import { apiClient } from '../../lib/apiClient';

export type SalesContextUser = {
  userCompanyId: number;
  userId: number | null;
  name: string;
  email: string;
  role?: string | null;
  status?: string | null;
};

export type SalesContextResponse = {
  users: SalesContextUser[];
  units: Array<Record<string, unknown>>;
  businesses: Array<Record<string, unknown>>;
  currentUserCompanyId?: number | null;
  dictionaries?: Record<string, unknown>;
};

export type SalesApiCollection =
  | 'contacts'
  | 'opportunities'
  | 'products'
  | 'quotes'
  | 'sales'
  | 'inventory-warehouses'
  | 'inventory-balances'
  | 'inventory-movements'
  | 'post-sales'
  | 'contracts';

export type SalesApiListResponse<TItem = Record<string, unknown>> = {
  items: TItem[];
  count: number;
  collection: string;
};

export type SalesApiKpisResponse = Record<string, number | string | null>;

export type SalesProductImageUploadResponse = {
  objectKey?: string;
  object_key?: string;
  uploadUrl?: string;
  upload_url?: string;
  expiresAt?: string;
  expires_at?: string;
  uploadHeaders?: Record<string, string>;
  upload_headers?: Record<string, string>;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

const buildCollectionPath = (collection: SalesApiCollection, id?: number | string) => (
  `${endpoints.sales.base}/${collection}${id === undefined ? '' : `/${id}`}`
);

const buildQuery = (filters?: Record<string, string | number | boolean | null | undefined>) => {
  const params = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const salesApi = {
  context() {
    return apiClient<SalesContextResponse>(endpoints.sales.context);
  },
  kpis() {
    return apiClient<SalesApiKpisResponse>(endpoints.sales.kpis);
  },
  list<TItem = Record<string, unknown>>(
    collection: SalesApiCollection,
    filters?: Record<string, string | number | boolean | null | undefined>,
  ) {
    return apiClient<SalesApiListResponse<TItem>>(`${buildCollectionPath(collection)}${buildQuery(filters)}`);
  },
  create<TItem = Record<string, unknown>>(collection: SalesApiCollection, payload: Record<string, unknown>) {
    return apiClient<TItem>(buildCollectionPath(collection), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update<TItem = Record<string, unknown>>(
    collection: SalesApiCollection,
    id: number | string,
    payload: Record<string, unknown>,
  ) {
    return apiClient<TItem>(buildCollectionPath(collection, id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  delete(collection: SalesApiCollection, id: number | string) {
    return apiClient<void>(buildCollectionPath(collection, id), {
      method: 'DELETE',
    });
  },
  createProductImageUpload(payload: { fileName: string; contentType: string; sizeBytes: number }) {
    return apiClient<SalesProductImageUploadResponse>(`${endpoints.sales.base}/products/images/presign-upload`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async uploadProductImageFile(uploadUrl: string, file: File, uploadHeaders?: Record<string, string>) {
    const headers = new Headers(uploadHeaders ?? {});
    if (file.type && !headers.has('Content-Type')) {
      headers.set('Content-Type', file.type);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Product image upload failed with status ${response.status}`);
    }
  },
  registerProductImage(
    productId: number | string,
    payload: {
      objectKey: string;
      fileName?: string;
      contentType?: string;
      sizeBytes?: number;
      alt?: string;
    },
  ) {
    return apiClient<Record<string, unknown>>(`${endpoints.sales.base}/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createSalePaymentEvidenceUpload(payload: { fileName: string; contentType: string; sizeBytes: number }) {
    return apiClient<SalesProductImageUploadResponse>(`${endpoints.sales.base}/sales/payment-evidence/presign-upload`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async uploadSalePaymentEvidenceFile(uploadUrl: string, file: File, uploadHeaders?: Record<string, string>) {
    const headers = new Headers(uploadHeaders ?? {});
    if (file.type && !headers.has('Content-Type')) {
      headers.set('Content-Type', file.type);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Payment evidence upload failed with status ${response.status}`);
    }
  },
  registerSalePaymentEvidence(
    saleId: number | string,
    payload: {
      objectKey: string;
      fileName?: string;
      contentType?: string;
      sizeBytes?: number;
    },
  ) {
    return apiClient<Record<string, unknown>>(`${endpoints.sales.base}/sales/${saleId}/payment-evidence`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
