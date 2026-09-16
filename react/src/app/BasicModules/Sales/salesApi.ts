import { endpoints } from '../../api/endpoints';
import { apiClient } from '../../lib/apiClient';
import { resolveSalesStorageUrl } from './utils/salesStorageUrls';

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
  | 'commission-rules'
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

export type SalesApiKpisResponse = Record<string, unknown>;

export type SalesKpiContactRow = {
  id: number; unitId: number | null; businessId: number | null; companyName: string;
  contactPerson: string | null; source: string | null; status: string;
  ownerUserCompanyId: number | null; ownerName: string | null;
};

export type SalesKpiOpportunityRow = {
  id: number; contactId: number | null; unitId: number | null; businessId: number | null;
  opportunityCode: string; opportunityName: string; companyName: string | null; source: string | null;
  stage: string; lifecycleStatus: string | null; status: string; ownerUserCompanyId: number | null;
  ownerName: string | null; probabilityPercent: number | null; expectedCloseDate: string | null;
  nextAction: string | null; nextActionAt: string | null; lastContactAt: string | null;
  createdAt: string; updatedAt: string;
};

export type SalesKpiQuoteRow = {
  id: number; contactId: number | null; opportunityId: number | null; quoteNumber: string;
  clientName: string; status: string; createdDate: string | null; expirationDate: string | null;
  sellerUserCompanyId: number | null; sellerName: string | null;
};

export type SalesKpiSaleRow = {
  id: number; contactId: number | null; opportunityId: number | null; quoteId: number | null;
  unitId: number | null; businessId: number | null; saleNumber: string; customerName: string;
  sellerUserCompanyId: number | null; sellerName: string | null; saleDate: string | null;
  commercialStatus: string; financeStatus: string; inventoryStatus: string; deliveryStatus: string;
  commissionStatus: string; inventoryMovementStatus: string;
};

export type SalesKpiWorkspaceSource = {
  contacts: SalesKpiContactRow[];
  opportunities: SalesKpiOpportunityRow[];
  quotes: SalesKpiQuoteRow[];
  sales: SalesKpiSaleRow[];
  units: Array<{ id: number; name: string }>;
  businesses: Array<{ id: number; unitId: number; name: string }>;
  asOfDate: string;
  timeZone: string;
  definitionVersion: string;
};

export function toSalesKpiWorkspaceSource(value: unknown): SalesKpiWorkspaceSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid sales KPI workspace response.');
  const source = value as Partial<SalesKpiWorkspaceSource>;
  if (!Array.isArray(source.contacts) || !Array.isArray(source.opportunities) || !Array.isArray(source.quotes)
      || !Array.isArray(source.sales) || !Array.isArray(source.units) || !Array.isArray(source.businesses)) {
    throw new Error('Incomplete sales KPI workspace response.');
  }
  if (typeof source.asOfDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(source.asOfDate)
      || typeof source.timeZone !== 'string' || !source.timeZone.trim()
      || source.definitionVersion !== 'sales-kpi-v1') {
    throw new Error('Invalid sales KPI workspace metadata.');
  }
  return source as SalesKpiWorkspaceSource;
}

export type OpportunityFlowApiStage = {
  key: string;
  label: string;
  type: 'OPEN' | 'WON' | 'LOST';
  colorToken: 'BLUE' | 'AQUA' | 'GREEN' | 'YELLOW' | 'CORAL' | 'VIOLET' | 'SLATE';
  defaultProbabilityPercent: number;
  position: number;
  required: boolean;
  opportunityCount: number;
};

export type OpportunityFlowApiFlow = {
  id: number;
  key: string;
  name: string;
  factory: boolean;
  defaultFlow: boolean;
  stages: OpportunityFlowApiStage[];
};

export type OpportunityFlowApiCatalogResponse = {
  flows: OpportunityFlowApiFlow[];
  defaultFlowId: number;
  canManage: boolean;
};

export type OpportunityFlowPositionsApiResponse = {
  flowId: number;
  positions: Array<{
    opportunityId: number;
    stageKey: string;
    probabilityPercent: number;
  }>;
};

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

export type MetaLeadImportRequest = {
  pageId: string;
  accessToken: string;
  maxLeads: number;
};

export type MetaLeadImportResponse = {
  downloaded: number;
  imported: number;
  skippedPreviouslyImported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  contacts: Array<{
    id: number;
    contactCode: string;
    contactPerson: string;
    email: string;
    phone: string;
  }>;
};

export type QuoteConnectionRequest =
  | { mode: 'existing_opportunity'; opportunityId: number }
  | { mode: 'create_opportunity'; opportunityName: string }
  | { mode: 'quote_only' };

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
  kpis(preferredCurrency?: string) {
    return apiClient<SalesApiKpisResponse>(`${endpoints.sales.kpis}${buildQuery({ preferredCurrency })}`);
  },
  kpiWorkspace() {
    return apiClient<unknown>(`${endpoints.sales.base}/kpis/workspace`).then(toSalesKpiWorkspaceSource);
  },
  getOpportunityFlows() {
    return apiClient<OpportunityFlowApiCatalogResponse>(`${endpoints.sales.base}/opportunity-flow`);
  },
  getOpportunityFlowPositions(flowId: number) {
    return apiClient<OpportunityFlowPositionsApiResponse>(
      `${endpoints.sales.base}/opportunity-flow/${flowId}/positions`,
    );
  },
  createOpportunityFlow(name: string, stages: Array<{
    key?: string;
    label: string;
    colorToken: OpportunityFlowApiStage['colorToken'];
    defaultProbabilityPercent: number;
  }>) {
    return apiClient<OpportunityFlowApiFlow>(`${endpoints.sales.base}/opportunity-flow`, {
      method: 'POST',
      body: JSON.stringify({ name, stages }),
    });
  },
  updateOpportunityFlow(flowId: number, name: string, stages: Array<{
    key?: string;
    label: string;
    colorToken: OpportunityFlowApiStage['colorToken'];
    defaultProbabilityPercent: number;
  }>) {
    return apiClient<OpportunityFlowApiFlow>(`${endpoints.sales.base}/opportunity-flow/${flowId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, stages }),
    });
  },
  importMetaLeads(payload: MetaLeadImportRequest) {
    return apiClient<MetaLeadImportResponse>(`${endpoints.sales.base}/meta-leads/import`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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
  connectQuote<TItem = Record<string, unknown>>(quoteId: number | string, payload: QuoteConnectionRequest) {
    return apiClient<TItem>(`${buildCollectionPath('quotes', quoteId)}/connection`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  delete(collection: SalesApiCollection, id: number | string) {
    return apiClient<void>(buildCollectionPath(collection, id), {
      method: 'DELETE',
    });
  },
  commitInventoryOperation<TBalance = Record<string, unknown>, TMovement = Record<string, unknown>>(
    payload: { balances: Record<string, unknown>[]; movements: Record<string, unknown>[] },
  ) {
    return apiClient<{ balances: TBalance[]; movements: TMovement[] }>(
      `${endpoints.sales.base}/inventory-operations/commit`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  previewCommissionRule(payload: Record<string, unknown>) {
    return apiClient<{ commissionAmount: number; currency: string }>(`${endpoints.sales.base}/commission-rules/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listCommissionCuts() {
    return apiClient<{ items: Array<Record<string, unknown>>; count: number }>(`${endpoints.sales.base}/commission-cuts`);
  },
  createCommissionCut(payload: { periodStart: string; periodEnd: string; preferredCurrency: string }) {
    return apiClient<Record<string, unknown>>(`${endpoints.sales.base}/commission-cuts`, {
      method: 'POST', body: JSON.stringify(payload),
    });
  },
  getCommissionCutSchedule() {
    return apiClient<{ items: Array<{ id: number; name: string; cadence: 'weekly' | 'semimonthly' | 'monthly'; status: 'active' | 'paused'; nextRunDate: string; lastRunAt?: string | null }>; count: number }>(`${endpoints.sales.base}/commission-cut-schedule`);
  },
  saveCommissionCutSchedule(payload: { id?: number; name: string; cadence: 'weekly' | 'semimonthly' | 'monthly'; status: 'active' | 'paused'; preferredCurrency: string }) {
    return apiClient<{ id: number; name: string; cadence: 'weekly' | 'semimonthly' | 'monthly'; status: 'active' | 'paused'; nextRunDate: string; lastRunAt?: string | null }>(`${endpoints.sales.base}/commission-cut-schedule`, {
      method: 'PUT', body: JSON.stringify(payload),
    });
  },
  deleteCommissionCutSchedule(id: number) {
    return apiClient<void>(`${endpoints.sales.base}/commission-cut-schedule/${id}`, { method: 'DELETE' });
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

    const response = await fetch(resolveSalesStorageUrl(uploadUrl), {
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
