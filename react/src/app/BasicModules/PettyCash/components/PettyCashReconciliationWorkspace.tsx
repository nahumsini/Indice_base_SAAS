import { Banknote, Building2, CheckCircle2, Download, ExternalLink, FileText, FolderOpen, Landmark, Loader2, Paperclip, Plus, ReceiptText, Search, Trash2, Upload, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { mockAccounts } from '../../Expenses/AccountingAccounts/accountingAccounts.mock';
import type { AccountingAccount } from '../../Expenses/AccountingAccounts/types';
import { mockProviderRecords } from '../../Expenses/data/providerRecords.mock';
import { mockPaymentAccounts } from '../../Expenses/PaymentAccounts/paymentAccounts.mock';
import type { PaymentAccount } from '../../Expenses/PaymentAccounts/types';
import { ProviderCreateModal } from '../../Expenses/Providers/components/ProviderCreateModal';
import type { ProviderFormValues, ProviderRecord } from '../../Expenses/Providers/useProveedoresLogic';
import { accountingAccountsService, paymentAccountsService, providersService, toFinanceApiErrorMessage } from '../../Expenses/services';
import type { FinanceReferenceOption } from '../../Expenses/types/finance-reference.types';
import { hasPettyCashBackendId, pettyCashService, type PettyCashStatementCloseAction } from '../services';
import { useTablePagination } from '../../../hooks/useTablePagination';
import type {
  PettyCashAttachment,
  PettyCashFund,
  PettyCashMovement,
  PettyCashSettlementLine,
  PettyCashStatement,
  PettyCashStatementStatus,
} from '../types/pettyCash.types';
import {
  formatPettyCashCurrency,
  formatPettyCashIsoDate,
  getFundById,
  getStatementLines,
  getStatementSettlementBalance,
} from '../utils/pettyCash.utils';
import { getPettyCashMethodLabel, PETTY_CASH_METHOD_KEYS } from '../utils/pettyCash.methods';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import {
  PettyCashEmptyState,
  PettyCashField,
  PettyCashFilterShell,
  PettyCashHeaderBanner,
  PettyCashMetric,
  PettyCashPagination,
  pettyCashInputClass,
  PettyCashStatusPill,
  PettyCashTableShell,
} from './PettyCashShared';

type PettyCashReconciliationWorkspaceProps = {
  funds: PettyCashFund[];
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

type ReceiptDraft = {
  accountingAccountId: string;
  amount: string;
  attachments: File[];
  description: string;
  expenseDate: string;
  providerId: string;
  receiptReference: string;
  taxAmount: string;
};

type CloseStatementDraft = {
  action: PettyCashStatementCloseAction;
  closeDate: string;
  reference: string;
  shortageAmount: string;
};

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

const createReceiptDraft = (
  providers: ProviderRecord[] = mockProviderRecords,
  accountingAccounts: AccountingAccount[] = activeAccountingAccountMocks,
): ReceiptDraft => ({
  accountingAccountId: accountingAccounts.find(account => account.isActive)?.id ?? '',
  amount: '',
  attachments: [],
  description: '',
  expenseDate: todayIso(),
  providerId: providers.find(provider => provider.status === 'active')?.id ?? '',
  receiptReference: '',
  taxAmount: '0',
});

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

const canCreateExpenseFromLine = (line: PettyCashSettlementLine) => (
  line.status === 'RECEIPT_ATTACHED' || line.status === 'VALIDATED'
);

export function PettyCashReconciliationWorkspace({
  funds,
  movements,
  onFundsChange,
  onMovementsChange,
  onSettlementLinesChange,
  onStatementsChange,
  settlementLines,
  statements,
}: PettyCashReconciliationWorkspaceProps) {
  const copy = usePettyCashTranslations();
  const [selectedFundId, setSelectedFundId] = useState(funds[0]?.id ?? '');
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PettyCashStatementStatus | 'all'>('all');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [attachmentLine, setAttachmentLine] = useState<PettyCashSettlementLine | null>(null);
  const [closingStatement, setClosingStatement] = useState<PettyCashStatement | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderRecord[]>(mockProviderRecords);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(activePaymentAccountMocks);
  const [accountingAccounts, setAccountingAccounts] = useState<AccountingAccount[]>(activeAccountingAccountMocks);
  const [referenceError, setReferenceError] = useState('');
  const [expenseCreationLineId, setExpenseCreationLineId] = useState<string | null>(null);
  const [statementCloseId, setStatementCloseId] = useState<string | null>(null);

  const selectedFund = funds.find(fund => fund.id === selectedFundId);
  const fundStatements = useMemo(() => (
    statements.filter(statement => statement.pettyCashFundId === selectedFundId)
  ), [selectedFundId, statements]);
  const selectedStatement = fundStatements.find(statement => statement.id === selectedStatementId) ?? fundStatements[0];
  const selectedLines = selectedStatement ? getStatementLines(selectedStatement.id, settlementLines) : [];
  const selectedMovements = movements.filter(movement => movement.pettyCashFundId === selectedFundId);

  const filteredLines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return selectedLines.filter((line) => {
      const matchesSearch = !search
        || line.description.toLowerCase().includes(search)
        || line.providerName?.toLowerCase().includes(search)
        || line.receiptReference?.toLowerCase().includes(search);
      return matchesSearch;
    });
  }, [searchTerm, selectedLines]);

  const filteredStatements = useMemo(() => (
    fundStatements.filter(statement => statusFilter === 'all' || statement.status === statusFilter)
  ), [fundStatements, statusFilter]);
  const movementPaginationResetKey = useMemo(
    () => `${selectedFundId}:${selectedMovements.map(movement => movement.id).join('|')}`,
    [selectedFundId, selectedMovements],
  );
  const movementPagination = useTablePagination({
    resetKey: movementPaginationResetKey,
    rows: selectedMovements,
  });
  const linePaginationResetKey = useMemo(
    () => `${searchTerm}:${filteredLines.map(line => line.id).join('|')}`,
    [filteredLines, searchTerm],
  );
  const linePagination = useTablePagination({
    resetKey: linePaginationResetKey,
    rows: filteredLines,
  });
  const statementPaginationResetKey = useMemo(
    () => `${statusFilter}:${filteredStatements.map(statement => statement.id).join('|')}`,
    [filteredStatements, statusFilter],
  );
  const statementPagination = useTablePagination({
    resetKey: statementPaginationResetKey,
    rows: filteredStatements,
  });

  const totalDeposits = selectedMovements
    .filter(movement => movement.type === 'INITIAL_FUNDING' || movement.type === 'ADDITIONAL_DEPOSIT')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalReceipts = selectedLines.reduce((sum, line) => sum + line.totalAmount, 0);
  const pendingSettlement = selectedStatement ? getStatementSettlementBalance(selectedStatement) : 0;

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
    if (funds.length === 0) {
      setSelectedFundId('');
      setSelectedStatementId('');
      return;
    }

    if (!funds.some(fund => fund.id === selectedFundId)) {
      const nextFundId = funds[0].id;
      const nextStatement = statements.find(statement => statement.pettyCashFundId === nextFundId);
      setSelectedFundId(nextFundId);
      setSelectedStatementId(nextStatement?.id ?? '');
    }
  }, [funds, selectedFundId, statements]);

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
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) return;
    const taxAmount = Math.max(0, Number(draft.taxAmount) || 0);
    const subtotalAmount = Math.max(0, amount - taxAmount);
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
      status: 'RECEIPT_ATTACHED',
      subtotalAmount,
      taxAmount,
      totalAmount: amount,
    };

    if (hasPettyCashBackendId(selectedFund.id)) {
      try {
        const saved = await pettyCashService.createSettlementLine(selectedFund.id, {
          ...localLine,
          attachmentCount: 0,
        });
        let savedLine = saved.settlementLine;
        let savedStatement = saved.statement;

        if (draft.attachments.length > 0) {
          try {
            const attachments = await uploadReceiptAttachments(selectedFund.id, saved.settlementLine.id, draft.attachments);
            savedLine = { ...saved.settlementLine, attachmentCount: attachments.length };
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
      const nextBalance = Math.max(0, fund.currentBalanceAmount - amount);
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
            declaredClosingBalanceAmount: Math.max(0, selectedFund.currentBalanceAmount - amount),
            estimatedUsageAmount: amount,
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
            declaredClosingBalanceAmount: Math.max(0, currentStatement.declaredClosingBalanceAmount - amount),
            estimatedUsageAmount: currentStatement.estimatedUsageAmount + amount,
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
    if (!canCreateExpenseFromLine(line)) {
      setReferenceError(copy.reconciliation.errors.expenseNeedsReceipt);
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {referenceError}
        </div>
      ) : null}

      <PettyCashFilterShell
        resultLabel={copy.reconciliation.filters.result(filteredLines.length)}
        subtitle={copy.reconciliation.filters.subtitle}
      >
        <PettyCashField label={copy.reconciliation.filters.fund}>
          <select className={pettyCashInputClass} onChange={(event) => handleSelectFund(event.target.value)} value={selectedFundId}>
            {funds.map(fund => (
              <option key={fund.id} value={fund.id}>{fund.name} - {fund.responsibleName}</option>
            ))}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.filters.statement}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setSelectedStatementId(event.target.value)}
            value={selectedStatement?.id ?? ''}
          >
            {fundStatements.length > 0 ? fundStatements.map(statement => (
              <option key={statement.id} value={statement.id}>{statement.folio} - {statement.periodKey}</option>
            )) : (
              <option value="">{copy.common.automaticCurrentStatement}</option>
            )}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.filters.status}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setStatusFilter(event.target.value as PettyCashStatementStatus | 'all')}
            value={statusFilter}
          >
            <option value="all">{copy.common.all}</option>
            <option value="OPEN">{copy.status.statement.OPEN}</option>
            <option value="CUT_PENDING">{copy.status.statement.CUT_PENDING}</option>
            <option value="PARTIALLY_SETTLED">{copy.status.statement.PARTIALLY_SETTLED}</option>
            <option value="SETTLED">{copy.status.statement.SETTLED}</option>
            <option value="SHORTAGE">{copy.status.statement.SHORTAGE}</option>
          </select>
        </PettyCashField>
        <PettyCashField label={copy.reconciliation.filters.searchReceipt}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${pettyCashInputClass} pl-9`}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={copy.reconciliation.filters.searchPlaceholder}
              value={searchTerm}
            />
          </div>
        </PettyCashField>
      </PettyCashFilterShell>

      {selectedFund ? (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-5">
            <PettyCashMetric icon={WalletCards} label={copy.reconciliation.metrics.fundBalance} tone="success" value={formatPettyCashCurrency(selectedFund.currentBalanceAmount, selectedFund.currencyCode)} />
            <PettyCashMetric icon={Landmark} label={copy.reconciliation.metrics.deposited} value={formatPettyCashCurrency(totalDeposits, selectedFund.currencyCode)} />
            <PettyCashMetric icon={ReceiptText} label={copy.reconciliation.metrics.receipts} tone="warning" value={formatPettyCashCurrency(totalReceipts, selectedFund.currencyCode)} />
            <PettyCashMetric icon={FileText} label={copy.reconciliation.metrics.pendingSettlement} tone={pendingSettlement > 0 ? 'warning' : 'success'} value={formatPettyCashCurrency(pendingSettlement, selectedFund.currencyCode)} />
          </div>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="block text-xs uppercase tracking-[0.16em] text-slate-400">{copy.reconciliation.metrics.responsible}</span>
              {selectedFund.responsibleName}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="block text-xs uppercase tracking-[0.16em] text-slate-400">{copy.reconciliation.metrics.source}</span>
              {selectedFund.fundingSourceName}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="block text-xs uppercase tracking-[0.16em] text-slate-400">{copy.reconciliation.metrics.receivesBy}</span>
              {selectedFund.fundingMethods.map(method => getPettyCashMethodLabel(copy.funds.methodLabels, method)).join(', ')}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="block text-xs uppercase tracking-[0.16em] text-slate-400">{copy.reconciliation.metrics.spendsBy}</span>
              {selectedFund.spendingMethods.map(method => getPettyCashMethodLabel(copy.funds.methodLabels, method)).join(', ')}
            </div>
          </div>
        </section>
      ) : (
        <PettyCashEmptyState label={copy.reconciliation.statements.emptyFund} />
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.2fr]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">{copy.reconciliation.movements.title}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{copy.reconciliation.movements.subtitle}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">{selectedMovements.length}</span>
          </div>
          {selectedMovements.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {[
                        copy.reconciliation.movements.columns.date,
                        copy.reconciliation.movements.columns.type,
                        copy.reconciliation.movements.columns.source,
                        copy.reconciliation.movements.columns.amount,
                        copy.reconciliation.movements.columns.reference,
                      ].map(column => (
                        <th key={column} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movementPagination.paginatedRows.map(movement => (
                      <tr key={movement.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatPettyCashIsoDate(movement.movementDate)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{copy.status.movement[movement.type]}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{movement.fromPaymentAccountName ?? copy.common.notAvailable}</td>
                        <td className="px-5 py-4 text-sm font-black text-[#147514]">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">{getPettyCashMethodLabel(copy.funds.methodLabels, movement.reference)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PettyCashPagination
                currentPage={movementPagination.currentPage}
                itemLabel={copy.reconciliation.movements.itemLabel}
                onPageChange={movementPagination.onPageChange}
                onPageSizeChange={movementPagination.onPageSizeChange}
                pageEnd={movementPagination.pageEnd}
                pageSize={movementPagination.pageSize}
                pageSizeOptions={movementPagination.pageSizeOptions}
                pageStart={movementPagination.pageStart}
                totalCount={movementPagination.totalCount}
                totalPages={movementPagination.totalPages}
              />
            </>
          ) : (
            <div className="p-5">
              <PettyCashEmptyState label={copy.reconciliation.movements.empty} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">{copy.reconciliation.receipts.title}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{copy.reconciliation.receipts.subtitle}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">{filteredLines.length}</span>
          </div>
          {filteredLines.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {[
                        copy.reconciliation.receipts.columns.receipt,
                        copy.reconciliation.receipts.columns.provider,
                        copy.reconciliation.receipts.columns.accountingAccount,
                        copy.reconciliation.receipts.columns.date,
                        copy.reconciliation.receipts.columns.total,
                        copy.reconciliation.receipts.columns.attachments,
                        copy.reconciliation.receipts.columns.status,
                        copy.reconciliation.receipts.columns.actions,
                      ].map(column => (
                        <th key={column} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linePagination.paginatedRows.map(line => {
                      const canCreateExpense = canCreateExpenseFromLine(line);
                      return (
                      <tr key={line.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-slate-900">{line.description}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{line.receiptReference ?? copy.reconciliation.receipts.noReference}</p>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{line.providerName ?? copy.common.notAvailable}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{line.accountingAccountName ?? copy.common.notAvailable}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatPettyCashIsoDate(line.expenseDate)}</td>
                        <td className="px-5 py-4 text-sm font-black text-[#147514]">{formatPettyCashCurrency(line.totalAmount, line.currencyCode)}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setAttachmentLine(line)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            <Paperclip className="h-4 w-4 text-[#147514]" />
                            {line.attachmentCount}
                          </button>
                        </td>
                        <td className="px-5 py-4"><PettyCashStatusPill kind="line" status={line.status} /></td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            disabled={!canCreateExpense || line.status === 'EXPENSE_CREATED' || expenseCreationLineId === line.id}
                            onClick={() => handleCreateExpenseFromLine(line)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#147514]/20 bg-[#147514] px-3 text-sm font-black text-white transition hover:bg-[#0f5f0f] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            title={canCreateExpense ? copy.reconciliation.receipts.createExpenseTitle : copy.reconciliation.receipts.createExpenseDisabledTitle}
                          >
                            {expenseCreationLineId === line.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            {copy.reconciliation.receipts.createExpense}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PettyCashPagination
                currentPage={linePagination.currentPage}
                itemLabel={copy.reconciliation.receipts.itemLabel}
                onPageChange={linePagination.onPageChange}
                onPageSizeChange={linePagination.onPageSizeChange}
                pageEnd={linePagination.pageEnd}
                pageSize={linePagination.pageSize}
                pageSizeOptions={linePagination.pageSizeOptions}
                pageStart={linePagination.pageStart}
                totalCount={linePagination.totalCount}
                totalPages={linePagination.totalPages}
              />
            </>
          ) : (
            <div className="p-5">
              <PettyCashEmptyState label={copy.reconciliation.receipts.empty} />
            </div>
          )}
        </section>
      </div>

      {filteredStatements.length > 0 ? (
        <PettyCashTableShell
          footer={(
            <PettyCashPagination
              currentPage={statementPagination.currentPage}
              itemLabel={copy.reconciliation.statements.itemLabel}
              onPageChange={statementPagination.onPageChange}
              onPageSizeChange={statementPagination.onPageSizeChange}
              pageEnd={statementPagination.pageEnd}
              pageSize={statementPagination.pageSize}
              pageSizeOptions={statementPagination.pageSizeOptions}
              pageStart={statementPagination.pageStart}
              totalCount={statementPagination.totalCount}
              totalPages={statementPagination.totalPages}
            />
          )}
        >
          <table className="w-full min-w-[1120px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  copy.reconciliation.statements.columns.statement,
                  copy.reconciliation.statements.columns.period,
                  copy.reconciliation.statements.columns.responsible,
                  copy.reconciliation.statements.columns.assigned,
                  copy.reconciliation.statements.columns.declaredBalance,
                  copy.reconciliation.statements.columns.estimated,
                  copy.reconciliation.statements.columns.pending,
                  copy.reconciliation.statements.columns.status,
                  copy.reconciliation.statements.columns.actions,
                ].map(column => (
                  <th key={column} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statementPagination.paginatedRows.map((statement) => {
                const fund = getFundById(funds, statement.pettyCashFundId);
                return (
                  <tr key={statement.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-5 text-sm font-black text-slate-900">{statement.folio}</td>
                    <td className="px-5 py-5 text-sm font-bold text-slate-700">{statement.periodKey}</td>
                    <td className="px-5 py-5 text-sm font-bold text-slate-700">{fund?.responsibleName ?? statement.responsibleName}</td>
                    <td className="px-5 py-5 text-sm font-black text-slate-900">{formatPettyCashCurrency(statement.assignedAmount + statement.additionalDepositAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-5 text-sm font-black text-[#147514]">{formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-5 text-sm font-black text-slate-900">{formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-5 text-sm font-black text-amber-600">{formatPettyCashCurrency(getStatementSettlementBalance(statement), statement.currencyCode)}</td>
                    <td className="px-5 py-5"><PettyCashStatusPill kind="statement" status={statement.status} /></td>
                    <td className="px-5 py-5">
                      <button
                        type="button"
                        disabled={
                          statement.status === 'CLOSED'
                          || statement.status === 'TRANSFERRED_TO_NEXT_CUT'
                          || statement.status === 'FORGIVEN_SHORTAGE'
                          || statement.status === 'CHARGED_TO_EMPLOYEE'
                          || statementCloseId === statement.id
                        }
                        onClick={() => setClosingStatement(statement)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {statementCloseId === statement.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-[#147514]" />}
                        {statementCloseId === statement.id ? copy.reconciliation.statements.closing : copy.reconciliation.statements.close}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </PettyCashTableShell>
      ) : null}

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
  onSave: (draft: CloseStatementDraft) => void;
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
      onClose={onClose}
      onSave={() => onSave(draft)}
      subtitle={`${statement.folio}${fund ? ` - ${fund.name}` : ''}`}
      title={copy.reconciliation.closeModal.title}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <span className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400">{copy.reconciliation.closeModal.cashBalance}</span>
          <p className="mt-2 text-lg font-black text-[#147514]">{formatPettyCashCurrency(closingBalance, statement.currencyCode)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <span className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400">{copy.reconciliation.closeModal.pending}</span>
          <p className={`mt-2 text-lg font-black ${pendingAmount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
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
          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
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
  onSave: (draft: DepositDraft) => void;
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
          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
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
  providers,
  onSave,
}: {
  accountingAccounts: AccountingAccount[];
  fund: PettyCashFund;
  onClose: () => void;
  providers: ProviderRecord[];
  onSave: (draft: ReceiptDraft) => void;
}) {
  const copy = usePettyCashTranslations();
  const [draft, setDraft] = useState<ReceiptDraft>(() => createReceiptDraft(providers, accountingAccounts));
  const canSave = draft.description.trim().length > 0 && Number(draft.amount) > 0;

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
        <PettyCashField label={copy.reconciliation.receiptModal.provider}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setDraft(current => ({ ...current, providerId: event.target.value }))}
            value={draft.providerId}
          >
            <option value="">{copy.reconciliation.receiptModal.noProvider}</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>{provider.name}</option>
            ))}
          </select>
        </PettyCashField>
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
        <PettyCashField label={copy.reconciliation.receiptModal.tax}>
          <input
            className={pettyCashInputClass}
            min="0"
            onChange={(event) => setDraft(current => ({ ...current, taxAmount: event.target.value }))}
            placeholder="0.00"
            type="number"
            value={draft.taxAmount}
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
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
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

  const deleteAttachment = async (attachmentId: number) => {
    if (!hasBackendLine) return;
    setIsSaving(true);
    try {
      await pettyCashService.deleteSettlementLineAttachment(fundId, line.id, attachmentId);
      const nextAttachments = attachments.filter(attachment => attachment.id !== attachmentId);
      setAttachments(nextAttachments);
      onCountChange(line, nextAttachments.length);
      setError('');
    } catch (deleteError) {
      setError(toFinanceApiErrorMessage(deleteError, copy.reconciliation.errors.attachmentDelete));
    } finally {
      setIsSaving(false);
    }
  };

  const totalSize = attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#147514]/30 bg-white shadow-2xl">
        <header className="bg-[#147514] px-7 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <Paperclip className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-2xl font-black">{copy.reconciliation.attachments.title}</h3>
                <p className="mt-1 text-sm font-semibold text-white/80">{line.description}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 transition hover:bg-white/25">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-7 py-6">
          {!hasBackendLine ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {copy.reconciliation.attachments.backendWarning}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#147514] bg-[#147514]/5 px-5 py-8 text-center transition hover:bg-[#147514]/10">
            <Upload className="h-9 w-9 text-[#147514]" />
            <span className="mt-3 text-lg font-black text-slate-900">{copy.reconciliation.attachments.selectTitle}</span>
            <span className="mt-1 text-sm font-semibold text-slate-500">{copy.reconciliation.attachments.selectDescription}</span>
            <input
              className="hidden"
              disabled={!hasBackendLine || isSaving}
              multiple
              onChange={(event) => setPendingFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>

          {pendingFiles.length > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">{copy.reconciliation.attachments.pendingFiles(pendingFiles.length)}</p>
              <div className="mt-3 space-y-2">
                {pendingFiles.map(file => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-slate-500">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-base font-black text-slate-900">{copy.reconciliation.attachments.savedTitle(attachments.length)}</h4>
              <span className="text-sm font-semibold text-slate-500">{copy.reconciliation.attachments.total(formatBytes(totalSize))}</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-sm font-bold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.common.loadingAttachments}
              </div>
            ) : attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{attachment.originalFilename}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatBytes(attachment.sizeBytes)}
                        {attachment.createdAt ? ` · ${formatPettyCashIsoDate(attachment.createdAt.slice(0, 10))}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {attachment.downloadUrl ? (
                        <a
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          href={attachment.downloadUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {copy.reconciliation.attachments.open}
                        </a>
                      ) : (
                        <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-400">
                          <Download className="h-4 w-4" />
                          {copy.reconciliation.attachments.noLink}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => deleteAttachment(attachment.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
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

        <footer className="flex items-center justify-between gap-3 bg-[#147514] px-7 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            {copy.common.close}
          </button>
          <button
            type="button"
            disabled={!hasBackendLine || pendingFiles.length === 0 || isSaving}
            onClick={uploadPendingFiles}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#147514] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {copy.reconciliation.attachments.save}
          </button>
        </footer>
      </div>
    </div>
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
  canSave,
  children,
  icon,
  onClose,
  onSave,
  subtitle,
  title,
}: {
  actionLabel: string;
  canSave: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClose: () => void;
  onSave: () => void;
  subtitle: string;
  title: string;
}) {
  const copy = usePettyCashTranslations();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#147514]/30 bg-white shadow-2xl">
        <header className="bg-[#147514] px-7 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                {icon}
              </span>
              <div>
                <h3 className="text-2xl font-black">{title}</h3>
                <p className="mt-1 text-sm font-semibold text-white/80">{subtitle}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 transition hover:bg-white/25">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="overflow-y-auto px-7 py-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            {children}
          </section>
        </div>
        <footer className="flex items-center justify-between gap-3 bg-[#147514] px-7 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            {copy.common.cancel}
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#147514] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
