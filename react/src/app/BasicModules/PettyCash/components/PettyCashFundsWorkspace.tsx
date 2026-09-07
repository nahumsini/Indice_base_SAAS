import { Archive, Banknote, Coins, Copy, ExternalLink, Eye, Info, KeyRound, Landmark, Link2, MoreHorizontal, Pencil, QrCode, ReceiptText, RotateCw, Search, Share2, ShieldCheck, Trash2, UserRound, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { getCategoryById } from '../../Expenses/data/categories.data';
import { useFinanceReferenceData } from '../../Expenses/hooks/useFinanceReferenceData';
import { mockPaymentAccounts } from '../../Expenses/PaymentAccounts/paymentAccounts.mock';
import type { PaymentAccount } from '../../Expenses/PaymentAccounts/types';
import { budgetLinesService, paymentAccountsService, toFinanceApiErrorMessage } from '../../Expenses/services';
import type { FinanceBudgetLine } from '../../Expenses/types/finance-domain.types';
import type { FinanceReferenceOption } from '../../Expenses/types/finance-reference.types';
import type { PettyCashCurrency, PettyCashFund, PettyCashFundStatus, PettyCashFundType, PettyCashStatement } from '../types/pettyCash.types';
import { hasPettyCashBackendId, pettyCashService } from '../services';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { ColumnasConfigModal, type ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation } from '../../../components/indice-modal';
import { KioskAdminActionButton, KioskAdminPanelAction } from '../../../components/kiosk-engine/KioskAdminPrimitives';
import { KioskModalFrame } from '../../../components/kiosk-engine/KioskModalFrame';
import { useKioskQrCode } from '../../../components/kiosk-engine/useKioskQrCode';
import {
  formatPettyCashCurrency,
  getStatementSettlementBalance,
} from '../utils/pettyCash.utils';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { OperationalKpiArea, getOperationalKpiCurrencyCopy } from '../../shared/operational';
import { useKpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import { useLanguage } from '../../../shared/context';
import {
  getPettyCashMethodLabel,
  normalizePettyCashMethods,
  PETTY_CASH_METHOD_KEYS,
  pettyCashFundingMethodOptions,
  pettyCashSpendingMethodOptions,
} from '../utils/pettyCash.methods';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import {
  PettyCashEmptyState,
  PettyCashField,
  PettyCashFilterShell,
  PettyCashHeaderBanner,
  PettyCashPagination,
  PettyCashSortableHeader,
  pettyCashInputClass,
  PettyCashStatusPill,
  PettyCashTableShell,
  normalizePettyCashColumns,
  usePettyCashColumns,
  usePettyCashTableSort,
} from './PettyCashShared';

const pettyCashFundsColumnsStorageKey = 'indice.pettyCash.funds.columns.v1';

type PettyCashFundsWorkspaceProps = {
  funds: PettyCashFund[];
  onFundsChange: Dispatch<SetStateAction<PettyCashFund[]>>;
  onViewReceipts: (fundId: string) => void;
  statements: PettyCashStatement[];
};

type FundDraft = {
  budgetLineId: string;
  businessId: string;
  createdByUserId: string;
  currencyCode: PettyCashCurrency;
  cutOffDay: string;
  fundingMethods: string[];
  fundingSourcePaymentAccountId: string;
  fundingSourceName: string;
  fundType: PettyCashFundType;
  externalOwnerType: string;
  externalOwnerName: string;
  externalOwnerRelationship: string;
  externalOwnerReference: string;
  statementRecipientEmail: string;
  managedAssetType: string;
  managedAssetName: string;
  managedAssetReference: string;
  limitAmount: string;
  name: string;
  paymentAccountId: string;
  responsibleUserId: string;
  spendingMethods: string[];
  unitId: string;
};

type KioskDraft = {
  businessId: string;
  kioskEnabled: boolean;
  name: string;
  unitId: string;
};

const fallbackPaymentAccounts = mockPaymentAccounts.filter(account => account.isActive);
const supportedCurrencies: PettyCashCurrency[] = ['CAD', 'MXN', 'COP', 'USD', 'BRL'];

const firstOptionValue = (options: FinanceReferenceOption[]) => options[0]?.value ?? '';

const getOptionLabel = (options: FinanceReferenceOption[], value: string, fallback: string) => (
  options.find(option => option.value === value)?.label ?? fallback
);

const filterBusinessesByUnit = (businessOptions: FinanceReferenceOption[], unitId: string) => (
  unitId ? businessOptions.filter(option => !option.unitId || option.unitId === unitId) : businessOptions
);

const getFundPaymentAccount = (accounts: PaymentAccount[]) => (
  accounts.find(account => account.source === 'petty_cash')
  ?? accounts.find(account => account.type === 'cash')
  ?? accounts[0]
);

const getFundingSourceAccount = (accounts: PaymentAccount[], excludedAccountId = '') => (
  accounts.find(account => account.type === 'bank' && account.id !== excludedAccountId)
  ?? accounts.find(account => account.id !== excludedAccountId)
  ?? accounts[0]
);

const accountMatchesCurrency = (account: PaymentAccount | undefined, currency: PettyCashCurrency) => (
  !account || toPettyCashCurrency(account.currency) === currency
);

const budgetLineMatchesCurrency = (line: FinanceBudgetLine | undefined, currency: PettyCashCurrency) => (
  !line || toPettyCashCurrency(line.currencyCode) === currency
);

const getBudgetLineForCurrency = (lines: FinanceBudgetLine[], currency: PettyCashCurrency) => (
  lines.find(line => budgetLineMatchesCurrency(line, currency))
);

const getFundingSourceOptions = (
  accounts: PaymentAccount[],
  excludedAccountId: string,
  currency: PettyCashCurrency,
) => accounts.filter(account => account.id !== excludedAccountId && accountMatchesCurrency(account, currency));

const getBudgetLineLimit = (line?: FinanceBudgetLine) => {
  if (!line) return 0;
  return line.availableAmount > 0 ? line.availableAmount : line.plannedAmount;
};

const isLowSignalBudgetLineName = (value: string, amount: number) => {
  const normalizedValue = value.trim().replace(/[$,\s]/g, '');
  if (!normalizedValue) return true;
  if (Number.isFinite(Number(normalizedValue))) return true;
  return normalizedValue === String(amount);
};

const getBudgetLineDisplayName = (line: FinanceBudgetLine, fallback: string) => {
  const amount = getBudgetLineLimit(line);
  const categoryName = line.categoryKey ? getCategoryById(line.categoryKey)?.name : undefined;
  const candidates = [line.name, line.description, categoryName].filter(Boolean) as string[];
  return candidates.find(candidate => !isLowSignalBudgetLineName(candidate, amount)) ?? fallback;
};

const getBudgetLineLabel = (
  line: FinanceBudgetLine,
  budgetLineFallback: string,
  optionLabel: (name: string, period: string, amount: string) => string,
) => {
  const amount = getBudgetLineLimit(line);
  return optionLabel(
    getBudgetLineDisplayName(line, budgetLineFallback),
    line.period ?? '',
    formatPettyCashCurrency(amount, toPettyCashCurrency(line.currencyCode)),
  );
};

const createEmptyFundDraft = ({
  businessOptions,
  budgetLines,
  currentUserId,
  paymentAccounts,
  unitOptions,
  userOptions,
  financialAccountFallback,
}: {
  businessOptions: FinanceReferenceOption[];
  budgetLines: FinanceBudgetLine[];
  currentUserId?: string;
  financialAccountFallback: string;
  paymentAccounts: PaymentAccount[];
  unitOptions: FinanceReferenceOption[];
  userOptions: FinanceReferenceOption[];
}): FundDraft => {
  const paymentAccount = getFundPaymentAccount(paymentAccounts);
  const fundingSource = getFundingSourceAccount(paymentAccounts, paymentAccount?.id);
  const unitId = firstOptionValue(unitOptions);
  const availableBusinesses = filterBusinessesByUnit(businessOptions, unitId);
  const businessId = firstOptionValue(availableBusinesses);
  const budgetLine = budgetLines[0];

  return {
    budgetLineId: budgetLine?.id ?? '',
    businessId,
    createdByUserId: currentUserId || firstOptionValue(userOptions),
    currencyCode: toPettyCashCurrency(paymentAccount?.currency ?? budgetLine?.currencyCode),
    cutOffDay: '30',
    fundingMethods: [PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER],
    fundingSourceName: fundingSource?.name ?? financialAccountFallback,
    fundingSourcePaymentAccountId: fundingSource?.id ?? '',
    fundType: 'INTERNAL_COMPANY',
    externalOwnerType: 'COMPANY',
    externalOwnerName: '',
    externalOwnerRelationship: 'CLIENT',
    externalOwnerReference: '',
    statementRecipientEmail: '',
    managedAssetType: '',
    managedAssetName: '',
    managedAssetReference: '',
    limitAmount: budgetLine ? String(getBudgetLineLimit(budgetLine)) : '',
    name: '',
    paymentAccountId: paymentAccount?.id ?? '',
    responsibleUserId: firstOptionValue(userOptions) || currentUserId || '',
    spendingMethods: [PETTY_CASH_METHOD_KEYS.CASH],
    unitId,
  };
};

const createFallbackFundDraft = (financialAccountFallback: string): FundDraft => ({
  budgetLineId: '',
  businessId: '',
  createdByUserId: '',
  currencyCode: 'MXN',
  cutOffDay: '30',
  fundingMethods: [PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER],
  fundingSourcePaymentAccountId: fallbackPaymentAccounts[0]?.id ?? '',
  fundingSourceName: fallbackPaymentAccounts[0]?.name ?? financialAccountFallback,
  fundType: 'INTERNAL_COMPANY',
  externalOwnerType: 'COMPANY',
  externalOwnerName: '',
  externalOwnerRelationship: 'CLIENT',
  externalOwnerReference: '',
  statementRecipientEmail: '',
  managedAssetType: '',
  managedAssetName: '',
  managedAssetReference: '',
  limitAmount: '',
  name: '',
  paymentAccountId: fallbackPaymentAccounts[0]?.id ?? '',
  responsibleUserId: '',
  spendingMethods: [PETTY_CASH_METHOD_KEYS.CASH],
  unitId: '',
});

const createFundDraftFromFund = (fund: PettyCashFund): FundDraft => ({
  budgetLineId: fund.budgetLineId ?? '',
  businessId: fund.businessId,
  createdByUserId: fund.createdByUserId,
  currencyCode: fund.currencyCode,
  cutOffDay: String(fund.cutOffDay),
  fundingMethods: [...fund.fundingMethods],
  fundingSourceName: fund.fundingSourceName,
  fundingSourcePaymentAccountId: fund.fundingSourcePaymentAccountId ?? '',
  fundType: fund.fundType,
  externalOwnerType: fund.externalOwnerType ?? 'COMPANY',
  externalOwnerName: fund.externalOwnerName ?? '',
  externalOwnerRelationship: fund.externalOwnerRelationship ?? 'CLIENT',
  externalOwnerReference: fund.externalOwnerReference ?? '',
  statementRecipientEmail: fund.statementRecipientEmail ?? '',
  managedAssetType: fund.managedAssetType ?? '',
  managedAssetName: fund.managedAssetName ?? '',
  managedAssetReference: fund.managedAssetReference ?? '',
  limitAmount: String(fund.limitAmount),
  name: fund.name,
  paymentAccountId: fund.paymentAccountId,
  responsibleUserId: fund.responsibleUserId,
  spendingMethods: [...fund.spendingMethods],
  unitId: fund.unitId,
});

const toSlug = (value: string) => (
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
);

const toPettyCashCurrency = (currency: string | undefined): PettyCashCurrency => (
  supportedCurrencies.includes(currency as PettyCashCurrency) ? currency as PettyCashCurrency : 'MXN'
);

const getPaymentAccountLabel = (account: PaymentAccount) => {
  const descriptor = [account.bank, account.accountNumber].filter(Boolean).join(' ');
  return `${account.name}${descriptor ? ` - ${descriptor}` : ''} (${account.currency})`;
};

const getPaymentAccountName = (accounts: PaymentAccount[], accountId: string, fallback: string) => (
  accounts.find(account => account.id === accountId)?.name ?? fallback
);

function toggleValue(values: string[], value: string) {
  if (values.includes(value)) {
    return values.filter(current => current !== value);
  }
  return [...values, value];
}

const isFallbackKioskPath = (fund: PettyCashFund, path?: string) => (
  Boolean(path && (
    path === `/petty-cash/kiosk/${fund.id}`
    || path.includes('/petty-cash/kiosk/fund-')
  ))
);

const getUsableKioskPath = (fund?: PettyCashFund) => {
  if (!fund) return '';
  if (fund.kioskPublicToken) return `/petty-cash/kiosk/${fund.kioskPublicToken}`;
  if (fund.kioskAccessUrl && !isFallbackKioskPath(fund, fund.kioskAccessUrl)) return fund.kioskAccessUrl;
  return '';
};

export function PettyCashFundsWorkspace({ funds, onFundsChange, onViewReceipts, statements }: PettyCashFundsWorkspaceProps) {
  const copy = usePettyCashTranslations();
  const defaultColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'fund', label: copy.funds.table.fund, visible: true, locked: true },
    { id: 'responsible', label: copy.funds.table.responsible, visible: true },
    { id: 'balance', label: copy.funds.table.balance, visible: true },
    { id: 'pending', label: copy.funds.table.pending, visible: true },
    { id: 'status', label: copy.funds.table.status, visible: true },
    { id: 'unit', label: copy.funds.table.unit, visible: false },
    { id: 'business', label: copy.funds.table.business, visible: false },
    { id: 'source', label: copy.funds.table.source, visible: false },
    { id: 'budget', label: copy.funds.table.budget, visible: false },
    { id: 'kiosk', label: copy.funds.table.kiosk, visible: false },
  ], [copy.funds.table]);
  const fixedColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'actions', label: copy.common.actions, visible: true, locked: true },
  ], [copy.common.actions]);
  const { columns, setColumns, visibleColumns } = usePettyCashColumns(pettyCashFundsColumnsStorageKey, defaultColumns);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { currentLanguage } = useLanguage();
  const currencyCopy = getOperationalKpiCurrencyCopy(currentLanguage.code);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<PettyCashFundStatus | 'all'>('all');
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [isCreateFundOpen, setIsCreateFundOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<PettyCashFund | null>(null);
  const [deletingFund, setDeletingFund] = useState<PettyCashFund | null>(null);
  const [deletingFundId, setDeletingFundId] = useState<string | null>(null);
  const [statusFundId, setStatusFundId] = useState<string | null>(null);
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(fallbackPaymentAccounts);
  const [budgetLines, setBudgetLines] = useState<FinanceBudgetLine[]>([]);
  const [serviceNotice, setServiceNotice] = useState('');
  const {
    businessOptions,
    currentUser,
    isLoadingReferenceData,
    unitOptions,
    userOptions,
  } = useFinanceReferenceData(setServiceNotice);
  const activePaymentAccounts = useMemo(() => paymentAccounts.filter(account => account.isActive), [paymentAccounts]);
  const activeBudgetLines = useMemo(() => (
    budgetLines.filter(line => line.status === 'ACTIVE')
  ), [budgetLines]);
  const fundUnitOptions = useMemo(() => (
    [...new Map(funds.map(fund => [fund.unitId, { id: fund.unitId, name: fund.unitName }])).values()]
      .filter(option => option.id)
      .sort((left, right) => left.name.localeCompare(right.name))
  ), [funds]);
  const fundBusinessOptions = useMemo(() => (
    [...new Map(
      funds
        .filter(fund => unitFilter === 'all' || fund.unitId === unitFilter)
        .map(fund => [fund.businessId, { id: fund.businessId, name: fund.businessName }]),
    ).values()]
      .filter(option => option.id)
      .sort((left, right) => left.name.localeCompare(right.name))
  ), [funds, unitFilter]);
  const scopedFunds = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return funds.filter((fund) => {
      const matchesSearch = !search
        || fund.name.toLowerCase().includes(search)
        || fund.responsibleName.toLowerCase().includes(search)
        || fund.createdByName.toLowerCase().includes(search)
        || fund.fundingSourceName.toLowerCase().includes(search)
        || fund.unitName.toLowerCase().includes(search)
        || fund.businessName.toLowerCase().includes(search);
      const matchesUnit = unitFilter === 'all' || fund.unitId === unitFilter;
      const matchesBusiness = businessFilter === 'all' || fund.businessId === businessFilter;
      return matchesSearch && matchesUnit && matchesBusiness;
    });
  }, [businessFilter, funds, searchTerm, unitFilter]);
  const filteredFunds = useMemo(() => scopedFunds.filter((fund) => (
    statusFilter === 'all' || fund.status === statusFilter
  )), [scopedFunds, statusFilter]);
  const aggregateIds = scopedFunds.map((fund) => fund.id);
  const balanceAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_BALANCE', preferredCurrency, ids: aggregateIds });
  const limitAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_LIMIT', preferredCurrency, ids: aggregateIds });
  const balanceLabel = balanceAggregate.data && !balanceAggregate.loading
    ? formatPettyCashCurrency(balanceAggregate.data.preferredTotal, preferredCurrency) : '—';
  const limitLabel = limitAggregate.data && !limitAggregate.loading
    ? formatPettyCashCurrency(limitAggregate.data.preferredTotal, preferredCurrency) : '—';
  const riskCount = scopedFunds.filter((fund) => fund.status === 'LOW_BALANCE' || fund.status === 'NEEDS_RECONCILIATION').length;
  const currencyCount = useMemo(
    () => new Set(scopedFunds.map(fund => fund.currencyCode)).size,
    [scopedFunds],
  );
  const nativeBalance = balanceAggregate.data?.nativeTotals
    .map(({ amount, currency }) => formatPettyCashCurrency(amount, currency as PettyCashCurrency)).join(' / ') || preferredCurrency;
  const fundSortAccessors = useMemo(() => ({
    balance: (fund: PettyCashFund) => fund.currentBalanceAmount,
    budget: (fund: PettyCashFund) => fund.limitAmount,
    business: (fund: PettyCashFund) => fund.businessName,
    fund: (fund: PettyCashFund) => fund.name,
    kiosk: (fund: PettyCashFund) => fund.kioskEnabled ? 1 : 0,
    pending: (fund: PettyCashFund) => statements
      .filter(statement => statement.pettyCashFundId === fund.id)
      .reduce((sum, statement) => sum + getStatementSettlementBalance(statement), 0),
    responsible: (fund: PettyCashFund) => fund.responsibleName,
    source: (fund: PettyCashFund) => fund.fundingSourceName,
    status: (fund: PettyCashFund) => fund.status,
    unit: (fund: PettyCashFund) => fund.unitName,
  }), [statements]);
  const fundSort = usePettyCashTableSort(filteredFunds, fundSortAccessors, 'fund');
  const fundsPaginationResetKey = useMemo(
    () => `${searchTerm}:${unitFilter}:${businessFilter}:${statusFilter}:${fundSort.sortKey}:${fundSort.sortDirection}:${filteredFunds.map(fund => fund.id).join('|')}`,
    [businessFilter, filteredFunds, fundSort.sortDirection, fundSort.sortKey, searchTerm, statusFilter, unitFilter],
  );
  const fundsPagination = useTablePagination({
    resetKey: fundsPaginationResetKey,
    rows: fundSort.sortedRows,
  });

  const handleCreateFund = async (draft: FundDraft) => {
    const name = draft.name.trim();
    const id = `fund-${toSlug(name) || Date.now()}`;
    const selectedBudgetLine = activeBudgetLines.find(line => line.id === draft.budgetLineId);
    const businessChoices = filterBusinessesByUnit(businessOptions, draft.unitId);
    const responsibleName = getOptionLabel(userOptions, draft.responsibleUserId, currentUser?.name ?? copy.funds.defaults.assigned);
    const createdByName = getOptionLabel(userOptions, draft.createdByUserId, currentUser?.name ?? copy.funds.defaults.assigned);
    const unitName = getOptionLabel(unitOptions, draft.unitId, copy.funds.defaults.unit);
    const businessName = getOptionLabel(businessChoices, draft.businessId, copy.funds.defaults.business);
    const isExternalFund = draft.fundType === 'EXTERNAL_MANAGED';
    const fundingAccountName = isExternalFund
      ? draft.fundingSourceName.trim()
      : getPaymentAccountName(activePaymentAccounts, draft.fundingSourcePaymentAccountId, copy.funds.defaults.financialAccount);
    const localFund: PettyCashFund = {
      id,
      budgetId: isExternalFund ? undefined : selectedBudgetLine?.budgetId,
      budgetLineId: isExternalFund ? undefined : selectedBudgetLine?.id,
      budgetLineName: isExternalFund ? undefined : selectedBudgetLine?.name,
      businessId: draft.businessId,
      businessName,
      companyId: 'company-1',
      createdByName,
      createdByUserId: draft.createdByUserId,
      currencyCode: draft.currencyCode,
      currentBalanceAmount: 0,
      cutOffDay: Number(draft.cutOffDay) || 30,
      fundingMethods: normalizePettyCashMethods(draft.fundingMethods),
      fundType: draft.fundType,
      fundingSourceName: fundingAccountName,
      fundingSourcePaymentAccountId: isExternalFund ? undefined : draft.fundingSourcePaymentAccountId,
      externalOwnerType: isExternalFund ? draft.externalOwnerType : undefined,
      externalOwnerName: isExternalFund ? draft.externalOwnerName.trim() : undefined,
      externalOwnerRelationship: isExternalFund ? draft.externalOwnerRelationship : undefined,
      externalOwnerReference: isExternalFund ? draft.externalOwnerReference.trim() || undefined : undefined,
      statementRecipientEmail: isExternalFund ? draft.statementRecipientEmail.trim() : undefined,
      managedAssetType: isExternalFund ? draft.managedAssetType || undefined : undefined,
      managedAssetName: isExternalFund ? draft.managedAssetName.trim() || undefined : undefined,
      managedAssetReference: isExternalFund ? draft.managedAssetReference.trim() || undefined : undefined,
      externalIdentityPending: false,
      budgetLinkPending: false,
      kioskAccessUrl: undefined,
      kioskEnabled: false,
      kioskPublicToken: undefined,
      kioskUsesUniversalPin: true,
      limitAmount: Number(draft.limitAmount) || 0,
      name,
      paymentAccountId: draft.paymentAccountId,
      responsibleName,
      responsibleUserId: draft.responsibleUserId,
      spendingMethods: normalizePettyCashMethods(draft.spendingMethods),
      status: 'OPEN',
      unitId: draft.unitId,
      unitName,
    };

    try {
      const savedFund = await pettyCashService.createFund(localFund);
      onFundsChange(currentFunds => ([{
        ...savedFund,
        budgetLineName: selectedBudgetLine?.name ?? savedFund.budgetLineName,
        businessName,
        createdByName,
        fundingSourceName: fundingAccountName,
        paymentAccountId: savedFund.paymentAccountId || draft.paymentAccountId,
        responsibleName,
        unitName,
      }, ...currentFunds]));
      setServiceNotice('');
    } catch (error) {
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.saveFailed));
      throw error;
    }
    setIsCreateFundOpen(false);
  };

  const handleUpdateFund = async (draft: FundDraft) => {
    if (!editingFund) return;
    const isExternalFund = draft.fundType === 'EXTERNAL_MANAGED';
    const selectedBudgetLine = activeBudgetLines.find(line => line.id === draft.budgetLineId);
    const businessChoices = filterBusinessesByUnit(businessOptions, draft.unitId);
    const updatedFund: PettyCashFund = {
      ...editingFund,
      budgetId: isExternalFund ? undefined : selectedBudgetLine?.budgetId,
      budgetLineId: isExternalFund ? undefined : selectedBudgetLine?.id,
      budgetLineName: isExternalFund ? undefined : selectedBudgetLine?.name,
      businessId: draft.businessId,
      businessName: getOptionLabel(businessChoices, draft.businessId, editingFund.businessName),
      createdByName: getOptionLabel(userOptions, draft.createdByUserId, editingFund.createdByName),
      createdByUserId: draft.createdByUserId,
      currencyCode: draft.currencyCode,
      cutOffDay: Number(draft.cutOffDay) || editingFund.cutOffDay,
      fundingMethods: normalizePettyCashMethods(draft.fundingMethods),
      fundType: draft.fundType,
      fundingSourceName: isExternalFund
        ? draft.fundingSourceName.trim()
        : getPaymentAccountName(activePaymentAccounts, draft.fundingSourcePaymentAccountId, draft.fundingSourceName),
      fundingSourcePaymentAccountId: isExternalFund ? undefined : draft.fundingSourcePaymentAccountId,
      externalOwnerType: isExternalFund ? draft.externalOwnerType : undefined,
      externalOwnerName: isExternalFund ? draft.externalOwnerName.trim() || undefined : undefined,
      externalOwnerRelationship: isExternalFund ? draft.externalOwnerRelationship : undefined,
      externalOwnerReference: isExternalFund ? draft.externalOwnerReference.trim() || undefined : undefined,
      statementRecipientEmail: isExternalFund ? draft.statementRecipientEmail.trim() || undefined : undefined,
      managedAssetType: isExternalFund ? draft.managedAssetType || undefined : undefined,
      managedAssetName: isExternalFund ? draft.managedAssetName.trim() || undefined : undefined,
      managedAssetReference: isExternalFund ? draft.managedAssetReference.trim() || undefined : undefined,
      externalIdentityPending: isExternalFund && (
        !draft.externalOwnerName.trim() || !draft.statementRecipientEmail.trim()
      ),
      budgetLinkPending: !isExternalFund && !selectedBudgetLine,
      limitAmount: Number(draft.limitAmount) || editingFund.limitAmount,
      name: draft.name.trim(),
      paymentAccountId: draft.paymentAccountId,
      responsibleName: getOptionLabel(userOptions, draft.responsibleUserId, editingFund.responsibleName),
      responsibleUserId: draft.responsibleUserId,
      spendingMethods: normalizePettyCashMethods(draft.spendingMethods),
      unitId: draft.unitId,
      unitName: getOptionLabel(unitOptions, draft.unitId, editingFund.unitName),
    };
    try {
      const saved = hasPettyCashBackendId(editingFund.id) ? await pettyCashService.updateFund(updatedFund) : updatedFund;
      onFundsChange(current => current.map(fund => fund.id === editingFund.id ? {
        ...updatedFund,
        ...saved,
        budgetLineName: updatedFund.budgetLineName,
        businessName: updatedFund.businessName,
        createdByName: updatedFund.createdByName,
        fundingSourceName: updatedFund.fundingSourceName,
        responsibleName: updatedFund.responsibleName,
        unitName: updatedFund.unitName,
      } : fund));
      setEditingFund(null);
      setServiceNotice('');
    } catch (error) {
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.updateFailed));
      throw error;
    }
  };

  const handleToggleFundStatus = async (fund: PettyCashFund) => {
    const nextStatus: PettyCashFundStatus = fund.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
    const updatedFund: PettyCashFund = {
      ...fund,
      kioskEnabled: nextStatus === 'CLOSED' ? false : fund.kioskEnabled,
      status: nextStatus,
    };

    setStatusFundId(fund.id);
    try {
      const saved = hasPettyCashBackendId(fund.id) ? await pettyCashService.updateFund(updatedFund) : updatedFund;
      onFundsChange(current => current.map(currentFund => currentFund.id === fund.id ? {
        ...updatedFund,
        ...saved,
        budgetLineName: updatedFund.budgetLineName,
        businessName: updatedFund.businessName,
        createdByName: updatedFund.createdByName,
        fundingSourceName: updatedFund.fundingSourceName,
        responsibleName: updatedFund.responsibleName,
        unitName: updatedFund.unitName,
      } : currentFund));
      setServiceNotice('');
    } catch (error) {
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.updateFailed));
    } finally {
      setStatusFundId(null);
    }
  };

  const handleDeleteFund = async () => {
    if (!deletingFund) return;
    setDeletingFundId(deletingFund.id);
    try {
      if (hasPettyCashBackendId(deletingFund.id)) await pettyCashService.deleteFund(deletingFund.id);
      onFundsChange(current => current.filter(fund => fund.id !== deletingFund.id));
      setDeletingFund(null);
      setServiceNotice('');
    } catch (error) {
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.deleteFailed));
    } finally {
      setDeletingFundId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      paymentAccountsService.getPaymentAccounts(),
      budgetLinesService.getBudgetLines(),
    ])
      .then(([paymentAccountsResult, budgetLinesResult]) => {
        if (cancelled) return;

        if (paymentAccountsResult.status === 'fulfilled' && paymentAccountsResult.value.length > 0) {
          setPaymentAccounts(paymentAccountsResult.value);
        } else {
          setPaymentAccounts(fallbackPaymentAccounts);
        }

        if (budgetLinesResult.status === 'fulfilled') {
          setBudgetLines(budgetLinesResult.value);
        }

        if (paymentAccountsResult.status === 'rejected' || budgetLinesResult.status === 'rejected') {
          setServiceNotice(copy.funds.notices.partialReferences);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveKiosk = async (fundId: string, values: KioskDraft) => {
    const currentFund = funds.find(fund => fund.id === fundId);
    if (!currentFund) return undefined;
    const businessChoices = filterBusinessesByUnit(businessOptions, values.unitId);
    const unitName = getOptionLabel(unitOptions, values.unitId, currentFund.unitName);
    const businessName = getOptionLabel(businessChoices, values.businessId, currentFund.businessName);

    const kioskAccessUrl = getUsableKioskPath(currentFund) || undefined;

    const updatedFund: PettyCashFund = {
      ...currentFund,
      businessId: values.businessId,
      businessName,
      kioskAccessUrl,
      kioskEnabled: values.kioskEnabled,
      kioskPin: undefined,
      kioskUsesUniversalPin: true,
      name: values.name.trim() || currentFund.name,
      unitId: values.unitId,
      unitName,
    };

    if (hasPettyCashBackendId(fundId)) {
      try {
        let savedFund = await pettyCashService.updateFund(updatedFund);
        if (values.kioskEnabled && !getUsableKioskPath(savedFund) && hasPettyCashBackendId(savedFund.id)) {
          savedFund = await pettyCashService.rotateFundKioskToken(savedFund.id);
        }
        const hydratedSavedFund = {
          ...savedFund,
          businessName,
          unitName,
        };
        onFundsChange(currentFunds => currentFunds.map(fund => (
          fund.id === fundId
            ? hydratedSavedFund
            : fund
        )));
        setServiceNotice('');
        return hydratedSavedFund;
      } catch (error) {
        setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.kioskSaveFailed));
        throw error;
      }
    }

    onFundsChange(currentFunds => currentFunds.map(fund => (fund.id === fundId ? updatedFund : fund)));
    setServiceNotice('');
    return updatedFund;
  };

  const handleRotateKioskToken = async (fundId: string) => {
    if (!hasPettyCashBackendId(fundId)) {
      setServiceNotice(copy.funds.notices.rotateNeedsBackend);
      return;
    }

    try {
      const savedFund = await pettyCashService.rotateFundKioskToken(fundId);
      const currentFund = funds.find(fund => fund.id === fundId);
      onFundsChange(currentFunds => currentFunds.map(fund => (
        fund.id === fundId
          ? {
            ...savedFund,
            businessName: currentFund?.businessName ?? savedFund.businessName,
            unitName: currentFund?.unitName ?? savedFund.unitName,
          }
          : fund
      )));
      setServiceNotice('');
    } catch (error) {
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.rotateFailed));
    }
  };

  const handleDeleteKiosk = async (fundId: string) => {
    const currentFund = funds.find(fund => fund.id === fundId);
    if (!currentFund) return;
    const updatedFund: PettyCashFund = {
      ...currentFund,
      kioskAccessUrl: undefined,
      kioskEnabled: false,
      kioskPin: undefined,
      kioskPublicToken: undefined,
      kioskUsesUniversalPin: true,
    };

    if (!hasPettyCashBackendId(fundId)) {
      onFundsChange(currentFunds => currentFunds.map(fund => (fund.id === fundId ? updatedFund : fund)));
      return;
    }

    try {
      const savedFund = await pettyCashService.deleteFundKiosk(fundId);
      onFundsChange(currentFunds => currentFunds.map(fund => (
        fund.id === fundId
          ? {
            ...savedFund,
            businessName: currentFund.businessName,
            unitName: currentFund.unitName,
          }
          : fund
      )));
      setServiceNotice('');
    } catch (error) {
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.kioskSaveFailed));
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <PettyCashHeaderBanner
        actionLabel={copy.funds.header.create}
        description={copy.funds.header.description}
        emoji="🗃️"
        onAction={() => setIsCreateFundOpen(true)}
        onColumns={() => setShowColumnsModal(true)}
        onSecondaryAction={() => setIsKioskOpen(true)}
        secondaryActionIcon={KeyRound}
        secondaryActionLabel={copy.funds.header.kiosk}
        title={copy.funds.header.title}
      />

      {serviceNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {serviceNotice}
        </div>
      ) : null}

      <PettyCashFilterShell
        activeAdvancedCount={Number(unitFilter !== 'all') + Number(businessFilter !== 'all')}
        advancedContent={(
          <>
            <PettyCashField label={copy.funds.table.unit}>
              <select
                className={pettyCashInputClass}
                onChange={(event) => {
                  setUnitFilter(event.target.value);
                  setBusinessFilter('all');
                }}
                value={unitFilter}
              >
                <option value="all">{copy.common.all}</option>
                {fundUnitOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </PettyCashField>
            <PettyCashField label={copy.funds.table.business}>
              <select
                className={pettyCashInputClass}
                onChange={(event) => setBusinessFilter(event.target.value)}
                value={businessFilter}
              >
                <option value="all">{copy.common.all}</option>
                {fundBusinessOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </PettyCashField>
          </>
        )}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== 'all' || unitFilter !== 'all' || businessFilter !== 'all')}
        onClear={() => {
          setSearchTerm('');
          setStatusFilter('all');
          setUnitFilter('all');
          setBusinessFilter('all');
        }}
        resultLabel={copy.funds.filters.result(filteredFunds.length)}
        subtitle={copy.funds.filters.subtitle}
      >
        <PettyCashField label={copy.funds.filters.search}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${pettyCashInputClass} pl-9`}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={copy.funds.filters.searchPlaceholder}
              value={searchTerm}
            />
          </div>
        </PettyCashField>
        <PettyCashField label={copy.funds.filters.status}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setStatusFilter(event.target.value as PettyCashFundStatus | 'all')}
            value={statusFilter}
          >
            <option value="all">{copy.common.all}</option>
            <option value="OPEN">{copy.status.fund.OPEN}</option>
            <option value="LOW_BALANCE">{copy.status.fund.LOW_BALANCE}</option>
            <option value="NEEDS_RECONCILIATION">{copy.status.fund.NEEDS_RECONCILIATION}</option>
            <option value="CLOSED">{copy.status.fund.CLOSED}</option>
          </select>
        </PettyCashField>
      </PettyCashFilterShell>

      <OperationalKpiArea
        alertChips={[
          { id: 'preferred-currency', icon: <Coins className="h-3.5 w-3.5" />, label: copy.common.preferredCurrency(preferredCurrency), tone: 'info' },
          ...(currencyCount > 1 ? [{ id: 'currency-count', icon: <Coins className="h-3.5 w-3.5" />, label: copy.common.currenciesRepresented(currencyCount), tone: 'info' as const }] : []),
          { id: 'native-balance', icon: <WalletCards className="h-3.5 w-3.5" />, label: copy.common.nativeBreakdown(nativeBalance), tone: 'neutral' },
        ]}
        distributionSegments={[
          { id: 'open', label: copy.status.fund.OPEN, count: scopedFunds.filter((fund) => fund.status === 'OPEN').length, className: 'bg-[#147514]', active: statusFilter === 'OPEN', onClick: () => setStatusFilter(current => current === 'OPEN' ? 'all' : 'OPEN') },
          { id: 'low', label: copy.status.fund.LOW_BALANCE, count: scopedFunds.filter((fund) => fund.status === 'LOW_BALANCE').length, className: 'bg-amber-400', active: statusFilter === 'LOW_BALANCE', onClick: () => setStatusFilter(current => current === 'LOW_BALANCE' ? 'all' : 'LOW_BALANCE') },
          { id: 'reconciliation', label: copy.status.fund.NEEDS_RECONCILIATION, count: scopedFunds.filter((fund) => fund.status === 'NEEDS_RECONCILIATION').length, className: 'bg-rose-500', active: statusFilter === 'NEEDS_RECONCILIATION', onClick: () => setStatusFilter(current => current === 'NEEDS_RECONCILIATION' ? 'all' : 'NEEDS_RECONCILIATION') },
          { id: 'closed', label: copy.status.fund.CLOSED, count: scopedFunds.filter((fund) => fund.status === 'CLOSED').length, className: 'bg-slate-400', active: statusFilter === 'CLOSED', onClick: () => setStatusFilter(current => current === 'CLOSED' ? 'all' : 'CLOSED') },
        ]}
        insight={copy.funds.insight(scopedFunds.length, riskCount, balanceLabel)}
        insightIcon={<Info className="h-4 w-4" />}
        metrics={[
          { id: 'assigned', icon: <WalletCards className="h-4 w-4" />, label: copy.funds.metrics.assignedAmount, value: limitLabel },
          { id: 'balance', icon: <Landmark className="h-4 w-4" />, label: copy.funds.metrics.currentBalance, value: balanceLabel, valueClassName: (balanceAggregate.data?.preferredTotal ?? 0) < 0 ? 'text-rose-600' : 'text-[#147514]' },
          { id: 'kiosks', icon: <ShieldCheck className="h-4 w-4" />, label: copy.funds.metrics.activeKiosks, value: scopedFunds.filter(fund => fund.kioskEnabled).length, valueClassName: 'text-sky-600' },
          { id: 'risk', icon: <UserRound className="h-4 w-4" />, label: copy.funds.metrics.riskFunds, value: riskCount, valueClassName: riskCount > 0 ? 'text-rose-600' : 'text-[#147514]' },
        ]}
        currencyContext={{
          preferredCurrency,
          nativeBreakdown: nativeBalance,
          rateLabel: balanceAggregate.data?.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : currencyCopy.unavailable,
          effectiveDate: balanceAggregate.data?.exchangeRate.effectiveDate,
          source: balanceAggregate.data?.exchangeRate.source,
          isPartial: Boolean(balanceAggregate.error || balanceAggregate.data?.partial),
          excludedCount: balanceAggregate.data?.excludedRecords ?? (balanceAggregate.error ? scopedFunds.length : 0),
          labels: currencyCopy,
        }}
      />

      <div className="space-y-3 md:hidden">
        {fundsPagination.paginatedRows.map((fund) => {
          const pendingSettlement = statements
            .filter(statement => statement.pettyCashFundId === fund.id)
            .reduce((sum, statement) => sum + getStatementSettlementBalance(statement), 0);
          const isFundActionBusy = statusFundId === fund.id || deletingFundId === fund.id;

          return (
            <article key={fund.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{fund.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{fund.responsibleName} · {fund.unitName}</p>
                </div>
                <PettyCashStatusPill kind="fund" status={fund.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{copy.funds.table.balance}</p>
                  <p className={`mt-1 text-base font-medium tabular-nums ${fund.currentBalanceAmount < 0 ? 'text-rose-600' : 'text-[#147514] dark:text-emerald-300'}`}>{formatPettyCashCurrency(fund.currentBalanceAmount, fund.currencyCode)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{copy.funds.table.pending}</p>
                  <p className="mt-1 text-base font-medium tabular-nums text-amber-600 dark:text-amber-300">{formatPettyCashCurrency(pendingSettlement, fund.currencyCode)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" disabled={isFundActionBusy} onClick={() => onViewReceipts(fund.id)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#147514]/25 bg-white px-3 text-sm font-medium text-[#147514] transition hover:bg-[#147514]/5 disabled:opacity-50 dark:border-emerald-400/25 dark:bg-slate-900 dark:text-emerald-300">
                  <Eye className="h-4 w-4" />
                  {copy.funds.table.viewDetail}
                </button>
                <button type="button" disabled={isFundActionBusy} onClick={() => setEditingFund(fund)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#147514]/30 hover:text-[#147514] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title={copy.funds.table.edit} aria-label={copy.funds.table.edit}>
                  <Pencil className="h-4 w-4" />
                </button>
                <FundActionsMenu
                  busy={isFundActionBusy}
                  deleteLabel={copy.funds.table.delete}
                  fund={fund}
                  label={copy.common.actions}
                  onDelete={() => setDeletingFund(fund)}
                  onToggle={() => void handleToggleFundStatus(fund)}
                />
              </div>
            </article>
          );
        })}
        {fundsPagination.paginatedRows.length === 0 ? <PettyCashEmptyState label={copy.funds.filters.result(0)} /> : null}
        <PettyCashPagination
          currentPage={fundsPagination.currentPage}
          itemLabel={copy.funds.table.itemLabel}
          onPageChange={fundsPagination.onPageChange}
          onPageSizeChange={fundsPagination.onPageSizeChange}
          pageEnd={fundsPagination.pageEnd}
          pageSize={fundsPagination.pageSize}
          pageSizeOptions={fundsPagination.pageSizeOptions}
          pageStart={fundsPagination.pageStart}
          totalCount={fundsPagination.totalCount}
          totalPages={fundsPagination.totalPages}
        />
      </div>

      <div className="hidden md:block">
      <PettyCashTableShell
        footer={(
          <PettyCashPagination
            currentPage={fundsPagination.currentPage}
            itemLabel={copy.funds.table.itemLabel}
            onPageChange={fundsPagination.onPageChange}
            onPageSizeChange={fundsPagination.onPageSizeChange}
            pageEnd={fundsPagination.pageEnd}
            pageSize={fundsPagination.pageSize}
            pageSizeOptions={fundsPagination.pageSizeOptions}
            pageStart={fundsPagination.pageStart}
            totalCount={fundsPagination.totalCount}
            totalPages={fundsPagination.totalPages}
          />
        )}
      >
        <table className={visibleColumns.length <= 5 ? 'w-full min-w-[820px]' : 'w-full min-w-[1120px]'}>
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              {visibleColumns.map(column => (
                <PettyCashSortableHeader key={column.id} columnKey={column.id as keyof typeof fundSortAccessors} label={column.label} onSort={fundSort.onSort} sortDirection={fundSort.sortDirection} sortKey={fundSort.sortKey} />
              ))}
              <PettyCashSortableHeader align="right" label={copy.common.actions} widthClass="w-[220px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {fundsPagination.paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-6 py-12 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  {copy.funds.filters.result(0)}
                </td>
              </tr>
            ) : null}
            {fundsPagination.paginatedRows.map((fund) => {
              const fundStatements = statements.filter(statement => statement.pettyCashFundId === fund.id);
              const pendingSettlement = fundStatements.reduce((sum, statement) => sum + getStatementSettlementBalance(statement), 0);
              const budgetLineName = fund.budgetLineName
                ?? activeBudgetLines.find(line => line.id === fund.budgetLineId)?.name
                ?? copy.funds.defaults.noBudget;
              const fundAccountName = getPaymentAccountName(activePaymentAccounts, fund.paymentAccountId, copy.funds.defaults.financialAccount);
              const isFundActionBusy = statusFundId === fund.id || deletingFundId === fund.id;

              return (
                <tr key={fund.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
                  {visibleColumns.map(column => {
                    if (column.id === 'fund') return <td key={column.id} className="px-5 py-4"><p className="font-medium text-slate-900 dark:text-white">{fund.name}</p><p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{fundAccountName}</p></td>;
                    if (column.id === 'unit') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund.unitName}</td>;
                    if (column.id === 'business') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund.businessName}</td>;
                    if (column.id === 'responsible') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund.responsibleName}</td>;
                    if (column.id === 'source') return <td key={column.id} className="px-5 py-4"><p className="text-sm font-medium text-slate-700 dark:text-slate-300">{fund.fundingSourceName}</p><p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{fund.fundingMethods.map(method => getPettyCashMethodLabel(copy.funds.methodLabels, method)).join(', ')}</p></td>;
                    if (column.id === 'budget') return <td key={column.id} className="px-5 py-4"><p className="text-sm font-medium text-slate-900 dark:text-white">{formatPettyCashCurrency(fund.limitAmount, fund.currencyCode)}</p><p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{budgetLineName}</p></td>;
                    if (column.id === 'balance') return <td key={column.id} className={`px-5 py-4 text-sm font-medium tabular-nums ${fund.currentBalanceAmount < 0 ? 'text-red-600 dark:text-red-300' : 'text-[#147514] dark:text-emerald-300'}`}>{formatPettyCashCurrency(fund.currentBalanceAmount, fund.currencyCode)}</td>;
                    if (column.id === 'pending') return <td key={column.id} className="px-5 py-4 text-sm font-medium tabular-nums text-amber-600 dark:text-amber-300">{formatPettyCashCurrency(pendingSettlement, fund.currencyCode)}</td>;
                    if (column.id === 'kiosk') return <td key={column.id} className="px-5 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${fund.kioskEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{fund.kioskEnabled ? copy.common.enabled : copy.common.disabled}</span></td>;
                    return <td key={column.id} className="px-5 py-4"><PettyCashStatusPill kind="fund" status={fund.status} /></td>;
                  })}
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        disabled={isFundActionBusy}
                        onClick={(event) => {
                          event.stopPropagation();
                          onViewReceipts(fund.id);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-[#147514] transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                        title={copy.funds.table.viewDetail}
                        aria-label={`${copy.funds.table.viewDetail}: ${fund.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isFundActionBusy}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingFund(fund);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
                        title={copy.funds.table.edit}
                        aria-label={`${copy.funds.table.edit}: ${fund.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <FundActionsMenu
                        busy={isFundActionBusy}
                        compact
                        deleteLabel={copy.funds.table.delete}
                        fund={fund}
                        label={copy.common.actions}
                        onDelete={() => setDeletingFund(fund)}
                        onToggle={() => void handleToggleFundStatus(fund)}
                        rotating={statusFundId === fund.id}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PettyCashTableShell>
      </div>

      <ColumnasConfigModal
        isOpen={showColumnsModal}
        columns={columns}
        defaultColumns={defaultColumns}
        fixedColumns={fixedColumns}
        theme="expenses"
        onClose={() => setShowColumnsModal(false)}
        onSave={(nextColumns) => setColumns(normalizePettyCashColumns(nextColumns, defaultColumns))}
      />

      {isCreateFundOpen ? (
        <CreateFundModal
          paymentAccounts={activePaymentAccounts}
          budgetLines={activeBudgetLines}
          businessOptions={businessOptions}
          currentUserId={currentUser?.id}
          isLoadingReferenceData={isLoadingReferenceData}
          onClose={() => setIsCreateFundOpen(false)}
          onSave={handleCreateFund}
          unitOptions={unitOptions}
          userOptions={userOptions}
        />
      ) : null}

      {editingFund ? (
        <CreateFundModal
          paymentAccounts={activePaymentAccounts}
          budgetLines={activeBudgetLines}
          businessOptions={businessOptions}
          currentUserId={currentUser?.id}
          initialFund={editingFund}
          isLoadingReferenceData={isLoadingReferenceData}
          onClose={() => setEditingFund(null)}
          onSave={handleUpdateFund}
          unitOptions={unitOptions}
          userOptions={userOptions}
        />
      ) : null}

      {isKioskOpen ? (
        <KioskModal
          funds={funds}
          businessOptions={businessOptions}
          onClose={() => setIsKioskOpen(false)}
          onDelete={handleDeleteKiosk}
          onRotate={handleRotateKioskToken}
          onSave={handleSaveKiosk}
          unitOptions={unitOptions}
        />
      ) : null}

      <ConfirmDeleteDialog
        isVisible={Boolean(deletingFund)}
        title={copy.funds.modal.deleteTitle}
        itemName={deletingFund?.name}
        description={copy.funds.modal.deleteDescription}
        confirmLabel={copy.funds.modal.deleteConfirm}
        cancelLabel={copy.common.cancel}
        confirmDisabled={Boolean(deletingFundId)}
        onCancel={() => setDeletingFund(null)}
        onConfirm={handleDeleteFund}
      />
    </div>
  );
}

function FundActionsMenu({
  busy,
  compact = false,
  deleteLabel,
  fund,
  label,
  onDelete,
  onToggle,
  rotating = false,
}: {
  busy: boolean;
  compact?: boolean;
  deleteLabel: string;
  fund: PettyCashFund;
  label: string;
  onDelete: () => void;
  onToggle: () => void;
  rotating?: boolean;
}) {
  const closeMenu = (target: HTMLElement) => target.closest('details')?.removeAttribute('open');

  return (
    <details className="group relative">
      <summary
        aria-disabled={busy}
        aria-label={label}
        className={`inline-flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#147514]/30 hover:text-[#147514] group-open:border-[#147514]/30 group-open:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 [&::-webkit-details-marker]:hidden ${compact ? 'h-9 w-9' : 'h-10 w-10'} ${busy ? 'pointer-events-none opacity-50' : ''}`}
        title={label}
      >
        {rotating ? <RotateCw className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </summary>
      <div className="absolute bottom-full right-0 z-30 mb-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={(event) => { closeMenu(event.currentTarget); onToggle(); }}>
          <Archive className="h-4 w-4" />
          {fund.status === 'CLOSED' ? 'Reactivar fondo' : 'Desactivar fondo'}
        </button>
        <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
        <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30" onClick={(event) => { closeMenu(event.currentTarget); onDelete(); }}>
          <Trash2 className="h-4 w-4" />
          {deleteLabel}
        </button>
      </div>
    </details>
  );
}

function CreateFundModal({
  budgetLines,
  businessOptions,
  currentUserId,
  isLoadingReferenceData,
  onClose,
  initialFund,
  onSave,
  paymentAccounts,
  unitOptions,
  userOptions,
}: {
  budgetLines: FinanceBudgetLine[];
  businessOptions: FinanceReferenceOption[];
  currentUserId?: string;
  isLoadingReferenceData: boolean;
  initialFund?: PettyCashFund;
  onClose: () => void;
  onSave: (draft: FundDraft) => void | Promise<void>;
  paymentAccounts: PaymentAccount[];
  unitOptions: FinanceReferenceOption[];
  userOptions: FinanceReferenceOption[];
}) {
  const copy = usePettyCashTranslations();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<FundDraft>(() => {
    if (initialFund) return createFundDraftFromFund(initialFund);
    if (paymentAccounts.length === 0 && unitOptions.length === 0 && userOptions.length === 0) {
      return createFallbackFundDraft(copy.funds.defaults.financialAccount);
    }
    return createEmptyFundDraft({
      businessOptions,
      budgetLines,
      currentUserId,
      financialAccountFallback: copy.funds.defaults.financialAccount,
      paymentAccounts,
      unitOptions,
      userOptions,
    });
  });
  useEffect(() => {
    if (initialFund) return;
    setDraft((current) => {
      const nextDefaults = createEmptyFundDraft({
        businessOptions,
        budgetLines,
        currentUserId,
        financialAccountFallback: copy.funds.defaults.financialAccount,
        paymentAccounts,
        unitOptions,
        userOptions,
      });
      const currentBusinesses = filterBusinessesByUnit(businessOptions, current.unitId || nextDefaults.unitId);
      const nextUnitId = current.unitId || nextDefaults.unitId;
      const nextBusinessId = current.businessId && currentBusinesses.some(option => option.value === current.businessId)
        ? current.businessId
        : nextDefaults.businessId;
      const nextBudgetLineId = current.budgetLineId || nextDefaults.budgetLineId;
      const nextBudgetLine = budgetLines.find(line => line.id === nextBudgetLineId);

      return {
        ...current,
        budgetLineId: nextBudgetLineId,
        businessId: nextBusinessId,
        createdByUserId: current.createdByUserId || nextDefaults.createdByUserId,
        currencyCode: current.currencyCode || nextDefaults.currencyCode,
        fundingSourcePaymentAccountId: current.fundType === 'EXTERNAL_MANAGED'
          ? ''
          : current.fundingSourcePaymentAccountId || nextDefaults.fundingSourcePaymentAccountId,
        limitAmount: current.limitAmount || (nextBudgetLine ? String(getBudgetLineLimit(nextBudgetLine)) : nextDefaults.limitAmount),
        paymentAccountId: current.paymentAccountId || nextDefaults.paymentAccountId,
        responsibleUserId: current.responsibleUserId || nextDefaults.responsibleUserId,
        unitId: nextUnitId,
      };
    });
  }, [budgetLines, businessOptions, currentUserId, initialFund, paymentAccounts, unitOptions, userOptions]);
  const selectedBudgetLine = budgetLines.find(line => line.id === draft.budgetLineId);
  const selectedBudgetLimit = getBudgetLineLimit(selectedBudgetLine);
  const filteredBusinessOptions = filterBusinessesByUnit(businessOptions, draft.unitId);
  const selectedFundAccount = paymentAccounts.find(account => account.id === draft.paymentAccountId);
  const selectedFundingSourceAccount = paymentAccounts.find(account => account.id === draft.fundingSourcePaymentAccountId);
  const fundingSourceOptions = getFundingSourceOptions(paymentAccounts, draft.paymentAccountId, draft.currencyCode);
  const hasDistinctFundingAccounts = draft.paymentAccountId.length > 0
    && draft.fundingSourcePaymentAccountId.length > 0
    && draft.paymentAccountId !== draft.fundingSourcePaymentAccountId;
  const fundAccountCurrencyMatches = accountMatchesCurrency(selectedFundAccount, draft.currencyCode);
  const fundingSourceCurrencyMatches = accountMatchesCurrency(selectedFundingSourceAccount, draft.currencyCode);
  const isExternalFund = draft.fundType === 'EXTERNAL_MANAGED';
  const preservesLegacyPendingIdentity = Boolean(
    initialFund?.externalIdentityPending && initialFund.fundType === draft.fundType,
  );
  const preservesLegacyMissingBudget = Boolean(
    initialFund?.budgetLinkPending
    && initialFund.fundType === 'INTERNAL_COMPANY'
    && initialFund.fundType === draft.fundType
    && !draft.budgetLineId,
  );
  const preservesLegacyMissingSourceAccount = Boolean(
    initialFund?.fundType === 'INTERNAL_COMPANY'
    && !initialFund.fundingSourcePaymentAccountId
    && initialFund.fundType === draft.fundType
    && !draft.fundingSourcePaymentAccountId,
  );
  const hasExternalFundingSource = isExternalFund && draft.fundingSourceName.trim().length > 0;
  const hasValidFundingSource = hasExternalFundingSource || (isExternalFund && preservesLegacyPendingIdentity) || (
    !isExternalFund && (
      (hasDistinctFundingAccounts && fundingSourceCurrencyMatches)
      || preservesLegacyMissingSourceAccount
    )
  );
  const budgetLineCurrencyMatches = isExternalFund || budgetLineMatchesCurrency(selectedBudgetLine, draft.currencyCode);
  const isLimitAboveBudget = Boolean(
    selectedBudgetLine
    && selectedBudgetLimit > 0
    && Number(draft.limitAmount) > selectedBudgetLimit,
  );
  const canCreate = draft.name.trim().length > 0
    && Number(draft.limitAmount) > 0
    && draft.paymentAccountId.length > 0
    && hasValidFundingSource
    && fundAccountCurrencyMatches
    && budgetLineCurrencyMatches
    && draft.responsibleUserId.length > 0
    && draft.unitId.length > 0
    && draft.businessId.length > 0
    && draft.fundingMethods.length > 0
    && draft.spendingMethods.length > 0;
  const hasRequiredAccountingLink = isExternalFund || Boolean(selectedBudgetLine) || preservesLegacyMissingBudget;
  const hasValidManagedAsset = !draft.managedAssetType || draft.managedAssetName.trim().length > 0;
  const recipientEmail = draft.statementRecipientEmail.trim();
  const hasValidRecipientEmail = !recipientEmail || /\S+@\S+\.\S+/.test(recipientEmail);
  const hasExternalIdentity = !isExternalFund || (
    hasValidManagedAsset
    && hasValidRecipientEmail
    && (preservesLegacyPendingIdentity || (
      draft.externalOwnerType.length > 0
      && draft.externalOwnerName.trim().length > 0
      && draft.externalOwnerRelationship.length > 0
      && recipientEmail.length > 0
    ))
  );
  const canSave = canCreate && hasRequiredAccountingLink && hasExternalIdentity;

  const handleSubmit = async () => {
    if (!canSave || isSaving) return;
    setError('');
    setIsSaving(true);
    try {
      await onSave(draft);
    } catch (saveError) {
      setError(toFinanceApiErrorMessage(saveError, initialFund ? copy.funds.notices.updateFailed : copy.funds.notices.saveFailed));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      busy={isSaving}
      contentClassName="sm:max-w-4xl"
      description={initialFund ? copy.funds.modal.editSubtitle : copy.funds.modal.subtitle}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" disabled={isSaving} onClick={onClose} className="min-h-11 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50">
            {copy.common.cancel}
          </button>
          <button
            type="button"
            disabled={!canSave || isSaving}
            onClick={handleSubmit}
            className="min-h-11 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-[#147514] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {initialFund ? copy.funds.modal.update : copy.funds.modal.submit}
          </button>
        </div>
      )}
      footerSummary={draft.name || (initialFund ? copy.funds.modal.editTitle : copy.funds.modal.title)}
      icon={<Banknote className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => !open && onClose()}
      open
      title={initialFund ? copy.funds.modal.editTitle : copy.funds.modal.title}
      tone="green"
    >
      <div className="space-y-4">
        {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
        {preservesLegacyPendingIdentity ? (
          <IndiceModalValidation messages={[copy.funds.modal.legacyIdentityPending]} tone="warning" />
        ) : null}
        {preservesLegacyMissingBudget ? (
          <IndiceModalValidation messages={[copy.funds.modal.legacyBudgetPending]} tone="warning" />
        ) : null}
        {preservesLegacyMissingSourceAccount ? (
          <IndiceModalValidation messages={[copy.funds.modal.legacySourcePending]} tone="warning" />
        ) : null}
        <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.typeTitle}</h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.funds.modal.typeDescription}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {([
              ['INTERNAL_COMPANY', copy.funds.modal.internalFund, copy.funds.modal.internalFundDescription, Landmark],
              ['EXTERNAL_MANAGED', copy.funds.modal.externalFund, copy.funds.modal.externalFundDescription, ShieldCheck],
            ] as const).map(([value, label, description, Icon]) => {
              const selected = draft.fundType === value;
              return (
                <button
                  aria-pressed={selected}
                  className={`rounded-lg border p-4 text-left transition ${selected ? 'border-[#147514] bg-white ring-2 ring-[#147514]/15 dark:bg-slate-900' : 'border-slate-200 bg-white/70 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900/70'}`}
                  disabled={Boolean(initialFund)}
                  key={value}
                  onClick={() => setDraft(current => ({
                    ...current,
                    budgetLineId: value === 'EXTERNAL_MANAGED' ? '' : current.budgetLineId || budgetLines[0]?.id || '',
                    fundType: value,
                    fundingMethods: value === 'EXTERNAL_MANAGED'
                      ? current.fundingMethods.filter(method => method !== PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER).length > 0
                        ? current.fundingMethods.filter(method => method !== PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER)
                        : [PETTY_CASH_METHOD_KEYS.TRANSFER]
                      : current.fundingMethods.includes(PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER)
                        ? current.fundingMethods
                        : [PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER, ...current.fundingMethods],
                    fundingSourcePaymentAccountId: value === 'EXTERNAL_MANAGED'
                      ? ''
                      : current.fundingSourcePaymentAccountId || fundingSourceOptions[0]?.id || '',
                  }))}
                  type="button"
                >
                  <span className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-[#147514] text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><Icon className="h-5 w-5" /></span><span className="font-medium text-slate-900 dark:text-white">{label}</span></span>
                  <span className="mt-3 block text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</span>
                </button>
              );
            })}
          </div>
          {initialFund ? <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.funds.modal.typeLocked}</p> : null}
        </section>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.dataTitle}</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <PettyCashField label={copy.funds.modal.name}>
                <input
                  className={pettyCashInputClass}
                  onChange={(event) => setDraft(current => ({ ...current, name: event.target.value }))}
                  placeholder={copy.funds.modal.namePlaceholder}
                  value={draft.name}
                />
              </PettyCashField>
              {!isExternalFund ? <PettyCashField label={copy.funds.modal.budgetLine}>
                <select
                  className={pettyCashInputClass}
                  onChange={(event) => {
                    const line = budgetLines.find(item => item.id === event.target.value);
                    setDraft(current => ({
                      ...current,
                      budgetLineId: event.target.value,
                      currencyCode: toPettyCashCurrency(line?.currencyCode ?? current.currencyCode),
                      limitAmount: line ? String(getBudgetLineLimit(line)) : current.limitAmount,
                    }));
                  }}
                  value={draft.budgetLineId}
                >
                  <option value="">{copy.funds.defaults.noBudget}</option>
                  {budgetLines.map(line => (
                    <option key={line.id} value={line.id}>{getBudgetLineLabel(line, copy.funds.defaults.budgetLine, copy.funds.budgetLineOption)}</option>
                  ))}
                </select>
              </PettyCashField> : null}
              <PettyCashField label={copy.funds.modal.currency}>
                <select
                  className={pettyCashInputClass}
                  disabled={Boolean(initialFund)}
                  onChange={(event) => setDraft(current => ({ ...current, currencyCode: event.target.value as PettyCashCurrency }))}
                  value={draft.currencyCode}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="COP">COP</option>
                  <option value="BRL">BRL</option>
                </select>
              </PettyCashField>
              <PettyCashField label={copy.funds.modal.limit}>
                <input
                  className={pettyCashInputClass}
                  min="0"
                  onChange={(event) => setDraft(current => ({ ...current, limitAmount: event.target.value }))}
                  placeholder="0.00"
                  type="number"
                  value={draft.limitAmount}
                />
                {!isExternalFund && selectedBudgetLine ? (
                  <p className={`mt-2 text-xs font-medium ${isLimitAboveBudget ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {copy.funds.modal.budgetAvailable(getBudgetLineDisplayName(selectedBudgetLine, copy.funds.defaults.budgetLine), formatPettyCashCurrency(selectedBudgetLimit, toPettyCashCurrency(selectedBudgetLine.currencyCode)))} {isLimitAboveBudget ? copy.funds.modal.budgetExceededHint : copy.funds.modal.budgetNormalHint}
                  </p>
                ) : !isExternalFund ? (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {copy.funds.modal.budgetMissingHint}
                  </p>
                ) : <p className="mt-2 text-xs font-medium text-[#147514] dark:text-emerald-300">{copy.funds.modal.externalAccountingNote}</p>}
              </PettyCashField>
              <PettyCashField label={copy.funds.modal.cutOffDay}>
                <input
                  className={pettyCashInputClass}
                  max="31"
                  min="1"
                  onChange={(event) => setDraft(current => ({ ...current, cutOffDay: event.target.value }))}
                  type="number"
                  value={draft.cutOffDay}
                />
              </PettyCashField>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.responsibilityTitle}</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <PettyCashField label={copy.funds.modal.responsible}>
                <select
                  className={pettyCashInputClass}
                  disabled={isLoadingReferenceData && userOptions.length === 0}
                  onChange={(event) => setDraft(current => ({ ...current, responsibleUserId: event.target.value }))}
                  value={draft.responsibleUserId}
                >
                  {userOptions.length === 0 ? <option value="">{copy.funds.modal.noUsers}</option> : null}
                  {userOptions.map(user => (
                    <option key={user.value} value={user.value}>{user.label}</option>
                  ))}
                </select>
              </PettyCashField>
              <PettyCashField label={copy.funds.modal.unit}>
                <select
                  className={pettyCashInputClass}
                  disabled={isLoadingReferenceData && unitOptions.length === 0}
                  onChange={(event) => {
                    const nextUnitId = event.target.value;
                    const nextBusinesses = filterBusinessesByUnit(businessOptions, nextUnitId);
                    setDraft(current => ({
                      ...current,
                      businessId: nextBusinesses.some(option => option.value === current.businessId)
                        ? current.businessId
                        : firstOptionValue(nextBusinesses),
                      unitId: nextUnitId,
                    }));
                  }}
                  value={draft.unitId}
                >
                  {unitOptions.length === 0 ? <option value="">{copy.funds.modal.noUnits}</option> : null}
                  {unitOptions.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </PettyCashField>
              <PettyCashField label={copy.funds.modal.business}>
                <select
                  className={pettyCashInputClass}
                  disabled={isLoadingReferenceData && filteredBusinessOptions.length === 0}
                  onChange={(event) => setDraft(current => ({ ...current, businessId: event.target.value }))}
                  value={draft.businessId}
                >
                  {filteredBusinessOptions.length === 0 ? <option value="">{copy.funds.modal.noBusinesses}</option> : null}
                  {filteredBusinessOptions.map(business => (
                    <option key={business.value} value={business.value}>{business.label}</option>
                  ))}
                </select>
              </PettyCashField>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.fundingTitle}</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <PettyCashField label={copy.funds.modal.fundAccount}>
                <select
                  className={pettyCashInputClass}
                  onChange={(event) => {
                    const account = paymentAccounts.find(item => item.id === event.target.value);
                    const nextCurrency = toPettyCashCurrency(account?.currency ?? draft.currencyCode);
                    const nextBudgetLine = budgetLineMatchesCurrency(selectedBudgetLine, nextCurrency)
                      ? selectedBudgetLine
                      : getBudgetLineForCurrency(budgetLines, nextCurrency);
                    const nextFundingSource = getFundingSourceOptions(paymentAccounts, event.target.value, nextCurrency)[0];
                    setDraft(current => ({
                      ...current,
                      budgetLineId: current.fundType === 'EXTERNAL_MANAGED' ? '' : nextBudgetLine?.id ?? '',
                      currencyCode: nextCurrency,
                      fundingSourcePaymentAccountId: current.fundType === 'EXTERNAL_MANAGED'
                        ? ''
                        : nextFundingSource?.id ?? '',
                      limitAmount: nextBudgetLine ? String(getBudgetLineLimit(nextBudgetLine)) : current.limitAmount,
                      paymentAccountId: event.target.value,
                    }));
                  }}
                  value={draft.paymentAccountId}
                >
                  {paymentAccounts.length === 0 ? <option value="">{copy.funds.modal.noAccounts}</option> : null}
                  {paymentAccounts.map(account => (
                    <option key={account.id} value={account.id}>{getPaymentAccountLabel(account)}</option>
                  ))}
                </select>
                {!fundAccountCurrencyMatches ? (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{copy.funds.modal.fundAccountCurrencyWarning}</p>
                ) : null}
              </PettyCashField>
              {!isExternalFund ? (
                <PettyCashField label={copy.funds.modal.sourceAccount}>
                  <select
                    className={pettyCashInputClass}
                    onChange={(event) => {
                      const account = paymentAccounts.find(item => item.id === event.target.value);
                      setDraft(current => ({
                        ...current,
                        fundingSourceName: account?.name ?? current.fundingSourceName,
                        fundingSourcePaymentAccountId: event.target.value,
                      }));
                    }}
                    value={draft.fundingSourcePaymentAccountId}
                  >
                    {fundingSourceOptions.length === 0 ? <option value="">{copy.funds.modal.noCompatibleAccounts}</option> : null}
                    {fundingSourceOptions.map(account => (
                      <option key={account.id} value={account.id}>{getPaymentAccountLabel(account)}</option>
                    ))}
                  </select>
                  {!hasDistinctFundingAccounts || !fundingSourceCurrencyMatches ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{copy.funds.modal.sourceAccountWarning}</p>
                  ) : null}
                </PettyCashField>
              ) : (
                <PettyCashField label={copy.funds.modal.externalSourceName}>
                  <input
                    className={pettyCashInputClass}
                    maxLength={180}
                    onChange={(event) => setDraft(current => ({ ...current, fundingSourceName: event.target.value }))}
                    placeholder={copy.funds.modal.externalSourcePlaceholder}
                    value={draft.fundingSourceName}
                  />
                </PettyCashField>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.funds.modal.fundingMethods}</p>
                <div className="mt-2 grid gap-2">
                  {pettyCashFundingMethodOptions.map(method => (
                    <label key={method} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      <input
                        checked={draft.fundingMethods.includes(method)}
                        onChange={() => setDraft(current => ({ ...current, fundingMethods: toggleValue(current.fundingMethods, method) }))}
                        type="checkbox"
                      />
                      {getPettyCashMethodLabel(copy.funds.methodLabels, method)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.funds.modal.spendingMethods}</p>
                <div className="mt-2 grid gap-2">
                  {pettyCashSpendingMethodOptions.map(method => (
                    <label key={method} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      <input
                        checked={draft.spendingMethods.includes(method)}
                        onChange={() => setDraft(current => ({ ...current, spendingMethods: toggleValue(current.spendingMethods, method) }))}
                        type="checkbox"
                      />
                      {getPettyCashMethodLabel(copy.funds.methodLabels, method)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {!isExternalFund ? <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">{copy.funds.modal.internalAccountingNote}</p> : null}
          </section>
          {isExternalFund ? (
            <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900 dark:bg-blue-950/25">
              <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.externalIdentityTitle}</h4>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.funds.modal.externalIdentityDescription}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <PettyCashField label={copy.funds.modal.ownerType}>
                  <select className={pettyCashInputClass} onChange={(event) => setDraft(current => ({ ...current, externalOwnerType: event.target.value }))} value={draft.externalOwnerType}>
                    <option value="COMPANY">{copy.funds.modal.ownerCompany}</option><option value="PERSON">{copy.funds.modal.ownerPerson}</option><option value="TRUST">{copy.funds.modal.ownerTrust}</option><option value="OTHER">{copy.funds.modal.ownerOther}</option>
                  </select>
                </PettyCashField>
                <PettyCashField label={copy.funds.modal.ownerRelationship}>
                  <select className={pettyCashInputClass} onChange={(event) => setDraft(current => ({ ...current, externalOwnerRelationship: event.target.value }))} value={draft.externalOwnerRelationship}>
                    <option value="CLIENT">{copy.funds.modal.relationshipClient}</option><option value="OWNER">{copy.funds.modal.relationshipOwner}</option><option value="PARTNER">{copy.funds.modal.relationshipPartner}</option><option value="BENEFICIARY">{copy.funds.modal.relationshipBeneficiary}</option><option value="OTHER">{copy.funds.modal.relationshipOther}</option>
                  </select>
                </PettyCashField>
                <PettyCashField label={copy.funds.modal.ownerName}>
                  <input className={pettyCashInputClass} maxLength={180} onChange={(event) => setDraft(current => ({ ...current, externalOwnerName: event.target.value }))} placeholder={copy.funds.modal.ownerNamePlaceholder} value={draft.externalOwnerName} />
                </PettyCashField>
                <PettyCashField label={copy.funds.modal.recipientEmail}>
                  <input className={pettyCashInputClass} maxLength={254} onChange={(event) => setDraft(current => ({ ...current, statementRecipientEmail: event.target.value }))} placeholder="cliente@empresa.com" type="email" value={draft.statementRecipientEmail} />
                </PettyCashField>
                <PettyCashField label={copy.funds.modal.ownerReference}>
                  <input className={pettyCashInputClass} maxLength={120} onChange={(event) => setDraft(current => ({ ...current, externalOwnerReference: event.target.value }))} placeholder={copy.funds.modal.ownerReferencePlaceholder} value={draft.externalOwnerReference} />
                </PettyCashField>
                <div className="md:col-span-2"><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{copy.funds.modal.managedAssetTitle}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.funds.modal.managedAssetDescription}</p></div>
                <PettyCashField label={copy.funds.modal.assetType}>
                  <select className={pettyCashInputClass} onChange={(event) => setDraft(current => ({ ...current, managedAssetType: event.target.value, managedAssetName: event.target.value ? current.managedAssetName : '', managedAssetReference: event.target.value ? current.managedAssetReference : '' }))} value={draft.managedAssetType}>
                    <option value="">{copy.common.notAvailable}</option><option value="REAL_ESTATE">{copy.funds.modal.assetRealEstate}</option><option value="VEHICLE">{copy.funds.modal.assetVehicle}</option><option value="VESSEL">{copy.funds.modal.assetVessel}</option><option value="MACHINERY">{copy.funds.modal.assetMachinery}</option><option value="INVESTMENT_ACCOUNT">{copy.funds.modal.assetInvestment}</option><option value="CURRENCY">{copy.funds.modal.assetCurrency}</option><option value="SECURITIES">{copy.funds.modal.assetSecurities}</option><option value="OTHER">{copy.funds.modal.assetOther}</option>
                  </select>
                </PettyCashField>
                <PettyCashField label={copy.funds.modal.assetName}>
                  <input className={pettyCashInputClass} disabled={!draft.managedAssetType} maxLength={180} onChange={(event) => setDraft(current => ({ ...current, managedAssetName: event.target.value }))} placeholder={copy.funds.modal.assetNamePlaceholder} value={draft.managedAssetName} />
                </PettyCashField>
                <PettyCashField label={copy.funds.modal.assetReference}>
                  <input className={pettyCashInputClass} disabled={!draft.managedAssetType} maxLength={120} onChange={(event) => setDraft(current => ({ ...current, managedAssetReference: event.target.value }))} placeholder={copy.funds.modal.assetReferencePlaceholder} value={draft.managedAssetReference} />
                </PettyCashField>
              </div>
            </section>
          ) : null}
      </div>
    </IndiceModalFrame>
  );
}

function KioskModal({
  businessOptions,
  funds,
  onClose,
  onDelete,
  onRotate,
  onSave,
  unitOptions,
}: {
  businessOptions: FinanceReferenceOption[];
  funds: PettyCashFund[];
  onClose: () => void;
  onDelete: (fundId: string) => Promise<void> | void;
  onRotate: (fundId: string) => Promise<void>;
  onSave: (fundId: string, values: KioskDraft) => PettyCashFund | undefined | void | Promise<PettyCashFund | undefined | void>;
  unitOptions: FinanceReferenceOption[];
}) {
  const copy = usePettyCashTranslations();
  const buildDraft = (fund?: PettyCashFund): KioskDraft => ({
    businessId: fund?.businessId ?? '',
    kioskEnabled: fund?.kioskEnabled ?? true,
    name: fund?.name ?? '',
    unitId: fund?.unitId ?? '',
  });
  const [selectedFundId, setSelectedFundId] = useState('');
  const [editorFundId, setEditorFundId] = useState('');
  const selectedFund = funds.find(fund => fund.id === selectedFundId);
  const [draft, setDraft] = useState<KioskDraft>(() => buildDraft());
  const [operationError, setOperationError] = useState('');
  const [copiedFundId, setCopiedFundId] = useState('');
  const [deletingKioskId, setDeletingKioskId] = useState('');
  const [pendingDeleteKioskId, setPendingDeleteKioskId] = useState('');
  const [rotatingFundId, setRotatingFundId] = useState('');
  const [shareFundId, setShareFundId] = useState('');
  const [optionsFundId, setOptionsFundId] = useState('');
  const [qrFundId, setQrFundId] = useState('');
  const activeKiosks = funds.filter(fund => fund.kioskEnabled).length;
  const nextFundToConfigure = funds.find(fund => !fund.kioskEnabled) ?? funds[0];
  const unitChoices = useMemo(() => {
    if (!selectedFund || unitOptions.some(option => option.value === selectedFund.unitId)) {
      return unitOptions;
    }
    return [{ label: selectedFund.unitName, value: selectedFund.unitId }, ...unitOptions];
  }, [selectedFund, unitOptions]);
  const businessChoices = useMemo(() => {
    const filtered = filterBusinessesByUnit(businessOptions, draft.unitId);
    if (!selectedFund || filtered.some(option => option.value === selectedFund.businessId)) {
      return filtered;
    }
    return [{ label: selectedFund.businessName, unitId: selectedFund.unitId, value: selectedFund.businessId }, ...filtered];
  }, [businessOptions, draft.unitId, selectedFund]);

  const getKioskPath = (fund?: PettyCashFund) => getUsableKioskPath(fund);
  const getKioskUrl = (fund?: PettyCashFund) => {
    const path = getKioskPath(fund);
    return path ? (path.startsWith('http') ? path : `${window.location.origin}${path}`) : '';
  };
  const shareFund = funds.find(fund => fund.id === shareFundId);
  const optionsFund = funds.find(fund => fund.id === optionsFundId);
  const qrFund = funds.find(fund => fund.id === qrFundId);
  const qrDataUrl = useKioskQrCode(getKioskUrl(qrFund), '#147514');
  const hasChildView = Boolean(shareFund || optionsFund || qrFund || pendingDeleteKioskId);

  const openEditor = (fundId: string) => {
    const nextFund = funds.find(fund => fund.id === fundId);
    setSelectedFundId(fundId);
    setEditorFundId(fundId);
    setDraft(buildDraft(nextFund));
    setCopiedFundId('');
    setOperationError('');
    setRotatingFundId('');
    setShareFundId('');
    setOptionsFundId('');
    setQrFundId('');
  };
  const closeEditor = () => {
    setEditorFundId('');
    setSelectedFundId('');
    setDraft(buildDraft());
  };

  const canSave = selectedFundId.length > 0
    && draft.name.trim().length > 0
    && draft.unitId.length > 0
    && draft.businessId.length > 0;

  const handleCopyLink = async (fund: PettyCashFund) => {
    const fundKioskUrl = getKioskUrl(fund);
    if (!fundKioskUrl) return;
    await navigator.clipboard.writeText(fundKioskUrl);
    setCopiedFundId(fund.id);
    window.setTimeout(() => setCopiedFundId(''), 1800);
  };
  const handleOpenOrActivateLink = async (fund: PettyCashFund) => {
    const currentUrl = getKioskUrl(fund);
    if (fund.kioskEnabled && currentUrl) {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!hasPettyCashBackendId(fund.id)) return;
    const pendingWindow = window.open('', '_blank', 'noopener,noreferrer');
    setRotatingFundId(fund.id);
    setOperationError('');
    try {
      const savedFund = await Promise.resolve(onSave(fund.id, {
        businessId: fund.businessId,
        kioskEnabled: true,
        name: fund.name,
        unitId: fund.unitId,
      }));
      const savedUrl = getKioskUrl(savedFund as PettyCashFund | undefined);
      if (savedUrl) {
        if (pendingWindow) {
          pendingWindow.location.href = savedUrl;
        } else {
          window.open(savedUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        pendingWindow?.close();
      }
    } catch (error) {
      pendingWindow?.close();
      setOperationError(toFinanceApiErrorMessage(error, copy.funds.notices.kioskSaveFailed));
    } finally {
      setRotatingFundId('');
    }
  };
  const handleRotateLink = async (fundId = selectedFundId) => {
    if (!fundId || !hasPettyCashBackendId(fundId)) return;
    setRotatingFundId(fundId);
    setCopiedFundId('');
    try {
      await onRotate(fundId);
    } finally {
      setRotatingFundId('');
    }
  };
  const handleDeleteKioskAccess = async () => {
    if (!pendingDeleteKioskId) return;
    setDeletingKioskId(pendingDeleteKioskId);
    setOperationError('');
    try {
      await Promise.resolve(onDelete(pendingDeleteKioskId));
      setPendingDeleteKioskId('');
    } catch (error) {
      setOperationError(toFinanceApiErrorMessage(error, copy.funds.notices.kioskSaveFailed));
    } finally {
      setDeletingKioskId('');
    }
  };
  const handleSaveEditor = async () => {
    if (!canSave) return;
    setOperationError('');
    try {
      const saved = await Promise.resolve(onSave(selectedFundId, { ...draft, kioskEnabled: true }));
      if (saved) closeEditor();
    } catch (error) {
      setOperationError(toFinanceApiErrorMessage(error, copy.funds.notices.kioskSaveFailed));
    }
  };

  return (
    <>
      <KioskModalFrame
        busy={Boolean(deletingKioskId || rotatingFundId)}
        description={editorFundId ? 'Configura el portal móvil del fondo seleccionado.' : 'Administra portales móviles para ingresar dinero y subir comprobantes por fondo.'}
        footer={editorFundId ? (
          <>
            <button type="button" onClick={closeEditor} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">{copy.common.cancel}</button>
            <button type="button" disabled={!canSave} onClick={() => void handleSaveEditor()} className="h-10 rounded-xl bg-[#147514] px-5 text-sm font-medium text-white transition hover:bg-[#105F10] disabled:cursor-not-allowed disabled:opacity-50">{copy.funds.kiosk.save}</button>
          </>
        ) : (
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">{copy.common.cancel}</button>
        )}
        footerSummary={editorFundId ? (selectedFund?.name ?? 'Kiosco') : `${activeKiosks} activos de ${funds.length}`}
        icon={<KeyRound className="h-5 w-5" />}
        onOpenChange={(open) => {
          if (open) return;
          if (editorFundId) closeEditor();
          else onClose();
        }}
        open={!hasChildView}
        size={editorFundId ? 'form' : 'workspace'}
        surface="administration"
        title={editorFundId ? (selectedFund?.kioskEnabled ? 'Editar kiosco' : 'Crear acceso de kiosco') : 'Kioscos de fondos'}
        tone="green"
      >
        {operationError ? <IndiceModalValidation className="mb-4" messages={[operationError]} tone="error" /> : null}
        {editorFundId ? (
          <>
            <div>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="grid gap-4">
                  <PettyCashField label={copy.funds.kiosk.assignedFund}>
                    <select className={pettyCashInputClass} onChange={(event) => openEditor(event.target.value)} value={selectedFundId}>
                      {funds.map(fund => (
                        <option key={fund.id} value={fund.id}>{fund.name} - {fund.responsibleName}</option>
                      ))}
                    </select>
                  </PettyCashField>
                  <PettyCashField label={copy.funds.kiosk.boxName}>
                    <input className={pettyCashInputClass} onChange={(event) => setDraft(current => ({ ...current, name: event.target.value }))} value={draft.name} />
                  </PettyCashField>
                  <div className="grid gap-4 md:grid-cols-2">
                    <PettyCashField label={copy.funds.kiosk.assignedUnit}>
                      <select
                        className={pettyCashInputClass}
                        onChange={(event) => {
                          const nextUnitId = event.target.value;
                          const nextBusinesses = filterBusinessesByUnit(businessOptions, nextUnitId);
                          setDraft(current => ({
                            ...current,
                            businessId: nextBusinesses.some(option => option.value === current.businessId) ? current.businessId : firstOptionValue(nextBusinesses),
                            unitId: nextUnitId,
                          }));
                        }}
                        value={draft.unitId}
                      >
                        {unitChoices.length === 0 ? <option value="">{copy.funds.modal.noUnits}</option> : null}
                        {unitChoices.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                      </select>
                    </PettyCashField>
                    <PettyCashField label={copy.funds.kiosk.assignedBusiness}>
                      <select className={pettyCashInputClass} onChange={(event) => setDraft(current => ({ ...current, businessId: event.target.value }))} value={draft.businessId}>
                        {businessChoices.length === 0 ? <option value="">{copy.funds.modal.noBusinesses}</option> : null}
                        {businessChoices.map(business => <option key={business.value} value={business.value}>{business.label}</option>)}
                      </select>
                    </PettyCashField>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{copy.funds.kiosk.universalPinTitle}</p>
                    <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {copy.funds.kiosk.universalPinDescription(selectedFund?.responsibleName ?? copy.funds.modal.responsible)}
                    </p>
                  </div>
                </div>
              </section>
            </div>

          </>
        ) : (
          <>
        <div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Accesos configurados</p>
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{activeKiosks} activos de {funds.length}</p>
              </div>
              <button
                type="button"
                disabled={!nextFundToConfigure}
                onClick={() => nextFundToConfigure ? openEditor(nextFundToConfigure.id) : undefined}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#147514] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#0f5f10] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-lg leading-none">+</span>
                Nuevo acceso
              </button>
            </div>
          </section>

          <div className="mt-4">
            <IndiceModalSummary
              columns={3}
              items={[
                { label: 'Total de fondos', value: funds.length, emphasized: true },
                { label: 'Kioskos activos', value: activeKiosks },
                { label: 'Ligas listas', value: funds.filter(fund => Boolean(getKioskUrl(fund))).length },
              ]}
            />
          </div>

          <div className="mt-4 space-y-3">
            {funds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Crea un fondo para habilitar su kiosko móvil.
              </div>
            ) : null}
            {funds.map(fund => {
              const fundKioskUrl = getKioskUrl(fund);
              const canOpenFundKiosk = Boolean(fundKioskUrl && fund.kioskEnabled);
              const canActivateAndOpen = !canOpenFundKiosk && hasPettyCashBackendId(fund.id);
              const openButtonLabel = canOpenFundKiosk ? 'Abrir' : (canActivateAndOpen ? 'Activar y abrir' : 'Guarda primero');
              const fundBusinessChoices = filterBusinessesByUnit(businessOptions, fund.unitId);
              const fundBusinessLabel = getOptionLabel(fundBusinessChoices, fund.businessId, fund.businessName);
              const fundUnitLabel = getOptionLabel(unitOptions, fund.unitId, fund.unitName);

              return (
                <article key={fund.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="p-5">
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#147514] dark:bg-emerald-500/10">
                          <WalletCards className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-lg font-medium text-slate-950 dark:text-white">{fund.name}</h4>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${fund.kioskEnabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {fund.kioskEnabled ? 'Activo' : 'Apagado'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Portal móvil de caja chica</p>
                        </div>
                      </div>

                      <div className="grid shrink-0 grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:justify-end" aria-label={`Acciones de ${fund.name}`}>
                        <KioskAdminActionButton accent="green" label="Editar kiosko" onClick={() => openEditor(fund.id)} tone="primary">
                          <Pencil className="h-4 w-4" />
                        </KioskAdminActionButton>
                        <KioskAdminActionButton
                          accent="green"
                          disabled={!canOpenFundKiosk && !canActivateAndOpen}
                          label={openButtonLabel}
                          onClick={() => void handleOpenOrActivateLink(fund)}
                        >
                          {rotatingFundId === fund.id ? <RotateCw className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        </KioskAdminActionButton>
                        <KioskAdminActionButton accent="green" label="Compartir y administrar liga" onClick={() => setShareFundId(fund.id)}>
                          <Share2 className="h-4 w-4" />
                        </KioskAdminActionButton>
                        <KioskAdminActionButton accent="green" label="Más opciones" onClick={() => setOptionsFundId(fund.id)}>
                          <MoreHorizontal className="h-4 w-4" />
                        </KioskAdminActionButton>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <Landmark className="h-4 w-4 text-[#147514]" />
                          Alcance
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{fundUnitLabel} · {fundBusinessLabel}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <ShieldCheck className="h-4 w-4 text-[#147514]" />
                          Configuración
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{fund.currencyCode} · PIN universal</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {canOpenFundKiosk ? 'Acceso listo' : (fund.kioskEnabled ? 'Sin link generado' : 'Pendiente de activar')}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {fund.responsibleName}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {fund.currencyCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <ShieldCheck className={`h-4 w-4 ${canOpenFundKiosk ? 'text-[#147514]' : 'text-slate-400'}`} />
                      <span>{canOpenFundKiosk ? 'Link privado listo para compartir' : (fund.kioskEnabled ? 'Pendiente de generar acceso' : 'Kiosko desactivado')}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

          </>
        )}
      </KioskModalFrame>

      <KioskModalFrame
        busy={Boolean(rotatingFundId)}
        closeLabel="Cerrar administración de liga"
        description={shareFund ? `Administra el acceso público de ${shareFund.name}.` : 'Liga pública del kiosko.'}
        footer={<button type="button" onClick={() => setShareFundId('')} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cerrar</button>}
        icon={<Share2 className="h-5 w-5" />}
        onOpenChange={(open) => { if (!open) setShareFundId(''); }}
        open={Boolean(shareFund)}
        size="compact"
        surface="administration"
        title="Liga del kiosko"
        tone="green"
      >
        {shareFund ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#147514]"><Link2 className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-sm font-medium text-slate-950 dark:text-white">{shareFund.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{shareFund.responsibleName} · {shareFund.currencyCode}</p></div>
              </div>
            </div>
            {getKioskUrl(shareFund) ? (
              <>
                <IndiceModalValidation tone="info" title="Liga disponible" messages={['Puedes abrir, copiar o convertir esta liga privada en código QR.']} />
                <div className="grid gap-2">
                  <KioskAdminPanelAction accent="green" primary icon={<ExternalLink className="h-4 w-4" />} label="Abrir kiosko" onClick={() => void handleOpenOrActivateLink(shareFund)} />
                  <KioskAdminPanelAction accent="green" icon={<Copy className="h-4 w-4" />} label={copiedFundId === shareFund.id ? copy.common.copied : copy.common.copyLink} onClick={() => void handleCopyLink(shareFund)} />
                  <KioskAdminPanelAction accent="green" icon={<QrCode className="h-4 w-4" />} label="Mostrar código QR" onClick={() => { setShareFundId(''); setQrFundId(shareFund.id); }} />
                  <KioskAdminPanelAction accent="green" icon={<RotateCw className="h-4 w-4" />} label="Reemplazar liga" onClick={() => { setShareFundId(''); void handleRotateLink(shareFund.id); }} />
                </div>
              </>
            ) : (
              <>
                <IndiceModalValidation tone="warning" title="Liga pendiente" messages={['Activa o genera una liga para poder compartir este kiosko.']} />
                <KioskAdminPanelAction
                  accent="green"
                  primary
                  icon={<RotateCw className="h-4 w-4" />}
                  label={shareFund.kioskEnabled ? 'Generar liga' : 'Activar y abrir'}
                  onClick={() => {
                    setShareFundId('');
                    if (shareFund.kioskEnabled) void handleRotateLink(shareFund.id);
                    else void handleOpenOrActivateLink(shareFund);
                  }}
                />
              </>
            )}
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        busy={Boolean(deletingKioskId || rotatingFundId)}
        closeLabel="Cerrar opciones"
        description={optionsFund ? `Gestiona el acceso de ${optionsFund.name}.` : 'Opciones del kiosko.'}
        footer={<button type="button" onClick={() => setOptionsFundId('')} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cerrar</button>}
        icon={<MoreHorizontal className="h-5 w-5" />}
        onOpenChange={(open) => { if (!open) setOptionsFundId(''); }}
        open={Boolean(optionsFund)}
        size="compact"
        surface="administration"
        title="Opciones del kiosko"
        tone="green"
      >
        {optionsFund ? (
          <div className="space-y-3">
            <KioskAdminPanelAction
              accent="green"
              primary={!optionsFund.kioskEnabled}
              description={optionsFund.kioskEnabled ? 'Es reversible y conserva el fondo, movimientos y comprobantes.' : 'Permite utilizar nuevamente el portal móvil.'}
              icon={optionsFund.kioskEnabled ? <X className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              label={optionsFund.kioskEnabled ? 'Pausar acceso' : 'Reactivar acceso'}
              onClick={() => {
                setOptionsFundId('');
                setOperationError('');
                void Promise.resolve(onSave(optionsFund.id, {
                  businessId: optionsFund.businessId,
                  kioskEnabled: !optionsFund.kioskEnabled,
                  name: optionsFund.name,
                  unitId: optionsFund.unitId,
                })).catch(error => setOperationError(toFinanceApiErrorMessage(error, copy.funds.notices.kioskSaveFailed)));
              }}
            />
            <KioskAdminPanelAction
              accent="green"
              danger
              description="El enlace dejará de funcionar; el fondo y sus movimientos se conservan."
              disabled={deletingKioskId === optionsFund.id}
              icon={<Trash2 className="h-4 w-4" />}
              label="Eliminar acceso de kiosko"
              onClick={() => { setOptionsFundId(''); setPendingDeleteKioskId(optionsFund.id); }}
            />
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel="Cerrar código QR"
        description={qrFund ? `Comparte el acceso autorizado de ${qrFund.name}.` : 'Código de acceso del kiosko.'}
        footer={<button type="button" onClick={() => setQrFundId('')} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cerrar</button>}
        icon={<QrCode className="h-5 w-5" />}
        onOpenChange={(open) => { if (!open) setQrFundId(''); }}
        open={Boolean(qrFund)}
        size="compact"
        surface="administration"
        title="Código QR del kiosko"
        tone="green"
      >
        <div className="flex flex-col items-center text-center">
          {qrDataUrl ? <img src={qrDataUrl} alt={`Código QR del kiosko ${qrFund?.name ?? ''}`} className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" /> : <p className="py-16 text-sm font-medium text-slate-600">Generando código QR seguro...</p>}
          <p className="mt-4 text-xs leading-5 text-slate-500">Compártelo únicamente con las personas autorizadas para operar este fondo.</p>
        </div>
      </KioskModalFrame>

      <ConfirmDeleteDialog
        cancelLabel={copy.common.cancel}
        confirmDisabled={Boolean(deletingKioskId)}
        confirmLabel={deletingKioskId ? 'Eliminando…' : 'Eliminar acceso'}
        description="El enlace público dejará de funcionar y tendrá que generarse uno nuevo para volver a habilitar este kiosco."
        isVisible={Boolean(pendingDeleteKioskId)}
        itemName={funds.find(fund => fund.id === pendingDeleteKioskId)?.name}
        onCancel={() => !deletingKioskId && setPendingDeleteKioskId('')}
        onConfirm={() => void handleDeleteKioskAccess()}
        title="Eliminar acceso de kiosco"
      />
    </>
  );
}
