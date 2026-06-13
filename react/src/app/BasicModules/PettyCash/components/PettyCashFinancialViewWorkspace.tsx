import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Landmark, Search, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PettyCashFund, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement, PettyCashStatementStatus } from '../types/pettyCash.types';
import {
  formatPettyCashCurrency,
  formatPettyCashIsoDate,
  getFundById,
  getOperationalPettyCashSummary,
  getStatementSettlementBalance,
  pettyCashMovementTypeLabels,
} from '../utils/pettyCash.utils';
import {
  PettyCashEmptyState,
  PettyCashField,
  PettyCashFilterShell,
  PettyCashHeaderBanner,
  PettyCashMetric,
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

const statusOptions: Array<{ label: string; value: PettyCashStatementStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Abierto', value: 'OPEN' },
  { label: 'Corte pendiente', value: 'CUT_PENDING' },
  { label: 'Parcialmente liquidado', value: 'PARTIALLY_SETTLED' },
  { label: 'Liquidado', value: 'SETTLED' },
  { label: 'Faltante', value: 'SHORTAGE' },
  { label: 'Faltante perdonado', value: 'FORGIVEN_SHORTAGE' },
  { label: 'Cobrado a colaborador', value: 'CHARGED_TO_EMPLOYEE' },
  { label: 'Cerrado', value: 'CLOSED' },
];

export function PettyCashFinancialViewWorkspace({
  funds,
  movements,
  settlementLines,
  statements,
}: PettyCashFinancialViewWorkspaceProps) {
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<PettyCashStatementStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
        description="Lectura financiera sin doble conteo: fondeos, gasto comprobado, uso estimado, faltantes y saldos por liquidar."
        emoji="📊"
        title="Vista financiera de caja chica"
      />

      <PettyCashFilterShell
        resultLabel={`${filteredStatements.length} cortes`}
        subtitle="Filtra el periodo para revisar el impacto operativo y presupuestal de caja chica."
      >
        <PettyCashField label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${pettyCashInputClass} pl-9`}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Fondo, folio, responsable..."
              value={searchTerm}
            />
          </div>
        </PettyCashField>
        <PettyCashField label="Periodo">
          <select
            className={pettyCashInputClass}
            onChange={(event) => setPeriodFilter(event.target.value)}
            value={periodFilter}
          >
            <option value="all">Todos</option>
            {periodOptions.map(period => (
              <option key={period} value={period}>{period}</option>
            ))}
          </select>
        </PettyCashField>
        <PettyCashField label="Estado">
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
          <PettyCashMetric icon={WalletCards} label="Fondos asignados" value={formatPettyCashCurrency(summary.assignedAmount, 'MXN')} />
          <PettyCashMetric icon={CheckCircle2} label="Gasto comprobado" tone="success" value={formatPettyCashCurrency(summary.verifiedExpenseAmount, 'MXN')} />
          <PettyCashMetric icon={FileText} label="Por comprobar" tone="warning" value={formatPettyCashCurrency(summary.pendingReconciliationAmount, 'MXN')} />
          <PettyCashMetric icon={AlertTriangle} label="Faltantes" tone={summary.shortageAmount > 0 ? 'danger' : 'success'} value={formatPettyCashCurrency(summary.shortageAmount, 'MXN')} />
          <PettyCashMetric icon={Landmark} label="Disponible estimado" tone="info" value={formatPettyCashCurrency(budgetAvailable, 'MXN')} />
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-[#147514]" style={{ width: `${verifiedWidth}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${pendingWidth}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${shortageWidth}%` }} />
          <div className="h-full bg-sky-400" style={{ width: `${remainingWidth}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#147514]" /> Comprobado</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> Por comprobar</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" /> Faltante</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" /> Disponible</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#147514]/10 text-[#147514]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">Gasto verificado</h3>
              <p className="text-sm font-medium text-slate-500">Ya puede alimentar Expenses y presupuestos reales.</p>
            </div>
          </div>
          <p className="mt-5 text-3xl font-black text-[#147514]">{formatPettyCashCurrency(summary.verifiedExpenseAmount, 'MXN')}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{filteredLines.filter(line => line.status === 'EXPENSE_CREATED').length} comprobantes convertidos en gasto</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">Pendiente de liquidar</h3>
              <p className="text-sm font-medium text-slate-500">Uso estimado que todavia necesita comprobantes.</p>
            </div>
          </div>
          <p className="mt-5 text-3xl font-black text-amber-600">{formatPettyCashCurrency(summary.pendingReconciliationAmount, 'MXN')}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{reconciliationRate}% del uso estimado ya fue comprobado</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">Riesgo operativo</h3>
              <p className="text-sm font-medium text-slate-500">Cortes con faltantes o conciliacion incompleta.</p>
            </div>
          </div>
          <p className="mt-5 text-3xl font-black text-red-600">{summary.riskCount}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{formatPettyCashCurrency(summary.shortageAmount, 'MXN')} en faltantes detectados</p>
        </section>
      </div>

      <PettyCashTableShell>
        <table className="w-full min-w-[1180px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {['Corte', 'Fondo', 'Periodo', 'Asignado', 'Estimado', 'Comprobado', 'Pendiente', 'Faltante', 'Estado'].map(column => (
                <th key={column} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStatements.map((statement) => {
              const fund = getFundById(funds, statement.pettyCashFundId);
              return (
                <tr key={statement.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-5 text-sm font-black text-slate-900">{statement.folio}</td>
                  <td className="px-5 py-5">
                    <p className="text-sm font-extrabold text-slate-900">{fund?.name ?? 'Sin fondo'}</p>
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
            <h3 className="text-xl font-black text-slate-900">Movimientos de fondos</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Fondeos y ajustes. Estos movimientos no son gastos.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">{filteredMovements.length} movimientos</span>
        </div>
        {filteredMovements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Fecha', 'Fondo', 'Tipo', 'Origen', 'Destino', 'Monto', 'Referencia'].map(column => (
                    <th key={column} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((movement) => {
                  const fund = getFundById(funds, movement.pettyCashFundId);
                  return (
                    <tr key={movement.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">{formatPettyCashIsoDate(movement.movementDate)}</td>
                      <td className="px-5 py-4 text-sm font-black text-slate-900">{fund?.name ?? 'Sin fondo'}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">{pettyCashMovementTypeLabels[movement.type]}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">{movement.fromPaymentAccountName ?? '-'}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">{movement.toPaymentAccountName ?? '-'}</td>
                      <td className="px-5 py-4 text-sm font-black text-[#147514]">{formatPettyCashCurrency(movement.amount, movement.currencyCode)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{movement.reference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <PettyCashEmptyState label="No hay movimientos de fondos para el filtro seleccionado." />
          </div>
        )}
      </section>
    </div>
  );
}
