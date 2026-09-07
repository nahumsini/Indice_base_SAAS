import { apiClient } from '../../../lib/apiClient';
import type {
  CandidateSale,
  CreditPolicy,
  CreditSale,
  CreditSaleStatus,
  CreditSimulation,
  PaymentMethod,
  ReceivableAccount,
  ReceivableInstallment,
  ReceivablePayment,
  ReceivableStatus,
  ReceivablesState,
} from '../types';

const basePath = '/api/v1/finance/receivables';

type BackendCreditSimulation = {
  id?: string | null;
  name?: string | null;
  termMonths?: number | null;
  annualInterestRate?: number | string | null;
  monthlyPayment?: number | string | null;
  totalPayable?: number | string | null;
  totalInterest?: number | string | null;
};

type BackendCandidateSale = {
  id?: string | null;
  salesRecordId?: number | null;
  posTicketId?: number | null;
  contactId?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  saleNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  unit?: string | null;
  business?: string | null;
  saleDate?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  source?: string | null;
};

type BackendCreditPolicy = {
  id?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  contactId?: number | null;
  customerId?: string | null;
  customerName?: string | null;
  currencyCode?: string | null;
  creditLine?: number | string | null;
  monthlyPurchaseLimit?: number | string | null;
  availableCredit?: number | string | null;
  defaultTermMonths?: number | null;
  annualInterestRate?: number | string | null;
  status?: string | null;
  unit?: string | null;
  business?: string | null;
  notes?: string | null;
};

type BackendCreditSale = {
  id?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  salesRecordId?: number | null;
  posTicketId?: number | null;
  contactId?: number | null;
  saleId?: string | null;
  saleNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  unit?: string | null;
  business?: string | null;
  saleDate?: string | null;
  originalAmount?: number | string | null;
  financedAmount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  selectedSimulation?: BackendCreditSimulation | null;
  firstDueDate?: string | null;
  dueDate?: string | null;
  source?: string | null;
};

type BackendReceivableAccount = {
  id?: number | null;
  unitId?: number | null;
  businessId?: number | null;
  creditSaleId?: number | null;
  salesRecordId?: number | null;
  posTicketId?: number | null;
  contactId?: number | null;
  saleNumber?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  unit?: string | null;
  business?: string | null;
  originalAmount?: number | string | null;
  totalPayable?: number | string | null;
  paidAmount?: number | string | null;
  balance?: number | string | null;
  currency?: string | null;
  dueDate?: string | null;
  nextPaymentDate?: string | null;
  installmentAmount?: number | string | null;
  termMonths?: number | null;
  annualInterestRate?: number | string | null;
  status?: string | null;
};

type BackendReceivablePayment = {
  receiptUrl?: string | null;
  receiptFileName?: string | null;
  receiptMimeType?: string | null;
  paymentAccountId?: number | null;
  idempotencyKey?: string | null;
  id?: number | null;
  receivableId?: number | null;
  saleNumber?: string | null;
  customerName?: string | null;
  paymentDate?: string | null;
  method?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  reference?: string | null;
  registeredBy?: string | null;
};

type BackendReceivableInstallment = {
  id?: number | null;
  receivableId?: number | null;
  creditSaleId?: number | null;
  installmentNumber?: number | null;
  saleNumber?: string | null;
  customerName?: string | null;
  unit?: string | null;
  business?: string | null;
  dueDate?: string | null;
  amount?: number | string | null;
  paidAmount?: number | string | null;
  balance?: number | string | null;
  currency?: string | null;
  status?: string | null;
};

type BackendWorkspace = {
  creditSales?: BackendCreditSale[] | null;
  receivables?: BackendReceivableAccount[] | null;
  installments?: BackendReceivableInstallment[] | null;
  payments?: BackendReceivablePayment[] | null;
  creditPolicies?: BackendCreditPolicy[] | null;
  candidateSales?: BackendCandidateSale[] | null;
};

export type ReceivablesWorkspace = ReceivablesState & {
  candidateSales: CandidateSale[];
};

const jsonMutation = (method: 'POST' | 'PUT' | 'DELETE', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

const asNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const idString = (value: number | string | null | undefined, fallback = '') => (
  value === null || value === undefined || value === '' ? fallback : String(value)
);

const dateString = (value: string | null | undefined) => (
  value && value.trim() ? value.slice(0, 10) : new Date().toISOString().slice(0, 10)
);

const cleanText = (value: string | null | undefined, fallback: string) => {
  const cleaned = value?.trim();
  return cleaned ? cleaned : fallback;
};

const toSource = (value: string | null | undefined): CandidateSale['source'] => {
  const normalized = cleanText(value, 'sales').toLowerCase();
  return normalized === 'pos' || normalized === 'manual' ? normalized : 'sales';
};

const toCreditSaleStatus = (value: string | null | undefined): CreditSaleStatus => {
  const normalized = cleanText(value, 'active').toLowerCase();
  return ['draft', 'simulated', 'approved', 'active', 'completed', 'rejected', 'cancelled'].includes(normalized)
    ? normalized as CreditSaleStatus
    : 'active';
};

const toReceivableStatus = (value: string | null | undefined): ReceivableStatus => {
  const normalized = cleanText(value, 'on_time').toLowerCase();
  return ['on_time', 'due_soon', 'overdue', 'partial', 'paid', 'restructured', 'cancelled'].includes(normalized)
    ? normalized as ReceivableStatus
    : 'on_time';
};

const toPaymentMethod = (value: string | null | undefined): PaymentMethod => {
  const normalized = cleanText(value, 'transfer').toLowerCase();
  return ['cash', 'card', 'transfer', 'check', 'wallet'].includes(normalized)
    ? normalized as PaymentMethod
    : 'transfer';
};

const numericId = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const toSimulation = (dto?: BackendCreditSimulation | null): CreditSimulation => ({
  id: cleanText(dto?.id, 'balanced'),
  name: cleanText(dto?.name, 'Balanceada'),
  termMonths: Math.max(1, Math.round(asNumber(dto?.termMonths, 1))),
  annualInterestRate: asNumber(dto?.annualInterestRate),
  monthlyPayment: asNumber(dto?.monthlyPayment),
  totalPayable: asNumber(dto?.totalPayable),
  totalInterest: asNumber(dto?.totalInterest),
});

const toCandidateSale = (dto: BackendCandidateSale): CandidateSale => ({
  id: cleanText(dto.id, dto.salesRecordId ? `sales:${dto.salesRecordId}` : `candidate-${dto.saleNumber}`),
  salesRecordId: dto.salesRecordId ?? null,
  posTicketId: dto.posTicketId ?? null,
  contactId: dto.contactId ?? null,
  unitId: dto.unitId ?? null,
  businessId: dto.businessId ?? null,
  saleNumber: cleanText(dto.saleNumber, 'SIN-FOLIO'),
  customerId: cleanText(dto.customerId, dto.contactId ? String(dto.contactId) : `customer-${dto.saleNumber}`),
  customerName: cleanText(dto.customerName, 'Cliente sin nombre'),
  unit: cleanText(dto.unit, 'Unidad general'),
  business: cleanText(dto.business, 'Negocio general'),
  saleDate: dateString(dto.saleDate),
  amount: asNumber(dto.amount),
  currency: cleanText(dto.currency, 'MXN'),
  source: toSource(dto.source),
});

const toCreditPolicy = (dto: BackendCreditPolicy): CreditPolicy => ({
  id: idString(dto.id, `policy-${dto.customerId ?? dto.customerName}`),
  customerId: cleanText(dto.customerId, dto.contactId ? String(dto.contactId) : `customer-${dto.id}`),
  contactId: dto.contactId ?? null,
  unitId: dto.unitId ?? null,
  businessId: dto.businessId ?? null,
  customerName: cleanText(dto.customerName, 'Cliente sin nombre'),
  currency: cleanText(dto.currencyCode, 'MXN'),
  creditLine: asNumber(dto.creditLine),
  monthlyPurchaseLimit: asNumber(dto.monthlyPurchaseLimit),
  defaultTermMonths: Math.max(1, Math.round(asNumber(dto.defaultTermMonths, 1))),
  annualInterestRate: asNumber(dto.annualInterestRate),
  availableCredit: asNumber(dto.availableCredit),
  status: cleanText(dto.status, 'active').toLowerCase() as CreditPolicy['status'],
  unit: cleanText(dto.unit, 'Unidad general'),
  business: cleanText(dto.business, 'Negocio general'),
  notes: dto.notes ?? '',
});

const toCreditSale = (dto: BackendCreditSale): CreditSale => ({
  id: idString(dto.id, `credit-sale-${dto.saleNumber}`),
  saleId: cleanText(dto.saleId, dto.salesRecordId ? `sales:${dto.salesRecordId}` : `manual:${dto.id}`),
  salesRecordId: dto.salesRecordId ?? null,
  posTicketId: dto.posTicketId ?? null,
  contactId: dto.contactId ?? null,
  unitId: dto.unitId ?? null,
  businessId: dto.businessId ?? null,
  saleNumber: cleanText(dto.saleNumber, 'SIN-FOLIO'),
  customerId: cleanText(dto.customerId, dto.contactId ? String(dto.contactId) : `customer-${dto.id}`),
  customerName: cleanText(dto.customerName, 'Cliente sin nombre'),
  unit: cleanText(dto.unit, 'Unidad general'),
  business: cleanText(dto.business, 'Negocio general'),
  saleDate: dateString(dto.saleDate),
  originalAmount: asNumber(dto.originalAmount),
  financedAmount: asNumber(dto.financedAmount),
  currency: cleanText(dto.currency, 'MXN'),
  status: toCreditSaleStatus(dto.status),
  selectedSimulation: toSimulation(dto.selectedSimulation),
  firstDueDate: dateString(dto.firstDueDate),
  source: toSource(dto.source),
});

const toReceivableAccount = (dto: BackendReceivableAccount): ReceivableAccount => ({
  id: idString(dto.id, `receivable-${dto.saleNumber}`),
  creditSaleId: idString(dto.creditSaleId),
  salesRecordId: dto.salesRecordId ?? null,
  posTicketId: dto.posTicketId ?? null,
  contactId: dto.contactId ?? null,
  unitId: dto.unitId ?? null,
  businessId: dto.businessId ?? null,
  saleNumber: cleanText(dto.saleNumber, 'SIN-FOLIO'),
  customerId: cleanText(dto.customerId, dto.contactId ? String(dto.contactId) : `customer-${dto.id}`),
  customerName: cleanText(dto.customerName, 'Cliente sin nombre'),
  unit: cleanText(dto.unit, 'Unidad general'),
  business: cleanText(dto.business, 'Negocio general'),
  currency: cleanText(dto.currency, 'MXN'),
  originalAmount: asNumber(dto.originalAmount),
  totalPayable: asNumber(dto.totalPayable),
  paidAmount: asNumber(dto.paidAmount),
  balance: asNumber(dto.balance),
  dueDate: dateString(dto.dueDate),
  nextPaymentDate: dateString(dto.nextPaymentDate),
  installmentAmount: asNumber(dto.installmentAmount),
  termMonths: Math.max(1, Math.round(asNumber(dto.termMonths, 1))),
  annualInterestRate: asNumber(dto.annualInterestRate),
  status: toReceivableStatus(dto.status),
});

const toReceivableInstallment = (dto: BackendReceivableInstallment): ReceivableInstallment => ({
  id: idString(dto.id, `installment-${dto.receivableId}-${dto.installmentNumber}`),
  receivableId: idString(dto.receivableId),
  creditSaleId: idString(dto.creditSaleId),
  installmentNumber: Math.max(1, Math.round(asNumber(dto.installmentNumber, 1))),
  saleNumber: cleanText(dto.saleNumber, 'SIN-FOLIO'),
  customerName: cleanText(dto.customerName, 'Cliente sin nombre'),
  unit: cleanText(dto.unit, 'Unidad general'),
  business: cleanText(dto.business, 'Negocio general'),
  dueDate: dateString(dto.dueDate),
  amount: asNumber(dto.amount),
  paidAmount: asNumber(dto.paidAmount),
  balance: asNumber(dto.balance),
  currency: cleanText(dto.currency, 'MXN'),
  status: toReceivableStatus(dto.status),
});

const toReceivablePayment = (dto: BackendReceivablePayment): ReceivablePayment => ({
  paymentAccountId: dto.paymentAccountId == null ? undefined : String(dto.paymentAccountId),
  idempotencyKey: dto.idempotencyKey ?? undefined,
  receiptDataUrl: dto.receiptUrl ?? undefined,
  receiptImageDataUrl: dto.receiptMimeType?.startsWith("image/") ? dto.receiptUrl ?? undefined : undefined,
  receiptFileName: dto.receiptFileName ?? undefined,
  receiptMimeType: dto.receiptMimeType ?? undefined,
  id: idString(dto.id, `payment-${dto.reference}`),
  receivableId: idString(dto.receivableId),
  saleNumber: cleanText(dto.saleNumber, 'SIN-FOLIO'),
  customerName: cleanText(dto.customerName, 'Cliente sin nombre'),
  currency: cleanText(dto.currency, 'MXN'),
  paymentDate: dateString(dto.paymentDate),
  method: toPaymentMethod(dto.method),
  amount: asNumber(dto.amount),
  reference: cleanText(dto.reference, 'Sin referencia'),
  registeredBy: cleanText(dto.registeredBy, 'Finanzas'),
});

const toWorkspace = (dto: BackendWorkspace): ReceivablesWorkspace => ({
  creditSales: (dto.creditSales ?? []).map(toCreditSale),
  receivables: (dto.receivables ?? []).map(toReceivableAccount),
  installments: (dto.installments ?? []).map(toReceivableInstallment),
  payments: (dto.payments ?? []).map(toReceivablePayment),
  creditPolicies: (dto.creditPolicies ?? []).map(toCreditPolicy),
  candidateSales: (dto.candidateSales ?? []).map(toCandidateSale),
});

const simulationPayload = (simulation: CreditSimulation) => ({
  id: simulation.id,
  name: simulation.name,
  termMonths: simulation.termMonths,
  annualInterestRate: simulation.annualInterestRate,
  monthlyPayment: simulation.monthlyPayment,
  totalPayable: simulation.totalPayable,
  totalInterest: simulation.totalInterest,
});

const creditPolicyPayload = (policy: Omit<CreditPolicy, 'id' | 'availableCredit'>) => ({
        contactId: policy.contactId ?? numericId(policy.customerId),
        unitId: policy.unitId ?? null,
        businessId: policy.businessId ?? null,
        customerId: policy.customerId,
        customerName: policy.customerName,
        currencyCode: policy.currency ?? 'MXN',
        creditLine: policy.creditLine,
        monthlyPurchaseLimit: policy.monthlyPurchaseLimit,
        defaultTermMonths: policy.defaultTermMonths,
        annualInterestRate: policy.annualInterestRate,
        status: policy.status.toUpperCase(),
        notes: policy.notes,
      });

export const receivablesApi = {
  async workspace(): Promise<ReceivablesWorkspace> {
    return toWorkspace(await apiClient<BackendWorkspace>(`${basePath}/workspace`));
  },

  async createCreditSale(draft: {
    candidate: CandidateSale;
    financedAmount: number;
    firstDueDate: string;
    creditPolicy: CreditPolicy;
    selectedSimulation: CreditSimulation;
  }): Promise<ReceivablesWorkspace> {
    const response = await apiClient<BackendWorkspace>(
      `${basePath}/credit-sales`,
      jsonMutation('POST', {
        candidateId: draft.candidate.id,
        salesRecordId: draft.candidate.salesRecordId ?? numericId(draft.candidate.id.replace(/^sales:/, '')),
        posTicketId: draft.candidate.posTicketId ?? null,
        contactId: draft.candidate.contactId ?? numericId(draft.candidate.customerId),
        creditContactId: draft.creditPolicy.contactId ?? numericId(draft.creditPolicy.customerId),
        creditCustomerId: draft.creditPolicy.customerId,
        creditCustomerName: draft.creditPolicy.customerName,
        unitId: draft.candidate.unitId ?? null,
        businessId: draft.candidate.businessId ?? null,
        saleNumber: draft.candidate.saleNumber,
        customerName: draft.candidate.customerName,
        saleDate: draft.candidate.saleDate,
        originalAmount: draft.candidate.amount,
        financedAmount: draft.financedAmount,
        currency: draft.candidate.currency,
        firstDueDate: draft.firstDueDate,
        source: draft.candidate.source.toUpperCase(),
        selectedSimulation: simulationPayload(draft.selectedSimulation),
      }),
    );
    return toWorkspace(response);
  },

  async paymentAccounts(receivableId: string): Promise<Array<{ id: number; name: string; type: string; currencyCode: string }>> {
    return apiClient(`${basePath}/payment-accounts?receivableId=${encodeURIComponent(String(numericId(receivableId)))}`);
  },

  async registerPayment(payment: Omit<ReceivablePayment, 'id'>): Promise<ReceivablesWorkspace> {
    let receipt: { objectKey: string; fileName: string; contentType: string; sizeBytes: number } | undefined;
    const dataUrl = payment.receiptDataUrl ?? payment.receiptImageDataUrl;
    if (dataUrl?.startsWith('data:')) {
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = payment.receiptFileName || 'receipt';
      const contentType = blob.type || payment.receiptMimeType || 'application/octet-stream';
      const upload = await apiClient<{ objectKey: string; uploadUrl: string; uploadHeaders: Record<string, string> }>(
        `${basePath}/payment-receipts/uploads`, jsonMutation('POST', {
          receivableId: numericId(payment.receivableId), fileName, contentType, sizeBytes: blob.size,
        }));
      const uploaded = await fetch(upload.uploadUrl, { method: 'PUT', headers: upload.uploadHeaders, body: blob });
      if (!uploaded.ok) throw new Error('No se pudo guardar el comprobante de pago.');
      receipt = { objectKey: upload.objectKey, fileName, contentType, sizeBytes: blob.size };
    }
    const response = await apiClient<BackendWorkspace>(
      `${basePath}/payments`,
      jsonMutation('POST', {
        receivableId: numericId(payment.receivableId),
        paymentAccountId: payment.paymentAccountId ? numericId(payment.paymentAccountId) : null,
        idempotencyKey: payment.idempotencyKey,
        paymentDate: payment.paymentDate,
        method: payment.method.toUpperCase(),
        amount: payment.amount,
        reference: payment.reference,
        registeredBy: payment.registeredBy,
        receipt,
      }),
    );
    return toWorkspace(response);
  },

  async updateCreditPolicy(id: string, policy: Omit<CreditPolicy, 'id' | 'availableCredit'>): Promise<ReceivablesWorkspace> {
    return toWorkspace(await apiClient<BackendWorkspace>(`${basePath}/credit-policies/${numericId(id)}`,
      jsonMutation('PUT', creditPolicyPayload(policy))));
  },

  async archiveCreditPolicy(id: string): Promise<ReceivablesWorkspace> {
    return toWorkspace(await apiClient<BackendWorkspace>(`${basePath}/credit-policies/${numericId(id)}`,
      jsonMutation('DELETE', {})));
  },

  async createCreditPolicy(policy: Omit<CreditPolicy, 'id' | 'availableCredit'>): Promise<ReceivablesWorkspace> {
    const response = await apiClient<BackendWorkspace>(
      `${basePath}/credit-policies`,
      jsonMutation('POST', creditPolicyPayload(policy)),
    );
    return toWorkspace(response);
  },
};
