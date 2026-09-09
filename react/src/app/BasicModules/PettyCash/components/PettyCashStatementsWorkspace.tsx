import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { Banknote, CheckCircle2, Coins, Eye, Info, ReceiptText, Search, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { ColumnasConfigModal, type ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../types/pettyCash.types';
import { formatPettyCashCurrency, formatPettyCashIsoDate, formatPettyCashNativeBreakdown } from '../utils/pettyCash.utils';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregates } from '../../shared/kpiMonetaryApi';
import { getOperationalKpiCurrencyCopy, OperationalKpiArea } from '../../shared/operational';
import { useLanguage } from '../../../shared/context';
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
  normalizePettyCashColumns,
  pettyCashInputClass,
  usePettyCashColumns,
  usePettyCashTableSort,
} from './PettyCashShared';
import { PettyCashStatementDetailModal } from './statements/PettyCashStatementDetailModal';

type Props = {
  dataReady?: boolean;
  funds: PettyCashFund[];
  movements: PettyCashMovement[];
  settlementLines: PettyCashSettlementLine[];
  statements: PettyCashStatement[];
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();
const pettyCashStatementsColumnsStorageKey = 'indice.pettyCash.statements.columns.v1';

export function PettyCashStatementsWorkspace({ dataReady = true, funds, movements, settlementLines, statements }: Props) {
  const copy = usePettyCashTranslations();
  const defaultColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'statement', label: copy.statementsHistory.table.statement, visible: true, locked: true },
    { id: 'fund', label: copy.statementsHistory.table.fund, visible: true },
    { id: 'period', label: copy.statementsHistory.table.period, visible: true },
    { id: 'approved', label: copy.statementsHistory.table.approved, visible: true },
    { id: 'closing', label: copy.statementsHistory.table.closing, visible: true },
    { id: 'status', label: copy.statementsHistory.table.status, visible: true },
    { id: 'opening', label: copy.statementsHistory.table.opening, visible: false },
    { id: 'funded', label: copy.statementsHistory.table.funded, visible: false },
    { id: 'captured', label: copy.statementsHistory.table.captured, visible: false },
    { id: 'source', label: copy.statementsHistory.table.source, visible: false },
  ], [copy.statementsHistory.table]);
  const fixedColumns = useMemo<ColumnConfig[]>(() => [
    { id: 'actions', label: copy.statementsHistory.table.actions, visible: true, locked: true },
  ], [copy.statementsHistory.table.actions]);
  const { columns, setColumns, visibleColumns } = usePettyCashColumns(pettyCashStatementsColumnsStorageKey, defaultColumns);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { currentLanguage } = useLanguage();
  const currencyCopy = getOperationalKpiCurrencyCopy(currentLanguage.code);
  const [search, setSearch] = useState('');
  const [fundId, setFundId] = useState('all');
  const [period, setPeriod] = useState('all');
  const [status, setStatus] = useState('all');
  const [showColumnsModal, setShowColumnsModal] = useState(false);
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

  const scopedStatements = useMemo(() => {
    const query = normalize(search);
    return [...statements]
      .filter(statement => fundId === 'all' || statement.pettyCashFundId === fundId)
      .filter(statement => period === 'all' || statement.periodKey === period)
      .filter(statement => {
        if (!query) return true;
        const fund = fundsById.get(statement.pettyCashFundId);
        return [statement.folio, statement.periodKey, statement.responsibleName, fund?.name]
          .some(value => normalize(value ?? '').includes(query));
      })
      .sort((left, right) => right.periodKey.localeCompare(left.periodKey) || right.id.localeCompare(left.id));
  }, [fundId, fundsById, period, search, statements]);
  const filteredStatements = useMemo(() => scopedStatements.filter(statement => (
    status === 'all' || statement.status === status
  )), [scopedStatements, status]);

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
    source: (statement: PettyCashStatement) => previousStatement(statement)?.folio ?? '',
  }), [fundsById]);
  const statementSort = usePettyCashTableSort(filteredStatements, statementSortAccessors, 'period', 'desc');
  const pagination = useTablePagination({
    resetKey: `${search}|${fundId}|${period}|${status}|${statementSort.sortKey}|${statementSort.sortDirection}`,
    rows: statementSort.sortedRows,
  });

  const workspaceState = useMemo(() => ({ search, fundId, period, status, sortKey: statementSort.sortKey, sortDirection: statementSort.sortDirection,
    currentPage: pagination.currentPage, pageSize: pagination.pageSize }), [search, fundId, period, status, statementSort.sortKey, statementSort.sortDirection, pagination.currentPage, pagination.pageSize]);
  useWorkspaceNavigationMemory({ moduleKey: 'petty-cash', tabKey: 'statements', enabled: dataReady,
    state: workspaceState, defaults: { search: '', fundId: 'all', period: 'all', status: 'all', sortKey: 'period', sortDirection: 'desc', currentPage: 1, pageSize: 10 },
    urlFields: { search: 'pcs_q', fundId: 'pcs_fund', period: 'pcs_period', status: 'pcs_status' },
    onRestore: restored => {
      setSearch(typeof restored.search === 'string' ? restored.search : '');
      setFundId(funds.some(fund => fund.id === restored.fundId) ? restored.fundId : 'all');
      setPeriod(periods.includes(restored.period) ? restored.period : 'all');
      setStatus(Object.prototype.hasOwnProperty.call(copy.status.statement, restored.status) ? restored.status : 'all');
      statementSort.restoreSort(restored.sortKey, restored.sortDirection); pagination.restorePagination(restored);
    },
  });

  const statementIds = scopedStatements.map((statement) => statement.id);
  const aggregates = useKpiMonetaryAggregates([
    { key: 'opening', metric: 'PETTY_CASH_STATEMENT_OPENING', preferredCurrency, ids: statementIds },
    { key: 'funded', metric: 'PETTY_CASH_STATEMENT_FUNDED', preferredCurrency, ids: statementIds },
    { key: 'captured', metric: 'PETTY_CASH_STATEMENT_ESTIMATED', preferredCurrency, ids: statementIds },
    { key: 'approved', metric: 'PETTY_CASH_STATEMENT_VERIFIED', preferredCurrency, ids: statementIds },
    { key: 'closing', metric: 'PETTY_CASH_STATEMENT_CLOSING', preferredCurrency, ids: statementIds },
  ]);
  const totals = {
    approved: aggregates.data.approved?.preferredTotal ?? 0,
    captured: aggregates.data.captured?.preferredTotal ?? 0,
    closing: aggregates.data.closing?.preferredTotal ?? 0,
    funded: aggregates.data.funded?.preferredTotal ?? 0,
    opening: aggregates.data.opening?.preferredTotal ?? 0,
  };
  const currencyCount = new Set(scopedStatements.map(statement => statement.currencyCode)).size;
  const nativeClosing = formatPettyCashNativeBreakdown(
    scopedStatements,
    statement => statement.declaredClosingBalanceAmount,
    statement => statement.currencyCode,
  );
  const formatAggregateTotal = (key: keyof typeof totals) => (
    !aggregates.loading && aggregates.data[key]
      ? formatPettyCashCurrency(totals[key], preferredCurrency)
      : '—'
  );
  const closingAggregate = aggregates.data.closing;
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
        onColumns={() => setShowColumnsModal(true)}
        title={copy.statementsHistory.header.title}
        description={copy.statementsHistory.header.description}
      />

      <PettyCashFilterShell
        activeAdvancedCount={Number(fundId !== 'all')}
        advancedContent={(
          <PettyCashField label={copy.statementsHistory.filters.fund}>
            <select className={pettyCashInputClass} value={fundId} onChange={event => setFundId(event.target.value)}>
              <option value="all">{copy.common.all}</option>
              {funds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
            </select>
          </PettyCashField>
        )}
        hasActiveFilters={Boolean(search || fundId !== 'all' || period !== 'all' || status !== 'all')}
        onClear={() => {
          pagination.onPageChange(1);
          setSearch('');
          setFundId('all');
          setPeriod('all');
          setStatus('all');
        }}
        resultLabel={copy.statementsHistory.filters.result(filteredStatements.length)}
        subtitle={copy.statementsHistory.filters.subtitle}
      >
        <PettyCashField label={copy.statementsHistory.filters.search}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input className={`${pettyCashInputClass} pl-9`} value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.statementsHistory.filters.searchPlaceholder} />
          </div>
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
          ...statuses.map((statementStatus, index) => ({
            id: statementStatus,
            label: copy.status.statement[statementStatus],
            count: scopedStatements.filter(statement => statement.status === statementStatus).length,
            className: ['bg-[#147514]', 'bg-amber-400', 'bg-sky-500', 'bg-rose-500', 'bg-slate-400'][index % 5],
            active: status === statementStatus,
            onClick: () => setStatus(current => current === statementStatus ? 'all' : statementStatus),
          })),
        ]}
        insight={`${copy.statementsHistory.filters.result(scopedStatements.length)} · ${copy.statementsHistory.metrics.approved}: ${formatAggregateTotal('approved')} · ${copy.statementsHistory.metrics.closing}: ${formatAggregateTotal('closing')}`}
        insightIcon={<Info className="h-4 w-4" />}
        metrics={[
          { id: 'opening', icon: <WalletCards className="h-4 w-4" />, label: copy.statementsHistory.metrics.opening, value: formatAggregateTotal('opening') },
          { id: 'funded', icon: <Banknote className="h-4 w-4" />, label: copy.statementsHistory.metrics.funded, value: formatAggregateTotal('funded'), valueClassName: 'text-sky-600' },
          { id: 'approved', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.statementsHistory.metrics.approved, value: formatAggregateTotal('approved'), valueClassName: 'text-[#147514]' },
          { id: 'closing', icon: <WalletCards className="h-4 w-4" />, label: copy.statementsHistory.metrics.closing, value: formatAggregateTotal('closing'), valueClassName: totals.closing < 0 ? 'text-rose-600' : 'text-slate-950' },
        ]}
        currencyContext={{
          preferredCurrency,
          nativeBreakdown: nativeClosing,
          rateLabel: closingAggregate?.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : currencyCopy.unavailable,
          effectiveDate: closingAggregate?.exchangeRate.effectiveDate,
          source: closingAggregate?.exchangeRate.source,
          isPartial: Boolean(aggregates.error || closingAggregate?.partial),
          excludedCount: closingAggregate?.excludedRecords ?? (aggregates.error ? scopedStatements.length : 0),
          labels: currencyCopy,
        }}
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
          <table className={visibleColumns.length <= 6 ? 'w-full min-w-[860px]' : 'w-full min-w-[1120px]'}>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
              <tr>
                {visibleColumns.map(column => (
                  <PettyCashSortableHeader key={column.id} columnKey={column.id as keyof typeof statementSortAccessors} label={column.label} onSort={statementSort.onSort} sortDirection={statementSort.sortDirection} sortKey={statementSort.sortKey} />
                ))}
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
                    {visibleColumns.map(column => {
                      if (column.id === 'statement') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">{statement.folio}</td>;
                      if (column.id === 'fund') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{fund?.name ?? copy.common.notAvailable}</td>;
                      if (column.id === 'period') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{formatPettyCashIsoDate(statement.periodStart)} – {formatPettyCashIsoDate(statement.periodEnd)}</td>;
                      if (column.id === 'opening') return <td key={column.id} className="px-5 py-4 text-sm font-medium tabular-nums">{formatPettyCashCurrency(statement.openingBalanceAmount, statement.currencyCode)}</td>;
                      if (column.id === 'funded') return <td key={column.id} className="px-5 py-4 text-sm font-medium tabular-nums text-sky-700 dark:text-sky-300">{formatPettyCashCurrency(funded, statement.currencyCode)}</td>;
                      if (column.id === 'captured') return <td key={column.id} className="px-5 py-4 text-sm font-medium tabular-nums text-amber-700 dark:text-amber-300">{formatPettyCashCurrency(statement.estimatedUsageAmount, statement.currencyCode)}</td>;
                      if (column.id === 'approved') return <td key={column.id} className="px-5 py-4 text-sm font-medium tabular-nums text-[#147514] dark:text-emerald-300">{formatPettyCashCurrency(statement.verifiedExpenseAmount, statement.currencyCode)}</td>;
                      if (column.id === 'closing') return <td key={column.id} className={`px-5 py-4 text-sm font-medium tabular-nums ${statement.declaredClosingBalanceAmount < 0 ? 'text-red-600' : ''}`}>{formatPettyCashCurrency(statement.declaredClosingBalanceAmount, statement.currencyCode)}</td>;
                      if (column.id === 'source') return <td key={column.id} className="px-5 py-4 text-sm font-medium text-slate-500">{previous ? copy.statementsHistory.table.previous(previous.folio) : copy.statementsHistory.table.current}</td>;
                      return <td key={column.id} className="px-5 py-4"><PettyCashStatusPill kind="statement" status={statement.status} /></td>;
                    })}
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

      <ColumnasConfigModal
        isOpen={showColumnsModal}
        columns={columns}
        defaultColumns={defaultColumns}
        fixedColumns={fixedColumns}
        theme="expenses"
        onClose={() => setShowColumnsModal(false)}
        onSave={(nextColumns) => setColumns(normalizePettyCashColumns(nextColumns, defaultColumns))}
      />

      <PettyCashStatementDetailModal
        copy={copy}
        fund={selectedStatement ? fundsById.get(selectedStatement.pettyCashFundId) ?? null : null}
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
