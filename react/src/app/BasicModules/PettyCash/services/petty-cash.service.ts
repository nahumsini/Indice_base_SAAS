import { apiClient } from '../../../lib/apiClient';
import { numericId } from '../../Expenses/adapters/adapter.utils';
import type {
  PettyCashAttachment,
  PettyCashCurrency,
  PettyCashFund,
  PettyCashFundStatus,
  PettyCashFundType,
  PettyCashMovement,
  PettyCashMovementType,
  PettyCashSettlementLine,
  PettyCashSettlementLineStatus,
  PettyCashStatement,
  PettyCashStatementStatus,
} from '../types/pettyCash.types';

type PettyCashJson = Record<string, unknown> | null | undefined;

type PettyCashFundApiDto = {
  id: number;
  companyId: number;
  unitId?: number | null;
  businessId?: number | null;
  budgetId?: number | null;
  budgetLineId?: number | null;
  paymentAccountId?: number | null;
  fundingSourcePaymentAccountId?: number | null;
  responsibleUserId?: number | null;
  fundType?: PettyCashFundType | null;
  name: string;
  currencyCode: string;
  limitAmount: number | string;
  currentBalanceAmount: number | string;
  cutOffDay?: number | null;
  fundingSourceName?: string | null;
  externalOwnerType?: string | null;
  externalOwnerName?: string | null;
  externalOwnerRelationship?: string | null;
  externalOwnerReference?: string | null;
  statementRecipientEmail?: string | null;
  managedAssetType?: string | null;
  managedAssetName?: string | null;
  managedAssetReference?: string | null;
  externalIdentityPending?: boolean | null;
  budgetLinkPending?: boolean | null;
  fundingMethods?: string[] | null;
  spendingMethods?: string[] | null;
  kioskEnabled?: boolean | null;
  kioskUsesUniversalPin?: boolean | null;
  kioskAccessUrl?: string | null;
  kioskPublicToken?: string | null;
  status?: PettyCashFundStatus | null;
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
  customFields?: PettyCashJson;
  metadata?: PettyCashJson;
};

type PettyCashStatementApiDto = {
  id: number;
  companyId: number;
  pettyCashFundId: number;
  fundTypeSnapshot?: PettyCashFundType | null;
  folio: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  cutOffDate: string;
  openingBalanceAmount: number | string;
  assignedAmount: number | string;
  additionalDepositAmount: number | string;
  declaredClosingBalanceAmount: number | string;
  estimatedUsageAmount: number | string;
  verifiedExpenseAmount: number | string;
  returnedAmount: number | string;
  shortageAmount: number | string;
  carryForwardAmount: number | string;
  currencyCode: string;
  status?: PettyCashStatementStatus | null;
  responsibleUserId?: number | null;
  externalOwnerTypeSnapshot?: string | null;
  externalOwnerNameSnapshot?: string | null;
  externalOwnerRelationshipSnapshot?: string | null;
  externalOwnerReferenceSnapshot?: string | null;
  statementRecipientEmailSnapshot?: string | null;
  managedAssetTypeSnapshot?: string | null;
  managedAssetNameSnapshot?: string | null;
  managedAssetReferenceSnapshot?: string | null;
  reviewedByUserId?: number | null;
  attachmentCount?: number | null;
  customFields?: PettyCashJson;
  metadata?: PettyCashJson;
};

type PettyCashMovementApiDto = {
  id: number;
  companyId: number;
  pettyCashFundId: number;
  pettyCashStatementId?: number | null;
  fromPaymentAccountId?: number | null;
  toPaymentAccountId?: number | null;
  externalSourceName?: string | null;
  entryCategory?: string | null;
  counterpartyName?: string | null;
  statementDescription?: string | null;
  fundingMethod?: string | null;
  internalNote?: string | null;
  type: PettyCashMovementType;
  amount: number | string;
  currencyCode: string;
  movementDate: string;
  reference?: string | null;
  customFields?: PettyCashJson;
  metadata?: PettyCashJson;
};

type PettyCashSettlementLineApiDto = {
  id: number;
  companyId: number;
  pettyCashFundId: number;
  pettyCashStatementId: number;
  expenseId?: number | null;
  providerId?: number | null;
  accountingAccountId?: number | null;
  description: string;
  receiptReference?: string | null;
  subtotalAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  currencyCode: string;
  expenseDate: string;
  attachmentCount?: number | null;
  status?: PettyCashSettlementLineStatus | null;
  cancellationReason?: string | null;
  cancelledByUserId?: number | null;
  cancelledAt?: string | null;
  customFields?: PettyCashJson;
  metadata?: PettyCashJson;
};

type PettyCashWorkspaceApiResponse = {
  funds: PettyCashFundApiDto[];
  statements: PettyCashStatementApiDto[];
  movements: PettyCashMovementApiDto[];
  settlementLines: PettyCashSettlementLineApiDto[];
  count: number;
};

type PettyCashWorkspace = {
  funds: PettyCashFund[];
  statements: PettyCashStatement[];
  movements: PettyCashMovement[];
  settlementLines: PettyCashSettlementLine[];
  count: number;
};

type PettyCashMovementMutationApiResponse = {
  fund: PettyCashFundApiDto;
  statement: PettyCashStatementApiDto;
  movement: PettyCashMovementApiDto;
};

type PettyCashMovementMutation = {
  fund: PettyCashFund;
  statement: PettyCashStatement;
  movement: PettyCashMovement;
};

type PettyCashSettlementLineMutationApiResponse = {
  fund: PettyCashFundApiDto;
  statement: PettyCashStatementApiDto;
  settlementLine: PettyCashSettlementLineApiDto;
};

type PettyCashSettlementLineMutation = {
  fund: PettyCashFund;
  statement: PettyCashStatement;
  settlementLine: PettyCashSettlementLine;
};

export type PettyCashStatementCloseAction =
  | 'CLOSE_CLEAN'
  | 'RETURN_TO_SOURCE'
  | 'CARRY_FORWARD'
  | 'FORGIVE_SHORTAGE'
  | 'CHARGE_EMPLOYEE';

type PettyCashStatementCloseApiResponse = {
  fund: PettyCashFundApiDto;
  statement: PettyCashStatementApiDto;
  nextStatement?: PettyCashStatementApiDto | null;
};

type PettyCashStatementCloseMutation = {
  fund: PettyCashFund;
  statement: PettyCashStatement;
  nextStatement?: PettyCashStatement;
};

type PettyCashAttachmentApiDto = Partial<PettyCashAttachment> & {
  original_filename?: string;
  mime_type?: string;
  size_bytes?: number;
  object_key?: string;
  download_url?: string | null;
  uploaded_by_user_id?: number | null;
  uploaded_by_name?: string | null;
  created_at?: string | null;
};

type PettyCashAttachmentListApiResponse = {
  items: PettyCashAttachmentApiDto[];
  count: number;
};

type PettyCashAttachmentPresignPayload = {
  file_name: string;
  content_type: string;
  size_bytes: number;
};

type PettyCashAttachmentPresignResponse = {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers?: Record<string, string>;
};

type RegisterPettyCashAttachmentPayload = {
  object_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
};

type PettyCashFundApiRequest = {
  unitId?: number | null;
  businessId?: number | null;
  budgetId?: number | null;
  budgetLineId?: number | null;
  paymentAccountId?: number | null;
  fundingSourcePaymentAccountId?: number | null;
  responsibleUserId?: number | null;
  fundType?: PettyCashFundType;
  name: string;
  currencyCode: string;
  limitAmount: number;
  currentBalanceAmount?: number;
  cutOffDay?: number;
  fundingSourceName?: string | null;
  externalOwnerType?: string | null;
  externalOwnerName?: string | null;
  externalOwnerRelationship?: string | null;
  externalOwnerReference?: string | null;
  statementRecipientEmail?: string | null;
  managedAssetType?: string | null;
  managedAssetName?: string | null;
  managedAssetReference?: string | null;
  fundingMethods?: string[];
  spendingMethods?: string[];
  kioskEnabled?: boolean;
  kioskUsesUniversalPin?: boolean;
  kioskAccessUrl?: string | null;
  kioskPublicToken?: string | null;
  status?: PettyCashFundStatus;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type PettyCashMovementApiRequest = {
  pettyCashStatementId?: number | null;
  fromPaymentAccountId?: number | null;
  toPaymentAccountId?: number | null;
  externalSourceName?: string | null;
  entryCategory?: string | null;
  counterpartyName?: string | null;
  statementDescription?: string | null;
  fundingMethod?: string | null;
  internalNote?: string | null;
  type?: PettyCashMovementType;
  amount: number;
  currencyCode: string;
  movementDate: string;
  reference?: string | null;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type PettyCashSettlementLineApiRequest = {
  pettyCashStatementId?: number | null;
  expenseId?: number | null;
  providerId?: number | null;
  accountingAccountId?: number | null;
  description: string;
  receiptReference?: string | null;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  currencyCode: string;
  expenseDate: string;
  attachmentCount?: number;
  status?: PettyCashSettlementLineStatus;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type PettyCashStatementCloseApiRequest = {
  action: PettyCashStatementCloseAction;
  shortageAmount?: number;
  closeDate?: string;
  reference?: string;
};

const pettyCashPath = '/api/v1/finance/petty-cash';
const supportedCurrencies: PettyCashCurrency[] = ['CAD', 'MXN', 'COP', 'USD', 'BRL'];

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

const idString = (value?: number | string | null) => (
  value === null || value === undefined ? '' : String(value)
);

const asNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asCurrency = (value?: string | null): PettyCashCurrency => (
  supportedCurrencies.includes(value as PettyCashCurrency) ? value as PettyCashCurrency : 'MXN'
);

const asCustomObject = (value: PettyCashJson): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const customString = (customFields: PettyCashJson, key: string) => {
  const value = asCustomObject(customFields)[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const labelWithId = (label: string, id?: number | null) => (
  id ? `${label} #${id}` : `Sin ${label.toLowerCase()}`
);

const optionalLabelWithId = (label: string, id?: number | null) => (
  id ? `${label} #${id}` : undefined
);

const toFund = (dto: PettyCashFundApiDto): PettyCashFund => ({
  id: idString(dto.id),
  budgetId: idString(dto.budgetId),
  budgetLineId: idString(dto.budgetLineId),
  budgetLineName: customString(dto.customFields, 'budgetLineName'),
  businessId: idString(dto.businessId),
  businessName: customString(dto.customFields, 'businessName') ?? labelWithId('Business', dto.businessId),
  companyId: idString(dto.companyId),
  createdByName: customString(dto.customFields, 'createdByName') ?? labelWithId('User', dto.createdByUserId),
  createdByUserId: idString(dto.createdByUserId),
  currencyCode: asCurrency(dto.currencyCode),
  currentBalanceAmount: asNumber(dto.currentBalanceAmount),
  cutOffDay: dto.cutOffDay ?? 30,
  fundingMethods: dto.fundingMethods ?? [],
  fundType: dto.fundType ?? (dto.fundingSourcePaymentAccountId ? 'INTERNAL_COMPANY' : 'EXTERNAL_MANAGED'),
  fundingSourceName: dto.fundingSourceName ?? customString(dto.customFields, 'fundingSourceName') ?? 'Financial account',
  fundingSourcePaymentAccountId: idString(dto.fundingSourcePaymentAccountId),
  externalOwnerType: dto.externalOwnerType ?? undefined,
  externalOwnerName: dto.externalOwnerName ?? undefined,
  externalOwnerRelationship: dto.externalOwnerRelationship ?? undefined,
  externalOwnerReference: dto.externalOwnerReference ?? undefined,
  statementRecipientEmail: dto.statementRecipientEmail ?? undefined,
  managedAssetType: dto.managedAssetType ?? undefined,
  managedAssetName: dto.managedAssetName ?? undefined,
  managedAssetReference: dto.managedAssetReference ?? undefined,
  externalIdentityPending: Boolean(dto.externalIdentityPending),
  budgetLinkPending: Boolean(dto.budgetLinkPending),
  kioskAccessUrl: dto.kioskAccessUrl
    ?? customString(dto.customFields, 'kioskAccessUrl')
    ?? (dto.kioskPublicToken ? `/petty-cash/kiosk/${dto.kioskPublicToken}` : undefined),
  kioskEnabled: Boolean(dto.kioskEnabled),
  kioskPublicToken: dto.kioskPublicToken ?? customString(dto.customFields, 'kioskPublicToken'),
  kioskUsesUniversalPin: dto.kioskUsesUniversalPin ?? true,
  limitAmount: asNumber(dto.limitAmount),
  name: dto.name,
  paymentAccountId: idString(dto.paymentAccountId),
  responsibleName: customString(dto.customFields, 'responsibleName') ?? labelWithId('User', dto.responsibleUserId),
  responsibleUserId: idString(dto.responsibleUserId),
  spendingMethods: dto.spendingMethods ?? [],
  status: dto.status ?? 'OPEN',
  unitId: idString(dto.unitId),
  unitName: customString(dto.customFields, 'unitName') ?? labelWithId('Unit', dto.unitId),
});

const toStatement = (
  dto: PettyCashStatementApiDto,
  fundsById: Map<string, PettyCashFund>,
): PettyCashStatement => {
  const fund = fundsById.get(idString(dto.pettyCashFundId));

  return {
    id: idString(dto.id),
    additionalDepositAmount: asNumber(dto.additionalDepositAmount),
    assignedAmount: asNumber(dto.assignedAmount),
    attachmentCount: dto.attachmentCount ?? 0,
    carryForwardAmount: asNumber(dto.carryForwardAmount),
    companyId: idString(dto.companyId),
    currencyCode: asCurrency(dto.currencyCode),
    cutOffDate: dto.cutOffDate,
    declaredClosingBalanceAmount: asNumber(dto.declaredClosingBalanceAmount),
    estimatedUsageAmount: asNumber(dto.estimatedUsageAmount),
    folio: dto.folio,
    openingBalanceAmount: asNumber(dto.openingBalanceAmount),
    periodEnd: dto.periodEnd,
    periodKey: dto.periodKey,
    periodStart: dto.periodStart,
    pettyCashFundId: idString(dto.pettyCashFundId),
    fundTypeSnapshot: dto.fundTypeSnapshot ?? fund?.fundType ?? 'INTERNAL_COMPANY',
    responsibleName: customString(dto.customFields, 'responsibleName') ?? fund?.responsibleName ?? labelWithId('User', dto.responsibleUserId),
    responsibleUserId: idString(dto.responsibleUserId),
    externalOwnerTypeSnapshot: dto.externalOwnerTypeSnapshot ?? undefined,
    externalOwnerNameSnapshot: dto.externalOwnerNameSnapshot ?? undefined,
    externalOwnerRelationshipSnapshot: dto.externalOwnerRelationshipSnapshot ?? undefined,
    externalOwnerReferenceSnapshot: dto.externalOwnerReferenceSnapshot ?? undefined,
    statementRecipientEmailSnapshot: dto.statementRecipientEmailSnapshot ?? undefined,
    managedAssetTypeSnapshot: dto.managedAssetTypeSnapshot ?? undefined,
    managedAssetNameSnapshot: dto.managedAssetNameSnapshot ?? undefined,
    managedAssetReferenceSnapshot: dto.managedAssetReferenceSnapshot ?? undefined,
    returnedAmount: asNumber(dto.returnedAmount),
    reviewedByName: customString(dto.customFields, 'reviewedByName') ?? optionalLabelWithId('User', dto.reviewedByUserId),
    shortageAmount: asNumber(dto.shortageAmount),
    status: dto.status ?? 'OPEN',
    verifiedExpenseAmount: asNumber(dto.verifiedExpenseAmount),
  };
};

const toMovement = (
  dto: PettyCashMovementApiDto,
  fundsById: Map<string, PettyCashFund>,
): PettyCashMovement => {
  const fund = fundsById.get(idString(dto.pettyCashFundId));

  return {
    id: idString(dto.id),
    amount: asNumber(dto.amount),
    companyId: idString(dto.companyId),
    currencyCode: asCurrency(dto.currencyCode),
    externalSourceName: dto.externalSourceName ?? customString(dto.customFields, 'externalSourceName'),
    entryCategory: dto.entryCategory ?? undefined,
    counterpartyName: dto.counterpartyName ?? undefined,
    statementDescription: dto.statementDescription ?? undefined,
    fundingMethod: dto.fundingMethod ?? undefined,
    internalNote: dto.internalNote ?? undefined,
    fromPaymentAccountId: idString(dto.fromPaymentAccountId),
    fromPaymentAccountName: customString(dto.customFields, 'fromPaymentAccountName')
      ?? customString(dto.customFields, 'externalSourceName')
      ?? labelWithId('Account', dto.fromPaymentAccountId),
    movementDate: dto.movementDate,
    pettyCashFundId: idString(dto.pettyCashFundId),
    pettyCashStatementId: idString(dto.pettyCashStatementId),
    reference: dto.reference ?? '',
    toPaymentAccountId: idString(dto.toPaymentAccountId),
    toPaymentAccountName: customString(dto.customFields, 'toPaymentAccountName') ?? fund?.name ?? labelWithId('Account', dto.toPaymentAccountId),
    type: dto.type,
  };
};

const toSettlementLine = (dto: PettyCashSettlementLineApiDto): PettyCashSettlementLine => ({
  id: idString(dto.id),
  accountingAccountId: idString(dto.accountingAccountId),
  accountingAccountName: customString(dto.customFields, 'accountingAccountName') ?? optionalLabelWithId('Accounting account', dto.accountingAccountId),
  attachmentCount: dto.attachmentCount ?? 0,
  companyId: idString(dto.companyId),
  currencyCode: asCurrency(dto.currencyCode),
  description: dto.description,
  expenseDate: dto.expenseDate,
  expenseId: idString(dto.expenseId),
  pettyCashFundId: idString(dto.pettyCashFundId),
  pettyCashStatementId: idString(dto.pettyCashStatementId),
  providerId: idString(dto.providerId),
  providerName: customString(dto.customFields, 'providerName') ?? optionalLabelWithId('Provider', dto.providerId),
  receiptReference: dto.receiptReference ?? undefined,
  status: dto.status ?? 'DRAFT',
  cancellationReason: dto.cancellationReason ?? undefined,
  cancelledByUserId: idString(dto.cancelledByUserId) || undefined,
  cancelledAt: dto.cancelledAt ?? undefined,
  subtotalAmount: asNumber(dto.subtotalAmount),
  taxAmount: asNumber(dto.taxAmount),
  totalAmount: asNumber(dto.totalAmount),
});

const toAttachment = (dto: PettyCashAttachmentApiDto): PettyCashAttachment => ({
  id: Number(dto.id ?? 0),
  createdAt: dto.createdAt ?? dto.created_at ?? null,
  downloadUrl: dto.downloadUrl ?? dto.download_url ?? null,
  mimeType: dto.mimeType ?? dto.mime_type ?? '',
  objectKey: dto.objectKey ?? dto.object_key ?? '',
  originalFilename: dto.originalFilename ?? dto.original_filename ?? '',
  sizeBytes: Number(dto.sizeBytes ?? dto.size_bytes ?? 0),
  uploadedByName: dto.uploadedByName ?? dto.uploaded_by_name ?? null,
  uploadedByUserId: dto.uploadedByUserId ?? dto.uploaded_by_user_id ?? null,
});

const toWorkspace = (response: PettyCashWorkspaceApiResponse): PettyCashWorkspace => {
  const funds = response.funds.map(toFund);
  const fundsById = new Map(funds.map(fund => [fund.id, fund]));

  return {
    count: response.count,
    funds,
    movements: response.movements.map(movement => toMovement(movement, fundsById)),
    settlementLines: response.settlementLines.map(toSettlementLine),
    statements: response.statements.map(statement => toStatement(statement, fundsById)),
  };
};

const fundCustomFields = (fund: PettyCashFund) => ({
  budgetLineName: fund.budgetLineName,
  businessName: fund.businessName,
  createdByName: fund.createdByName,
  fundingSourceName: fund.fundingSourceName,
  kioskAccessUrl: fund.kioskAccessUrl,
  kioskPublicToken: fund.kioskPublicToken,
  responsibleName: fund.responsibleName,
  unitName: fund.unitName,
});

const toFundCreateRequest = (fund: PettyCashFund): PettyCashFundApiRequest => ({
  budgetId: numericId(fund.budgetId) ?? null,
  budgetLineId: numericId(fund.budgetLineId) ?? null,
  businessId: numericId(fund.businessId) ?? null,
  currencyCode: fund.currencyCode,
  currentBalanceAmount: fund.currentBalanceAmount,
  customFields: fundCustomFields(fund),
  cutOffDay: fund.cutOffDay,
  fundingMethods: fund.fundingMethods,
  fundType: fund.fundType,
  fundingSourceName: fund.fundingSourceName,
  fundingSourcePaymentAccountId: numericId(fund.fundingSourcePaymentAccountId) ?? null,
  externalOwnerType: fund.externalOwnerType ?? null,
  externalOwnerName: fund.externalOwnerName ?? null,
  externalOwnerRelationship: fund.externalOwnerRelationship ?? null,
  externalOwnerReference: fund.externalOwnerReference ?? null,
  statementRecipientEmail: fund.statementRecipientEmail ?? null,
  managedAssetType: fund.managedAssetType ?? null,
  managedAssetName: fund.managedAssetName ?? null,
  managedAssetReference: fund.managedAssetReference ?? null,
  kioskAccessUrl: fund.kioskAccessUrl ?? null,
  kioskEnabled: fund.kioskEnabled,
  kioskPublicToken: fund.kioskPublicToken ?? null,
  kioskUsesUniversalPin: fund.kioskUsesUniversalPin ?? true,
  limitAmount: fund.limitAmount,
  metadata: { source: 'petty_cash_frontend' },
  name: fund.name,
  paymentAccountId: numericId(fund.paymentAccountId) ?? null,
  responsibleUserId: numericId(fund.responsibleUserId) ?? null,
  spendingMethods: fund.spendingMethods,
  status: fund.status,
  unitId: numericId(fund.unitId) ?? null,
});

const toFundUpdateRequest = (fund: PettyCashFund): PettyCashFundApiRequest => {
  const request = toFundCreateRequest(fund);
  return {
    ...request,
    currentBalanceAmount: undefined,
  };
};

const toMovementRequest = (movement: PettyCashMovement): PettyCashMovementApiRequest => ({
  amount: movement.amount,
  currencyCode: movement.currencyCode,
  customFields: {
    externalSourceName: movement.externalSourceName,
    fromPaymentAccountName: movement.fromPaymentAccountName,
    toPaymentAccountName: movement.toPaymentAccountName,
  },
  fromPaymentAccountId: numericId(movement.fromPaymentAccountId) ?? null,
  externalSourceName: movement.externalSourceName?.trim() || null,
  entryCategory: movement.entryCategory?.trim() || null,
  counterpartyName: movement.counterpartyName?.trim() || null,
  statementDescription: movement.statementDescription?.trim() || null,
  fundingMethod: movement.fundingMethod?.trim() || null,
  internalNote: movement.internalNote?.trim() || null,
  metadata: { source: 'petty_cash_frontend' },
  movementDate: movement.movementDate,
  pettyCashStatementId: numericId(movement.pettyCashStatementId) ?? null,
  reference: movement.reference || null,
  toPaymentAccountId: numericId(movement.toPaymentAccountId) ?? null,
  type: movement.type,
});

const toSettlementLineRequest = (line: PettyCashSettlementLine): PettyCashSettlementLineApiRequest => ({
  accountingAccountId: numericId(line.accountingAccountId) ?? null,
  attachmentCount: line.attachmentCount,
  currencyCode: line.currencyCode,
  customFields: {
    accountingAccountName: line.accountingAccountName,
    providerName: line.providerName,
  },
  description: line.description,
  expenseDate: line.expenseDate,
  expenseId: numericId(line.expenseId) ?? null,
  metadata: { source: 'petty_cash_frontend' },
  pettyCashStatementId: numericId(line.pettyCashStatementId) ?? null,
  providerId: numericId(line.providerId) ?? null,
  receiptReference: line.receiptReference ?? null,
  status: line.status,
  subtotalAmount: line.subtotalAmount,
  taxAmount: line.taxAmount,
  totalAmount: line.totalAmount,
});

const requireBackendId = (id: string, label: string) => {
  const parsed = numericId(id);
  if (!parsed) {
    throw new Error(`${label} does not have a backend id.`);
  }
  return parsed;
};

export const hasPettyCashBackendId = (id?: string | number | null) => numericId(id) !== undefined;

export const pettyCashService = {
  async getWorkspace(): Promise<PettyCashWorkspace> {
    const response = await apiClient<PettyCashWorkspaceApiResponse>(pettyCashPath);
    return toWorkspace(response);
  },

  async createFund(fund: PettyCashFund): Promise<PettyCashFund> {
    const response = await apiClient<PettyCashFundApiDto>(
      `${pettyCashPath}/funds`,
      jsonMutation('POST', toFundCreateRequest(fund)),
    );
    return toFund(response);
  },

  async updateFund(fund: PettyCashFund): Promise<PettyCashFund> {
    const fundId = requireBackendId(fund.id, 'Petty cash fund');
    const response = await apiClient<PettyCashFundApiDto>(
      `${pettyCashPath}/funds/${fundId}`,
      jsonMutation('PUT', toFundUpdateRequest(fund)),
    );
    return toFund(response);
  },

  async rotateFundKioskToken(fundId: string): Promise<PettyCashFund> {
    const response = await apiClient<PettyCashFundApiDto>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/rotate-kiosk-token`,
      { method: 'POST' },
    );
    return toFund(response);
  },

  async deleteFundKiosk(fundId: string): Promise<PettyCashFund> {
    const response = await apiClient<PettyCashFundApiDto>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/kiosk`,
      { method: 'DELETE' },
    );
    return toFund(response);
  },

  async deleteFund(fundId: string): Promise<void> {
    await apiClient(`${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}`, { method: 'DELETE' });
  },

  async createMovement(fundId: string, movement: PettyCashMovement): Promise<PettyCashMovementMutation> {
    const response = await apiClient<PettyCashMovementMutationApiResponse>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/movements`,
      jsonMutation('POST', toMovementRequest(movement)),
    );
    const fund = toFund(response.fund);
    const fundsById = new Map([[fund.id, fund]]);
    return {
      fund,
      movement: toMovement(response.movement, fundsById),
      statement: toStatement(response.statement, fundsById),
    };
  },

  async createSettlementLine(fundId: string, line: PettyCashSettlementLine): Promise<PettyCashSettlementLineMutation> {
    const response = await apiClient<PettyCashSettlementLineMutationApiResponse>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines`,
      jsonMutation('POST', toSettlementLineRequest(line)),
    );
    const fund = toFund(response.fund);
    const fundsById = new Map([[fund.id, fund]]);
    return {
      fund,
      settlementLine: toSettlementLine(response.settlementLine),
      statement: toStatement(response.statement, fundsById),
    };
  },

  async createExpenseFromSettlementLine(fundId: string, settlementLineId: string): Promise<PettyCashSettlementLineMutation> {
    const response = await apiClient<PettyCashSettlementLineMutationApiResponse>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines/${requireBackendId(settlementLineId, 'Petty cash settlement line')}/create-expense`,
      jsonMutation('POST', {}),
    );
    const fund = toFund(response.fund);
    const fundsById = new Map([[fund.id, fund]]);
    return {
      fund,
      settlementLine: toSettlementLine(response.settlementLine),
      statement: toStatement(response.statement, fundsById),
    };
  },

  async rejectSettlementLine(fundId: string, settlementLineId: string): Promise<PettyCashSettlementLineMutation> {
    const response = await apiClient<PettyCashSettlementLineMutationApiResponse>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines/${requireBackendId(settlementLineId, 'Petty cash settlement line')}/reject`,
      jsonMutation('POST', {}),
    );
    const fund = toFund(response.fund);
    const fundsById = new Map([[fund.id, fund]]);
    return {
      fund,
      settlementLine: toSettlementLine(response.settlementLine),
      statement: toStatement(response.statement, fundsById),
    };
  },

  async deleteSettlementLine(fundId: string, settlementLineId: string, reason: string): Promise<void> {
    await apiClient(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines/${requireBackendId(settlementLineId, 'Petty cash settlement line')}?reason=${encodeURIComponent(reason.trim())}`,
      { method: 'DELETE' },
    );
  },

  async closeStatement(
    fundId: string,
    statementId: string,
    payload: PettyCashStatementCloseApiRequest,
  ): Promise<PettyCashStatementCloseMutation> {
    const response = await apiClient<PettyCashStatementCloseApiResponse>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/statements/${requireBackendId(statementId, 'Petty cash statement')}/close`,
      jsonMutation('POST', payload),
    );
    const fund = toFund(response.fund);
    const fundsById = new Map([[fund.id, fund]]);
    return {
      fund,
      statement: toStatement(response.statement, fundsById),
      nextStatement: response.nextStatement ? toStatement(response.nextStatement, fundsById) : undefined,
    };
  },

  async listSettlementLineAttachments(fundId: string, settlementLineId: string): Promise<PettyCashAttachment[]> {
    const response = await apiClient<PettyCashAttachmentListApiResponse>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines/${requireBackendId(settlementLineId, 'Petty cash settlement line')}/attachments`,
    );
    return response.items.map(toAttachment);
  },

  async presignSettlementLineAttachmentUpload(
    fundId: string,
    settlementLineId: string,
    payload: PettyCashAttachmentPresignPayload,
  ): Promise<PettyCashAttachmentPresignResponse> {
    return apiClient<PettyCashAttachmentPresignResponse>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines/${requireBackendId(settlementLineId, 'Petty cash settlement line')}/attachments/presign-upload`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async uploadSettlementLineAttachment(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ): Promise<void> {
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
      throw new Error('Petty cash attachment upload failed.');
    }
  },

  async registerSettlementLineAttachment(
    fundId: string,
    settlementLineId: string,
    payload: RegisterPettyCashAttachmentPayload,
  ): Promise<PettyCashAttachment> {
    const response = await apiClient<PettyCashAttachmentApiDto>(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines/${requireBackendId(settlementLineId, 'Petty cash settlement line')}/attachments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return toAttachment(response);
  },

  async deleteSettlementLineAttachment(fundId: string, settlementLineId: string, attachmentId: number): Promise<void> {
    await apiClient(
      `${pettyCashPath}/funds/${requireBackendId(fundId, 'Petty cash fund')}/settlement-lines/${requireBackendId(settlementLineId, 'Petty cash settlement line')}/attachments/${attachmentId}`,
      { method: 'DELETE' },
    );
  },
};

export type {
  PettyCashAttachmentPresignPayload,
  PettyCashAttachmentPresignResponse,
  PettyCashMovementMutation,
  PettyCashSettlementLineMutation,
  PettyCashWorkspace,
  RegisterPettyCashAttachmentPayload,
};
