import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Landmark, Search, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement, PettyCashStatementStatus } from '../types/pettyCash.types';
import { useTablePagination } from '../../../hooks/useTablePagination';
import {
  formatPettyCashCurrency,
  formatPettyCashIsoDate,
  getFundById,
  getOperationalPettyCashSummary,
  getStatementSettlementBalance,
} from '../utils/pettyCash.utils';
import { getPettyCashMethodLabel } from '../utils/pettyCash.methods';
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

type PettyCashFinancialViewWorkspaceProps = {
  funds: PettyCashFund[];
  movements: PettyCashMovement[];
  settlementLines: PettyCashSettlementLine[];
  statements: PettyCashStatement[];
};

export function PettyCashFinancialViewWorkspace({
  funds,
  movements,
  settlementLines,
  statements,
}: PettyCashFinancialViewWorkspaceProps) {
  const copy = usePettyCashTranslations();
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<PettyCashStatementStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const statusOptions: Array<{ label: string; value: PettyCashStatementStatus | 'all' }> = useMemo(() => [
    { label: copy.common.all, value: 'all' },
    { label: copy.status.statement.OPEN, value: 'OPEN' },
    { label: copy.status.statement.CUT_PENDING, value: 'CUT_PENDING' },
    { label: copy.status.statement.PARTIALLY_SETTLED, value: 'PARTIALLY_SETTLED' },
    { label: copy.status.statement.SETTLED, value: 'SETTLED' },
    { label: copy.status.statement.SHORTAGE, value: 'SHORTAGE' },
    { label: copy.status.statement.FORGIVEN_SHORTAGE, value: 'FORGIVEN_SHORTAGE' },
    { label: copy.status.statement.CHARGED_TO_EMPLOYEE, value: 'CHARGED_TO_EMPLOYEE' },
    { label: copy.status.statement.CLOSED, value: 'CLOSED' },
  ], [copy]);

  const periodOptions = useMemo(() => (
    Array.from(new Set(statements.map(statement => statement.periodKey))).sort().reverse()
  ), [statements]);

  const filteredStatements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return statements.filter((statement) => {
      const fund = getFundById(funds, statement.pettyCashFundId);
      const matchesPeriod = periodFilter === 'all' || statement.periodKey === periodFilter;
      const matchesStatus = statusFilter === 'all' || statement.status === statusFilter;
      const matchesSearch = !search
        || statement.folio.toLowerCase().includes(search)
        || statement.responsibleName.toLowerCase().includes(search)
        || fund?.name.toLowerCase().includes(search)
        || fund?.unitName.toLowerCase().includes(search)
        || fund?.businessName.toLowerCase().includes(search);

      return matchesPeriod && matchesStatus && matchesSearch;
    });
  }, [funds, periodFilter, searchTerm, statements, statusFilter]);

  const filteredStatementIds = useMemo(
    () => new Set(filteredStatements.map(statement => statement.id)),
    [filteredStatements],
  );
  const filteredMovements = useMemo(
    () => movements.filter(movement => !movement.pettyCashStatementId || filteredStatementIds.has(movement.pettyCashStatementId)),
    [filteredStatementIds, movements],
  );
  const filteredLines = useMemo(
    () => settlementLines.filter(line => filteredStatementIds.has(line.pettyCashStatementId)),
    [filteredStatementIds, settlementLines],
  );
  const statementPaginationResetKey = useMemo(
    () => `${periodFilter}:${statusFilter}:${searchTerm}:${filteredStatements.map(statement => statement.id).join('|')}`,
    [filteredStatements, periodFilter, searchTerm, statusFilter],
  );
  const statementPagination = useTablePagination({
    resetKey: statementPaginationResetKey,
    rows: filteredStatements,
  });
  const movementPaginationResetKey = useMemo(
    () => `${periodFilter}:${statusFilter}:${searchTerm}:${filteredMovements.map(movement => movement.id).join('|')}`,
    [filteredMovements, periodFilter, searchTerm, statusFilter],
  );
  const movementPagination = useTablePagination({
    resetKey: movementPaginationResetKey,
    rows: filteredMovements,
  });
  const summary = useMemo(
    () => getOperationalPettyCashSummary(filteredStatements, funds),
    [filteredStatements, funds],
  );

  const assignedAmount = Math.max(summary.assignedAmount, 1);
  const verifiedWidth = Math.min(100, (summary.verifiedExpenseAmount / assignedAmount) * 100);
  const pendingWidth = Math.min(100 - verifiedWidth, (summary.pendingReconciliationAmount / assignedAmount) * 100);
  const shortageWidth = Math.min(100 - verifiedWidth - pendingWidth, (summary.shortageAmount / assignedAmount) * 100);
  const remainingWidth = Math.max(0, 100 - verifiedWidth - pendingWidth - shortageWidth);
  const reconciliationRate = summary.estimatedUsageAmount > 0
    ? Math.round((summary.verifiedExpenseAmount / summary.estimatedUsageAmount) * 100)
    : 0;
  const budgetAvailable = Math.max(0, summary.assignedAmount - summary.estimatedUsageAmount);

  return (
    <div className="space-y-6">
      <PettyCashHeaderBanner
        description={copy.financial.header.description}
        emoji="📊"
        title={copy.financial.header.title}
      />

      <PettyCashFilterShell
        resultLabel={copy.financial.filters.result(filteredStatements.length)}
        subtitle={copy.financial.filters.subtitle}
      >
        <PettyCashField label={copy.financial.filters.search}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${pettyCashInputClass} pl-9`}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={copy.financial.filters.searchPlaceholder}
              value={searchTerm}
            />
          </div>
        </PettyCashField>
        <PettyCashField label={copy.financial.filters.period}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setPeriodFilter(event.target.value)}
            value={periodFilter}
          >
            <option value="all">{copy.common.all}</option>
            {periodOptions.map(period => (
              <option key={period} value={period}>{period}</option>
            ))}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.financial.filters.status}>
          <select
            className={pettyCashInputClass}
            onChange={(event) => setStatusFilter(event.target.value as PettyCashStatementStatus | 'all')}
            value={statusFilter}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </PettyCashField>
      </PettyCashFilterShell>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <PettyCashMetric icon={WalletCards} label={copy.financial.metrics.assignedFunds} value={formatPettyCashCurrency(summary.assignedAmount, 'MXN')} />
          <PettyCashMetric icon={CheckCircle2} label={copy.financial.metrics.verifiedExpense} tone="success" value={formatPettyCashCurrency(summary.verifiedExpenseAmount, 'MXN')} />
          <PettyCashMetric icon={FileText} label={copy.financial.metrics.pendingProof} tone="warning" value={formatPettyCashCurrency(summary.pendingReconciliationAmount, 'MXN')} />
          <PettyCashMetric icon={AlertTriangle} label={copy.financial.metrics.shortages} tone={summary.shortageAmount > 0 ? 'danger' : 'success'} value={formatPettyCashCurrency(summary.shortageAmount, 'MXN')} />
          <PettyCashMetric icon={Landmark} label={copy.financial.metrics.estimatedAvailable} tone="info" value={formatPettyCashCurrency(budgetAvailable, 'MXN')} />
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-[#147514]" style={{ width: `${verifiedWidth}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${pendingWidth}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${shortageWidth}%` }} />
          <div className="h-full bg-sky-400" style={{ width: `${remainingWidth}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#147514]" /> {copy.financial.progress.verified}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> {copy.financial.progress.pending}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" /> {copy.financial.progress.shortage}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" /> {copy.financial.progress.available}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#147514]/10 text-[#147514]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">{copy.financial.cards.verifiedTitle}</h3>
              <p className="text-sm font-medium text-slate-500">{copy.financial.cards.verifiedDescription}</p>
            </div>
          </div>
          <p className="mt-5 text-3xl font-black text-[#147514]">{formatPettyCashCurrency(summary.verifiedExpenseAmount, 'MXN')}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{copy.financial.cards.verifiedFooter(filteredLines.filter(line => line.status === 'EXPENSE_CREATED').length)}</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">{copy.financial.cards.pendingTitle}</h3>
              <p className="text-sm font-medium text-slate-500">{copy.financial.cards.pendingDescription}</p>
            </div>
          </div>
          <p className="mt-5 text-3xl font-black text-amber-600">{formatPettyCashCurrency(summary.pendingReconciliationAmount, 'MXN')}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{copy.financial.cards.pendingFooter(reconciliationRate)}</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">{copy.financial.cards.riskTitle}</h3>
              <p className="text-sm font-medium text-slate-500">{copy.financial.cards.riskDescription}</p>
            </div>
          </div>
          <p className="mt-5 text-3xl font-black text-red-600">{summary.riskCount}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{copy.financial.cards.riskFooter(formatPettyCashCurrency(summary.shortageAmount, 'MXN'))}</p>
        </section>
      </div>

      <PettyCashTableShell
        footer={(
          <PettyCashPagination
            currentPage={statementPagination.currentPage}
            itemLabel={copy.financial.statements.itemLabel}
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
        <table className="w-full min-w-[1180px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                copy.financial.statements.columns.statement,
                copy.financial.statements.columns.fund,
                copy.financial.statements.columns.period,
                copy.financial.statements.columns.assigned,
                copy.financial.statements.columns.estimated,
                copy.financial.statements.columns.verified,
                copy.financial.statements.columns.pending,
                copy.financial.statements.columns.shortage,
                copy.financial.statements.columns.status,
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
                  <td className="px-5 py-5">
                    <p className="text-sm font-extrabold text-slate-900">{fund?.name ?? copy.financial.statements.noFund}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{statement.responsibleName}</p>
                  </td>
                  <td className="px-5 py-5 text-sm font-bold text-slate-700">{statement.periodKey}</td>
                  <td className="px-5 py-5 text-sm font-black text-slate-900">{formatPettyCashCurrency(statement.assignedAmount + statement.additionalDepositAmount, statement.currencyCode)}</td>
                  <td className="px-5 py-5 text-sm font-black text-slate-900">{formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode)}</td>
                  <td className="px-5 py-5 text-sm font-black text-[#147514]">{formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)}</td>
                  <td className="px-5 py-5 text-sm font-black text-amber-600">{formatPettyCashCurrency(getStatementSettlementBalance(statement), statement.currencyCode)}</td>
                  <td className="px-5 py-5 text-sm font-black text-red-600">{formatPettyCashCurrency(statement.shortageAmount, statement.currencyCode)}</td>
                  <td className="px-5 py-5"><PettyCashStatusPill kind="statement" status={statement.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PettyCashTableShell>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">{copy.financial.movements.title}</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">{copy.financial.movements.subtitle}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">{copy.financial.movements.result(filteredMovements.length)}</span>
        </div>
        {filteredMovements.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {[
                      copy.financial.movements.columns.date,
                      copy.financial.movements.columns.fund,
                      copy.financial.movements.columns.type,
                      copy.financial.movements.columns.source,
                      copy.financial.movements.columns.target,
                      copy.financial.movements.columns.amount,
                      copy.financial.movements.columns.reference,
                    ].map(column => (
                      <th key={column} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movementPagination.paginatedRows.map((movement) => {
                    const fund = getFundById(funds, movement.pettyCashFundId);
                    return (
                      <tr key={movement.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatPettyCashIsoDate(movement.movementDate)}</td>
                        <td className="px-5 py-4 text-sm font-black text-slate-900">{fund?.name ?? copy.financial.movements.noFund}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{copy.status.movement[movement.type]}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{movement.fromPaymentAccountName ?? copy.common.notAvailable}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-700">{movement.toPaymentAccountName ?? copy.common.notAvailable}</td>
                        <td className="px-5 py-4 text-sm font-black text-[#147514]">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">{getPettyCashMethodLabel(copy.funds.methodLabels, movement.reference)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PettyCashPagination
              currentPage={movementPagination.currentPage}
              itemLabel={copy.financial.movements.itemLabel}
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
            <PettyCashEmptyState label={copy.financial.movements.empty} />
          </div>
        )}
      </section>
    </div>
  );
}
