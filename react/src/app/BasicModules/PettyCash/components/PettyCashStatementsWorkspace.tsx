import { Banknote, CheckCircle2, Coins, Eye, Info, ReceiptText, Search, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTablePagination } from '../../../hooks/useTablePagination';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../types/pettyCash.types';
import { formatPettyCashCurrency, formatPettyCashIsoDate, formatPettyCashNativeBreakdown } from '../utils/pettyCash.utils';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import { OperationalKpiArea } from '../../shared/operational';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import {
  PettyCashEmptyState,
  PettyCashField,
  PettyCashFilterShell,
  PettyCashHeaderBanner,
  PettyCashPagination,
  PettyCashSortableHeader,
  PettyCashStatusPill,
  PettyCashTableShell,
  pettyCashInputClass,
  usePettyCashTableSort,
} from './PettyCashShared';
import { PettyCashStatementDetailModal } from './statements/PettyCashStatementDetailModal';

type Props = {
  funds: PettyCashFund[];
  movements: PettyCashMovement[];
  settlementLines: PettyCashSettlementLine[];
  statements: PettyCashStatement[];
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function PettyCashStatementsWorkspace({ funds, movements, settlementLines, statements }: Props) {
  const copy = usePettyCashTranslations();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [search, setSearch] = useState('');
  const [fundId, setFundId] = useState('all');
  const [period, setPeriod] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedStatement, setSelectedStatement] = useState<PettyCashStatement | null>(null);

  const fundsById = useMemo(() => new Map(funds.map(fund => [fund.id, fund])), [funds]);
  const periods = useMemo(() => [...new Set(statements.map(statement => statement.periodKey))].sort().reverse(), [statements]);
  const statuses = useMemo(() => [...new Set(statements.map(statement => statement.status))], [statements]);
  const orderedByFund = useMemo(() => {
    const grouped = new Map<string, PettyCashStatement[]>();
    statements.forEach(statement => {
      grouped.set(statement.pettyCashFundId, [...(grouped.get(statement.pettyCashFundId) ?? []), statement]);
    });
    grouped.forEach(items => items.sort((left, right) => left.periodKey.localeCompare(right.periodKey)));
    return grouped;
  }, [statements]);

  const previousStatement = (statement: PettyCashStatement) => {
    const items = orderedByFund.get(statement.pettyCashFundId) ?? [];
    const index = items.findIndex(item => item.id === statement.id);
    return index > 0 ? items[index - 1] : undefined;
  };

  const filteredStatements = useMemo(() => {
    const query = normalize(search);
    return [...statements]
      .filter(statement => fundId === 'all' || statement.pettyCashFundId === fundId)
      .filter(statement => period === 'all' || statement.periodKey === period)
      .filter(statement => status === 'all' || statement.status === status)
      .filter(statement => {
        if (!query) return true;
        const fund = fundsById.get(statement.pettyCashFundId);
        return [statement.folio, statement.periodKey, statement.responsibleName, fund?.name]
          .some(value => normalize(value ?? '').includes(query));
      })
      .sort((left, right) => right.periodKey.localeCompare(left.periodKey) || right.id.localeCompare(left.id));
  }, [fundId, fundsById, period, search, statements, status]);

  const statementSortAccessors = useMemo(() => ({
    approved: (statement: PettyCashStatement) => statement.verifiedExpenseAmount,
    captured: (statement: PettyCashStatement) => statement.estimatedUsageAmount,
    closing: (statement: PettyCashStatement) => statement.declaredClosingBalanceAmount,
    fund: (statement: PettyCashStatement) => fundsById.get(statement.pettyCashFundId)?.name,
    funded: (statement: PettyCashStatement) => statement.assignedAmount + statement.additionalDepositAmount,
    opening: (statement: PettyCashStatement) => statement.openingBalanceAmount,
    period: (statement: PettyCashStatement) => statement.periodStart,
    statement: (statement: PettyCashStatement) => statement.folio,
    status: (statement: PettyCashStatement) => statement.status,
  }), [fundsById]);
  const statementSort = usePettyCashTableSort(filteredStatements, statementSortAccessors, 'period', 'desc');
  const pagination = useTablePagination({
    resetKey: `${search}|${fundId}|${period}|${status}|${statementSort.sortKey}|${statementSort.sortDirection}`,
    rows: statementSort.sortedRows,
  });

  const statementIds = filteredStatements.map((statement) => statement.id);
  const openingAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_STATEMENT_OPENING', preferredCurrency, ids: statementIds });
  const fundedAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_STATEMENT_FUNDED', preferredCurrency, ids: statementIds });
  const capturedAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_STATEMENT_ESTIMATED', preferredCurrency, ids: statementIds });
  const approvedAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_STATEMENT_VERIFIED', preferredCurrency, ids: statementIds });
  const closingAggregate = useKpiMonetaryAggregate({ metric: 'PETTY_CASH_STATEMENT_CLOSING', preferredCurrency, ids: statementIds });
  const totals = {
    approved: approvedAggregate.data?.preferredTotal ?? 0,
    captured: capturedAggregate.data?.preferredTotal ?? 0,
    closing: closingAggregate.data?.preferredTotal ?? 0,
    funded: fundedAggregate.data?.preferredTotal ?? 0,
    opening: openingAggregate.data?.preferredTotal ?? 0,
  };
  const currencyCount = new Set(filteredStatements.map(statement => statement.currencyCode)).size;
  const nativeClosing = formatPettyCashNativeBreakdown(
    filteredStatements,
    statement => statement.declaredClosingBalanceAmount,
    statement => statement.currencyCode,
  );
  const selectedMovements = selectedStatement
    ? movements.filter(movement => movement.pettyCashStatementId === selectedStatement.id)
    : [];
  const selectedReceipts = selectedStatement
    ? settlementLines.filter(line => line.pettyCashStatementId === selectedStatement.id)
    : [];

  return (
    <div className="space-y-6">
      <PettyCashHeaderBanner
        emoji="📋"
        title={copy.statementsHistory.header.title}
        description={copy.statementsHistory.header.description}
      />

      <PettyCashFilterShell
        resultLabel={copy.statementsHistory.filters.result(filteredStatements.length)}
        subtitle={copy.statementsHistory.filters.subtitle}
      >
        <PettyCashField label={copy.statementsHistory.filters.search}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input className={`${pettyCashInputClass} pl-9`} value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.statementsHistory.filters.searchPlaceholder} />
          </div>
        </PettyCashField>
        <PettyCashField label={copy.statementsHistory.filters.fund}>
          <select className={pettyCashInputClass} value={fundId} onChange={event => setFundId(event.target.value)}>
            <option value="all">{copy.common.all}</option>
            {funds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.statementsHistory.filters.period}>
          <select className={pettyCashInputClass} value={period} onChange={event => setPeriod(event.target.value)}>
            <option value="all">{copy.common.all}</option>
            {periods.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </PettyCashField>
        <PettyCashField label={copy.statementsHistory.filters.status}>
          <select className={pettyCashInputClass} value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">{copy.common.all}</option>
            {statuses.map(value => <option key={value} value={value}>{copy.status.statement[value]}</option>)}
          </select>
        </PettyCashField>
      </PettyCashFilterShell>

      <OperationalKpiArea
        alertChips={[
          { id: 'preferred-currency', icon: <Coins className="h-3.5 w-3.5" />, label: copy.common.preferredCurrency(preferredCurrency), tone: 'info' },
          ...(currencyCount > 1 ? [{ id: 'currency-count', icon: <Coins className="h-3.5 w-3.5" />, label: copy.common.currenciesRepresented(currencyCount), tone: 'info' as const }] : []),
          { id: 'native-closing', icon: <WalletCards className="h-3.5 w-3.5" />, label: copy.common.nativeBreakdown(nativeClosing), tone: 'neutral' },
        ]}
        distributionSegments={[
          { id: 'approved', label: copy.statementsHistory.metrics.approved, count: totals.approved, className: 'bg-[#147514]' },
          { id: 'captured', label: copy.statementsHistory.metrics.captured, count: Math.max(0, totals.captured - totals.approved), className: 'bg-amber-400' },
          { id: 'closing', label: copy.statementsHistory.metrics.closing, count: Math.max(0, totals.closing), className: 'bg-sky-400' },
        ]}
        insight={`${copy.statementsHistory.filters.result(filteredStatements.length)} · ${copy.statementsHistory.metrics.approved}: ${formatPettyCashCurrency(totals.approved, preferredCurrency)} · ${copy.statementsHistory.metrics.closing}: ${formatPettyCashCurrency(totals.closing, preferredCurrency)}`}
        insightIcon={<Info className="h-4 w-4" />}
        metrics={[
          { id: 'opening', icon: <WalletCards className="h-4 w-4" />, label: copy.statementsHistory.metrics.opening, value: formatPettyCashCurrency(totals.opening, preferredCurrency) },
          { id: 'funded', icon: <Banknote className="h-4 w-4" />, label: copy.statementsHistory.metrics.funded, value: formatPettyCashCurrency(totals.funded, preferredCurrency), valueClassName: 'text-sky-600' },
          { id: 'approved', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.statementsHistory.metrics.approved, value: formatPettyCashCurrency(totals.approved, preferredCurrency), valueClassName: 'text-[#147514]' },
          { id: 'closing', icon: <WalletCards className="h-4 w-4" />, label: copy.statementsHistory.metrics.closing, value: formatPettyCashCurrency(totals.closing, preferredCurrency), valueClassName: totals.closing < 0 ? 'text-rose-600' : 'text-slate-950' },
        ]}
      />

      {filteredStatements.length ? (
        <>
        <div className="space-y-3 md:hidden">
          {pagination.paginatedRows.map((statement) => {
            const fund = fundsById.get(statement.pettyCashFundId);
            return (
              <article key={statement.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{statement.folio}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{fund?.name ?? copy.common.notAvailable} · {statement.periodKey}</p>
                  </div>
                  <PettyCashStatusPill kind="statement" status={statement.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{copy.statementsHistory.metrics.approved}</p>
                    <p className="mt-1 text-base font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{copy.statementsHistory.metrics.closing}</p>
                    <p className={`mt-1 text-base font-medium tabular-nums ${statement.declaredClosingBalanceAmount < 0 ? 'text-rose-600' : 'text-slate-950 dark:text-white'}`}>{formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedStatement(statement)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#147514]/25 bg-white px-3 text-sm font-medium text-[#147514] transition hover:bg-[#147514]/5 dark:border-emerald-400/25 dark:bg-slate-900 dark:text-emerald-300">
                  <Eye className="h-4 w-4" />
                  {copy.statementsHistory.table.view}
                </button>
              </article>
            );
          })}
          <PettyCashPagination
            currentPage={pagination.currentPage}
            itemLabel={copy.statementsHistory.table.itemLabel}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            pageEnd={pagination.pageEnd}
            pageSize={pagination.pageSize}
            pageSizeOptions={pagination.pageSizeOptions}
            pageStart={pagination.pageStart}
            totalCount={pagination.totalCount}
            totalPages={pagination.totalPages}
          />
        </div>
        <div className="hidden md:block">
        <PettyCashTableShell footer={(
          <PettyCashPagination
            currentPage={pagination.currentPage}
            itemLabel={copy.statementsHistory.table.itemLabel}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            pageEnd={pagination.pageEnd}
            pageSize={pagination.pageSize}
            pageSizeOptions={pagination.pageSizeOptions}
            pageStart={pagination.pageStart}
            totalCount={pagination.totalCount}
            totalPages={pagination.totalPages}
          />
        )}>
          <table className="w-full min-w-[1320px]">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
              <tr>
                <PettyCashSortableHeader columnKey="statement" label={copy.statementsHistory.table.statement} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="fund" label={copy.statementsHistory.table.fund} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="period" label={copy.statementsHistory.table.period} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="opening" label={copy.statementsHistory.table.opening} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="funded" label={copy.statementsHistory.table.funded} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="captured" label={copy.statementsHistory.table.captured} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="approved" label={copy.statementsHistory.table.approved} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader columnKey="closing" label={copy.statementsHistory.table.closing} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader label={copy.statementsHistory.table.source} />
                <PettyCashSortableHeader columnKey="status" label={copy.statementsHistory.table.status} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                <PettyCashSortableHeader align="right" label={copy.statementsHistory.table.actions} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {pagination.paginatedRows.map(statement => {
                const fund = fundsById.get(statement.pettyCashFundId);
                const previous = previousStatement(statement);
                const funded = statement.assignedAmount + statement.additionalDepositAmount;
                return (
                  <tr key={statement.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">{statement.folio}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund?.name ?? copy.common.notAvailable}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{formatPettyCashIsoDate(statement.periodStart)} – {formatPettyCashIsoDate(statement.periodEnd)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums">{formatPettyCashCurrency(statement.openingBalanceAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-sky-700 dark:text-sky-300">{formatPettyCashCurrency(funded, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-amber-700 dark:text-amber-300">{formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)}</td>
                    <td className={`px-5 py-4 text-sm font-medium tabular-nums ${statement.declaredClosingBalanceAmount < 0 ? 'text-red-600' : ''}`}>{formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-500">{previous ? copy.statementsHistory.table.previous(previous.folio) : copy.statementsHistory.table.current}</td>
                    <td className="px-5 py-4"><PettyCashStatusPill kind="statement" status={statement.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => setSelectedStatement(statement)} title={copy.statementsHistory.table.view} aria-label={copy.statementsHistory.table.view} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#147514]/20 bg-[#147514]/10 text-[#147514] hover:bg-[#147514] hover:text-white"><Eye className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </PettyCashTableShell>
        </div>
        </>
      ) : <PettyCashEmptyState label={copy.statementsHistory.table.empty} />}

      <PettyCashStatementDetailModal
        copy={copy}
        movements={selectedMovements}
        onClose={() => setSelectedStatement(null)}
        originText={selectedStatement && previousStatement(selectedStatement)
          ? copy.statementsHistory.table.previous(previousStatement(selectedStatement)!.folio)
          : copy.statementsHistory.detail.noPrevious}
        receipts={selectedReceipts}
        statement={selectedStatement}
      />
    </div>
  );
}
