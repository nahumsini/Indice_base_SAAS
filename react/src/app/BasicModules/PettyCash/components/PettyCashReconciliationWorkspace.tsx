import { Ban, Banknote, Building2, CheckCircle2, Coins, Copy, Download, ExternalLink, FolderOpen, Info, Loader2, MoreHorizontal, Paperclip, Plus, ReceiptText, Search, Trash2, Upload, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { isAdminAccessRole } from '../../../access/accessRules';
import { authApi } from '../../../api/auth';
import { mockAccounts } from '../../Expenses/AccountingAccounts/accountingAccounts.mock';
import type { AccountingAccount } from '../../Expenses/AccountingAccounts/types';
import { mockProviderRecords } from '../../Expenses/data/providerRecords.mock';
import { mockPaymentAccounts } from '../../Expenses/PaymentAccounts/paymentAccounts.mock';
import type { PaymentAccount } from '../../Expenses/PaymentAccounts/types';
import { ProviderCreateModal } from '../../Expenses/Providers/components/ProviderCreateModal';
import { createQuickProviderRecord } from '../../Expenses/Providers/providerRecordFactory';
import type { ProviderFormValues, ProviderRecord } from '../../Expenses/Providers/useProveedoresLogic';
import { toExpenseProvider } from '../../Expenses/adapters/provider.adapter';
import { QuickProviderField } from '../../Expenses/components/modals/QuickProviderField';
import { accountingAccountsService, paymentAccountsService, providersService, toFinanceApiErrorMessage } from '../../Expenses/services';
import type { Provider } from '../../Expenses/types/expenses.types';
import type { FinanceReferenceOption } from '../../Expenses/types/finance-reference.types';
import {
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
} from '../../Expenses/Budgets/budgetTaxCatalog';
import { BudgetTaxControls, type TaxControlDraft } from '../../Expenses/components/modals/BudgetTaxControls';
import { hasPettyCashBackendId, pettyCashService, type PettyCashStatementCloseAction } from '../services';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { IndiceModalFrame, IndiceModalValidation } from '../../../components/indice-modal';
import type {
  PettyCashAttachment,
  PettyCashFund,
  PettyCashMovement,
  PettyCashSettlementLine,
  PettyCashSettlementLineStatus,
  PettyCashStatement,
} from '../types/pettyCash.types';
import {
  formatPettyCashCurrency,
  formatPettyCashIsoDate,
  getFundById,
  getStatementLines,
  getStatementSettlementBalance,
} from '../utils/pettyCash.utils';
import { downloadPettyCashStatementPdf } from '../utils/pettyCashStatementPdf';
import { getPettyCashMethodLabel, PETTY_CASH_METHOD_KEYS } from '../utils/pettyCash.methods';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import { getOperationalKpiCurrencyCopy, OperationalKpiArea } from '../../shared/operational';
import { useLanguage } from '../../../shared/context';
import {
  PettyCashEmptyState,
  PettyCashField,
  PettyCashFilterShell,
  PettyCashHeaderBanner,
  PettyCashPagination,
  PettyCashSortableHeader,
  pettyCashInputClass,
  PettyCashStatusPill,
  usePettyCashTableSort,
} from './PettyCashShared';

type PettyCashReconciliationWorkspaceProps = {
  funds: PettyCashFund[];
  initialFundId?: string;
  movements: PettyCashMovement[];
  onFundsChange: Dispatch<SetStateAction<PettyCashFund[]>>;
  onMovementsChange: Dispatch<SetStateAction<PettyCashMovement[]>>;
  onSettlementLinesChange: Dispatch<SetStateAction<PettyCashSettlementLine[]>>;
  onStatementsChange: Dispatch<SetStateAction<PettyCashStatement[]>>;
  settlementLines: PettyCashSettlementLine[];
  statements: PettyCashStatement[];
};

type DepositDraft = {
  amount: string;
  fundingMethod: string;
  movementDate: string;
  reference: string;
  sourcePaymentAccountId: string;
};

type ReceiptDraft = TaxControlDraft & {
  accountingAccountId: string;
  attachments: File[];
  description: string;
  expenseDate: string;
  providerId: string;
  receiptReference: string;
};

type CloseStatementDraft = {
  action: PettyCashStatementCloseAction;
  closeDate: string;
  reference: string;
  shortageAmount: string;
};

type OperationView = 'expenses' | 'income';

const todayIso = () => new Date().toISOString().slice(0, 10);

const activePaymentAccountMocks = mockPaymentAccounts.filter(account => account.isActive);
const activeAccountingAccountMocks = mockAccounts.filter(account => account.isActive);

const formatPaymentAccountLabel = (account: PaymentAccount) => {
  const suffix = [account.bank, account.accountNumber].filter(Boolean).join(' ');
  return `${account.name}${suffix ? ` - ${suffix}` : ''} (${account.currency})`;
};

const formatAccountingAccountLabel = (account: AccountingAccount) => `${account.code} - ${account.name}`;

const paymentAccountMatchesCurrency = (account: PaymentAccount, currency: string) => (
  account.currency.toUpperCase() === currency.toUpperCase()
);

const getDepositSourceAccountOptions = (fund: PettyCashFund, paymentAccounts: PaymentAccount[]) => (
  paymentAccounts.filter(account => (
    account.isActive
    && account.id !== fund.paymentAccountId
    && paymentAccountMatchesCurrency(account, fund.currencyCode)
  ))
);

const createDepositDraft = (fund?: PettyCashFund, paymentAccounts: PaymentAccount[] = activePaymentAccountMocks): DepositDraft => ({
  amount: '',
  fundingMethod: fund?.fundingMethods[0] ?? PETTY_CASH_METHOD_KEYS.INTERNAL_TRANSFER,
  movementDate: todayIso(),
  reference: '',
  sourcePaymentAccountId: fund
    ? (
      getDepositSourceAccountOptions(fund, paymentAccounts).some(account => account.id === fund.fundingSourcePaymentAccountId)
        ? fund.fundingSourcePaymentAccountId ?? ''
        : getDepositSourceAccountOptions(fund, paymentAccounts)[0]?.id ?? ''
    )
    : paymentAccounts.find(account => account.isActive)?.id ?? '',
});

const createReceiptTaxDraft = (currencyCode = 'MXN'): TaxControlDraft => {
  const country = inferTaxCountryFromCurrency(currencyCode);
  const defaultProfile = getDefaultBudgetTaxProfile(country);

  return {
    amount: '',
    budgetCurrencyCode: currencyCode,
    taxes: '',
    taxCountry: country,
    taxEnabled: false,
    taxIncluded: false,
    taxMode: 'none',
    taxProfileId: defaultProfile?.id ?? '',
    taxRate: defaultProfile ? taxRateToPercentInput(defaultProfile.rate) : '',
    taxSpecialAmount: '',
  };
};

const createReceiptDraft = (
  providers: ProviderRecord[] = mockProviderRecords,
  accountingAccounts: AccountingAccount[] = activeAccountingAccountMocks,
  currencyCode = 'MXN',
): ReceiptDraft => ({
  ...createReceiptTaxDraft(currencyCode),
  accountingAccountId: accountingAccounts.find(account => account.isActive)?.id ?? '',
  attachments: [],
  description: '',
  expenseDate: todayIso(),
  providerId: providers.find(provider => provider.status === 'active')?.id ?? '',
  receiptReference: '',
});

const toPettyCashMoneyNumber = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsedValue = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const roundPettyCashMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const getReceiptTaxBreakdown = (draft: Pick<ReceiptDraft, 'amount' | 'taxes' | 'taxEnabled' | 'taxIncluded'>) => {
  const enteredAmount = Math.max(0, toPettyCashMoneyNumber(draft.amount));
  const taxAmount = draft.taxEnabled ? Math.max(0, toPettyCashMoneyNumber(draft.taxes)) : 0;
  const subtotalAmount = draft.taxEnabled && draft.taxIncluded
    ? Math.max(0, enteredAmount - taxAmount)
    : enteredAmount;
  const totalAmount = draft.taxEnabled && !draft.taxIncluded
    ? enteredAmount + taxAmount
    : enteredAmount;

  return {
    subtotalAmount: roundPettyCashMoney(subtotalAmount),
    taxAmount: roundPettyCashMoney(taxAmount),
    totalAmount: roundPettyCashMoney(totalAmount),
  };
};

const inferAttachmentContentType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/pdf';
  }
};

const uniqueReferenceOptions = (options: FinanceReferenceOption[]) => Array.from(
  new Map(options.filter(option => option.value).map(option => [option.value, option])).values(),
);

const buildUnitOptions = (funds: PettyCashFund[]): FinanceReferenceOption[] => uniqueReferenceOptions(
  funds.map(fund => ({ label: fund.unitName, value: fund.unitId })),
);

const buildBusinessOptions = (funds: PettyCashFund[]): FinanceReferenceOption[] => uniqueReferenceOptions(
  funds.map(fund => ({ label: fund.businessName, unitId: fund.unitId, value: fund.businessId })),
);

const buildUserOptions = (funds: PettyCashFund[]): FinanceReferenceOption[] => uniqueReferenceOptions([
  ...funds.map(fund => ({ label: fund.responsibleName, value: fund.responsibleUserId })),
  ...funds.map(fund => ({ label: fund.createdByName, value: fund.createdByUserId })),
]);

const buildAccountingAccountOptions = (accountingAccounts: AccountingAccount[]): FinanceReferenceOption[] => (
  accountingAccounts
    .filter(account => account.isActive)
    .map(account => ({ label: formatAccountingAccountLabel(account), value: account.id }))
);

const getNextProviderFolio = (providers: ProviderRecord[]) => {
  const nextNumber = providers.reduce((maxNumber, provider) => {
    const match = provider.folio.match(/PROV-(\d+)/);
    return Math.max(maxNumber, match ? Number(match[1]) : 0);
  }, 0) + 1;

  return `PROV-${String(nextNumber).padStart(4, '0')}`;
};

const createProviderRecord = (providers: ProviderRecord[], values: ProviderFormValues): ProviderRecord => {
  const now = new Date();

  return {
    id: `prov-petty-${Date.now()}`,
    accountingAccount: values.accountingAccount,
    address: values.address,
    attachments: [],
    auditNotes: '',
    authorizer: values.authorizer,
    business: values.business,
    businessUnit: values.businessUnit,
    company: values.company || values.name,
    contactName: values.contactName,
    createdAt: now,
    email: values.email,
    folio: getNextProviderFolio(providers),
    name: values.name,
    performer: values.performer,
    phone: values.phone,
    status: values.status,
    taxId: values.taxId,
    type: values.type,
    updatedAt: now,
  };
};

const buildStatementForFund = (fund: PettyCashFund): PettyCashStatement => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const periodStart = `${year}-${month}-01`;
  const periodEnd = `${year}-${month}-${String(Math.min(fund.cutOffDay, 28)).padStart(2, '0')}`;

  return {
    id: `statement-${fund.id}-${year}-${month}`,
    additionalDepositAmount: 0,
    assignedAmount: 0,
    attachmentCount: 0,
    carryForwardAmount: 0,
    companyId: fund.companyId,
    currencyCode: fund.currencyCode,
    cutOffDate: periodEnd,
    declaredClosingBalanceAmount: fund.currentBalanceAmount,
    estimatedUsageAmount: 0,
    folio: `PC-ST-${year}-${month}`,
    openingBalanceAmount: fund.currentBalanceAmount,
    periodEnd,
    periodKey: `${year}-${month}`,
    periodStart,
    pettyCashFundId: fund.id,
    responsibleName: fund.responsibleName,
    responsibleUserId: fund.responsibleUserId,
    returnedAmount: 0,
    shortageAmount: 0,
    status: 'OPEN',
    verifiedExpenseAmount: 0,
  };
};

const canAuthorizeExpenseFromLine = (line: PettyCashSettlementLine) => (
  line.status === 'DRAFT' || line.status === 'RECEIPT_ATTACHED' || line.status === 'VALIDATED'
);

const canRejectSettlementLine = (line: PettyCashSettlementLine) => canAuthorizeExpenseFromLine(line);

type SettlementLineActionTone = 'amber' | 'blue' | 'green' | 'red' | 'slate' | 'violet';

const settlementLineActionToneClass: Record<SettlementLineActionTone, string> = {
  amber: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
  blue: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300',
  green: 'border-emerald-100 bg-emerald-50 text-[#147514] hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
  red: 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300',
  slate: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  violet: 'border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300',
};

function SettlementLineActionButton({
  children,
  disabled = false,
  label,
  onClick,
  tone = 'slate',
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  tone?: SettlementLineActionTone;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 ${settlementLineActionToneClass[tone]}`}
    >
      {children}
    </button>
  );
}

export function PettyCashReconciliationWorkspace({
  funds,
  initialFundId,
  movements,
  onFundsChange,
  onMovementsChange,
  onSettlementLinesChange,
  onStatementsChange,
  settlementLines,
  statements,
}: PettyCashReconciliationWorkspaceProps) {
  const copy = usePettyCashTranslations();
  const { currentLanguage } = useLanguage();
  const currencyCopy = getOperationalKpiCurrencyCopy(currentLanguage.code);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [selectedFundId, setSelectedFundId] = useState(initialFundId || funds[0]?.id || '');
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [operationView, setOperationView] = useState<OperationView>('expenses');
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<PettyCashSettlementLineStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'with' | 'without'>('all');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [attachmentLine, setAttachmentLine] = useState<PettyCashSettlementLine | null>(null);
  const [closingStatement, setClosingStatement] = useState<PettyCashStatement | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderRecord[]>(mockProviderRecords);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(activePaymentAccountMocks);
  const [accountingAccounts, setAccountingAccounts] = useState<AccountingAccount[]>(activeAccountingAccountMocks);
  const [referenceError, setReferenceError] = useState('');
  const [canAuthorizeWithoutSupport, setCanAuthorizeWithoutSupport] = useState(false);
  const [expenseCreationLineId, setExpenseCreationLineId] = useState<string | null>(null);
  const [rejectingLineId, setRejectingLineId] = useState<string | null>(null);
  const [copyingLineId, setCopyingLineId] = useState<string | null>(null);
  const [deletingLine, setDeletingLine] = useState<PettyCashSettlementLine | null>(null);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  const [statementCloseId, setStatementCloseId] = useState<string | null>(null);

  const selectedFund = funds.find(fund => fund.id === selectedFundId);
  const fundStatements = useMemo(() => (
    statements.filter(statement => statement.pettyCashFundId === selectedFundId)
  ), [selectedFundId, statements]);
  const selectedStatement = fundStatements.find(statement => statement.id === selectedStatementId) ?? fundStatements[0];
  const selectedLines = selectedStatement ? getStatementLines(selectedStatement.id, settlementLines) : [];
  const selectedMovements = movements.filter(movement => (
    movement.pettyCashFundId === selectedFundId
    && (!selectedStatement || movement.pettyCashStatementId === selectedStatement.id)
  ));
  const incomeMovements = selectedMovements.filter(movement => (
    movement.type === 'INITIAL_FUNDING'
    || movement.type === 'ADDITIONAL_DEPOSIT'
    || movement.type === 'CARRY_FORWARD'
  ));
  const depositedAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_MOVEMENT_AMOUNT', preferredCurrency, ids: incomeMovements.map((movement) => movement.id) });
  const capturedAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_SETTLEMENT_AMOUNT', preferredCurrency, ids: selectedLines.map((line) => line.id) });
  const authorizedAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_SETTLEMENT_AMOUNT', preferredCurrency, ids: selectedLines.filter((line) => line.status === 'EXPENSE_CREATED').map((line) => line.id) });
  const selectedFundAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_BALANCE', preferredCurrency, ids: selectedFund ? [selectedFund.id] : [] });
  const depositedPreferred = depositedAggregate.data?.preferredTotal ?? 0;
  const capturedPreferred = capturedAggregate.data?.preferredTotal ?? 0;
  const authorizedPreferred = authorizedAggregate.data?.preferredTotal ?? 0;
  const balancePreferred = selectedFundAggregate.data?.preferredTotal ?? 0;
  const formatAggregate = (aggregate: typeof capturedAggregate, value: number) => (
    aggregate.data && !aggregate.loading
      ? formatPettyCashCurrency(value, preferredCurrency)
      : '—'
  );

  const filteredLines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return selectedLines.filter((line) => {
      const matchesSearch = !search
        || line.description.toLowerCase().includes(search)
        || line.providerName?.toLowerCase().includes(search)
        || line.receiptReference?.toLowerCase().includes(search);
      const matchesStatus = receiptStatusFilter === 'all' || line.status === receiptStatusFilter;
      const matchesProvider = providerFilter === 'all' || line.providerId === providerFilter;
      const matchesEvidence = evidenceFilter === 'all'
        || (evidenceFilter === 'with' ? line.attachmentCount > 0 : line.attachmentCount === 0);
      return matchesSearch && matchesStatus && matchesProvider && matchesEvidence;
    });
  }, [evidenceFilter, providerFilter, receiptStatusFilter, searchTerm, selectedLines]);
  const lineSortAccessors = useMemo(() => ({
    attachments: (line: PettyCashSettlementLine) => line.attachmentCount,
    date: (line: PettyCashSettlementLine) => line.expenseDate,
    provider: (line: PettyCashSettlementLine) => line.providerName ?? '',
    receipt: (line: PettyCashSettlementLine) => line.description,
    status: (line: PettyCashSettlementLine) => line.status,
    total: (line: PettyCashSettlementLine) => line.totalAmount,
  }), []);
  const lineSort = usePettyCashTableSort(filteredLines, lineSortAccessors, 'date', 'desc');
  const linePaginationResetKey = useMemo(
    () => `${searchTerm}:${lineSort.sortKey}:${lineSort.sortDirection}:${filteredLines.map(line => line.id).join('|')}`,
    [filteredLines, lineSort.sortDirection, lineSort.sortKey, searchTerm],
  );
  const linePagination = useTablePagination({
    resetKey: linePaginationResetKey,
    rows: lineSort.sortedRows,
  });
  const filteredIncomeMovements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return incomeMovements;
    return incomeMovements.filter(movement => (
      movement.reference.toLowerCase().includes(search)
      || movement.fromPaymentAccountName?.toLowerCase().includes(search)
      || movement.toPaymentAccountName?.toLowerCase().includes(search)
      || copy.status.movement[movement.type].toLowerCase().includes(search)
    ));
  }, [copy.status.movement, incomeMovements, searchTerm]);
  const movementSortAccessors = useMemo(() => ({
    amount: (movement: PettyCashMovement) => movement.amount,
    date: (movement: PettyCashMovement) => movement.movementDate,
    destination: (movement: PettyCashMovement) => movement.toPaymentAccountName ?? '',
    reference: (movement: PettyCashMovement) => movement.reference,
    source: (movement: PettyCashMovement) => movement.fromPaymentAccountName ?? '',
    type: (movement: PettyCashMovement) => movement.type,
  }), []);
  const movementSort = usePettyCashTableSort(filteredIncomeMovements, movementSortAccessors, 'date', 'desc');
  const movementPagination = useTablePagination({
    resetKey: `${searchTerm}:${movementSort.sortKey}:${movementSort.sortDirection}:${filteredIncomeMovements.map(movement => movement.id).join('|')}`,
    rows: movementSort.sortedRows,
  });

  const ensureStatement = (fund: PettyCashFund) => selectedStatement ?? buildStatementForFund(fund);

  const syncLineAttachmentCount = (line: PettyCashSettlementLine, count: number) => {
    const previousCount = settlementLines.find(item => item.id === line.id)?.attachmentCount ?? line.attachmentCount ?? 0;
    const delta = count - previousCount;

    if (delta === 0) {
      return;
    }

    onSettlementLinesChange(current => current.map(item => (
      item.id === line.id ? { ...item, attachmentCount: count } : item
    )));

    if (delta !== 0) {
      onStatementsChange(current => current.map(statement => (
        statement.id === line.pettyCashStatementId
          ? { ...statement, attachmentCount: Math.max(0, statement.attachmentCount + delta) }
          : statement
      )));
    }
  };

  const uploadReceiptAttachments = async (
    fundId: string,
    lineId: string,
    files: File[],
  ): Promise<PettyCashAttachment[]> => {
    for (const file of files) {
      const contentType = file.type || inferAttachmentContentType(file.name);
      const presign = await pettyCashService.presignSettlementLineAttachmentUpload(fundId, lineId, {
        content_type: contentType,
        file_name: file.name,
        size_bytes: file.size,
      });

      await pettyCashService.uploadSettlementLineAttachment(
        presign.upload_url,
        file,
        contentType,
        presign.upload_headers ?? {},
      );

      await pettyCashService.registerSettlementLineAttachment(fundId, lineId, {
        mime_type: contentType,
        object_key: presign.object_key,
        original_filename: file.name,
        size_bytes: file.size,
      });
    }

    return pettyCashService.listSettlementLineAttachments(fundId, lineId);
  };
  const activePaymentAccounts = useMemo(() => (
    paymentAccounts.filter(account => account.isActive)
  ), [paymentAccounts]);
  const activeProviders = useMemo(() => (
    providers.filter(provider => provider.status === 'active')
  ), [providers]);
  const activeAccountingAccounts = useMemo(() => (
    accountingAccounts.filter(account => account.isActive)
  ), [accountingAccounts]);
  const accountingAccountOptions = useMemo(() => buildAccountingAccountOptions(activeAccountingAccounts), [activeAccountingAccounts]);
  const unitOptions = useMemo(() => buildUnitOptions(funds), [funds]);
  const businessOptions = useMemo(() => buildBusinessOptions(funds), [funds]);
  const userOptions = useMemo(() => buildUserOptions(funds), [funds]);

  useEffect(() => {
    let active = true;
    authApi.getSessionOrNull()
      .then(session => {
        if (active) setCanAuthorizeWithoutSupport(isAdminAccessRole(session?.user.role));
      })
      .catch(() => {
        if (active) setCanAuthorizeWithoutSupport(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (funds.length === 0) {
      setSelectedFundId('');
      setSelectedStatementId('');
      return;
    }

    const requestedFundId = initialFundId && funds.some(fund => fund.id === initialFundId)
      ? initialFundId
      : undefined;

    if (requestedFundId && requestedFundId !== selectedFundId) {
      const nextStatement = statements.find(statement => statement.pettyCashFundId === requestedFundId);
      setSelectedFundId(requestedFundId);
      setSelectedStatementId(nextStatement?.id ?? '');
      return;
    }

    if (!funds.some(fund => fund.id === selectedFundId)) {
      const nextFundId = requestedFundId ?? funds[0].id;
      const nextStatement = statements.find(statement => statement.pettyCashFundId === nextFundId);
      setSelectedFundId(nextFundId);
      setSelectedStatementId(nextStatement?.id ?? '');
    }
  }, [funds, initialFundId, selectedFundId, statements]);

  useEffect(() => {
    if (fundStatements.length === 0) {
      setSelectedStatementId('');
      return;
    }

    if (selectedStatementId && !fundStatements.some(statement => statement.id === selectedStatementId)) {
      setSelectedStatementId(fundStatements[0].id);
    }
  }, [fundStatements, selectedStatementId]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      providersService.getProviderRecords(),
      paymentAccountsService.getPaymentAccounts(),
      accountingAccountsService.getAccountingAccounts(),
    ])
      .then(([providersResult, paymentAccountsResult, accountingAccountsResult]) => {
        if (cancelled) return;
        const errors: string[] = [];

        if (providersResult.status === 'fulfilled' && providersResult.value.length > 0) {
          setProviders(providersResult.value);
        } else if (providersResult.status === 'rejected') {
          errors.push(toFinanceApiErrorMessage(providersResult.reason, copy.reconciliation.errors.providers));
        }

        if (paymentAccountsResult.status === 'fulfilled' && paymentAccountsResult.value.length > 0) {
          setPaymentAccounts(paymentAccountsResult.value);
        } else if (paymentAccountsResult.status === 'rejected') {
          errors.push(toFinanceApiErrorMessage(paymentAccountsResult.reason, copy.reconciliation.errors.paymentAccounts));
        }

        if (accountingAccountsResult.status === 'fulfilled' && accountingAccountsResult.value.length > 0) {
          setAccountingAccounts(accountingAccountsResult.value);
        } else if (accountingAccountsResult.status === 'rejected') {
          errors.push(toFinanceApiErrorMessage(accountingAccountsResult.reason, copy.reconciliation.errors.accountingAccounts));
        }

        setReferenceError(errors.length > 0 ? copy.reconciliation.errors.localReferences : '');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectFund = (fundId: string) => {
    const nextStatement = statements.find(statement => statement.pettyCashFundId === fundId);
    setSelectedFundId(fundId);
    setSelectedStatementId(nextStatement?.id ?? '');
  };

  const handleAddDeposit = async (draft: DepositDraft) => {
    if (!selectedFund) return;
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) return;
    const statement = ensureStatement(selectedFund);
    const movementDate = draft.movementDate || todayIso();
    const sourceAccount = getDepositSourceAccountOptions(selectedFund, activePaymentAccounts)
      .find(account => account.id === draft.sourcePaymentAccountId);
    if (!sourceAccount) {
      setReferenceError(copy.reconciliation.errors.sourceAccount);
      return;
    }
    const localMovement: PettyCashMovement = {
      id: `movement-${Date.now()}`,
      amount,
      companyId: selectedFund.companyId,
      currencyCode: selectedFund.currencyCode,
      fromPaymentAccountId: sourceAccount.id,
      fromPaymentAccountName: sourceAccount.name,
      movementDate,
      pettyCashFundId: selectedFund.id,
      pettyCashStatementId: statement.id,
      reference: draft.reference.trim() || draft.fundingMethod,
      toPaymentAccountId: selectedFund.paymentAccountId,
      toPaymentAccountName: selectedFund.name,
      type: 'ADDITIONAL_DEPOSIT',
    };

    if (hasPettyCashBackendId(selectedFund.id)) {
      try {
        const saved = await pettyCashService.createMovement(selectedFund.id, localMovement);
        onMovementsChange(current => [saved.movement, ...current.filter(movement => movement.id !== saved.movement.id)]);
        onFundsChange(current => current.map(fund => (fund.id === saved.fund.id ? saved.fund : fund)));
        onStatementsChange(current => (
          current.some(currentStatement => currentStatement.id === saved.statement.id)
            ? current.map(currentStatement => (currentStatement.id === saved.statement.id ? saved.statement : currentStatement))
            : [saved.statement, ...current]
        ));
        setSelectedStatementId(saved.statement.id);
        setReferenceError('');
        setIsDepositModalOpen(false);
        return;
      } catch (error) {
        setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.depositSave));
      }
    }

    onMovementsChange(current => ([
      localMovement,
      ...current,
    ]));
    onFundsChange(current => current.map(fund => (
      fund.id === selectedFund.id
        ? { ...fund, currentBalanceAmount: fund.currentBalanceAmount + amount, status: 'OPEN' }
        : fund
    )));
    onStatementsChange(current => {
      const exists = current.some(currentStatement => currentStatement.id === statement.id);
      if (!exists) {
        return [
          {
            ...statement,
            additionalDepositAmount: amount,
            declaredClosingBalanceAmount: selectedFund.currentBalanceAmount + amount,
          },
          ...current,
        ];
      }
      return current.map(currentStatement => (
        currentStatement.id === statement.id
          ? {
            ...currentStatement,
            additionalDepositAmount: currentStatement.additionalDepositAmount + amount,
            declaredClosingBalanceAmount: currentStatement.declaredClosingBalanceAmount + amount,
            status: currentStatement.status === 'SETTLED' ? currentStatement.status : 'OPEN',
          }
          : currentStatement
      ));
    });
    setSelectedStatementId(statement.id);
    setIsDepositModalOpen(false);
  };

  const handleAddReceipt = async (draft: ReceiptDraft) => {
    if (!selectedFund) return;
    const { subtotalAmount, taxAmount, totalAmount } = getReceiptTaxBreakdown(draft);
    if (!totalAmount || totalAmount <= 0) return;
    const statement = ensureStatement(selectedFund);
    const provider = activeProviders.find(item => item.id === draft.providerId);
    const accountingAccount = activeAccountingAccounts.find(account => account.id === draft.accountingAccountId);
    const localLine: PettyCashSettlementLine = {
      id: `settlement-${Date.now()}`,
      accountingAccountId: accountingAccount?.id,
      accountingAccountName: accountingAccount ? formatAccountingAccountLabel(accountingAccount) : undefined,
      attachmentCount: draft.attachments.length,
      companyId: selectedFund.companyId,
      currencyCode: selectedFund.currencyCode,
      description: draft.description.trim(),
      expenseDate: draft.expenseDate || todayIso(),
      pettyCashFundId: selectedFund.id,
      pettyCashStatementId: statement.id,
      providerId: provider?.id,
      providerName: provider?.name,
      receiptReference: draft.receiptReference.trim() || undefined,
      status: draft.attachments.length > 0 ? 'RECEIPT_ATTACHED' : 'DRAFT',
      subtotalAmount,
      taxAmount,
      totalAmount,
    };

    if (hasPettyCashBackendId(selectedFund.id)) {
      try {
        const saved = await pettyCashService.createSettlementLine(selectedFund.id, {
          ...localLine,
          attachmentCount: 0,
          status: 'DRAFT',
        });
        let savedLine = saved.settlementLine;
        let savedStatement = saved.statement;

        if (draft.attachments.length > 0) {
          try {
            const attachments = await uploadReceiptAttachments(selectedFund.id, saved.settlementLine.id, draft.attachments);
            savedLine = {
              ...saved.settlementLine,
              attachmentCount: attachments.length,
              status: attachments.length > 0 ? 'RECEIPT_ATTACHED' : 'DRAFT',
            };
            savedStatement = { ...saved.statement, attachmentCount: saved.statement.attachmentCount + attachments.length };
          } catch (uploadError) {
            setReferenceError(toFinanceApiErrorMessage(uploadError, copy.reconciliation.errors.receiptUploadPartial));
          }
        }

        onSettlementLinesChange(current => [
          savedLine,
          ...current.filter(line => line.id !== savedLine.id),
        ]);
        onFundsChange(current => current.map(fund => (fund.id === saved.fund.id ? saved.fund : fund)));
        onStatementsChange(current => (
          current.some(currentStatement => currentStatement.id === savedStatement.id)
            ? current.map(currentStatement => (currentStatement.id === savedStatement.id ? savedStatement : currentStatement))
            : [savedStatement, ...current]
        ));
        setSelectedStatementId(savedStatement.id);
        if (draft.attachments.length === 0) {
          setReferenceError('');
        }
        setIsReceiptModalOpen(false);
        return;
      } catch (error) {
        setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.receiptSave));
      }
    }

    onSettlementLinesChange(current => ([
      localLine,
      ...current,
    ]));
    onFundsChange(current => current.map((fund) => {
      if (fund.id !== selectedFund.id) return fund;
      const nextBalance = fund.currentBalanceAmount - totalAmount;
      const nextStatus = nextBalance <= fund.limitAmount * 0.15 ? 'LOW_BALANCE' : fund.status;
      return {
        ...fund,
        currentBalanceAmount: nextBalance,
        status: nextStatus,
      };
    }));
    onStatementsChange(current => {
      const exists = current.some(currentStatement => currentStatement.id === statement.id);
      if (!exists) {
        return [
          {
            ...statement,
            attachmentCount: localLine.attachmentCount,
            declaredClosingBalanceAmount: selectedFund.currentBalanceAmount - totalAmount,
            estimatedUsageAmount: totalAmount,
            status: 'CUT_PENDING',
          },
          ...current,
        ];
      }
      return current.map(currentStatement => (
        currentStatement.id === statement.id
          ? {
            ...currentStatement,
            attachmentCount: currentStatement.attachmentCount + localLine.attachmentCount,
            declaredClosingBalanceAmount: currentStatement.declaredClosingBalanceAmount - totalAmount,
            estimatedUsageAmount: currentStatement.estimatedUsageAmount + totalAmount,
            status: currentStatement.status === 'SETTLED' ? 'PARTIALLY_SETTLED' : 'CUT_PENDING',
          }
          : currentStatement
      ));
    });
    setSelectedStatementId(statement.id);
    setIsReceiptModalOpen(false);
  };

  const handleCreateExpenseFromLine = async (line: PettyCashSettlementLine) => {
    if (!selectedFund || line.status === 'EXPENSE_CREATED') return;
    if (!canAuthorizeExpenseFromLine(line)) {
      setReferenceError(copy.reconciliation.errors.expenseNeedsReceipt);
      return;
    }
    if (line.status === 'DRAFT' && !canAuthorizeWithoutSupport) {
      setReferenceError(copy.reconciliation.errors.expenseNeedsAdmin);
      return;
    }
    if (!hasPettyCashBackendId(selectedFund.id) || !hasPettyCashBackendId(line.id)) {
      setReferenceError(copy.reconciliation.errors.expenseNeedsBackend);
      return;
    }

    setExpenseCreationLineId(line.id);
    try {
      const saved = await pettyCashService.createExpenseFromSettlementLine(selectedFund.id, line.id);
      onSettlementLinesChange(current => current.map(currentLine => (
        currentLine.id === saved.settlementLine.id ? saved.settlementLine : currentLine
      )));
      onFundsChange(current => current.map(fund => (fund.id === saved.fund.id ? saved.fund : fund)));
      onStatementsChange(current => current.map(statement => (
        statement.id === saved.statement.id ? saved.statement : statement
      )));
      setReferenceError('');
    } catch (error) {
      setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.expenseCreate));
    } finally {
      setExpenseCreationLineId(null);
    }
  };

  const handleRejectSettlementLine = async (line: PettyCashSettlementLine) => {
    if (!selectedFund || !canRejectSettlementLine(line)) return;
    setRejectingLineId(line.id);
    try {
      if (hasPettyCashBackendId(selectedFund.id) && hasPettyCashBackendId(line.id)) {
        const saved = await pettyCashService.rejectSettlementLine(selectedFund.id, line.id);
        onSettlementLinesChange(current => current.map(currentLine => (
          currentLine.id === saved.settlementLine.id ? saved.settlementLine : currentLine
        )));
        onFundsChange(current => current.map(fund => (fund.id === saved.fund.id ? saved.fund : fund)));
        onStatementsChange(current => current.map(statement => (
          statement.id === saved.statement.id ? saved.statement : statement
        )));
      } else {
        onSettlementLinesChange(current => current.map(currentLine => (
          currentLine.id === line.id ? { ...currentLine, status: 'REJECTED' } : currentLine
        )));
      }
      setReferenceError('');
    } catch (error) {
      setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.receiptReject));
    } finally {
      setRejectingLineId(null);
    }
  };

  const handleCopySettlementLine = async (line: PettyCashSettlementLine) => {
    if (!selectedFund || !selectedStatement) return;
    const copyLine: PettyCashSettlementLine = {
      ...line,
      id: `settlement-${Date.now()}`,
      attachmentCount: 0,
      expenseId: undefined,
      receiptReference: line.receiptReference ? `${line.receiptReference} · ${copy.common.copied}` : undefined,
      status: 'DRAFT',
    };

    setCopyingLineId(line.id);
    try {
      if (hasPettyCashBackendId(selectedFund.id) && hasPettyCashBackendId(selectedStatement.id)) {
        const saved = await pettyCashService.createSettlementLine(selectedFund.id, copyLine);
        onSettlementLinesChange(current => [saved.settlementLine, ...current]);
        onFundsChange(current => current.map(fund => fund.id === saved.fund.id ? saved.fund : fund));
        onStatementsChange(current => current.map(statement => statement.id === saved.statement.id ? saved.statement : statement));
      } else {
        onSettlementLinesChange(current => [copyLine, ...current]);
        onFundsChange(current => current.map(fund => fund.id === selectedFund.id
          ? { ...fund, currentBalanceAmount: fund.currentBalanceAmount - copyLine.totalAmount }
          : fund));
        onStatementsChange(current => current.map(statement => statement.id === selectedStatement.id
          ? {
            ...statement,
            declaredClosingBalanceAmount: statement.declaredClosingBalanceAmount - copyLine.totalAmount,
            estimatedUsageAmount: statement.estimatedUsageAmount + copyLine.totalAmount,
            status: statement.status === 'SETTLED' ? 'PARTIALLY_SETTLED' : 'CUT_PENDING',
          }
          : statement));
      }
      setReferenceError('');
    } catch (error) {
      setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.receiptSave));
    } finally {
      setCopyingLineId(null);
    }
  };

  const handleDeleteSettlementLine = async () => {
    if (!selectedFund || !deletingLine) return;
    const line = deletingLine;
    const wasExpenseCreated = line.status === 'EXPENSE_CREATED';
    setDeletingLineId(line.id);
    try {
      if (hasPettyCashBackendId(selectedFund.id) && hasPettyCashBackendId(line.id)) {
        await pettyCashService.deleteSettlementLine(selectedFund.id, line.id);
      }
      onSettlementLinesChange(current => current.filter(item => item.id !== line.id));
      onFundsChange(current => current.map(fund => fund.id === selectedFund.id
        ? {
          ...fund,
          currentBalanceAmount: fund.currentBalanceAmount + line.totalAmount,
          status: fund.status === 'LOW_BALANCE' && fund.currentBalanceAmount + line.totalAmount > fund.limitAmount * 0.15 ? 'OPEN' : fund.status,
        }
        : fund));
      onStatementsChange(current => current.map(statement => statement.id === line.pettyCashStatementId
        ? {
          ...statement,
          attachmentCount: Math.max(0, statement.attachmentCount - line.attachmentCount),
          declaredClosingBalanceAmount: statement.declaredClosingBalanceAmount + line.totalAmount,
          estimatedUsageAmount: Math.max(0, statement.estimatedUsageAmount - line.totalAmount),
          verifiedExpenseAmount: wasExpenseCreated
            ? Math.max(0, statement.verifiedExpenseAmount - line.totalAmount)
            : statement.verifiedExpenseAmount,
          status: Math.max(0, statement.estimatedUsageAmount - line.totalAmount) === 0
            ? 'OPEN'
            : wasExpenseCreated && Math.max(0, statement.verifiedExpenseAmount - line.totalAmount) > 0
              ? 'PARTIALLY_SETTLED'
              : statement.status,
        }
        : statement));
      setDeletingLine(null);
      setReferenceError('');
    } catch (error) {
      setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.receiptDelete));
    } finally {
      setDeletingLineId(null);
    }
  };

  const handleCreateProvider = async (values: ProviderFormValues) => {
    const provider = createProviderRecord(providers, values);
    try {
      const savedProvider = await providersService.createProvider(provider);
      setProviders(current => [savedProvider, ...current]);
      setReferenceError('');
    } catch (error) {
      setProviders(current => [provider, ...current]);
      setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.providerCreate));
    }
    setIsProviderModalOpen(false);
  };

  const handleQuickProviderCreate = async (name: string): Promise<Provider> => {
    const normalizedName = name.trim();
    const existingProvider = providers.find(provider => (
      provider.status === 'active'
      && provider.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase()
    ));

    if (existingProvider) {
      return toExpenseProvider(existingProvider);
    }

    const provider = createQuickProviderRecord(providers, normalizedName);
    try {
      const savedProvider = await providersService.createProvider(provider);
      setProviders(current => [
        savedProvider,
        ...current.filter(currentProvider => currentProvider.id !== savedProvider.id),
      ]);
      setReferenceError('');
      return toExpenseProvider(savedProvider);
    } catch (error) {
      setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.providerCreate));
      throw error;
    }
  };

  const handleCloseStatement = async (statement: PettyCashStatement, draft: CloseStatementDraft) => {
    const fund = getFundById(funds, statement.pettyCashFundId);
    if (!fund) return;
    if (!hasPettyCashBackendId(fund.id) || !hasPettyCashBackendId(statement.id)) {
      setReferenceError(copy.reconciliation.errors.closeNeedsBackend);
      return;
    }

    setStatementCloseId(statement.id);
    try {
      const saved = await pettyCashService.closeStatement(fund.id, statement.id, {
        action: draft.action,
        closeDate: draft.closeDate,
        reference: draft.reference.trim() || undefined,
        shortageAmount: Number(draft.shortageAmount) || undefined,
      });
      onFundsChange(current => current.map(currentFund => (currentFund.id === saved.fund.id ? saved.fund : currentFund)));
      onStatementsChange(current => {
        const withClosed = current.map(currentStatement => (
          currentStatement.id === saved.statement.id ? saved.statement : currentStatement
        ));
        if (!saved.nextStatement) return withClosed;
        return withClosed.some(currentStatement => currentStatement.id === saved.nextStatement?.id)
          ? withClosed.map(currentStatement => (currentStatement.id === saved.nextStatement?.id ? saved.nextStatement : currentStatement))
          : [saved.nextStatement, ...withClosed];
      });
      setClosingStatement(null);
      setReferenceError('');
    } catch (error) {
      setReferenceError(toFinanceApiErrorMessage(error, copy.reconciliation.errors.closeFailed));
    } finally {
      setStatementCloseId(null);
    }
  };

  const handleDownloadStatementPdf = (statement: PettyCashStatement) => {
    const fund = getFundById(funds, statement.pettyCashFundId);
    if (!fund) return;

    downloadPettyCashStatementPdf({
      copy,
      fund,
      locale: copy.locale,
      movements,
      settlementLines: getStatementLines(statement.id, settlementLines),
      statement,
    });
  };

  return (
    <div className="space-y-6">
      <PettyCashHeaderBanner
        actionLabel={copy.reconciliation.header.uploadReceipt}
        description={copy.reconciliation.header.description}
        emoji="🧾"
        onAction={() => setIsReceiptModalOpen(true)}
        onSecondaryAction={() => setIsDepositModalOpen(true)}
        onTertiaryAction={() => setIsProviderModalOpen(true)}
        secondaryActionIcon={Banknote}
        secondaryActionLabel={copy.reconciliation.header.deposit}
        tertiaryActionIcon={Building2}
        tertiaryActionLabel={copy.reconciliation.header.provider}
        title={copy.reconciliation.header.title}
      />

      {referenceError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {referenceError}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-medium text-slate-800 dark:text-white">{copy.common.selectFund}</h3>
          <div className="inline-flex h-10 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
            <button type="button" aria-pressed={operationView === 'expenses'} onClick={() => { setOperationView('expenses'); setSearchTerm(''); }} className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${operationView === 'expenses' ? 'bg-[#147514] text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'}`}><ReceiptText className="h-4 w-4" />{copy.reconciliation.views.expenses}</button>
            <button type="button" aria-pressed={operationView === 'income'} onClick={() => { setOperationView('income'); setSearchTerm(''); }} className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${operationView === 'income' ? 'bg-[#147514] text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'}`}><Banknote className="h-4 w-4" />{copy.reconciliation.views.income}</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <PettyCashField label={copy.reconciliation.filters.fund}><select className={pettyCashInputClass} onChange={(event) => handleSelectFund(event.target.value)} value={selectedFundId}>{funds.map(fund => <option key={fund.id} value={fund.id}>{fund.name} · {fund.responsibleName}</option>)}</select></PettyCashField>
          </div>
          <div>
            <PettyCashField label={copy.reconciliation.filters.statement}><select className={pettyCashInputClass} onChange={(event) => setSelectedStatementId(event.target.value)} value={selectedStatement?.id ?? ''}>{fundStatements.length > 0 ? fundStatements.map(statement => <option key={statement.id} value={statement.id}>{statement.periodKey} · {statement.folio}</option>) : <option value="">{copy.common.automaticCurrentStatement}</option>}</select></PettyCashField>
          </div>
        </div>
      </section>

      <PettyCashFilterShell
        activeAdvancedCount={operationView === 'expenses' ? Number(providerFilter !== 'all') + Number(evidenceFilter !== 'all') : 0}
        advancedContent={operationView === 'expenses' ? (
          <>
            <PettyCashField label={copy.reconciliation.receipts.columns.provider}><select className={pettyCashInputClass} onChange={event => setProviderFilter(event.target.value)} value={providerFilter}><option value="all">{copy.common.all}</option>{activeProviders.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></PettyCashField>
            <PettyCashField label={copy.reconciliation.filters.evidence}><select className={pettyCashInputClass} onChange={event => setEvidenceFilter(event.target.value as 'all' | 'with' | 'without')} value={evidenceFilter}><option value="all">{copy.common.all}</option><option value="with">{copy.reconciliation.filters.withEvidence}</option><option value="without">{copy.reconciliation.filters.withoutEvidence}</option></select></PettyCashField>
          </>
        ) : undefined}
        hasActiveFilters={Boolean(searchTerm || (operationView === 'expenses' && (providerFilter !== 'all' || receiptStatusFilter !== 'all' || evidenceFilter !== 'all')))}
        onClear={() => {
          setSearchTerm('');
          setProviderFilter('all');
          setReceiptStatusFilter('all');
          setEvidenceFilter('all');
        }}
        resultLabel={operationView === 'expenses' ? copy.reconciliation.filters.result(filteredLines.length) : copy.reconciliation.movements.result(filteredIncomeMovements.length)}
      >
        <PettyCashField label={operationView === 'expenses' ? copy.reconciliation.filters.searchReceipt : copy.reconciliation.filters.searchIncome}>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" className={`${pettyCashInputClass} pl-9`} onChange={event => setSearchTerm(event.target.value)} placeholder={operationView === 'expenses' ? copy.reconciliation.filters.searchPlaceholder : copy.reconciliation.filters.incomeSearchPlaceholder} value={searchTerm} /></div>
        </PettyCashField>
        {operationView === 'expenses' ? <PettyCashField label={copy.reconciliation.filters.status}><select className={pettyCashInputClass} onChange={event => setReceiptStatusFilter(event.target.value as PettyCashSettlementLineStatus | 'all')} value={receiptStatusFilter}><option value="all">{copy.common.all}</option>{(['DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED', 'EXPENSE_CREATED', 'REJECTED'] as PettyCashSettlementLineStatus[]).map(value => <option key={value} value={value}>{copy.status.line[value]}</option>)}</select></PettyCashField> : null}
      </PettyCashFilterShell>

      {selectedFund ? <>
        <div className="flex flex-col gap-3 rounded-xl border border-[#147514]/20 bg-[#147514]/5 px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-400/10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span><strong>{selectedFund.name}</strong> · {selectedFund.responsibleName}</span>
            <span>{copy.reconciliation.operation.currentBalance}: <strong className={selectedFund.currentBalanceAmount < 0 ? 'text-red-600' : 'text-[#147514]'}>{formatPettyCashCurrency(selectedFund.currentBalanceAmount, selectedFund.currencyCode)}</strong></span>
            {selectedStatement ? <PettyCashStatusPill kind="statement" status={selectedStatement.status} /> : null}
          </div>
        </div>

        <OperationalKpiArea
          alertChips={[
            { id: 'preferred-currency', icon: <Coins className="h-3.5 w-3.5" />, label: copy.common.preferredCurrency(preferredCurrency), tone: 'info' },
            { id: 'native-balance', icon: <WalletCards className="h-3.5 w-3.5" />, label: copy.common.nativeBreakdown(formatPettyCashCurrency(selectedFund.currentBalanceAmount, selectedFund.currencyCode)), tone: 'neutral' },
            ...(selectedLines.some(line => line.attachmentCount === 0) ? [{
              id: 'missing-evidence',
              icon: <Paperclip className="h-3.5 w-3.5" />,
              label: `${selectedLines.filter(line => line.attachmentCount === 0).length} ${copy.reconciliation.filters.withoutEvidence}`,
              tone: 'warning' as const,
              active: evidenceFilter === 'without',
              onClick: () => setEvidenceFilter(current => current === 'without' ? 'all' : 'without'),
            }] : []),
          ]}
          distributionSegments={[
            ...(['DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED', 'EXPENSE_CREATED', 'REJECTED'] as PettyCashSettlementLineStatus[]).map((lineStatus, index) => ({
              id: lineStatus,
              label: copy.status.line[lineStatus],
              count: selectedLines.filter(line => line.status === lineStatus).length,
              className: ['bg-amber-400', 'bg-sky-400', 'bg-blue-500', 'bg-[#147514]', 'bg-rose-500'][index],
              active: receiptStatusFilter === lineStatus,
              onClick: () => setReceiptStatusFilter(current => current === lineStatus ? 'all' : lineStatus),
            })),
          ]}
          insight={copy.reconciliation.operation.signal(
            selectedLines.filter(line => line.status !== 'EXPENSE_CREATED' && line.status !== 'REJECTED').length,
            selectedLines.filter(line => line.status === 'VALIDATED' || line.status === 'RECEIPT_ATTACHED').length,
            formatPettyCashCurrency(Math.max(0, capturedPreferred - authorizedPreferred), preferredCurrency),
          )}
          insightIcon={<Info className="h-4 w-4" />}
          metrics={[
            { id: 'deposited', icon: <Banknote className="h-4 w-4" />, label: copy.reconciliation.metrics.deposited, value: formatAggregate(depositedAggregate, depositedPreferred), valueClassName: 'text-sky-600' },
            { id: 'captured', icon: <ReceiptText className="h-4 w-4" />, label: copy.reconciliation.operation.captured, value: formatAggregate(capturedAggregate, capturedPreferred), valueClassName: 'text-amber-600' },
            { id: 'authorized', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.reconciliation.operation.authorized, value: formatAggregate(authorizedAggregate, authorizedPreferred), valueClassName: 'text-[#147514]', active: receiptStatusFilter === 'EXPENSE_CREATED', onClick: () => setReceiptStatusFilter(current => current === 'EXPENSE_CREATED' ? 'all' : 'EXPENSE_CREATED') },
            { id: 'balance', icon: <WalletCards className="h-4 w-4" />, label: copy.reconciliation.operation.currentBalance, value: formatAggregate(selectedFundAggregate, balancePreferred), valueClassName: selectedFund.currentBalanceAmount < 0 ? 'text-rose-600' : 'text-[#147514]' },
          ]}
          currencyContext={{
            preferredCurrency,
            nativeBreakdown: formatPettyCashCurrency(selectedFund.currentBalanceAmount, selectedFund.currencyCode),
            rateLabel: selectedFundAggregate.data?.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : currencyCopy.unavailable,
            effectiveDate: selectedFundAggregate.data?.exchangeRate.effectiveDate,
            source: selectedFundAggregate.data?.exchangeRate.source,
            isPartial: Boolean(selectedFundAggregate.error || selectedFundAggregate.data?.partial),
            excludedCount: selectedFundAggregate.data?.excludedRecords ?? (selectedFundAggregate.error ? 1 : 0),
            labels: currencyCopy,
          }}
        />

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-xl font-medium text-slate-900 dark:text-white">{operationView === 'expenses' ? copy.reconciliation.receipts.title : copy.reconciliation.movements.title}</h3><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{operationView === 'expenses' ? copy.reconciliation.receipts.subtitle : copy.reconciliation.movements.subtitle}</p></div>
          </div>

          {operationView === 'expenses' ? (filteredLines.length > 0 ? <>
            <div className="space-y-3 p-3 md:hidden">
              {linePagination.paginatedRows.map(line => {
                const isCaptured = line.status === 'DRAFT';
                const canAuthorizeExpense = canAuthorizeExpenseFromLine(line) && (!isCaptured || canAuthorizeWithoutSupport);
                const canRejectLine = canRejectSettlementLine(line);
                const isLineActionBusy = copyingLineId === line.id || deletingLineId === line.id || expenseCreationLineId === line.id || rejectingLineId === line.id;
                const authorizeLabel = isCaptured ? copy.reconciliation.receipts.authorizeWithoutSupport : copy.reconciliation.receipts.authorize;

                return (
                  <article key={line.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{line.description}</p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{line.providerName ?? copy.common.notAvailable} · {formatPettyCashIsoDate(line.expenseDate)}</p>
                      </div>
                      <PettyCashStatusPill kind="line" status={line.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-y border-slate-100 py-3 dark:border-slate-800">
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{line.receiptReference ?? copy.reconciliation.receipts.noReference}</p>
                      <p className="shrink-0 text-base font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(line.totalAmount, line.currencyCode)}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" onClick={() => setAttachmentLine(line)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#147514]/25 bg-white px-3 text-sm font-medium text-[#147514] transition hover:bg-[#147514]/5 dark:border-emerald-400/25 dark:bg-slate-900 dark:text-emerald-300">
                        <Paperclip className="h-4 w-4" />
                        {copy.common.fileCount(line.attachmentCount)}
                      </button>
                      {canAuthorizeExpense ? (
                        <button type="button" disabled={isLineActionBusy} onClick={() => void handleCreateExpenseFromLine(line)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#147514] text-white transition hover:bg-[#105010] disabled:opacity-50" title={authorizeLabel} aria-label={authorizeLabel}>
                          {expenseCreationLineId === line.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" disabled={isLineActionBusy} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#147514]/30 hover:text-[#147514] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title={copy.common.actions} aria-label={copy.common.actions}>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                          <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => void handleCopySettlementLine(line)}><Copy />{copy.reconciliation.receipts.copy}</DropdownMenuItem>
                          {canRejectLine ? <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => void handleRejectSettlementLine(line)}><Ban />{copy.reconciliation.receipts.reject}</DropdownMenuItem> : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="rounded-lg py-2.5" variant="destructive" onClick={() => setDeletingLine(line)}><Trash2 />{copy.reconciliation.receipts.delete}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px]"><thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"><tr>
              <PettyCashSortableHeader columnKey="receipt" label={copy.reconciliation.receipts.columns.receipt} onSort={lineSort.onSort} sortDirection={lineSort.sortDirection} sortKey={lineSort.sortKey} />
              <PettyCashSortableHeader columnKey="provider" label={copy.reconciliation.receipts.columns.provider} onSort={lineSort.onSort} sortDirection={lineSort.sortDirection} sortKey={lineSort.sortKey} />
              <PettyCashSortableHeader columnKey="date" label={copy.reconciliation.receipts.columns.date} onSort={lineSort.onSort} sortDirection={lineSort.sortDirection} sortKey={lineSort.sortKey} />
              <PettyCashSortableHeader columnKey="total" label={copy.reconciliation.receipts.columns.total} onSort={lineSort.onSort} sortDirection={lineSort.sortDirection} sortKey={lineSort.sortKey} />
              <PettyCashSortableHeader columnKey="attachments" label={copy.reconciliation.receipts.columns.attachments} onSort={lineSort.onSort} sortDirection={lineSort.sortDirection} sortKey={lineSort.sortKey} />
              <PettyCashSortableHeader columnKey="status" label={copy.reconciliation.receipts.columns.status} onSort={lineSort.onSort} sortDirection={lineSort.sortDirection} sortKey={lineSort.sortKey} />
              <PettyCashSortableHeader align="right" label={copy.reconciliation.receipts.columns.actions} />
            </tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {linePagination.paginatedRows.map(line => {
                  const isCaptured = line.status === 'DRAFT';
                  const canAuthorizeExpense = canAuthorizeExpenseFromLine(line)
                    && (!isCaptured || canAuthorizeWithoutSupport);
                  const canRejectLine = canRejectSettlementLine(line);
                  const isLineActionBusy = copyingLineId === line.id
                    || deletingLineId === line.id
                    || expenseCreationLineId === line.id
                    || rejectingLineId === line.id;
                  const canDeleteLine = deletingLineId !== line.id;
                  const authorizeLabel = isCaptured
                    ? copy.reconciliation.receipts.authorizeWithoutSupport
                    : copy.reconciliation.receipts.authorize;

                  return (
                    <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{line.description}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{line.receiptReference ?? copy.reconciliation.receipts.noReference}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{line.providerName ?? copy.common.notAvailable}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{line.accountingAccountName ?? copy.common.notAvailable}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{formatPettyCashIsoDate(line.expenseDate)}</td>
                      <td className="px-5 py-4 text-sm font-medium text-[#147514]">{formatPettyCashCurrency(line.totalAmount, line.currencyCode)}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setAttachmentLine(line)}
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <Paperclip className="h-4 w-4 text-[#147514]" />
                          {line.attachmentCount}
                        </button>
                      </td>
                      <td className="px-5 py-4"><PettyCashStatusPill kind="line" status={line.status} /></td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <SettlementLineActionButton
                            label={`${copy.reconciliation.receipts.copy}: ${line.description}`}
                            disabled={isLineActionBusy}
                            onClick={() => void handleCopySettlementLine(line)}
                            tone="blue"
                          >
                            {copyingLineId === line.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                          </SettlementLineActionButton>

                          <SettlementLineActionButton
                            label={`${copy.reconciliation.receipts.delete}: ${line.description}`}
                            disabled={!canDeleteLine || isLineActionBusy}
                            onClick={() => setDeletingLine(line)}
                            tone="red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </SettlementLineActionButton>

                          {canAuthorizeExpense ? (
                            <SettlementLineActionButton
                              label={`${authorizeLabel}: ${line.description}`}
                              disabled={isLineActionBusy}
                              onClick={() => void handleCreateExpenseFromLine(line)}
                              tone="green"
                            >
                              {expenseCreationLineId === line.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            </SettlementLineActionButton>
                          ) : null}

                          {canRejectLine ? (
                            <SettlementLineActionButton
                              label={`${copy.reconciliation.receipts.reject}: ${line.description}`}
                              disabled={isLineActionBusy}
                              onClick={() => void handleRejectSettlementLine(line)}
                              tone="amber"
                            >
                              {rejectingLineId === line.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            </SettlementLineActionButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody></table></div>
            <PettyCashPagination currentPage={linePagination.currentPage} itemLabel={copy.reconciliation.receipts.itemLabel} onPageChange={linePagination.onPageChange} onPageSizeChange={linePagination.onPageSizeChange} pageEnd={linePagination.pageEnd} pageSize={linePagination.pageSize} pageSizeOptions={linePagination.pageSizeOptions} pageStart={linePagination.pageStart} totalCount={linePagination.totalCount} totalPages={linePagination.totalPages} />
          </> : <div className="p-5"><PettyCashEmptyState label={copy.reconciliation.receipts.empty} /></div>) : (filteredIncomeMovements.length > 0 ? <>
            <div className="space-y-3 p-3 md:hidden">
              {movementPagination.paginatedRows.map(movement => (
                <article key={movement.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{copy.status.movement[movement.type]}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatPettyCashIsoDate(movement.movementDate)}</p></div>
                    <p className="shrink-0 text-base font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs dark:border-slate-800">
                    <div><dt className="text-slate-500 dark:text-slate-400">{copy.reconciliation.movements.columns.source}</dt><dd className="mt-1 truncate font-medium text-slate-800 dark:text-slate-100">{movement.fromPaymentAccountName ?? copy.common.notAvailable}</dd></div>
                    <div className="text-right"><dt className="text-slate-500 dark:text-slate-400">{copy.reconciliation.movements.columns.destination}</dt><dd className="mt-1 truncate font-medium text-slate-800 dark:text-slate-100">{movement.toPaymentAccountName ?? selectedFund.name}</dd></div>
                  </dl>
                  <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">{movement.reference || copy.common.noReference}</p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px]"><thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"><tr>
              <PettyCashSortableHeader columnKey="date" label={copy.reconciliation.movements.columns.date} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
              <PettyCashSortableHeader columnKey="type" label={copy.reconciliation.movements.columns.type} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
              <PettyCashSortableHeader columnKey="source" label={copy.reconciliation.movements.columns.source} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
              <PettyCashSortableHeader columnKey="destination" label={copy.reconciliation.movements.columns.destination} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
              <PettyCashSortableHeader columnKey="reference" label={copy.reconciliation.movements.columns.reference} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
              <PettyCashSortableHeader columnKey="amount" label={copy.reconciliation.movements.columns.amount} onSort={movementSort.onSort} sortDirection={movementSort.sortDirection} sortKey={movementSort.sortKey} />
            </tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-700">{movementPagination.paginatedRows.map(movement => <tr key={movement.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50"><td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{formatPettyCashIsoDate(movement.movementDate)}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">{copy.status.movement[movement.type]}</span></td><td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{movement.fromPaymentAccountName ?? copy.common.notAvailable}</td><td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{movement.toPaymentAccountName ?? selectedFund.name}</td><td className="px-5 py-4 text-sm font-medium text-slate-500">{movement.reference || copy.common.noReference}</td><td className="px-5 py-4 text-sm font-medium tabular-nums text-[#147514]">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</td></tr>)}</tbody></table></div>
            <PettyCashPagination currentPage={movementPagination.currentPage} itemLabel={copy.reconciliation.movements.itemLabel} onPageChange={movementPagination.onPageChange} onPageSizeChange={movementPagination.onPageSizeChange} pageEnd={movementPagination.pageEnd} pageSize={movementPagination.pageSize} pageSizeOptions={movementPagination.pageSizeOptions} pageStart={movementPagination.pageStart} totalCount={movementPagination.totalCount} totalPages={movementPagination.totalPages} />
          </> : <div className="p-5"><PettyCashEmptyState label={copy.reconciliation.movements.empty} /></div>)}
        </section>
      </> : <PettyCashEmptyState label={copy.reconciliation.statements.emptyFund} />}

      {isDepositModalOpen && selectedFund ? (
        <DepositModal
          paymentAccounts={activePaymentAccounts}
          fund={selectedFund}
          onClose={() => setIsDepositModalOpen(false)}
          onSave={handleAddDeposit}
        />
      ) : null}

      {isReceiptModalOpen && selectedFund ? (
        <ReceiptModal
          accountingAccounts={activeAccountingAccounts}
          fund={selectedFund}
          onClose={() => setIsReceiptModalOpen(false)}
          onCreateProvider={handleQuickProviderCreate}
          providers={activeProviders}
          onSave={handleAddReceipt}
        />
      ) : null}

      {attachmentLine ? (
        <PettyCashAttachmentsModal
          fundId={attachmentLine.pettyCashFundId}
          line={attachmentLine}
          onClose={() => setAttachmentLine(null)}
          onCountChange={syncLineAttachmentCount}
        />
      ) : null}

      {closingStatement ? (
        <CloseStatementModal
          statement={closingStatement}
          fund={getFundById(funds, closingStatement.pettyCashFundId)}
          isSaving={statementCloseId === closingStatement.id}
          onClose={() => setClosingStatement(null)}
          onSave={(draft) => handleCloseStatement(closingStatement, draft)}
        />
      ) : null}

      {isProviderModalOpen ? (
        <ProviderCreateModal
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={businessOptions}
          onClose={() => setIsProviderModalOpen(false)}
          onSubmit={handleCreateProvider}
          submitLabel={copy.reconciliation.providerModal.submit}
          subtitle={copy.reconciliation.providerModal.subtitle}
          title={copy.reconciliation.providerModal.title}
          unitOptions={unitOptions}
          userOptions={userOptions}
        />
      ) : null}

      <ConfirmDeleteDialog
        isVisible={Boolean(deletingLine)}
        title={copy.reconciliation.receipts.deleteTitle}
        itemName={deletingLine?.description}
        description={copy.reconciliation.receipts.deleteDescription}
        confirmLabel={copy.reconciliation.receipts.deleteConfirm}
        cancelLabel={copy.common.cancel}
        confirmDisabled={Boolean(deletingLineId)}
        onCancel={() => setDeletingLine(null)}
        onConfirm={handleDeleteSettlementLine}
      />
    </div>
  );
}

function CloseStatementModal({
  fund,
  isSaving,
  onClose,
  onSave,
  statement,
}: {
  fund?: PettyCashFund;
  isSaving: boolean;
  onClose: () => void;
  onSave: (draft: CloseStatementDraft) => void | Promise<void>;
  statement: PettyCashStatement;
}) {
  const copy = usePettyCashTranslations();
  const closingBalance = statement.declaredClosingBalanceAmount;
  const pendingAmount = getStatementSettlementBalance(statement);
  const defaultAction: PettyCashStatementCloseAction = closingBalance > 0 ? 'CARRY_FORWARD' : 'CLOSE_CLEAN';
  const [draft, setDraft] = useState<CloseStatementDraft>({
    action: defaultAction,
    closeDate: todayIso(),
    reference: '',
    shortageAmount: '',
  });
  const hasBalance = closingBalance > 0;
  const isShortageAction = draft.action === 'FORGIVE_SHORTAGE' || draft.action === 'CHARGE_EMPLOYEE';
  const shortageAmount = Number(draft.shortageAmount) || 0;
  const canSave = pendingAmount <= 0
    && (isShortageAction ? shortageAmount > 0 && shortageAmount <= closingBalance : (draft.action === 'CLOSE_CLEAN' ? !hasBalance : hasBalance))
    && !isSaving;

  return (
    <PettyCashOperationModal
      actionLabel={isSaving ? copy.reconciliation.statements.closing : copy.reconciliation.statements.close}
      canSave={canSave}
      icon={isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
      busy={isSaving}
      onClose={onClose}
      onSave={() => onSave(draft)}
      subtitle={`${statement.folio}${fund ? ` - ${fund.name}` : ''}`}
      title={copy.reconciliation.closeModal.title}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{copy.reconciliation.closeModal.cashBalance}</span>
          <p className="mt-2 text-lg font-medium text-[#147514]">{formatPettyCashCurrency(closingBalance, statement.currencyCode)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{copy.reconciliation.closeModal.pending}</span>
          <p className={`mt-2 text-lg font-medium ${pendingAmount > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
            {formatPettyCashCurrency(pendingAmount, statement.currencyCode)}
          </p>
        </div>
        <PettyCashField label={copy.reconciliation.closeModal.action}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, action: event.target.value as PettyCashStatementCloseAction }))}
            value={draft.action}
          >
            <option disabled={hasBalance} value="CLOSE_CLEAN">{copy.reconciliation.closeModal.closeClean}</option>
            <option disabled={!hasBalance} value="CARRY_FORWARD">{copy.reconciliation.closeModal.carryForward}</option>
            <option disabled={!hasBalance} value="RETURN_TO_SOURCE">{copy.reconciliation.closeModal.returnToSource}</option>
            <option disabled={!hasBalance} value="CHARGE_EMPLOYEE">{copy.reconciliation.closeModal.chargeEmployee}</option>
            <option disabled={!hasBalance} value="FORGIVE_SHORTAGE">{copy.reconciliation.closeModal.forgiveShortage}</option>
          </select>
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.closeModal.closeDate}>
          <input
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, closeDate: event.target.value }))}
            type="date"
            value={draft.closeDate}
          />
        </PettyCashField>
        {isShortageAction ? (
          <PettyCashField label={copy.reconciliation.closeModal.shortageAmount}>
            <input
              className={pettyCashInputClass}
              max={closingBalance}
              min="0"
              onChange={(event) => setDraft(current => ({ ...current, shortageAmount: event.target.value }))}
              placeholder="0.00"
              type="number"
              value={draft.shortageAmount}
            />
          </PettyCashField>
        ) : null}
        <div className="md:col-span-2">
          <PettyCashField label={copy.reconciliation.closeModal.reference}>
            <input
              className={pettyCashInputClass}
              onChange={(event) => setDraft(current => ({ ...current, reference: event.target.value }))}
              placeholder={copy.reconciliation.closeModal.referencePlaceholder}
              value={draft.reference}
            />
          </PettyCashField>
        </div>
        {pendingAmount > 0 ? (
          <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {copy.reconciliation.closeModal.pendingWarning}
          </div>
        ) : null}
      </div>
    </PettyCashOperationModal>
  );
}

function DepositModal({
  fund,
  paymentAccounts,
  onClose,
  onSave,
}: {
  fund: PettyCashFund;
  paymentAccounts: PaymentAccount[];
  onClose: () => void;
  onSave: (draft: DepositDraft) => void | Promise<void>;
}) {
  const copy = usePettyCashTranslations();
  const [draft, setDraft] = useState<DepositDraft>(() => createDepositDraft(fund, paymentAccounts));
  const sourceAccounts = useMemo(
    () => getDepositSourceAccountOptions(fund, paymentAccounts),
    [fund, paymentAccounts],
  );
  const selectedSourceAccount = sourceAccounts.find(account => account.id === draft.sourcePaymentAccountId);
  const canSave = Number(draft.amount) > 0 && Boolean(selectedSourceAccount);

  useEffect(() => {
    if (sourceAccounts.some(account => account.id === draft.sourcePaymentAccountId)) {
      return;
    }
    setDraft(current => ({ ...current, sourcePaymentAccountId: sourceAccounts[0]?.id ?? '' }));
  }, [draft.sourcePaymentAccountId, sourceAccounts]);

  return (
    <PettyCashOperationModal
      actionLabel={copy.reconciliation.depositModal.action}
      canSave={canSave}
      icon={<Banknote className="h-5 w-5" />}
      onClose={onClose}
      onSave={() => onSave(draft)}
      subtitle={copy.reconciliation.depositModal.subtitle(fund.name)}
      title={copy.reconciliation.depositModal.title}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PettyCashField label={copy.reconciliation.depositModal.amount}>
          <input
            className={pettyCashInputClass}
            min="0"
            onChange={(event) => setDraft(current => ({ ...current, amount: event.target.value }))}
            placeholder="0.00"
            type="number"
            value={draft.amount}
          />
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.depositModal.date}>
          <input
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, movementDate: event.target.value }))}
            type="date"
            value={draft.movementDate}
          />
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.depositModal.sourceAccount}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, sourcePaymentAccountId: event.target.value }))}
            value={draft.sourcePaymentAccountId}
          >
            {sourceAccounts.map(account => (
              <option key={account.id} value={account.id}>{formatPaymentAccountLabel(account)}</option>
            ))}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.depositModal.method}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, fundingMethod: event.target.value }))}
            value={draft.fundingMethod}
          >
            {fund.fundingMethods.map(method => (
              <option key={method} value={method}>{getPettyCashMethodLabel(copy.funds.methodLabels, method)}</option>
            ))}
          </select>
        </PettyCashField>
        <div className="md:col-span-2">
          <PettyCashField label={copy.reconciliation.depositModal.reference}>
            <input
              className={pettyCashInputClass}
              onChange={(event) => setDraft(current => ({ ...current, reference: event.target.value }))}
              placeholder={copy.reconciliation.depositModal.referencePlaceholder}
              value={draft.reference}
            />
          </PettyCashField>
        </div>
        {!selectedSourceAccount ? (
          <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {copy.reconciliation.depositModal.noSource(fund.currencyCode)}
          </div>
        ) : null}
      </div>
    </PettyCashOperationModal>
  );
}

function ReceiptModal({
  accountingAccounts,
  fund,
  onClose,
  onCreateProvider,
  providers,
  onSave,
}: {
  accountingAccounts: AccountingAccount[];
  fund: PettyCashFund;
  onClose: () => void;
  onCreateProvider: (name: string) => Promise<Provider>;
  providers: ProviderRecord[];
  onSave: (draft: ReceiptDraft) => void | Promise<void>;
}) {
  const copy = usePettyCashTranslations();
  const [draft, setDraft] = useState<ReceiptDraft>(() => createReceiptDraft(providers, accountingAccounts, fund.currencyCode));
  const taxBreakdown = getReceiptTaxBreakdown(draft);
  const canSave = draft.description.trim().length > 0 && taxBreakdown.totalAmount > 0;

  return (
    <PettyCashOperationModal
      actionLabel={copy.reconciliation.receiptModal.action}
      canSave={canSave}
      icon={<Upload className="h-5 w-5" />}
      onClose={onClose}
      onSave={() => onSave(draft)}
      subtitle={copy.reconciliation.receiptModal.subtitle(fund.name)}
      title={copy.reconciliation.receiptModal.title}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PettyCashField label={copy.reconciliation.receiptModal.concept}>
          <input
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, description: event.target.value }))}
            placeholder={copy.reconciliation.receiptModal.conceptPlaceholder}
            value={draft.description}
          />
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.receiptModal.amount}>
          <input
            className={pettyCashInputClass}
            min="0"
            onChange={(event) => setDraft(current => ({ ...current, amount: event.target.value }))}
            placeholder="0.00"
            type="number"
            value={draft.amount}
          />
        </PettyCashField>
        <div className="md:col-span-2">
          <BudgetTaxControls
            compact
            draft={draft}
            onDraftChange={(updates) => setDraft(current => ({ ...current, ...updates }))}
          />
        </div>
        <div className="md:col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="grid gap-3 sm:grid-cols-3">
            <PettyCashAmountSummaryTile
              label="Subtotal"
              value={formatPettyCashCurrency(taxBreakdown.subtotalAmount, fund.currencyCode)}
            />
            <PettyCashAmountSummaryTile
              label="Impuestos"
              value={formatPettyCashCurrency(taxBreakdown.taxAmount, fund.currencyCode)}
            />
            <PettyCashAmountSummaryTile
              highlight
              label="Total"
              value={formatPettyCashCurrency(taxBreakdown.totalAmount, fund.currencyCode)}
            />
          </div>
        </div>
        <QuickProviderField
          emptyLabel={copy.reconciliation.receiptModal.noProvider}
          label={copy.reconciliation.receiptModal.provider}
          onChange={(providerId) => setDraft(current => ({ ...current, providerId }))}
          onCreateProvider={onCreateProvider}
          providers={providers.map(toExpenseProvider)}
          value={draft.providerId}
        />
        <PettyCashField label={copy.reconciliation.receiptModal.accountingAccount}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, accountingAccountId: event.target.value }))}
            value={draft.accountingAccountId}
          >
            {accountingAccounts.map(account => (
              <option key={account.id} value={account.id}>{formatAccountingAccountLabel(account)}</option>
            ))}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.receiptModal.date}>
          <input
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, expenseDate: event.target.value }))}
            type="date"
            value={draft.expenseDate}
          />
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.receiptModal.receiptReference}>
          <input
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, receiptReference: event.target.value }))}
            placeholder={copy.reconciliation.receiptModal.receiptReferencePlaceholder}
            value={draft.receiptReference}
          />
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.receiptModal.file}>
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <FolderOpen className="h-4 w-4" />
            {draft.attachments.length > 0 ? copy.common.fileCount(draft.attachments.length) : copy.reconciliation.receiptModal.selectReceipt}
            <input
              className="hidden"
              multiple
              onChange={(event) => setDraft(current => ({
                ...current,
                attachments: Array.from(event.target.files ?? []),
              }))}
              type="file"
            />
          </label>
        </PettyCashField>
      </div>
    </PettyCashOperationModal>
  );
}

function PettyCashAmountSummaryTile({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-medium ${highlight ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-950 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function PettyCashAttachmentsModal({
  fundId,
  line,
  onClose,
  onCountChange,
}: {
  fundId: string;
  line: PettyCashSettlementLine;
  onClose: () => void;
  onCountChange: (line: PettyCashSettlementLine, count: number) => void;
}) {
  const copy = usePettyCashTranslations();
  const [attachments, setAttachments] = useState<PettyCashAttachment[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteAttachment, setPendingDeleteAttachment] = useState<PettyCashAttachment | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const hasBackendLine = hasPettyCashBackendId(line.id) && hasPettyCashBackendId(fundId);

  useEffect(() => {
    let cancelled = false;

    if (!hasBackendLine) {
      setAttachments([]);
      return;
    }

    setIsLoading(true);
    pettyCashService.listSettlementLineAttachments(fundId, line.id)
      .then((items) => {
        if (cancelled) return;
        setAttachments(items);
        onCountChange(line, items.length);
        setError('');
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(toFinanceApiErrorMessage(loadError, copy.reconciliation.errors.attachmentsLoad));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fundId, hasBackendLine, line.id]);

  const uploadPendingFiles = async () => {
    if (!hasBackendLine || pendingFiles.length === 0) return;
    setIsSaving(true);
    try {
      for (const file of pendingFiles) {
        const contentType = file.type || inferAttachmentContentType(file.name);
        const presign = await pettyCashService.presignSettlementLineAttachmentUpload(fundId, line.id, {
          content_type: contentType,
          file_name: file.name,
          size_bytes: file.size,
        });

        await pettyCashService.uploadSettlementLineAttachment(
          presign.upload_url,
          file,
          contentType,
          presign.upload_headers ?? {},
        );

        await pettyCashService.registerSettlementLineAttachment(fundId, line.id, {
          mime_type: contentType,
          object_key: presign.object_key,
          original_filename: file.name,
          size_bytes: file.size,
        });
      }

      const nextAttachments = await pettyCashService.listSettlementLineAttachments(fundId, line.id);
      setAttachments(nextAttachments);
      setPendingFiles([]);
      onCountChange(line, nextAttachments.length);
      setError('');
    } catch (uploadError) {
      setError(toFinanceApiErrorMessage(uploadError, copy.reconciliation.errors.attachmentsSave));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAttachment = async () => {
    if (!hasBackendLine || !pendingDeleteAttachment) return;
    setIsSaving(true);
    try {
      await pettyCashService.deleteSettlementLineAttachment(fundId, line.id, pendingDeleteAttachment.id);
      const nextAttachments = attachments.filter(attachment => attachment.id !== pendingDeleteAttachment.id);
      setAttachments(nextAttachments);
      onCountChange(line, nextAttachments.length);
      setPendingDeleteAttachment(null);
      setError('');
    } catch (deleteError) {
      setError(toFinanceApiErrorMessage(deleteError, copy.reconciliation.errors.attachmentDelete));
    } finally {
      setIsSaving(false);
    }
  };

  const totalSize = attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0);

  return (
    <>
      <IndiceModalFrame
        busy={isSaving}
        description={line.description}
        footer={(
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="min-h-11 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {copy.common.close}
            </button>
            <button
              type="button"
              disabled={!hasBackendLine || pendingFiles.length === 0 || isSaving}
              onClick={uploadPendingFiles}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-[#147514] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              {copy.reconciliation.attachments.save}
            </button>
          </div>
        )}
        footerSummary={copy.reconciliation.attachments.savedTitle(attachments.length)}
        icon={<Paperclip className="h-5 w-5" />}
        modalType="standard-form"
        onOpenChange={(open) => !open && onClose()}
        open
        title={copy.reconciliation.attachments.title}
        tone="green"
      >
        <div className="space-y-4">
          {!hasBackendLine ? (
            <IndiceModalValidation messages={[copy.reconciliation.attachments.backendWarning]} tone="warning" />
          ) : null}

          {error ? (
            <IndiceModalValidation messages={[error]} tone="error" />
          ) : null}

          <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#147514] bg-[#147514]/5 px-5 py-8 text-center transition hover:bg-[#147514]/10 dark:bg-[#147514]/10">
            <Upload className="h-9 w-9 text-[#147514]" />
            <span className="mt-3 text-lg font-medium text-slate-900 dark:text-white">{copy.reconciliation.attachments.selectTitle}</span>
            <span className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{copy.reconciliation.attachments.selectDescription}</span>
            <input
              className="hidden"
              disabled={!hasBackendLine || isSaving}
              multiple
              onChange={(event) => setPendingFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>

          {pendingFiles.length > 0 ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.reconciliation.attachments.pendingFiles(pendingFiles.length)}</p>
              <div className="mt-3 space-y-2">
                {pendingFiles.map(file => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-base font-medium text-slate-900 dark:text-white">{copy.reconciliation.attachments.savedTitle(attachments.length)}</h4>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.reconciliation.attachments.total(formatBytes(totalSize))}</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.common.loadingAttachments}
              </div>
            ) : attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{attachment.originalFilename}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {formatBytes(attachment.sizeBytes)}
                        {attachment.createdAt ? ` - ${formatPettyCashIsoDate(attachment.createdAt.slice(0, 10))}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {attachment.downloadUrl ? (
                        <a
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          href={attachment.downloadUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {copy.reconciliation.attachments.open}
                        </a>
                      ) : (
                        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">
                          <Download className="h-4 w-4" />
                          {copy.reconciliation.attachments.noLink}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => setPendingDeleteAttachment(attachment)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                        aria-label={copy.common.deleteAttachment}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <PettyCashEmptyState label={copy.reconciliation.attachments.empty} />
            )}
          </div>
        </div>
      </IndiceModalFrame>

      <ConfirmDeleteDialog
        cancelLabel={copy.common.cancel}
        confirmDisabled={isSaving}
        confirmLabel={copy.common.deleteAttachment}
        isVisible={Boolean(pendingDeleteAttachment)}
        itemName={pendingDeleteAttachment?.originalFilename}
        onCancel={() => setPendingDeleteAttachment(null)}
        onConfirm={deleteAttachment}
        title={copy.common.deleteAttachment}
      />
    </>
  );
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return '0 KB';
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function PettyCashOperationModal({
  actionLabel,
  busy = false,
  canSave,
  children,
  icon,
  onClose,
  onSave,
  subtitle,
  title,
}: {
  actionLabel: string;
  busy?: boolean;
  canSave: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  subtitle: string;
  title: string;
}) {
  const copy = usePettyCashTranslations();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const effectiveBusy = busy || isSubmitting;

  const handleSave = async () => {
    if (!canSave || effectiveBusy) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onSave();
    } catch (saveError) {
      setError(toFinanceApiErrorMessage(saveError, 'No se pudo guardar la operación.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IndiceModalFrame
      busy={effectiveBusy}
      description={subtitle}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            disabled={effectiveBusy}
            onClick={onClose}
            className="min-h-11 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            {copy.common.cancel}
          </button>
          <button
            type="button"
            disabled={!canSave || effectiveBusy}
            onClick={handleSave}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-[#147514] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {effectiveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {actionLabel}
          </button>
        </div>
      )}
      footerSummary={title}
      icon={icon}
      modalType="standard-form"
      onOpenChange={(open) => !open && onClose()}
      open
      title={title}
      tone="green"
    >
      <div className="space-y-4">
        {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900">
          {children}
        </section>
      </div>
    </IndiceModalFrame>
  );
}
