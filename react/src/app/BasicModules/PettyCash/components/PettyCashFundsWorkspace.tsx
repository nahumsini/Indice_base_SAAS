import { Banknote, Copy, ExternalLink, KeyRound, Landmark, Link2, RotateCw, Search, ShieldCheck, UserRound, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { getCategoryById } from '../../Expenses/data/categories.data';
import { useFinanceReferenceData } from '../../Expenses/hooks/useFinanceReferenceData';
import { mockPaymentAccounts } from '../../Expenses/PaymentAccounts/paymentAccounts.mock';
import type { PaymentAccount } from '../../Expenses/PaymentAccounts/types';
import { budgetLinesService, paymentAccountsService, toFinanceApiErrorMessage } from '../../Expenses/services';
import type { FinanceBudgetLine } from '../../Expenses/types/finance-domain.types';
import type { FinanceReferenceOption } from '../../Expenses/types/finance-reference.types';
import type { PettyCashCurrency, PettyCashFund, PettyCashFundStatus, PettyCashStatement } from '../types/pettyCash.types';
import { hasPettyCashBackendId, pettyCashService } from '../services';
import { useTablePagination } from '../../../hooks/useTablePagination';
import {
  formatPettyCashCurrency,
  getOperationalPettyCashSummary,
  getStatementSettlementBalance,
} from '../utils/pettyCash.utils';
import {
  getPettyCashMethodLabel,
  normalizePettyCashMethods,
  PETTY_CASH_METHOD_KEYS,
  pettyCashFundingMethodOptions,
  pettyCashSpendingMethodOptions,
} from '../utils/pettyCash.methods';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import {
  PettyCashField,
  PettyCashFilterShell,
  PettyCashHeaderBanner,
  PettyCashMetric,
  PettyCashPagination,
  pettyCashInputClass,
  PettyCashStatusPill,
  PettyCashTableShell,
} from './PettyCashShared';

type PettyCashFundsWorkspaceProps = {
  funds: PettyCashFund[];
  onFundsChange: Dispatch<SetStateAction<PettyCashFund[]>>;
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
  limitAmount: '',
  name: '',
  paymentAccountId: fallbackPaymentAccounts[0]?.id ?? '',
  responsibleUserId: '',
  spendingMethods: [PETTY_CASH_METHOD_KEYS.CASH],
  unitId: '',
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

export function PettyCashFundsWorkspace({ funds, onFundsChange, statements }: PettyCashFundsWorkspaceProps) {
  const copy = usePettyCashTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PettyCashFundStatus | 'all'>('all');
  const [isCreateFundOpen, setIsCreateFundOpen] = useState(false);
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
  const summary = useMemo(() => getOperationalPettyCashSummary(statements, funds), [funds, statements]);
  const activePaymentAccounts = useMemo(() => paymentAccounts.filter(account => account.isActive), [paymentAccounts]);
  const activeBudgetLines = useMemo(() => (
    budgetLines.filter(line => line.status === 'ACTIVE')
  ), [budgetLines]);
  const filteredFunds = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return funds.filter((fund) => {
      const matchesSearch = !search
        || fund.name.toLowerCase().includes(search)
        || fund.responsibleName.toLowerCase().includes(search)
        || fund.createdByName.toLowerCase().includes(search)
        || fund.fundingSourceName.toLowerCase().includes(search)
        || fund.unitName.toLowerCase().includes(search)
        || fund.businessName.toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'all' || fund.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [funds, searchTerm, statusFilter]);
  const fundsPaginationResetKey = useMemo(
    () => `${searchTerm}:${statusFilter}:${filteredFunds.map(fund => fund.id).join('|')}`,
    [filteredFunds, searchTerm, statusFilter],
  );
  const fundsPagination = useTablePagination({
    resetKey: fundsPaginationResetKey,
    rows: filteredFunds,
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
    const fundingAccountName = getPaymentAccountName(activePaymentAccounts, draft.fundingSourcePaymentAccountId, copy.funds.defaults.financialAccount);
    const localFund: PettyCashFund = {
      id,
      budgetId: selectedBudgetLine?.budgetId,
      budgetLineId: selectedBudgetLine?.id,
      budgetLineName: selectedBudgetLine?.name,
      businessId: draft.businessId,
      businessName,
      companyId: 'company-1',
      createdByName,
      createdByUserId: draft.createdByUserId,
      currencyCode: draft.currencyCode,
      currentBalanceAmount: 0,
      cutOffDay: Number(draft.cutOffDay) || 30,
      fundingMethods: normalizePettyCashMethods(draft.fundingMethods),
      fundingSourceName: fundingAccountName,
      fundingSourcePaymentAccountId: draft.fundingSourcePaymentAccountId,
      kioskAccessUrl: `/petty-cash/kiosk/${id}`,
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
      onFundsChange(currentFunds => ([{
        ...localFund,
        fundingSourceName: fundingAccountName,
        paymentAccountId: draft.paymentAccountId,
      }, ...currentFunds]));
      setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.saveFailed));
    }
    setIsCreateFundOpen(false);
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
    if (!currentFund) return;
    const businessChoices = filterBusinessesByUnit(businessOptions, values.unitId);
    const unitName = getOptionLabel(unitOptions, values.unitId, currentFund.unitName);
    const businessName = getOptionLabel(businessChoices, values.businessId, currentFund.businessName);

    const kioskAccessUrl = currentFund.kioskAccessUrl
      ?? (currentFund.kioskPublicToken ? `/petty-cash/kiosk/${currentFund.kioskPublicToken}` : `/petty-cash/kiosk/${currentFund.id}`);

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

    onFundsChange(currentFunds => currentFunds.map(fund => (fund.id === fundId ? updatedFund : fund)));

    if (hasPettyCashBackendId(fundId)) {
      try {
        const savedFund = await pettyCashService.updateFund(updatedFund);
        onFundsChange(currentFunds => currentFunds.map(fund => (
          fund.id === fundId
            ? {
              ...savedFund,
              businessName,
              unitName,
            }
            : fund
        )));
        setServiceNotice('');
      } catch (error) {
        setServiceNotice(toFinanceApiErrorMessage(error, copy.funds.notices.kioskSaveFailed));
      }
    }

    setIsKioskOpen(false);
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

  return (
    <div className="space-y-6">
      <PettyCashHeaderBanner
        actionLabel={copy.funds.header.create}
        description={copy.funds.header.description}
        emoji="ðŸ’³"
        onAction={() => setIsCreateFundOpen(true)}
        onSecondaryAction={() => setIsKioskOpen(true)}
        secondaryActionIcon={KeyRound}
        secondaryActionLabel={copy.funds.header.kiosk}
        title={copy.funds.header.title}
      />

      {serviceNotice ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {serviceNotice}
        </div>
      ) : null}

      <PettyCashFilterShell
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

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-5">
          <PettyCashMetric icon={WalletCards} label={copy.funds.metrics.assignedAmount} value={formatPettyCashCurrency(summary.assignedAmount, 'MXN')} />
          <PettyCashMetric icon={Landmark} label={copy.funds.metrics.currentBalance} tone="success" value={formatPettyCashCurrency(summary.currentBalanceAmount, 'MXN')} />
          <PettyCashMetric icon={ShieldCheck} label={copy.funds.metrics.activeKiosks} tone="info" value={String(funds.filter(fund => fund.kioskEnabled).length)} />
          <PettyCashMetric icon={UserRound} label={copy.funds.metrics.riskFunds} tone={summary.riskCount > 0 ? 'danger' : 'success'} value={String(summary.riskCount)} />
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#147514]"
            style={{ width: `${summary.assignedAmount > 0 ? Math.min(100, (summary.verifiedExpenseAmount / summary.assignedAmount) * 100) : 0}%` }}
          />
        </div>
      </section>

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
        <table className="w-full min-w-[1520px] table-fixed">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                [copy.funds.table.fund, 'w-[180px]'],
                [copy.funds.table.unit, 'w-[150px]'],
                [copy.funds.table.business, 'w-[170px]'],
                [copy.funds.table.responsible, 'w-[170px]'],
                [copy.funds.table.creator, 'w-[160px]'],
                [copy.funds.table.source, 'w-[190px]'],
                [copy.funds.table.receivedBy, 'w-[190px]'],
                [copy.funds.table.spentBy, 'w-[180px]'],
                [copy.funds.table.budget, 'w-[150px]'],
                [copy.funds.table.balance, 'w-[140px]'],
                [copy.funds.table.pending, 'w-[140px]'],
                [copy.funds.table.kiosk, 'w-[120px]'],
                [copy.funds.table.status, 'w-[160px]'],
              ].map(([column, widthClass]) => (
                <th key={column} className={`${widthClass} px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500`}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fundsPagination.paginatedRows.map((fund) => {
              const fundStatements = statements.filter(statement => statement.pettyCashFundId === fund.id);
              const pendingSettlement = fundStatements.reduce((sum, statement) => sum + getStatementSettlementBalance(statement), 0);
              const budgetLineName = fund.budgetLineName
                ?? activeBudgetLines.find(line => line.id === fund.budgetLineId)?.name
                ?? copy.funds.defaults.noBudget;
              const fundAccountName = getPaymentAccountName(activePaymentAccounts, fund.paymentAccountId, copy.funds.defaults.financialAccount);

              return (
                <tr key={fund.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-5">
                    <p className="font-extrabold text-slate-900">{fund.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{fundAccountName}</p>
                  </td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-700">{fund.unitName}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-700">{fund.businessName}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-700">{fund.responsibleName}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-700">{fund.createdByName}</td>
                  <td className="px-5 py-5">
                    <p className="text-sm font-bold text-slate-700">{fund.fundingSourceName}</p>
                  </td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-700">{fund.fundingMethods.map(method => getPettyCashMethodLabel(copy.funds.methodLabels, method)).join(', ')}</td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-700">{fund.spendingMethods.map(method => getPettyCashMethodLabel(copy.funds.methodLabels, method)).join(', ')}</td>
                  <td className="px-5 py-5">
                    <p className="text-sm font-black text-slate-900">{formatPettyCashCurrency(fund.limitAmount, fund.currencyCode)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{budgetLineName}</p>
                  </td>
                  <td className="px-5 py-5 text-sm font-black text-[#147514]">{formatPettyCashCurrency(fund.currentBalanceAmount, fund.currencyCode)}</td>
                  <td className="px-5 py-5 text-sm font-black text-amber-600">{formatPettyCashCurrency(pendingSettlement, fund.currencyCode)}</td>
                  <td className="px-5 py-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${fund.kioskEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      {fund.kioskEnabled ? copy.common.enabled : copy.common.disabled}
                    </span>
                  </td>
                  <td className="px-5 py-5"><PettyCashStatusPill kind="fund" status={fund.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PettyCashTableShell>

      {isCreateFundOpen ? (
        <CreateFundModal
          paymentAccounts={activePaymentAccounts}
          budgetLines={activeBudgetLines}
          businessOptions={businessOptions}
          currentUserId={currentUser?.id}
          isLoadingReferenceData={isLoadingReferenceData}
          onClose={() => setIsCreateFundOpen(false)}
          onCreate={handleCreateFund}
          unitOptions={unitOptions}
          userOptions={userOptions}
        />
      ) : null}

      {isKioskOpen ? (
        <KioskModal
          funds={funds}
          businessOptions={businessOptions}
          onClose={() => setIsKioskOpen(false)}
          onRotate={handleRotateKioskToken}
          onSave={handleSaveKiosk}
          unitOptions={unitOptions}
        />
      ) : null}
    </div>
  );
}

function CreateFundModal({
  budgetLines,
  businessOptions,
  currentUserId,
  isLoadingReferenceData,
  onClose,
  onCreate,
  paymentAccounts,
  unitOptions,
  userOptions,
}: {
  budgetLines: FinanceBudgetLine[];
  businessOptions: FinanceReferenceOption[];
  currentUserId?: string;
  isLoadingReferenceData: boolean;
  onClose: () => void;
  onCreate: (draft: FundDraft) => void;
  paymentAccounts: PaymentAccount[];
  unitOptions: FinanceReferenceOption[];
  userOptions: FinanceReferenceOption[];
}) {
  const copy = usePettyCashTranslations();
  const [draft, setDraft] = useState<FundDraft>(() => {
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
        fundingSourcePaymentAccountId: current.fundingSourcePaymentAccountId || nextDefaults.fundingSourcePaymentAccountId,
        limitAmount: current.limitAmount || (nextBudgetLine ? String(getBudgetLineLimit(nextBudgetLine)) : nextDefaults.limitAmount),
        paymentAccountId: current.paymentAccountId || nextDefaults.paymentAccountId,
        responsibleUserId: current.responsibleUserId || nextDefaults.responsibleUserId,
        unitId: nextUnitId,
      };
    });
  }, [budgetLines, businessOptions, currentUserId, paymentAccounts, unitOptions, userOptions]);
  const selectedBudgetLine = budgetLines.find(line => line.id === draft.budgetLineId);
  const selectedBudgetLimit = getBudgetLineLimit(selectedBudgetLine);
  const filteredBusinessOptions = filterBusinessesByUnit(businessOptions, draft.unitId);
  const canUseManualLimit = budgetLines.length === 0;
  const selectedFundAccount = paymentAccounts.find(account => account.id === draft.paymentAccountId);
  const selectedFundingSourceAccount = paymentAccounts.find(account => account.id === draft.fundingSourcePaymentAccountId);
  const fundingSourceOptions = getFundingSourceOptions(paymentAccounts, draft.paymentAccountId, draft.currencyCode);
  const hasDistinctFundingAccounts = draft.paymentAccountId.length > 0
    && draft.fundingSourcePaymentAccountId.length > 0
    && draft.paymentAccountId !== draft.fundingSourcePaymentAccountId;
  const fundAccountCurrencyMatches = accountMatchesCurrency(selectedFundAccount, draft.currencyCode);
  const fundingSourceCurrencyMatches = accountMatchesCurrency(selectedFundingSourceAccount, draft.currencyCode);
  const budgetLineCurrencyMatches = budgetLineMatchesCurrency(selectedBudgetLine, draft.currencyCode);
  const isLimitAboveBudget = Boolean(
    selectedBudgetLine
    && selectedBudgetLimit > 0
    && Number(draft.limitAmount) > selectedBudgetLimit,
  );
  const canCreate = draft.name.trim().length > 0
    && Number(draft.limitAmount) > 0
    && (canUseManualLimit || draft.budgetLineId.length > 0)
    && draft.paymentAccountId.length > 0
    && hasDistinctFundingAccounts
    && fundAccountCurrencyMatches
    && fundingSourceCurrencyMatches
    && budgetLineCurrencyMatches
    && draft.responsibleUserId.length > 0
    && draft.unitId.length > 0
    && draft.businessId.length > 0
    && draft.fundingMethods.length > 0
    && draft.spendingMethods.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#147514]/30 bg-white shadow-2xl">
        <header className="bg-[#147514] px-7 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <Banknote className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-2xl font-black">{copy.funds.modal.title}</h3>
                <p className="mt-1 text-sm font-semibold text-white/80">{copy.funds.modal.subtitle}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 transition hover:bg-white/25">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-7 py-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-lg font-black text-slate-900">{copy.funds.modal.dataTitle}</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <PettyCashField label={copy.funds.modal.name}>
                <input
                  className={pettyCashInputClass}
                  onChange={(event) => setDraft(current => ({ ...current, name: event.target.value }))}
                  placeholder={copy.funds.modal.namePlaceholder}
                  value={draft.name}
                />
              </PettyCashField>
              <PettyCashField label={copy.funds.modal.budgetLine}>
                <select
                  className={pettyCashInputClass}
                  disabled={budgetLines.length === 0}
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
                  {budgetLines.length === 0 ? (
                    <option value="">{copy.funds.modal.noBudgets}</option>
                  ) : null}
                  {budgetLines.map(line => (
                    <option key={line.id} value={line.id}>{getBudgetLineLabel(line, copy.funds.defaults.budgetLine, copy.funds.budgetLineOption)}</option>
                  ))}
                </select>
              </PettyCashField>
              <PettyCashField label={copy.funds.modal.currency}>
                <select
                  className={pettyCashInputClass}
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
                {selectedBudgetLine ? (
                  <p className={`mt-2 text-xs font-semibold ${isLimitAboveBudget ? 'text-amber-700' : 'text-slate-500'}`}>
                    {copy.funds.modal.budgetAvailable(getBudgetLineDisplayName(selectedBudgetLine, copy.funds.defaults.budgetLine), formatPettyCashCurrency(selectedBudgetLimit, toPettyCashCurrency(selectedBudgetLine.currencyCode)))} {isLimitAboveBudget ? copy.funds.modal.budgetExceededHint : copy.funds.modal.budgetNormalHint}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {copy.funds.modal.budgetMissingHint}
                  </p>
                )}
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

          <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-lg font-black text-slate-900">{copy.funds.modal.responsibilityTitle}</h4>
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
              <PettyCashField label={copy.funds.modal.createdBy}>
                <select
                  className={pettyCashInputClass}
                  disabled={isLoadingReferenceData && userOptions.length === 0}
                  onChange={(event) => setDraft(current => ({ ...current, createdByUserId: event.target.value }))}
                  value={draft.createdByUserId}
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

          <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-lg font-black text-slate-900">{copy.funds.modal.fundingTitle}</h4>
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
                      budgetLineId: nextBudgetLine?.id ?? '',
                      currencyCode: nextCurrency,
                      fundingSourcePaymentAccountId: nextFundingSource?.id ?? '',
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
                  <p className="mt-2 text-xs font-semibold text-amber-700">{copy.funds.modal.fundAccountCurrencyWarning}</p>
                ) : null}
              </PettyCashField>
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
                  <p className="mt-2 text-xs font-semibold text-amber-700">{copy.funds.modal.sourceAccountWarning}</p>
                ) : null}
              </PettyCashField>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.funds.modal.fundingMethods}</p>
                <div className="mt-2 grid gap-2">
                  {pettyCashFundingMethodOptions.map(method => (
                    <label key={method} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
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
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.funds.modal.spendingMethods}</p>
                <div className="mt-2 grid gap-2">
                  {pettyCashSpendingMethodOptions.map(method => (
                    <label key={method} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
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
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 bg-[#147514] px-7 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            {copy.common.cancel}
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => onCreate(draft)}
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-[#147514] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.funds.modal.submit}
          </button>
        </footer>
      </div>
    </div>
  );
}

function KioskModal({
  businessOptions,
  funds,
  onClose,
  onRotate,
  onSave,
  unitOptions,
}: {
  businessOptions: FinanceReferenceOption[];
  funds: PettyCashFund[];
  onClose: () => void;
  onRotate: (fundId: string) => Promise<void>;
  onSave: (fundId: string, values: KioskDraft) => void;
  unitOptions: FinanceReferenceOption[];
}) {
  const copy = usePettyCashTranslations();
  const [selectedFundId, setSelectedFundId] = useState(funds[0]?.id ?? '');
  const selectedFund = funds.find(fund => fund.id === selectedFundId);
  const [draft, setDraft] = useState<KioskDraft>(() => ({
    businessId: selectedFund?.businessId ?? '',
    kioskEnabled: selectedFund?.kioskEnabled ?? false,
    name: selectedFund?.name ?? '',
    unitId: selectedFund?.unitId ?? '',
  }));
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRotatingLink, setIsRotatingLink] = useState(false);
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

  const handleSelectFund = (fundId: string) => {
    const nextFund = funds.find(fund => fund.id === fundId);
    setSelectedFundId(fundId);
    setDraft({
      businessId: nextFund?.businessId ?? '',
      kioskEnabled: nextFund?.kioskEnabled ?? false,
      name: nextFund?.name ?? '',
      unitId: nextFund?.unitId ?? '',
    });
    setCopiedLink(false);
    setIsRotatingLink(false);
  };

  const canSave = selectedFundId.length > 0
    && draft.name.trim().length > 0
    && draft.unitId.length > 0
    && draft.businessId.length > 0;
  const kioskPath = selectedFund
    ? selectedFund.kioskAccessUrl
      ?? (selectedFund.kioskPublicToken ? `/petty-cash/kiosk/${selectedFund.kioskPublicToken}` : `/petty-cash/kiosk/${selectedFund.id}`)
    : '';
  const kioskUrl = kioskPath
    ? (kioskPath.startsWith('http') ? kioskPath : `${window.location.origin}${kioskPath}`)
    : '';
  const canUseKioskLink = Boolean(kioskUrl && selectedFund?.kioskEnabled);
  const handleCopyLink = async () => {
    if (!kioskUrl) return;
    await navigator.clipboard.writeText(kioskUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };
  const handleOpenLink = () => {
    if (!kioskUrl) return;
    window.open(kioskUrl, '_blank', 'noopener,noreferrer');
  };
  const handleRotateLink = async () => {
    if (!selectedFundId || !hasPettyCashBackendId(selectedFundId)) return;
    setIsRotatingLink(true);
    setCopiedLink(false);
    try {
      await onRotate(selectedFundId);
    } finally {
      setIsRotatingLink(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#147514]/30 bg-white shadow-2xl">
        <header className="bg-[#147514] px-7 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-2xl font-black">{copy.funds.kiosk.title}</h3>
                <p className="mt-1 text-sm font-semibold text-white/80">{copy.funds.kiosk.subtitle}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 transition hover:bg-white/25">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-7 py-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-4">
              <PettyCashField label={copy.funds.kiosk.assignedFund}>
                <select className={pettyCashInputClass} onChange={(event) => handleSelectFund(event.target.value)} value={selectedFundId}>
                  {funds.map(fund => (
                    <option key={fund.id} value={fund.id}>{fund.name} - {fund.responsibleName}</option>
                  ))}
                </select>
              </PettyCashField>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span>
                  <span className="block text-sm font-black text-slate-900">{copy.funds.kiosk.enableTitle}</span>
                  <span className="block text-xs font-semibold text-slate-500">{copy.funds.kiosk.enableDescription}</span>
                </span>
                <input
                  checked={draft.kioskEnabled}
                  onChange={(event) => setDraft(current => ({ ...current, kioskEnabled: event.target.checked }))}
                  type="checkbox"
                />
              </label>

              <PettyCashField label={copy.funds.kiosk.boxName}>
                <input
                  className={pettyCashInputClass}
                  onChange={(event) => setDraft(current => ({ ...current, name: event.target.value }))}
                  value={draft.name}
                />
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
                        businessId: nextBusinesses.some(option => option.value === current.businessId)
                          ? current.businessId
                          : firstOptionValue(nextBusinesses),
                        unitId: nextUnitId,
                      }));
                    }}
                    value={draft.unitId}
                  >
                    {unitChoices.length === 0 ? <option value="">{copy.funds.modal.noUnits}</option> : null}
                    {unitChoices.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </PettyCashField>
                <PettyCashField label={copy.funds.kiosk.assignedBusiness}>
                  <select
                    className={pettyCashInputClass}
                    onChange={(event) => setDraft(current => ({ ...current, businessId: event.target.value }))}
                    value={draft.businessId}
                  >
                    {businessChoices.length === 0 ? <option value="">{copy.funds.modal.noBusinesses}</option> : null}
                    {businessChoices.map(business => (
                      <option key={business.value} value={business.value}>{business.label}</option>
                    ))}
                  </select>
                </PettyCashField>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-800">{copy.funds.kiosk.universalPinTitle}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {copy.funds.kiosk.universalPinDescription(selectedFund?.responsibleName ?? copy.funds.modal.responsible)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Link2 className="h-4 w-4 text-[#147514]" />
                  {copy.funds.kiosk.linkTitle}
                </div>
                <p className="mt-2 break-all rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                  {kioskUrl || copy.common.selectFund}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!kioskUrl}
                    onClick={() => void handleCopyLink()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4 text-[#147514]" />
                    {copiedLink ? copy.common.copied : copy.common.copyLink}
                  </button>
                  <button
                    type="button"
                    disabled={!canUseKioskLink}
                    onClick={handleOpenLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ExternalLink className="h-4 w-4 text-[#147514]" />
                    {copy.funds.kiosk.open}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFundId || !hasPettyCashBackendId(selectedFundId) || isRotatingLink}
                    onClick={() => void handleRotateLink()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCw className={`h-4 w-4 text-[#147514] ${isRotatingLink ? 'animate-spin' : ''}`} />
                    {isRotatingLink ? copy.funds.kiosk.regenerating : copy.funds.kiosk.regenerate}
                  </button>
                </div>
                {!selectedFund?.kioskEnabled ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {copy.funds.kiosk.enabledWarning}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 bg-[#147514] px-7 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            {copy.common.cancel}
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(selectedFundId, draft)}
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-[#147514] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.funds.kiosk.save}
          </button>
        </footer>
      </div>
    </div>
  );
}
