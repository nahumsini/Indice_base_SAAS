import { ManagedAssetsEditor } from './ManagedAssetsEditor';
import { getFundManagedAssets, getManagedAssetTypeLabel, getManagedAssetsCopy, managedAssetTypes, MAX_MANAGED_ASSETS, type ManagedAssetDraft } from '../utils/managedAssets';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { Archive, Banknote, Coins, Copy, ExternalLink, Eye, Info, KeyRound, Landmark, Link2, MoreHorizontal, Pencil, QrCode, ReceiptText, RotateCw, Search, Share2, ShieldCheck, Trash2, UserRound, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
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
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper } from '../../../components/indice-modal';
import { getFundWizardCopy, type FundWizardStep } from '../utils/fundWizard.copy';
import { KioskAdminActionButton, KioskAdminPanelAction } from '../../../components/kiosk-engine/KioskAdminPrimitives';
import { KioskModalFrame } from '../../../components/kiosk-engine/KioskModalFrame';
import { useKioskQrCode } from '../../../components/kiosk-engine/useKioskQrCode';
import { legacyOwnerKioskEntryPointsEnabled } from '../../../components/kiosk-engine/kioskAdminNavigation';
import {
  formatPettyCashCurrency,
  getStatementSettlementBalance,
} from '../utils/pettyCash.utils';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { OperationalKpiArea, getOperationalKpiCurrencyCopy } from '../../shared/operational';
import { useKpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import { useLanguage } from '../../../shared/context';
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
  dataReady?: boolean;
  funds: PettyCashFund[];
  initialKioskFundId?: string;
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
  managedAssets: ManagedAssetDraft[];
  limitAmount: string;
  name: string;
  paymentAccountId: string;
  responsibleUserId: string;
  spendingMethods: string[];
  typeChangeEffectiveDate: string;
  typeChangeReason: string;
  unitId: string;
};

const tomorrowDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDraftManagedAssetFields = (draft: FundDraft) => {
  const managedAssets = draft.fundType === 'EXTERNAL_MANAGED'
    ? draft.managedAssets.map(({ type, name, reference }) => ({ type, name: name.trim(), reference: reference?.trim() || undefined }))
    : [];
  return {
    managedAssets,
    managedAssetType: managedAssets[0]?.type,
    managedAssetName: managedAssets[0]?.name,
    managedAssetReference: managedAssets[0]?.reference,
  };
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

const accountMatchesCurrency = (account: PaymentAccount | undefined, currency: PettyCashCurrency) => (
  !account || toPettyCashCurrency(account.currency) === currency
);

const budgetLineMatchesCurrency = (line: FinanceBudgetLine | undefined, currency: PettyCashCurrency) => (
  !line || toPettyCashCurrency(line.currencyCode) === currency
);

const getBudgetLineForCurrency = (lines: FinanceBudgetLine[], currency: PettyCashCurrency) => (
  lines.find(line => budgetLineMatchesCurrency(line, currency))
);

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
    fundingMethods: [],
    fundingSourceName: '',
    fundingSourcePaymentAccountId: '',
    fundType: 'INTERNAL_COMPANY',
    externalOwnerType: 'COMPANY',
    externalOwnerName: '',
    externalOwnerRelationship: 'CLIENT',
    externalOwnerReference: '',
    statementRecipientEmail: '',
    managedAssets: [],
    limitAmount: budgetLine ? String(getBudgetLineLimit(budgetLine)) : '',
    name: '',
    paymentAccountId: paymentAccount?.id ?? '',
    responsibleUserId: firstOptionValue(userOptions) || currentUserId || '',
    spendingMethods: [],
    typeChangeEffectiveDate: tomorrowDate(),
    typeChangeReason: '',
    unitId,
  };
};

const createFallbackFundDraft = (financialAccountFallback: string): FundDraft => ({
  budgetLineId: '',
  businessId: '',
  createdByUserId: '',
  currencyCode: 'MXN',
  cutOffDay: '30',
  fundingMethods: [],
  fundingSourcePaymentAccountId: '',
  fundingSourceName: '',
  fundType: 'INTERNAL_COMPANY',
  externalOwnerType: 'COMPANY',
  externalOwnerName: '',
  externalOwnerRelationship: 'CLIENT',
  externalOwnerReference: '',
  statementRecipientEmail: '',
  managedAssets: [],
  limitAmount: '',
  name: '',
  paymentAccountId: fallbackPaymentAccounts[0]?.id ?? '',
  responsibleUserId: '',
  spendingMethods: [],
  typeChangeEffectiveDate: tomorrowDate(),
  typeChangeReason: '',
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
  fundingSourcePaymentAccountId: '',
  fundType: fund.fundType,
  externalOwnerType: fund.externalOwnerType ?? 'COMPANY',
  externalOwnerName: fund.externalOwnerName ?? '',
  externalOwnerRelationship: fund.externalOwnerRelationship ?? 'CLIENT',
  externalOwnerReference: fund.externalOwnerReference ?? '',
  statementRecipientEmail: fund.statementRecipientEmail ?? '',
  managedAssets: getFundManagedAssets(fund).map(asset => ({ ...asset, draftId: crypto.randomUUID() })),
  limitAmount: String(fund.limitAmount),
  name: fund.name,
  paymentAccountId: fund.paymentAccountId,
  responsibleUserId: fund.responsibleUserId,
  spendingMethods: [...fund.spendingMethods],
  typeChangeEffectiveDate: fund.pendingTypeEffectiveDate ?? tomorrowDate(),
  typeChangeReason: '',
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

export function PettyCashFundsWorkspace({ dataReady = true, funds, initialKioskFundId = '', onFundsChange, onViewReceipts, statements }: PettyCashFundsWorkspaceProps) {
  const copy = usePettyCashTranslations();
  const defaultColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'fund', label: copy.funds.table.fund, visible: true, locked: true },
    { id: 'responsible', label: copy.funds.table.responsible, visible: true },
    { id: 'balance', label: copy.funds.table.balance, visible: true },
    { id: 'pending', label: copy.funds.table.pending, visible: true },
    { id: 'status', label: copy.funds.table.status, visible: true },
    { id: 'unit', label: copy.funds.table.unit, visible: false },
    { id: 'business', label: copy.funds.table.business, visible: false },
    { id: 'budget', label: copy.funds.table.budget, visible: false },
    { id: 'kiosk', label: copy.funds.table.kiosk, visible: false },
  ], [copy.funds.table]);
  const fixedColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'actions', label: copy.common.actions, visible: true, locked: true },
  ], [copy.common.actions]);
  const { columns, setColumns, visibleColumns } = usePettyCashColumns(pettyCashFundsColumnsStorageKey, defaultColumns);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { currentLanguage } = useLanguage();
  const fundWizard = useMemo(() => getFundWizardCopy(currentLanguage.code), [currentLanguage.code]);
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
    isReferenceDataReady,
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

  useEffect(() => {
    if (initialKioskFundId) setIsKioskOpen(true);
  }, [initialKioskFundId]);
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

  const workspaceState = useMemo(() => ({ searchTerm, unitFilter, businessFilter, statusFilter,
    sortKey: fundSort.sortKey, sortDirection: fundSort.sortDirection, currentPage: fundsPagination.currentPage, pageSize: fundsPagination.pageSize }),
    [searchTerm, unitFilter, businessFilter, statusFilter, fundSort.sortKey, fundSort.sortDirection, fundsPagination.currentPage, fundsPagination.pageSize]);
  useWorkspaceNavigationMemory({ moduleKey: 'petty-cash', tabKey: 'cash', enabled: dataReady && isReferenceDataReady,
    state: workspaceState, defaults: { searchTerm: '', unitFilter: 'all', businessFilter: 'all', statusFilter: 'all', sortKey: 'fund', sortDirection: 'asc', currentPage: 1, pageSize: 10 },
    urlFields: { searchTerm: 'pcf_q', unitFilter: 'pcf_unit', businessFilter: 'pcf_business', statusFilter: 'pcf_status' },
    onRestore: restored => {
      const unit = unitOptions.some(option => option.value === restored.unitFilter) ? restored.unitFilter : 'all';
      setSearchTerm(typeof restored.searchTerm === 'string' ? restored.searchTerm : ''); setUnitFilter(unit);
      setBusinessFilter(businessOptions.some(option => option.value === restored.businessFilter && (unit === 'all' || option.unitId === unit)) ? restored.businessFilter : 'all');
      setStatusFilter(Object.prototype.hasOwnProperty.call(copy.status.fund, restored.statusFilter) ? restored.statusFilter as PettyCashFundStatus : 'all');
      fundSort.restoreSort(restored.sortKey, restored.sortDirection); fundsPagination.restorePagination(restored);
    },
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
      fundingMethods: [],
      fundType: draft.fundType,
      fundingSourceName: '',
      fundingSourcePaymentAccountId: undefined,
      externalOwnerType: isExternalFund ? draft.externalOwnerType : undefined,
      externalOwnerName: isExternalFund ? draft.externalOwnerName.trim() : undefined,
      externalOwnerRelationship: isExternalFund ? draft.externalOwnerRelationship : undefined,
      externalOwnerReference: isExternalFund ? draft.externalOwnerReference.trim() || undefined : undefined,
      statementRecipientEmail: isExternalFund ? draft.statementRecipientEmail.trim() : undefined,
      ...getDraftManagedAssetFields(draft),
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
      spendingMethods: [],
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
        fundingSourceName: '',
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
    const changesType = draft.fundType !== editingFund.fundType;
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
      fundingMethods: changesType ? [] : editingFund.fundingMethods,
      fundType: draft.fundType,
      fundingSourceName: changesType ? '' : editingFund.fundingSourceName,
      fundingSourcePaymentAccountId: changesType ? undefined : editingFund.fundingSourcePaymentAccountId,
      externalOwnerType: isExternalFund ? draft.externalOwnerType : undefined,
      externalOwnerName: isExternalFund ? draft.externalOwnerName.trim() || undefined : undefined,
      externalOwnerRelationship: isExternalFund ? draft.externalOwnerRelationship : undefined,
      externalOwnerReference: isExternalFund ? draft.externalOwnerReference.trim() || undefined : undefined,
      statementRecipientEmail: isExternalFund ? draft.statementRecipientEmail.trim() || undefined : undefined,
      ...getDraftManagedAssetFields(draft),
      externalIdentityPending: isExternalFund && (
        !draft.externalOwnerName.trim() || !draft.statementRecipientEmail.trim()
      ),
      budgetLinkPending: !isExternalFund && !selectedBudgetLine,
      limitAmount: Number(draft.limitAmount) || editingFund.limitAmount,
      name: draft.name.trim(),
      paymentAccountId: draft.paymentAccountId,
      responsibleName: getOptionLabel(userOptions, draft.responsibleUserId, editingFund.responsibleName),
      responsibleUserId: draft.responsibleUserId,
      spendingMethods: changesType ? [] : editingFund.spendingMethods,
      unitId: draft.unitId,
      unitName: getOptionLabel(unitOptions, draft.unitId, editingFund.unitName),
    };
    try {
      const saved = hasPettyCashBackendId(editingFund.id)
        ? changesType
          ? await pettyCashService.changeFundType(updatedFund, draft.typeChangeEffectiveDate, draft.typeChangeReason.trim())
          : await pettyCashService.updateFund(updatedFund)
        : updatedFund;
      onFundsChange(current => current.map(fund => {
        if (fund.id !== editingFund.id) return fund;
        if (changesType) return { ...fund, ...saved };
        return {
          ...updatedFund,
          ...saved,
          budgetLineName: updatedFund.budgetLineName,
          businessName: updatedFund.businessName,
          createdByName: updatedFund.createdByName,
          responsibleName: updatedFund.responsibleName,
          unitName: updatedFund.unitName,
        };
      }));
      setEditingFund(null);
      setServiceNotice('');
    } catch (error) {
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.updateFailed));
      throw error;
    }
  };

  const handleCancelTypeChange = async () => {
    if (!editingFund?.pendingTypeChangeId) return;
    const saved = await pettyCashService.cancelFundTypeChange(editingFund);
    onFundsChange(current => current.map(fund => fund.id === saved.id ? { ...fund, ...saved } : fund));
    setEditingFund(saved);
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
        onSecondaryAction={legacyOwnerKioskEntryPointsEnabled ? () => setIsKioskOpen(true) : undefined}
        secondaryActionIcon={legacyOwnerKioskEntryPointsEnabled ? KeyRound : undefined}
        secondaryActionLabel={legacyOwnerKioskEntryPointsEnabled ? copy.funds.header.kiosk : undefined}
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
          fundsPagination.onPageChange(1);
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
                    if (column.id === 'fund') return <td key={column.id} className="px-5 py-4"><p className="font-medium text-slate-900 dark:text-white">{fund.name}</p><p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{fundAccountName}</p>{fund.pendingFundType && fund.pendingTypeEffectiveDate ? <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">{fundWizard.scheduled(fund.pendingFundType === 'INTERNAL_COMPANY' ? copy.funds.modal.internalFund : copy.funds.modal.externalFund, fund.pendingTypeEffectiveDate)}</p> : null}</td>;
                    if (column.id === 'unit') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund.unitName}</td>;
                    if (column.id === 'business') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund.businessName}</td>;
                    if (column.id === 'responsible') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund.responsibleName}</td>;
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
          onCancelTypeChange={handleCancelTypeChange}
          onSave={handleUpdateFund}
          unitOptions={unitOptions}
          userOptions={userOptions}
        />
      ) : null}

      {isKioskOpen ? (
        <KioskModal
          funds={funds}
          businessOptions={businessOptions}
          initialFundId={initialKioskFundId}
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
  onCancelTypeChange,
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
  onCancelTypeChange?: () => void | Promise<void>;
  onSave: (draft: FundDraft) => void | Promise<void>;
  paymentAccounts: PaymentAccount[];
  unitOptions: FinanceReferenceOption[];
  userOptions: FinanceReferenceOption[];
}) {
  const copy = usePettyCashTranslations();
  const { currentLanguage } = useLanguage();
  const wizard = getFundWizardCopy(currentLanguage.code);
  const assetCopy = getManagedAssetsCopy(copy.locale);
  const isWizard = !initialFund;
  const [activeStep, setActiveStep] = useState<FundWizardStep>('type');
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const busyRef = useRef(false);
  const dirtyRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const validationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isWizard) return;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [activeStep, isWizard]);
  useEffect(() => {
    if (validationAttempt || discardPrompt) validationRef.current?.focus();
  }, [validationAttempt, discardPrompt]);
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
        budgetLineId: current.fundType === 'EXTERNAL_MANAGED' ? '' : nextBudgetLineId,
        businessId: nextBusinessId,
        createdByUserId: current.createdByUserId || nextDefaults.createdByUserId,
        currencyCode: current.currencyCode || nextDefaults.currencyCode,
        limitAmount: current.limitAmount || (current.fundType === 'EXTERNAL_MANAGED' ? '' : nextBudgetLine ? String(getBudgetLineLimit(nextBudgetLine)) : nextDefaults.limitAmount),
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
  const fundAccountCurrencyMatches = accountMatchesCurrency(selectedFundAccount, draft.currencyCode);
  const isExternalFund = draft.fundType === 'EXTERNAL_MANAGED';
  const changesType = Boolean(initialFund && initialFund.fundType !== draft.fundType);
  const preservesLegacyPendingIdentity = Boolean(
    initialFund?.externalIdentityPending && initialFund.fundType === draft.fundType,
  );
  const preservesLegacyMissingBudget = Boolean(
    initialFund?.budgetLinkPending
    && initialFund.fundType === 'INTERNAL_COMPANY'
    && initialFund.fundType === draft.fundType
    && !draft.budgetLineId,
  );
  const budgetLineCurrencyMatches = isExternalFund || budgetLineMatchesCurrency(selectedBudgetLine, draft.currencyCode);
  const isLimitAboveBudget = Boolean(
    selectedBudgetLine
    && selectedBudgetLimit > 0
    && Number(draft.limitAmount) > selectedBudgetLimit,
  );
  const canCreate = draft.name.trim().length > 0
    && Number(draft.limitAmount) > 0
    && Boolean(selectedFundAccount?.isActive)
    && fundAccountCurrencyMatches
    && budgetLineCurrencyMatches
    && draft.responsibleUserId.length > 0
    && draft.unitId.length > 0
    && draft.businessId.length > 0;
  const hasRequiredAccountingLink = isExternalFund || Boolean(selectedBudgetLine) || preservesLegacyMissingBudget;
  const hasValidManagedAsset = draft.managedAssets.length <= MAX_MANAGED_ASSETS && draft.managedAssets.every(asset =>
    managedAssetTypes.some(type => type === asset.type) && asset.name.trim().length > 0);
  const recipientEmail = draft.statementRecipientEmail.trim();
  const hasValidRecipientEmail = !recipientEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);
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
  const canSave = !initialFund?.pendingTypeChangeId && canCreate && hasRequiredAccountingLink && hasExternalIdentity
    && (!changesType || (draft.typeChangeEffectiveDate.length > 0 && draft.typeChangeReason.trim().length >= 8));

  const stepIds: FundWizardStep[] = isExternalFund
    ? ['type', 'details', 'identity', 'review']
    : ['type', 'details', 'review'];
  const activeStepIndex = stepIds.indexOf(activeStep);
  const steps = stepIds.map(id => ({ id, label: wizard.steps[id].label }));
  const compatibleFundAccounts = paymentAccounts.filter(account => account.isActive && accountMatchesCurrency(account, draft.currencyCode));
  const getStepErrors = (step: FundWizardStep): string[] => {
    const messages: string[] = [];
    const required = (valid: boolean, label: string) => { if (!valid) messages.push(wizard.required(label)); };
    if (step === 'details') {
      required(Boolean(draft.name.trim()), copy.funds.modal.name);
      if (!Number.isFinite(Number(draft.limitAmount)) || Number(draft.limitAmount) <= 0) messages.push(wizard.invalidAmount);
      const day = Number(draft.cutOffDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) messages.push(wizard.invalidDay);
      if (!hasRequiredAccountingLink) messages.push(copy.funds.modal.budgetMissingHint);
      if (!budgetLineCurrencyMatches) messages.push(wizard.required(copy.funds.modal.budgetLine + ' (' + draft.currencyCode + ')'));
      required(userOptions.some(user => user.value === draft.responsibleUserId), copy.funds.modal.responsible);
      required(unitOptions.some(unit => unit.value === draft.unitId), copy.funds.modal.unit);
      required(filteredBusinessOptions.some(business => business.value === draft.businessId), copy.funds.modal.business);
      required(Boolean(selectedFundAccount), copy.funds.modal.fundAccount);
      if (!fundAccountCurrencyMatches) messages.push(copy.funds.modal.fundAccountCurrencyWarning);
    }
    if (step === 'identity' && isExternalFund) {
      required(Boolean(draft.externalOwnerType), copy.funds.modal.ownerType);
      required(Boolean(draft.externalOwnerRelationship), copy.funds.modal.ownerRelationship);
      required(Boolean(draft.externalOwnerName.trim()), copy.funds.modal.ownerName);
      if (!recipientEmail || !hasValidRecipientEmail) messages.push(wizard.invalidEmail);
      if (draft.managedAssets.length > MAX_MANAGED_ASSETS) messages.push(assetCopy.limit);
      draft.managedAssets.forEach((asset, index) => {
        required(managedAssetTypes.some(type => type === asset.type), `${assetCopy.item(index + 1)}: ${copy.funds.modal.assetType}`);
        required(Boolean(asset.name.trim()), `${assetCopy.item(index + 1)}: ${copy.funds.modal.assetName}`);
      });
    }
    return messages;
  };
  const allStepErrors = stepIds.flatMap(getStepErrors);
  const validationMessages = isWizard && (validationAttempt > 0 || activeStep === 'review')
    ? activeStep === 'review' ? allStepErrors : getStepErrors(activeStep)
    : [];
  const goToStep = (step: FundWizardStep) => {
    if (busyRef.current) return;
    setError('');
    setValidationAttempt(0);
    setDiscardPrompt(false);
    setActiveStep(step);
  };
  const handleContinue = () => {
    if (busyRef.current || isLoadingReferenceData) return;
    if (getStepErrors(activeStep).length) {
      setValidationAttempt(attempt => attempt + 1);
      return;
    }
    const next = stepIds[activeStepIndex + 1];
    if (next) goToStep(next);
  };
  const handleClose = () => {
    if (busyRef.current) return;
    if (isWizard && dirtyRef.current) setDiscardPrompt(true);
    else onClose();
  };
  const money = (amount: number) => new Intl.NumberFormat(currentLanguage.code, {
    style: 'currency', currency: draft.currencyCode, currencyDisplay: 'code',
  }).format(amount);
  const summaryValue = (value: string) => <span className="block whitespace-normal break-words">{value || wizard.pending}</span>;
  const summaryItem = (label: string, value: string) => ({ label: label.replace(/\s*\*$/, ''), value: summaryValue(value) });

  const handleSubmit = async () => {
    if (!canSave || busyRef.current || (isWizard && (activeStep !== 'review' || allStepErrors.length || isLoadingReferenceData))) return;
    busyRef.current = true;
    setError('');
    setIsSaving(true);
    try {
      await onSave(draft);
    } catch (saveError) {
      setError(toFinanceApiErrorMessage(saveError, initialFund ? copy.funds.notices.updateFailed : copy.funds.notices.saveFailed));
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  };
  const handleCancelScheduled = async () => {
    if (!onCancelTypeChange || busyRef.current) return;
    busyRef.current = true; setError(''); setIsSaving(true);
    try { await onCancelTypeChange(); }
    catch (cancelError) { setError(toFinanceApiErrorMessage(cancelError, copy.funds.notices.updateFailed)); }
    finally { busyRef.current = false; setIsSaving(false); }
  };

  return (
    <IndiceModalFrame
      busy={isSaving}
      bodyRef={bodyRef}
      contentClassName={initialFund ? 'sm:max-w-4xl' : undefined}
      description={isWizard ? wizard.steps[activeStep].description : copy.funds.modal.editSubtitle}
      eyebrow={isWizard ? wizard.progress(activeStepIndex + 1, steps.length) : undefined}
      footerLeading={(
        <button type="button" disabled={isSaving} onClick={handleClose} className="min-h-11 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50">
          {copy.common.cancel}
        </button>
      )}
      footer={(
        <>
          {isWizard && activeStepIndex > 0 ? (
            <button type="button" disabled={isSaving} onClick={() => goToStep(stepIds[activeStepIndex - 1])}>
              {wizard.back}
            </button>
          ) : null}
          {isWizard && activeStep !== 'review' ? (
            <button type="button" disabled={isSaving || isLoadingReferenceData} onClick={handleContinue}>
              {wizard.next}
            </button>
          ) : (
            <button type="button" disabled={!canSave || isSaving || (isWizard && (allStepErrors.length > 0 || isLoadingReferenceData))} onClick={handleSubmit}>
              {isSaving ? wizard.saving : initialFund ? copy.funds.modal.update : copy.funds.modal.submit}
            </button>
          )}
        </>
      )}
      footerSummary={draft.name ? `${draft.name}${Number(draft.limitAmount) > 0 && Number.isFinite(Number(draft.limitAmount)) ? ` · ${copy.funds.modal.limit.replace(/\s*\*$/, '')} ${money(Number(draft.limitAmount))}` : ''}` : initialFund ? copy.funds.modal.editTitle : copy.funds.modal.title}
      icon={<Banknote className="h-5 w-5" />}
      modalType={isWizard ? 'wizard' : 'standard-form'}
      onOpenChange={(open) => !open && handleClose()}
      open
      title={initialFund ? copy.funds.modal.editTitle : copy.funds.modal.title}
      tone="green"
    >
      <form onChangeCapture={() => { dirtyRef.current = true; }} onSubmit={(event) => { event.preventDefault(); if (isWizard && activeStep !== 'review') handleContinue(); else void handleSubmit(); }}>
        {isWizard ? <IndiceModalWizardStepper accent="green" activeStepId={activeStep} progressLabel={wizard.progress(activeStepIndex + 1, steps.length)} steps={steps} /> : null}
        {isWizard ? <h3 ref={stepHeadingRef} tabIndex={-1} className="mb-4 mt-5 text-lg font-medium text-slate-950 outline-none dark:text-white">{activeStep === 'type' ? copy.funds.modal.typeTitle : wizard.steps[activeStep].label}</h3> : null}
        <div ref={validationRef} tabIndex={-1} className="space-y-3 outline-none">
          {isLoadingReferenceData ? <IndiceModalValidation messages={[wizard.loading]} tone="info" /> : null}
          {validationMessages.length ? <IndiceModalValidation messages={validationMessages} /> : null}
          {discardPrompt ? (
            <div className="space-y-3">
              <IndiceModalValidation messages={[wizard.discardWarning]} tone="warning" />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={isSaving} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm dark:border-slate-700" onClick={() => { setDiscardPrompt(false); stepHeadingRef.current?.focus(); }}>{wizard.keepEditing}</button>
                <button type="button" disabled={isSaving} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm text-red-700 dark:border-red-900 dark:text-red-300" onClick={() => { if (!busyRef.current) onClose(); }}>{wizard.discard}</button>
              </div>
            </div>
          ) : null}
        {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
        {preservesLegacyPendingIdentity ? (
          <IndiceModalValidation messages={[copy.funds.modal.legacyIdentityPending]} tone="warning" />
        ) : null}
        {preservesLegacyMissingBudget ? (
          <IndiceModalValidation messages={[copy.funds.modal.legacyBudgetPending]} tone="warning" />
        ) : null}
        {initialFund?.pendingTypeChangeId && initialFund.pendingFundType && initialFund.pendingTypeEffectiveDate ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <IndiceModalValidation messages={[wizard.scheduled(
              initialFund.pendingFundType === 'INTERNAL_COMPANY' ? copy.funds.modal.internalFund : copy.funds.modal.externalFund,
              initialFund.pendingTypeEffectiveDate,
            )]} tone="warning" />
            <button type="button" disabled={isSaving} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 text-sm font-medium text-amber-800 dark:bg-slate-900 dark:text-amber-200" onClick={() => void handleCancelScheduled()}>{wizard.cancelChange}</button>
          </div>
        ) : null}
        </div>
        <fieldset disabled={isSaving || Boolean(initialFund?.pendingTypeChangeId)} className="mt-4 min-w-0 space-y-4 disabled:opacity-70">
        {(!isWizard || activeStep === 'type') ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          {!isWizard ? <>
            <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.typeTitle}</h4>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.funds.modal.typeDescription}</p>
          </> : null}
          <div className={`${isWizard ? '' : 'mt-4'} grid gap-3 md:grid-cols-2`}>
            {([
              ['INTERNAL_COMPANY', copy.funds.modal.internalFund, copy.funds.modal.internalFundDescription, Landmark],
              ['EXTERNAL_MANAGED', copy.funds.modal.externalFund, copy.funds.modal.externalFundDescription, ShieldCheck],
            ] as const).map(([value, label, description, Icon]) => {
              const selected = draft.fundType === value;
              return (
                <button
                  aria-pressed={selected}
                  className={`rounded-lg border p-4 text-left transition ${selected ? 'border-[#147514] bg-white ring-2 ring-[#147514]/15 dark:bg-slate-900' : 'border-slate-200 bg-white/70 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900/70'}`}
                  disabled={Boolean(initialFund?.pendingTypeChangeId)}
                  key={value}
                  onClick={() => {
                    if (draft.fundType !== value) dirtyRef.current = true;
                    setDraft(current => ({
                    ...current,
                    budgetLineId: value === 'EXTERNAL_MANAGED' ? '' : current.budgetLineId || budgetLines[0]?.id || '',
                    fundType: value,
                    fundingSourceName: '',
                    fundingSourcePaymentAccountId: '',
                  }));
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-[#147514] text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><Icon className="h-5 w-5" /></span><span className="font-medium text-slate-900 dark:text-white">{label}</span></span>
                  <span className="mt-3 block text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</span>
                </button>
              );
            })}
          </div>
          {initialFund ? <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{wizard.typeChangeNote}</p> : null}
          {changesType ? (
            <div className="mt-4 grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-2 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="md:col-span-2"><h5 className="font-medium text-slate-900 dark:text-white">{wizard.typeChangeTitle}</h5><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{wizard.typeChangeNote}</p></div>
              <PettyCashField label={`${wizard.effectiveDate} *`}><input className={pettyCashInputClass} min={tomorrowDate()} type="date" value={draft.typeChangeEffectiveDate} onChange={event => setDraft(current => ({ ...current, typeChangeEffectiveDate: event.target.value }))} /></PettyCashField>
              <PettyCashField label={`${wizard.reason} *`}><textarea className={pettyCashInputClass} maxLength={500} rows={3} placeholder={wizard.reasonPlaceholder} value={draft.typeChangeReason} onChange={event => setDraft(current => ({ ...current, typeChangeReason: event.target.value }))} />{draft.typeChangeReason.length > 0 && draft.typeChangeReason.trim().length < 8 ? <p className="mt-2 text-xs font-medium text-red-600">{wizard.reasonError}</p> : null}</PettyCashField>
            </div>
          ) : null}
        </section>
        ) : null}
        {(!isWizard || activeStep === 'details') ? (<>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.dataTitle}</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <PettyCashField label={copy.funds.modal.name}>
                <input
                  className={pettyCashInputClass}
                  maxLength={180}
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
                  step="0.01"
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
              <PettyCashField label={`${copy.funds.modal.fundAccount} *`}>
                <select className={pettyCashInputClass} disabled={Boolean(initialFund)}
                  onChange={(event) => {
                    const account = paymentAccounts.find(item => item.id === event.target.value);
                    const nextCurrency = toPettyCashCurrency(account?.currency ?? draft.currencyCode);
                    setDraft(current => ({ ...current, currencyCode: nextCurrency, paymentAccountId: event.target.value }));
                  }}
                  value={compatibleFundAccounts.some(account => account.id === draft.paymentAccountId) ? draft.paymentAccountId : ''}>
                  <option value="">{wizard.pending}</option>
                  {compatibleFundAccounts.map(account => <option key={account.id} value={account.id}>{getPaymentAccountLabel(account)}</option>)}
                </select>
                {!fundAccountCurrencyMatches ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{copy.funds.modal.fundAccountCurrencyWarning}</p> : null}
              </PettyCashField>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <h4 className="text-lg font-medium text-slate-900 dark:text-white">{copy.funds.modal.responsibilityTitle}</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <PettyCashField label={isWizard ? `${copy.funds.modal.responsible} *` : copy.funds.modal.responsible}>
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
              <PettyCashField label={isWizard ? `${copy.funds.modal.unit} *` : copy.funds.modal.unit}>
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
              <PettyCashField label={isWizard ? `${copy.funds.modal.business} *` : copy.funds.modal.business}>
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

        </>) : null}
          {isExternalFund && (!isWizard || activeStep === 'identity') ? (
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
                <details className="md:col-span-2" open={!isWizard || draft.managedAssets.length > 0 || undefined}>
                  <summary className="cursor-pointer rounded-lg py-3 text-sm font-medium text-slate-800 dark:text-slate-100">{assetCopy.title}</summary>
                  <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{assetCopy.description}</p>
                  <ManagedAssetsEditor assets={draft.managedAssets} copy={copy} disabled={isSaving} onChange={managedAssets => {
                    dirtyRef.current = true;
                    setDraft(current => ({ ...current, managedAssets }));
                  }} />
                </details>
              </div>
            </section>
          ) : null}
          {isWizard && activeStep === 'review' ? (
            <div className="space-y-4">
              <IndiceModalValidation messages={[wizard.creationNote]} tone="info" />
              <IndiceModalSummary title={copy.funds.modal.dataTitle} columns={2} variant="success" items={[
                summaryItem(wizard.steps.type.label, isExternalFund ? copy.funds.modal.externalFund : copy.funds.modal.internalFund),
                summaryItem(copy.funds.modal.name, draft.name),
                summaryItem(copy.funds.modal.currency, draft.currencyCode),
                summaryItem(copy.funds.modal.limit, money(Number(draft.limitAmount))),
                summaryItem(wizard.initialBalance, money(0)),
                ...(!isExternalFund ? [summaryItem(copy.funds.modal.budgetLine, selectedBudgetLine
                  ? getBudgetLineDisplayName(selectedBudgetLine, copy.funds.defaults.budgetLine) : wizard.pending)] : []),
              ]} />
              {!isExternalFund && isLimitAboveBudget ? <IndiceModalValidation messages={[copy.funds.modal.budgetExceededHint]} tone="warning" /> : null}
              <IndiceModalSummary title={copy.funds.modal.responsibilityTitle} columns={2} items={[
                summaryItem(copy.funds.modal.responsible, getOptionLabel(userOptions, draft.responsibleUserId, wizard.pending)),
                summaryItem(copy.funds.modal.unit, getOptionLabel(unitOptions, draft.unitId, wizard.pending)),
                summaryItem(copy.funds.modal.business, getOptionLabel(filteredBusinessOptions, draft.businessId, wizard.pending)),
              ]} />
              {isExternalFund ? <IndiceModalSummary title={copy.funds.modal.externalIdentityTitle} columns={2} items={[
                summaryItem(copy.funds.modal.ownerName, draft.externalOwnerName),
                summaryItem(copy.funds.modal.ownerType, ({ COMPANY: copy.funds.modal.ownerCompany, PERSON: copy.funds.modal.ownerPerson,
                  TRUST: copy.funds.modal.ownerTrust, OTHER: copy.funds.modal.ownerOther } as Record<string, string>)[draft.externalOwnerType]),
                summaryItem(copy.funds.modal.ownerRelationship, ({ CLIENT: copy.funds.modal.relationshipClient, OWNER: copy.funds.modal.relationshipOwner,
                  PARTNER: copy.funds.modal.relationshipPartner, BENEFICIARY: copy.funds.modal.relationshipBeneficiary, OTHER: copy.funds.modal.relationshipOther } as Record<string, string>)[draft.externalOwnerRelationship]),
                summaryItem(copy.funds.modal.recipientEmail, recipientEmail),
                ...(draft.externalOwnerReference ? [summaryItem(copy.funds.modal.ownerReference, draft.externalOwnerReference)] : []),
              ]} /> : null}
              {isExternalFund ? draft.managedAssets.map((asset, index) => (
                <IndiceModalSummary key={asset.draftId} title={assetCopy.item(index + 1)} columns={2} items={[
                  summaryItem(copy.funds.modal.assetType, getManagedAssetTypeLabel(asset.type, copy)),
                  summaryItem(copy.funds.modal.assetName, asset.name),
                  ...(asset.reference ? [summaryItem(copy.funds.modal.assetReference, asset.reference)] : []),
                ]} />
              )) : null}
              <IndiceModalSummary title={copy.funds.modal.fundingTitle} columns={2} items={[
                summaryItem(copy.funds.modal.fundAccount, selectedFundAccount ? getPaymentAccountLabel(selectedFundAccount) : wizard.pending),
              ]} />
              {isExternalFund ? <IndiceModalValidation messages={[copy.funds.modal.externalAccountingNote]} tone="info" /> : null}
            </div>
          ) : null}
        </fieldset>
      </form>
    </IndiceModalFrame>
  );
}

function KioskModal({
  businessOptions,
  funds,
  initialFundId,
  onClose,
  onDelete,
  onRotate,
  onSave,
  unitOptions,
}: {
  businessOptions: FinanceReferenceOption[];
  funds: PettyCashFund[];
  initialFundId?: string;
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
  const openedInitialFundId = useRef('');
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

  useEffect(() => {
    if (!initialFundId || openedInitialFundId.current === initialFundId) return;
    if (!funds.some(fund => fund.id === initialFundId)) return;
    openedInitialFundId.current = initialFundId;
    openEditor(initialFundId);
  }, [funds, initialFundId]);

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
