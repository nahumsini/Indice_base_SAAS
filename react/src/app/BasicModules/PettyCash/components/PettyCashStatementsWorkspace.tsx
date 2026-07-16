import { Banknote, CalendarRange, CheckCircle2, Coins, Eye, Info, ReceiptText, Search, WalletCards, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTablePagination } from '../../../hooks/useTablePagination';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../types/pettyCash.types';
import { formatPettyCashCurrency, formatPettyCashIsoDate, formatPettyCashNativeBreakdown } from '../utils/pettyCash.utils';
import { convertBusinessCurrencyAmount } from '../../shared/businessCurrency';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
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

type Props = {
  funds: PettyCashFund[];
  movements: PettyCashMovement[];
  settlementLines: PettyCashSettlementLine[];
  statements: PettyCashStatement[];
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function PettyCashStatementsWorkspace({ funds, movements, settlementLines, statements }: Props) {
  const copy = usePettyCashTranslations();
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
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

  const totals = useMemo(() => filteredStatements.reduce((result, statement) => {
    const convert = (amount: number) => convertBusinessCurrencyAmount(
      amount,
      statement.currencyCode,
      preferredCurrency,
      exchangeRatesPerUsd,
    );
    return {
      approved: result.approved + convert(statement.verifiedExpenseAmount),
      captured: result.captured + convert(statement.estimatedUsageAmount),
      closing: result.closing + convert(statement.declaredClosingBalanceAmount),
      funded: result.funded + convert(statement.assignedAmount + statement.additionalDepositAmount),
      opening: result.opening + convert(statement.openingBalanceAmount),
    };
  }, { approved: 0, captured: 0, closing: 0, funded: 0, opening: 0 }), [exchangeRatesPerUsd, filteredStatements, preferredCurrency]);
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
          { id: 'captured', icon: <ReceiptText className="h-4 w-4" />, label: copy.statementsHistory.metrics.captured, value: formatPettyCashCurrency(totals.captured, preferredCurrency), valueClassName: 'text-amber-600' },
          { id: 'approved', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.statementsHistory.metrics.approved, value: formatPettyCashCurrency(totals.approved, preferredCurrency), valueClassName: 'text-[#147514]' },
          { id: 'closing', icon: <WalletCards className="h-4 w-4" />, label: copy.statementsHistory.metrics.closing, value: formatPettyCashCurrency(totals.closing, preferredCurrency), valueClassName: totals.closing < 0 ? 'text-rose-600' : 'text-slate-950' },
        ]}
      />

      {filteredStatements.length ? (
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
                    <td className="px-5 py-4 text-sm font-extrabold text-slate-900 dark:text-white">{statement.folio}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{fund?.name ?? copy.common.notAvailable}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{formatPettyCashIsoDate(statement.periodStart)} – {formatPettyCashIsoDate(statement.periodEnd)}</td>
                    <td className="px-5 py-4 text-sm font-extrabold tabular-nums">{formatPettyCashCurrency(statement.openingBalanceAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-extrabold tabular-nums text-sky-700 dark:text-sky-300">{formatPettyCashCurrency(funded, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-extrabold tabular-nums text-amber-700 dark:text-amber-300">{formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-extrabold tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)}</td>
                    <td className={`px-5 py-4 text-sm font-extrabold tabular-nums ${statement.declaredClosingBalanceAmount < 0 ? 'text-red-600' : ''}`}>{formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">{previous ? copy.statementsHistory.table.previous(previous.folio) : copy.statementsHistory.table.current}</td>
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
      ) : <PettyCashEmptyState label={copy.statementsHistory.table.empty} />}

      {selectedStatement ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl dark:bg-slate-900">
            <header className="flex items-start justify-between gap-4 bg-[#147514] px-6 py-5 text-white">
              <div className="flex gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15"><CalendarRange className="h-6 w-6" /></span><div><h3 className="text-2xl font-black">{copy.statementsHistory.detail.title}</h3><p className="mt-1 text-sm font-semibold text-white/75">{selectedStatement.folio} · {copy.statementsHistory.detail.description}</p></div></div>
              <button type="button" onClick={() => setSelectedStatement(null)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 hover:bg-white/20" aria-label={copy.common.close}><X className="h-5 w-5" /></button>
            </header>
            <div className="overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [copy.statementsHistory.metrics.opening, selectedStatement.openingBalanceAmount],
                  [copy.statementsHistory.metrics.funded, selectedStatement.assignedAmount + selectedStatement.additionalDepositAmount],
                  [copy.statementsHistory.metrics.captured, selectedStatement.estimatedUsageAmount],
                  [copy.statementsHistory.metrics.approved, selectedStatement.verifiedExpenseAmount],
                ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{formatPettyCashCurrency(Number(value), selectedStatement.currencyCode)}</p></div>)}
              </div>
              <section className="mt-5 rounded-xl border border-[#147514]/20 bg-[#147514]/5 p-4"><p className="text-xs font-black uppercase tracking-[0.08em] text-[#147514]">{copy.statementsHistory.detail.origin}</p><p className="mt-2 font-bold text-slate-800 dark:text-slate-200">{previousStatement(selectedStatement) ? copy.statementsHistory.table.previous(previousStatement(selectedStatement)!.folio) : copy.statementsHistory.detail.noPrevious}</p></section>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <section><h4 className="mb-3 text-lg font-black">{copy.statementsHistory.detail.movements} ({selectedMovements.length})</h4><div className="space-y-2">{selectedMovements.map(item => <div key={item.id} className="flex justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"><span className="text-sm font-bold">{copy.status.movement[item.type]}<small className="block text-slate-500">{formatPettyCashIsoDate(item.movementDate)}</small></span><strong>{formatPettyCashCurrency(item.amount, item.currencyCode)}</strong></div>)}{!selectedMovements.length ? <PettyCashEmptyState label={copy.statementsHistory.detail.movements} /> : null}</div></section>
                <section><h4 className="mb-3 text-lg font-black">{copy.statementsHistory.detail.receipts} ({selectedReceipts.length})</h4><div className="space-y-2">{selectedReceipts.map(item => <div key={item.id} className="flex justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"><span className="min-w-0 truncate text-sm font-bold">{item.description}<small className="block text-slate-500">{item.status === 'EXPENSE_CREATED' ? copy.statementsHistory.detail.approved : copy.statementsHistory.detail.pending}</small></span><strong>{formatPettyCashCurrency(item.totalAmount, item.currencyCode)}</strong></div>)}{!selectedReceipts.length ? <PettyCashEmptyState label={copy.statementsHistory.detail.receipts} /> : null}</div></section>
              </div>
            </div>
            <footer className="flex justify-end bg-[#147514] px-6 py-4"><button type="button" onClick={() => setSelectedStatement(null)} className="h-11 rounded-lg bg-white px-5 font-bold text-[#147514]">{copy.statementsHistory.detail.close}</button></footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
