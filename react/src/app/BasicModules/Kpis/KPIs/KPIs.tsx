import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Columns3,
  CreditCard,
  Download,
  Landmark,
  LineChart,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import { KPI_ACCENT } from '../kpisExecutiveData';
import { executivePanelApi } from './executivePanelApi';
import type {
  ExecutiveAlert,
  ExecutiveBreakdownRow,
  ExecutiveKpiCard,
  ExecutiveKpiResponse,
  ExecutiveKpiStatus,
  ExecutivePanelFilters,
  ExecutivePanelPeriod,
  ExecutivePersonSignal,
  ExecutiveUnitRow,
} from './types';
import { LearningModeTitleBarBridge } from '../../../learningMode';

const periodOptions: Array<{ label: string; value: ExecutivePanelPeriod }> = [
  { label: 'Mensual', value: 'monthly' },
  { label: 'Bimestral', value: 'bimonthly' },
  { label: 'Trimestral', value: 'quarterly' },
  { label: 'Semestral', value: 'semester' },
  { label: 'Anual', value: 'annual' },
  { label: 'Personalizado', value: 'custom' },
];

const statusClasses: Record<ExecutiveKpiStatus, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
  watch: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
  critical: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200',
};

const statusLabels: Record<ExecutiveKpiStatus, string> = {
  healthy: 'Sano',
  watch: 'Atencion',
  critical: 'Critico',
};

const cardIcons: Record<string, LucideIcon> = {
  sales: CircleDollarSign,
  collected: CreditCard,
  receivables: Landmark,
  expenses: WalletCards,
  payables: AlertTriangle,
  profit: TrendingUp,
  margin: LineChart,
  score: BarChart3,
};

const initialFilters: ExecutivePanelFilters = {
  search: '',
  unitId: '',
  businessId: '',
  period: 'monthly',
  from: '',
  to: '',
  risk: 'all',
};

type MatrixColumnKey =
  | 'identity'
  | 'sales'
  | 'expenses'
  | 'profit'
  | 'margin'
  | 'receivables'
  | 'payables'
  | 'tasks'
  | 'attendance'
  | 'status';

const matrixColumns: Array<{ key: MatrixColumnKey; label: string; required?: boolean }> = [
  { key: 'identity', label: 'Unidad / negocio', required: true },
  { key: 'sales', label: 'Ventas' },
  { key: 'expenses', label: 'Gastos' },
  { key: 'profit', label: 'Utilidad' },
  { key: 'margin', label: 'Margen' },
  { key: 'receivables', label: 'CxC' },
  { key: 'payables', label: 'CxP' },
  { key: 'tasks', label: 'Tareas' },
  { key: 'attendance', label: 'Asistencia' },
  { key: 'status', label: 'Estado' },
];

const defaultMatrixColumns = matrixColumns.map((column) => column.key);
const matrixPageSizeOptions = [10, 25, 50, 100] as const;

export default function KPIs() {
  const [filters, setFilters] = useState<ExecutivePanelFilters>(initialFilters);
  const [data, setData] = useState<ExecutiveKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await executivePanelApi.get(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el panel ejecutivo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.period, filters.unitId, filters.businessId, filters.risk, filters.from, filters.to]);

  const filteredRows = useMemo(() => {
    const rows = data?.unitRows ?? [];
    const search = filters.search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !search
        || `${row.unitName} ${row.businessName}`.toLowerCase().includes(search);
      const matchesRisk = filters.risk === 'all' || row.status === filters.risk;
      return matchesSearch && matchesRisk;
    });
  }, [data?.unitRows, filters.risk, filters.search]);

  const units = useMemo(() => uniqueOptions(data?.unitRows ?? [], 'unitId', 'unitName'), [data?.unitRows]);
  const businesses = useMemo(() => {
    const rows = filters.unitId
      ? (data?.unitRows ?? []).filter((row) => String(row.unitId ?? '') === filters.unitId)
      : (data?.unitRows ?? []);
    return uniqueOptions(rows, 'businessId', 'businessName');
  }, [data?.unitRows, filters.unitId]);

  const handleFilterChange = <K extends keyof ExecutivePanelFilters>(key: K, value: ExecutivePanelFilters[K]) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'unitId' ? { businessId: '' } : {}),
    }));
  };

  const handleExport = () => {
    if (!data) {
      return;
    }

    exportExecutivePanelCsv(data, filteredRows);
  };

  return (
    <div className="space-y-5">
      <TitleBar canExport={Boolean(data)} loading={loading} onExport={handleExport} onRefresh={load} />

      <FiltersBar
        businesses={businesses}
        filters={filters}
        loading={loading}
        units={units}
        onChange={handleFilterChange}
        onSearch={() => void load()}
      />

      {error ? (
        <section className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 shadow-sm dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </span>
          <Button type="button" variant="outline" onClick={load} className="h-9 rounded-xl border-rose-200 bg-white text-rose-700">
            Reintentar
          </Button>
        </section>
      ) : null}

      <ContextStrip data={data} loading={loading} />

      <KpiGrid items={data?.kpiCards ?? []} loading={loading} />

      <ExecutiveInsight data={data} loading={loading} />

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <FinancialMap rows={filteredRows} summary={data?.summary ?? null} loading={loading} />
        <PettyCashPulse data={data} rows={filteredRows} loading={loading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <UnitMatrix rows={filteredRows} loading={loading} />
        <AlertPanel alerts={data?.alerts ?? []} loading={loading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <BreakdownPanel
          title="Ventas por fuente"
          description="POS, ventas comerciales y ventas a credito dentro del periodo."
          icon={BriefcaseBusiness}
          items={data?.salesBySource ?? []}
          labelKey="source"
          loading={loading}
        />
        <BreakdownPanel
          title="Gastos por cuenta"
          description="Concentracion del gasto registrada en cuentas contables."
          icon={Landmark}
          items={data?.expensesByAccount ?? []}
          labelKey="accountName"
          loading={loading}
        />
        <RankingPanel rows={data?.rankings?.attention ?? []} loading={loading} />
      </section>

      <ExecutiveRankings data={data} loading={loading} />

      <section className="grid gap-5 xl:grid-cols-2">
        <PeopleSignalPanel
          description="Colaboradores con tareas vencidas, bajo avance o score operativo bajo."
          emptyText="Sin focos operativos por colaborador."
          icon={BarChart3}
          items={data?.lowProductivity ?? []}
          kind="productivity"
          loading={loading}
          title="Desempeno operativo"
        />
        <PeopleSignalPanel
          description="Ausencias y retardos visibles dentro del periodo seleccionado."
          emptyText="Sin focos de asistencia en el periodo."
          icon={CalendarDays}
          items={data?.absenteeism ?? []}
          kind="attendance"
          loading={loading}
          title="Ausentismo y puntualidad"
        />
      </section>
    </div>
  );
}

function TitleBar({
  canExport,
  loading,
  onExport,
  onRefresh,
}: {
  canExport: boolean;
  loading: boolean;
  onExport: () => void;
  onRefresh: () => void;
}) {
  const actionLayout = (
    <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
      <Button type="button" variant="outline" className="h-11 rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-50" disabled={!canExport || loading} onClick={onExport}>
        <Download className="mr-2 h-4 w-4" />Exportar
      </Button>
      <Button type="button" onClick={onRefresh} disabled={loading} className="h-11 rounded-xl bg-blue-700 text-white hover:bg-blue-800">
        <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Actualizar
      </Button>
    </div>
  );

  return (
    <LearningModeTitleBarBridge actions={actionLayout}>
    <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/25">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="mb-1 text-xl font-bold text-slate-950 dark:text-white">Panel ejecutivo</h2>
            <p className="max-w-4xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
              Vista directiva de ventas, gastos, cartera, cajas chicas y ejecucion por unidad de negocio.
            </p>
          </div>
        </div>
        {actionLayout}
      </div>
    </section>
    </LearningModeTitleBarBridge>
  );
}

function FiltersBar({
  businesses,
  filters,
  loading,
  units,
  onChange,
  onSearch,
}: {
  businesses: Array<{ label: string; value: string }>;
  filters: ExecutivePanelFilters;
  loading: boolean;
  units: Array<{ label: string; value: string }>;
  onChange: <K extends keyof ExecutivePanelFilters>(key: K, value: ExecutivePanelFilters[K]) => void;
  onSearch: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_minmax(140px,0.7fr)_auto]">
        <Field label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => onChange('search', event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSearch();
              }}
              placeholder="Unidad, negocio o alerta"
              className={inputClassName('pl-9')}
            />
          </div>
        </Field>
        <Field label="Unidad">
          <select value={filters.unitId} onChange={(event) => onChange('unitId', event.target.value)} className={inputClassName()}>
            <option value="">Todas</option>
            {units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
          </select>
        </Field>
        <Field label="Negocio">
          <select value={filters.businessId} onChange={(event) => onChange('businessId', event.target.value)} className={inputClassName()}>
            <option value="">Todos</option>
            {businesses.map((business) => <option key={business.value} value={business.value}>{business.label}</option>)}
          </select>
        </Field>
        <Field label="Periodo">
          <select value={filters.period} onChange={(event) => onChange('period', event.target.value as ExecutivePanelPeriod)} className={inputClassName()}>
            {periodOptions.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
          </select>
        </Field>
        <Field label="Riesgo">
          <select value={filters.risk} onChange={(event) => onChange('risk', event.target.value)} className={inputClassName()}>
            <option value="all">Todos</option>
            <option value="healthy">Sano</option>
            <option value="watch">Atencion</option>
            <option value="critical">Critico</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button type="button" onClick={onSearch} disabled={loading} className="h-11 w-full rounded-xl bg-blue-700 text-white hover:bg-blue-800 lg:w-auto">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Aplicar
          </Button>
        </div>
      </div>

      {filters.period === 'custom' ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-md">
          <Field label="Desde">
            <input type="date" value={filters.from} onChange={(event) => onChange('from', event.target.value)} className={inputClassName()} />
          </Field>
          <Field label="Hasta">
            <input type="date" value={filters.to} onChange={(event) => onChange('to', event.target.value)} className={inputClassName()} />
          </Field>
        </div>
      ) : null}
    </section>
  );
}

function ContextStrip({ data, loading }: { data: ExecutiveKpiResponse | null; loading: boolean }) {
  const nativeCurrencies = data?.context.nativeCurrencies?.length ? data.context.nativeCurrencies.join(', ') : data?.context.currency ?? 'MXN';

  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
      <ContextItem icon={CalendarDays} label="Periodo" value={loading ? 'Cargando' : `${data?.range.from ?? ''} / ${data?.range.to ?? ''}`} />
      <ContextItem icon={CircleDollarSign} label="Moneda" value={nativeCurrencies} />
      <ContextItem icon={Building2} label="Alcance" value={data?.context.scopeLabel ?? 'Empresa completa'} />
      <ContextItem icon={RefreshCw} label="Actualizacion" value={data?.context.generatedAt ? new Date(data.context.generatedAt).toLocaleString('es-MX') : 'Pendiente'} />
    </section>
  );
}

function KpiGrid({ items, loading }: { items: ExecutiveKpiCard[]; loading: boolean }) {
  const displayItems = loading ? Array.from({ length: 8 }, (_, index) => ({ id: `loading-${index}` })) : items;

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {displayItems.map((item) => {
        const card = item as ExecutiveKpiCard;
        const Icon = cardIcons[card.id] ?? BarChart3;
        return (
          <article key={item.id} className="min-h-[168px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {loading ? <Skeleton /> : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <StatusBadge status={card.status} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.title}</p>
                <p className="mt-2 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">{formatValue(card.value, card.id)}</p>
                <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{card.description}</p>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ExecutiveInsight({ data, loading }: { data: ExecutiveKpiResponse | null; loading: boolean }) {
  const score = data?.summary.executiveScore ?? 0;
  const profit = data?.summary.operatingProfit ?? 0;
  const sales = data?.summary.salesTotal ?? 0;

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/25">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 dark:border-blue-800 dark:bg-slate-900">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-100">Lectura ejecutiva</p>
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {loading
                ? 'Consolidando informacion ejecutiva del periodo seleccionado.'
                : profit >= 0
                  ? `La empresa opera con utilidad de ${formatMoney(profit)} sobre ventas por ${formatMoney(sales)}.`
                  : `La empresa muestra perdida operativa de ${formatMoney(Math.abs(profit))}; revisa gastos y unidades criticas.`}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-right dark:border-blue-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">Score ejecutivo</p>
          <p className="text-2xl font-bold text-slate-950 dark:text-white">{loading ? '--' : `${score}/100`}</p>
        </div>
      </div>
    </section>
  );
}

function FinancialMap({
  loading,
  rows,
  summary,
}: {
  loading: boolean;
  rows: ExecutiveUnitRow[];
  summary: Record<string, number> | null;
}) {
  const rankedRows = [...rows]
    .sort((left, right) => Math.abs(right.salesTotal) + Math.abs(right.expensesTotal) - Math.abs(left.salesTotal) - Math.abs(left.expensesTotal))
    .slice(0, 6);
  const maxValue = Math.max(...rankedRows.map((row) => Math.max(row.salesTotal, row.expensesTotal)), 1);
  const salesTotal = summary?.salesTotal ?? rows.reduce((total, row) => total + row.salesTotal, 0);
  const expensesTotal = summary?.expensesTotal ?? rows.reduce((total, row) => total + row.expensesTotal, 0);
  const profit = summary?.operatingProfit ?? salesTotal - expensesTotal;

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            <LineChart className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">Mapa financiero por unidad</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Comparativo directo entre ventas, gastos y utilidad operativa.</p>
          </div>
        </div>
        <StatusBadge status={profit >= 0 ? 'healthy' : 'critical'} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Ventas" value={loading ? '--' : formatMoney(salesTotal)} />
        <MiniMetric label="Gastos" value={loading ? '--' : formatMoney(expensesTotal)} />
        <MiniMetric label="Utilidad" value={loading ? '--' : formatMoney(profit)} />
      </div>

      <div className="mt-4 space-y-4">
        {loading ? <Skeleton /> : rankedRows.length ? rankedRows.map((row) => {
          const salesWidth = Math.max(3, (row.salesTotal / maxValue) * 100);
          const expensesWidth = Math.max(3, (row.expensesTotal / maxValue) * 100);

          return (
            <div key={`financial-map-${row.unitId ?? 'u'}-${row.businessId ?? 'b'}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950 dark:text-white">{row.businessName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.unitName}</p>
                </div>
                <p className={cn('shrink-0 text-sm font-bold', row.operatingProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
                  {formatMoney(row.operatingProfit)}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                <FinancialBar label="Ventas" value={row.salesTotal} width={salesWidth} className="bg-blue-700" />
                <FinancialBar label="Gastos" value={row.expensesTotal} width={expensesWidth} className="bg-amber-500" />
              </div>
            </div>
          );
        }) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700">
            No hay unidades con movimiento financiero para el filtro actual.
          </p>
        )}
      </div>
    </section>
  );
}

function PettyCashPulse({
  data,
  loading,
  rows,
}: {
  data: ExecutiveKpiResponse | null;
  loading: boolean;
  rows: ExecutiveUnitRow[];
}) {
  const pettyCash = data?.pettyCash;
  const utilization = pettyCash?.limitTotal ? (pettyCash.balanceTotal / pettyCash.limitTotal) * 100 : 0;
  const visibleRows = rows
    .filter((row) => row.pettyCashFunds > 0 || row.pettyCashBalance !== 0)
    .sort((left, right) => Math.abs(right.pettyCashBalance) - Math.abs(left.pettyCashBalance))
    .slice(0, 5);

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            <WalletCards className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">Cajas chicas administradas</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Fondos activos, saldo disponible y cajas que requieren corte o revision.</p>
          </div>
        </div>
        <StatusBadge status={(pettyCash?.attention ?? 0) > 0 ? 'watch' : 'healthy'} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Fondos" value={loading ? '--' : String(pettyCash?.funds ?? 0)} />
        <MiniMetric label="Saldo" value={loading ? '--' : formatMoney(pettyCash?.balanceTotal ?? 0)} />
        <MiniMetric label="Atencion" value={loading ? '--' : String(pettyCash?.attention ?? 0)} />
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-blue-900 dark:text-blue-100">Uso contra limite</span>
          <span className="font-bold text-slate-950 dark:text-white">{loading ? '--' : formatPercent(utilization)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800">
          <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, Math.max(0, utilization))}%` }} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <Skeleton /> : visibleRows.length ? visibleRows.map((row) => (
          <div key={`petty-cash-${row.unitId ?? 'u'}-${row.businessId ?? 'b'}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950 dark:text-white">{row.businessName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.unitName} - {row.pettyCashFunds} fondos</p>
            </div>
            <p className="shrink-0 font-bold text-slate-950 dark:text-white">{formatMoney(row.pettyCashBalance)}</p>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700">
            Sin cajas chicas con saldo para el filtro actual.
          </p>
        )}
      </div>
    </section>
  );
}

function FinancialBar({
  className,
  label,
  value,
  width,
}: {
  className: string;
  label: string;
  value: number;
  width: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{formatMoney(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn('h-full rounded-full', className)} style={{ width: `${Math.min(100, Math.max(0, width))}%` }} />
      </div>
    </div>
  );
}

function UnitMatrix({ rows, loading }: { rows: ExecutiveUnitRow[]; loading: boolean }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof matrixPageSizeOptions)[number]>(10);
  const [selectedRow, setSelectedRow] = useState<ExecutiveUnitRow | null>(null);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<MatrixColumnKey[]>(defaultMatrixColumns);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(rows.length, safePage * pageSize);
  const pageRows = rows.slice(pageStart === 0 ? 0 : pageStart - 1, pageEnd);
  const activeColumns = matrixColumns.filter((column) => visibleColumns.includes(column.key));

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const toggleColumn = (key: MatrixColumnKey) => {
    const column = matrixColumns.find((item) => item.key === key);
    if (column?.required) {
      return;
    }

    setVisibleColumns((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ));
  };

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Matriz por unidad y negocio</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ventas, gastos, cartera y ejecucion comparables en una sola tabla.</p>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onClick={() => setShowColumns((current) => !current)}
            >
              <Columns3 className="mr-2 h-4 w-4" />
              Columnas
            </Button>
            {showColumns && (
              <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-950">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Columnas visibles</p>
                <div className="mt-3 space-y-2">
                  {matrixColumns.map((column) => (
                    <label key={column.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">
                      <span>{column.label}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                        checked={visibleColumns.includes(column.key)}
                        disabled={column.required}
                        onChange={() => toggleColumn(column.key)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              {activeColumns.map((column) => (
                <th key={column.key} className="px-4 py-3">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={activeColumns.length} className="px-4 py-8"><Skeleton /></td></tr>
            ) : pageRows.length ? pageRows.map((row) => (
              <tr key={`${row.unitId ?? 'u'}-${row.businessId ?? 'b'}`} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/10">
                {activeColumns.map((column) => (
                  <MatrixCell key={column.key} column={column.key} row={row} onSelect={() => setSelectedRow(row)} />
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={activeColumns.length} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  No hay datos para el filtro actual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300 lg:flex-row lg:items-center lg:justify-between">
        <p className="font-semibold">
          {rows.length ? `Mostrando ${pageStart}-${pageEnd} de ${rows.length} unidades/negocios` : 'Sin registros para paginar'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Filas</span>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value) as (typeof matrixPageSizeOptions)[number])}
          >
            {matrixPageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-3"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-24 text-center font-bold text-slate-700 dark:text-slate-200">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-3"
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {selectedRow ? <UnitDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} /> : null}
    </section>
  );
}

function MatrixCell({
  column,
  onSelect,
  row,
}: {
  column: MatrixColumnKey;
  onSelect: () => void;
  row: ExecutiveUnitRow;
}) {
  if (column === 'identity') {
    return (
      <td className="px-4 py-3">
        <p className="font-bold text-slate-950 dark:text-white">{row.businessName}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{row.unitName}</p>
        <button
          type="button"
          onClick={onSelect}
          className="mt-2 text-xs font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
        >
          Ver detalle
        </button>
      </td>
    );
  }

  if (column === 'profit') {
    return (
      <td className={cn('px-4 py-3 font-bold', row.operatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
        {formatMoney(row.operatingProfit)}
      </td>
    );
  }

  if (column === 'status') {
    return <td className="px-4 py-3"><StatusBadge status={row.status} /></td>;
  }

  const values: Record<Exclude<MatrixColumnKey, 'identity' | 'profit' | 'status'>, string> = {
    sales: formatMoney(row.salesTotal),
    expenses: formatMoney(row.expensesTotal),
    margin: formatPercent(row.operatingMargin),
    receivables: formatMoney(row.receivablesTotal),
    payables: formatMoney(row.payablesTotal),
    tasks: `${row.closedTasks}/${row.totalTasks}`,
    attendance: formatPercent(row.attendanceRate),
  };

  return <td className="px-4 py-3 font-semibold">{values[column]}</td>;
}

function UnitDetailModal({ onClose, row }: { onClose: () => void; row: ExecutiveUnitRow }) {
  const insights = getUnitInsights(row);
  const expensePressure = row.salesTotal > 0 ? (row.expensesTotal / row.salesTotal) * 100 : 0;
  const collectionPressure = row.salesTotal > 0 ? (row.receivablesTotal / row.salesTotal) * 100 : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        aria-modal="true"
        role="dialog"
        className="my-3 max-h-[calc(100vh-24px)] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:my-4 sm:max-h-[92vh]"
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Detalle ejecutivo</p>
              <h3 className="truncate text-xl font-black tracking-normal text-slate-950 dark:text-white">{row.businessName}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{row.unitName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            <Button type="button" variant="outline" aria-label="Cerrar detalle ejecutivo" className="h-10 rounded-xl px-3" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="Ventas" value={formatMoney(row.salesTotal)} />
            <MiniMetric label="Gastos" value={formatMoney(row.expensesTotal)} />
            <MiniMetric label="Utilidad" value={formatMoney(row.operatingProfit)} />
            <MiniMetric label="Margen" value={formatPercent(row.operatingMargin)} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                  <LineChart className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-950 dark:text-white">Lectura financiera</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Relacion entre ingreso, gasto, utilidad y presion de cartera.</p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <DetailBar label="Gasto sobre ventas" value={expensePressure} tone="bg-amber-500" />
                <DetailBar label="CxC sobre ventas" value={collectionPressure} tone="bg-rose-500" />
                <DetailBar label="Avance de tareas" value={row.taskCompletionRate} tone="bg-blue-700" />
                <DetailBar label="Asistencia" value={row.attendanceRate} tone="bg-emerald-600" />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-950 dark:text-white">Lectura accionable</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Senales generadas desde finanzas y operacion.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {insights.map((insight) => (
                  <p key={insight} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-5 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {insight}
                  </p>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailMetric icon={Landmark} label="CxC total" value={formatMoney(row.receivablesTotal)} helper={`${row.overdueReceivables} vencidas`} />
            <DetailMetric icon={CreditCard} label="CxP total" value={formatMoney(row.payablesTotal)} helper={`${row.overduePayables} vencidas`} />
            <DetailMetric icon={WalletCards} label="Caja chica" value={formatMoney(row.pettyCashBalance)} helper={`${row.pettyCashFunds} fondos`} />
            <DetailMetric icon={BarChart3} label="Tareas" value={`${row.closedTasks}/${row.totalTasks}`} helper={`${row.overdueTasks} vencidas`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailMetric({
  helper,
  icon: Icon,
  label,
  value,
}: {
  helper: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}

function DetailBar({ label, tone, value }: { label: string; tone: string; value: number }) {
  const normalizedValue = Math.min(100, Math.max(0, value || 0));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-black text-slate-950 dark:text-white">{formatPercent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${normalizedValue}%` }} />
      </div>
    </div>
  );
}

function getUnitInsights(row: ExecutiveUnitRow) {
  const insights: string[] = [];

  if (row.operatingProfit < 0) {
    insights.push(`Perdida operativa de ${formatMoney(Math.abs(row.operatingProfit))}; revisar gasto directo y margen comercial.`);
  } else {
    insights.push(`Utilidad operativa positiva por ${formatMoney(row.operatingProfit)} con margen de ${formatPercent(row.operatingMargin)}.`);
  }

  if (row.receivablesTotal > 0) {
    insights.push(`Cartera pendiente por ${formatMoney(row.receivablesTotal)}; priorizar cobranza si afecta liquidez.`);
  }

  if (row.payablesTotal > 0) {
    insights.push(`CxP acumulada por ${formatMoney(row.payablesTotal)}; revisar calendario de pagos y vencimientos.`);
  }

  if (row.overdueTasks > 0) {
    insights.push(`${row.overdueTasks} tareas vencidas; puede explicar atrasos operativos del negocio.`);
  }

  if (row.attendanceRate < 90) {
    insights.push(`Asistencia en ${formatPercent(row.attendanceRate)}; conviene revisar ausentismo del equipo asignado.`);
  }

  if (row.pettyCashFunds > 0) {
    insights.push(`Caja chica con ${row.pettyCashFunds} fondos y saldo de ${formatMoney(row.pettyCashBalance)}; revisar cortes pendientes.`);
  }

  return insights.slice(0, 5);
}

function AlertPanel({ alerts, loading }: { alerts: ExecutiveAlert[]; loading: boolean }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-950 dark:text-white">Alertas ejecutivas</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Prioridades generadas desde finanzas, cartera y operacion.</p>
      </div>
      <div className="space-y-3 p-4">
        {loading ? <Skeleton /> : alerts.map((alert) => (
          <div key={`${alert.title}-${alert.status}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-slate-950 dark:text-white">{alert.title}</p>
              <StatusBadge status={alert.status} />
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{alert.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BreakdownPanel({
  description,
  icon: Icon,
  items,
  labelKey,
  loading,
  title,
}: {
  description: string;
  icon: LucideIcon;
  items: ExecutiveBreakdownRow[];
  labelKey: 'source' | 'accountName';
  loading: boolean;
  title: string;
}) {
  const max = Math.max(...items.map((item) => item.total), 1);

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? <Skeleton /> : items.length ? items.map((item) => {
          const label = String(item[labelKey] ?? 'Sin clasificar');
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                <span className="font-bold text-slate-950 dark:text-white">{formatMoney(item.total)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }} />
              </div>
            </div>
          );
        }) : <p className="text-sm font-semibold text-slate-500">Sin datos en el periodo.</p>}
      </div>
    </section>
  );
}

type RankingKey = 'topSales' | 'topExpenses' | 'topProfit' | 'topReceivables';

const rankingTabs: Array<{
  icon: LucideIcon;
  key: RankingKey;
  label: string;
  metric: (row: ExecutiveUnitRow) => number;
  tone: string;
}> = [
  { icon: CircleDollarSign, key: 'topSales', label: 'Ventas', metric: (row) => row.salesTotal, tone: 'text-blue-700' },
  { icon: WalletCards, key: 'topExpenses', label: 'Gastos', metric: (row) => row.expensesTotal, tone: 'text-amber-700' },
  { icon: TrendingUp, key: 'topProfit', label: 'Utilidad', metric: (row) => row.operatingProfit, tone: 'text-emerald-700' },
  { icon: Landmark, key: 'topReceivables', label: 'Cartera', metric: (row) => row.receivablesTotal, tone: 'text-rose-700' },
];

function ExecutiveRankings({ data, loading }: { data: ExecutiveKpiResponse | null; loading: boolean }) {
  const [activeRanking, setActiveRanking] = useState<RankingKey>('topSales');
  const activeTab = rankingTabs.find((tab) => tab.key === activeRanking) ?? rankingTabs[0];
  const rows = data?.rankings?.[activeRanking] ?? [];
  const Icon = activeTab.icon;

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">Rankings ejecutivos</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Top por ventas, gastos, utilidad y cartera para priorizar decisiones.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {rankingTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.key === activeRanking;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveRanking(tab.key)}
                className={cn(
                  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors',
                  isActive
                    ? 'border-blue-700 bg-blue-700 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
                )}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        <article className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 dark:border-blue-800 dark:bg-slate-900">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-200">Vista activa</p>
              <p className="text-lg font-bold text-slate-950 dark:text-white">{activeTab.label}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {activeRanking === 'topSales' && 'Negocios que estan empujando el ingreso del periodo.'}
            {activeRanking === 'topExpenses' && 'Puntos donde conviene revisar concentracion del gasto.'}
            {activeRanking === 'topProfit' && 'Unidades con mejor contribucion operativa.'}
            {activeRanking === 'topReceivables' && 'Cartera pendiente que puede afectar liquidez.'}
          </p>
        </article>

        <div className="grid gap-3 lg:col-span-4 lg:grid-cols-2 xl:grid-cols-4">
          {loading ? Array.from({ length: 4 }, (_, index) => (
            <article key={`ranking-loading-${index}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <Skeleton />
            </article>
          )) : rows.length ? rows.slice(0, 4).map((row, index) => (
            <article key={`ranking-${activeRanking}-${row.unitId ?? 'u'}-${row.businessId ?? 'b'}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {index + 1}
                </span>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-3 truncate font-bold text-slate-950 dark:text-white">{row.businessName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.unitName}</p>
              <p className={cn('mt-3 text-xl font-black tracking-normal', activeTab.tone)}>
                {formatMoney(activeTab.metric(row))}
              </p>
            </article>
          )) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 lg:col-span-4">
              Sin registros para el ranking seleccionado.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function RankingPanel({ rows, loading }: { rows: ExecutiveUnitRow[]; loading: boolean }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">Focos de atencion</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Unidades o negocios que requieren lectura de direccion.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? <Skeleton /> : rows.length ? rows.map((row) => (
          <div key={`${row.unitId}-${row.businessId}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950 dark:text-white">{row.businessName}</p>
                <p className="text-xs text-slate-500">{row.unitName}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Utilidad {formatMoney(row.operatingProfit)} - CxC {formatMoney(row.receivablesTotal)}
            </p>
          </div>
        )) : <p className="text-sm font-semibold text-slate-500">Sin focos de riesgo activos.</p>}
      </div>
    </section>
  );
}

function PeopleSignalPanel({
  description,
  emptyText,
  icon: Icon,
  items,
  kind,
  loading,
  title,
}: {
  description: string;
  emptyText: string;
  icon: LucideIcon;
  items: ExecutivePersonSignal[];
  kind: 'productivity' | 'attendance';
  loading: boolean;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? <Skeleton /> : items.length ? items.map((item) => (
          <div key={`${kind}-${item.collaboratorId ?? item.collaboratorName}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950 dark:text-white">{item.collaboratorName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.unitName} - {item.businessName}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {kind === 'productivity' ? (
                <>
                  <MiniMetric label="Score" value={`${item.productivityScore ?? 0}/100`} />
                  <MiniMetric label="Vencidas" value={String(item.overdueTasks ?? 0)} />
                  <MiniMetric label="Cierre" value={`${item.closedTasks ?? 0}/${item.totalTasks ?? 0}`} />
                </>
              ) : (
                <>
                  <MiniMetric label="Asistencia" value={formatPercent(item.attendanceRate ?? 0)} />
                  <MiniMetric label="Faltas" value={String(item.absences ?? 0)} />
                  <MiniMetric label="Retardos" value={String(item.lateDays ?? 0)} />
                </>
              )}
            </div>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ContextItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ExecutiveKpiStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold', statusClasses[status])}>
      {statusLabels[status]}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="h-8 w-1/2 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

function inputClassName(extra?: string) {
  return cn(
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950',
    extra,
  );
}

function uniqueOptions(rows: ExecutiveUnitRow[], valueKey: 'unitId' | 'businessId', labelKey: 'unitName' | 'businessName') {
  const seen = new Map<string, string>();
  rows.forEach((row) => {
    const value = row[valueKey];
    const label = row[labelKey];
    if (value !== null && value !== undefined && !seen.has(String(value))) {
      seen.set(String(value), label);
    }
  });
  return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
}

function formatValue(value: number | string, id: string) {
  if (typeof value !== 'number') return value;
  if (id === 'margin') return formatPercent(value);
  if (id === 'score') return `${Math.round(value)}/100`;
  return formatMoney(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function exportExecutivePanelCsv(data: ExecutiveKpiResponse, rows: ExecutiveUnitRow[]) {
  const csvRows: Array<Array<string | number>> = [
    ['Panel ejecutivo de KPIs'],
    ['Periodo', data.range.period],
    ['Desde', data.range.from],
    ['Hasta', data.range.to],
    [],
    ['Resumen'],
    ['Ventas', data.summary.salesTotal],
    ['Cobrado', data.summary.collectedTotal],
    ['Cuentas por cobrar', data.summary.receivablesTotal],
    ['Gastos', data.summary.expensesTotal],
    ['Cuentas por pagar', data.summary.payablesTotal],
    ['Utilidad operativa', data.summary.operatingProfit],
    ['Margen operativo', data.summary.operatingMargin],
    ['Score ejecutivo', data.summary.executiveScore],
    [],
    ['Cajas chicas'],
    ['Fondos', data.pettyCash.funds],
    ['Limite total', data.pettyCash.limitTotal],
    ['Saldo total', data.pettyCash.balanceTotal],
    ['Fondos en atencion', data.pettyCash.attention],
    [],
    ['KPIs'],
    ['Indicador', 'Valor', 'Estado', 'Lectura'],
    ...data.kpiCards.map((card) => [card.title, card.value, statusLabels[card.status], card.description]),
    [],
    ['Matriz por unidad y negocio'],
    ['Unidad', 'Negocio', 'Ventas', 'Gastos', 'Utilidad', 'Margen', 'CxC', 'CxP', 'Fondos caja chica', 'Saldo caja chica', 'Tareas cerradas', 'Tareas totales', 'Asistencia', 'Estado'],
    ...rows.map((row) => [
      row.unitName,
      row.businessName,
      row.salesTotal,
      row.expensesTotal,
      row.operatingProfit,
      row.operatingMargin,
      row.receivablesTotal,
      row.payablesTotal,
      row.pettyCashFunds,
      row.pettyCashBalance,
      row.closedTasks,
      row.totalTasks,
      row.attendanceRate,
      statusLabels[row.status],
    ]),
  ];

  const csv = csvRows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `panel-ejecutivo-kpis-${data.range.from}-${data.range.to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}
