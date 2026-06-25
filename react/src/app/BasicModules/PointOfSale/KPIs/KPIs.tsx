import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Clock3,
  CreditCard,
  Package,
  Receipt,
  RefreshCw,
  Scale,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { usePosKpiCashClosings } from './hooks/usePosKpiCashClosings';
import {
  buildPosKpiAnalytics,
  periodOptions,
  type PosKpiAnalytics,
  type PosKpiPeriod,
} from './utils/posKpiAnalytics';

type MetricTone = 'orange' | 'emerald' | 'blue' | 'purple' | 'red';

const toneClasses: Record<MetricTone, string> = {
  orange: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  purple: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
};

export default function KPIs() {
  const [period, setPeriod] = useState<PosKpiPeriod>('today');
  const {
    rows,
    details,
    loading,
    error,
    detailError,
    detailFetchLimited,
    totalCount,
    refresh,
  } = usePosKpiCashClosings(period);

  const analytics = useMemo(() => buildPosKpiAnalytics({
    rows,
    details,
    period,
    totalCount,
  }), [details, period, rows, totalCount]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: analytics.primaryCurrency,
    maximumFractionDigits: 0,
  }).format(amount);

  const maxHourlySales = Math.max(...analytics.hourlySales.map((entry) => entry.sales), 0);
  const hasDifference = Math.abs(analytics.netDifference) >= 1;
  const insight = getInsight(analytics);
  const paymentBreakdownNote = detailError
    || (detailFetchLimited
      ? 'El desglose por metodo muestra efectivo del listado; abre un periodo mas corto para cargar todos los metodos.'
      : '');

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-orange-200 bg-orange-50 px-6 py-5 dark:border-orange-800 dark:bg-orange-900/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reportes operativos POS</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Ventas de mostrador, arqueos, mezcla de pago y senales de ejecucion por periodo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-orange-200 bg-white p-1 dark:border-orange-800 dark:bg-gray-900">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`min-h-9 rounded-md px-3 text-sm font-semibold transition ${
                    period === option.value
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-800 dark:bg-gray-900 dark:text-orange-300 dark:hover:bg-orange-900/30"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Cargando cierres reales de POS para el periodo seleccionado.
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </span>
          <button
            onClick={refresh}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          No hay cierres de caja reales en este periodo. Abre y cierra un turno para alimentar estos KPIs.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Wallet} label="Venta POS" value={formatCurrency(analytics.revenue)} detail={analytics.periodLabel} tone="orange" />
        <MetricCard icon={Receipt} label="Tickets" value={String(analytics.tickets)} detail={`Ticket prom. ${formatCurrency(analytics.averageTicket)}`} tone="blue" />
        <MetricCard icon={Banknote} label="Venta efectivo" value={formatCurrency(analytics.totalCashSales)} detail="Cobro cash registrado" tone="emerald" />
        <MetricCard icon={Scale} label="Diferencia caja" value={`${analytics.netDifference > 0 ? '+' : ''}${formatCurrency(analytics.netDifference)}`} detail={`${analytics.overShortRate.toFixed(1)}% sobre efectivo`} tone={hasDifference ? 'red' : 'emerald'} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon={TrendingUp} label="Efectivo esperado" value={formatCurrency(analytics.expectedCash)} detail="Calculado por backend" tone="blue" />
        <MetricCard icon={Package} label="Efectivo contado" value={formatCurrency(analytics.countedCash)} detail="Reportado en cierres" tone="purple" />
        <MetricCard icon={Clock3} label="Cierres" value={String(analytics.closings)} detail={`${analytics.totalCount} registros disponibles`} tone="orange" />
      </section>

      <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        insight.tone === 'risk'
          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100'
          : insight.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100'
          : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100'
      }`}>
        {insight.tone === 'risk' ? <AlertTriangle className="mt-0.5 h-5 w-5" /> : <ArrowUpRight className="mt-0.5 h-5 w-5" />}
        <p className="text-sm font-semibold">{insight.text}</p>
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <HourlySalesChart rows={analytics.hourlySales} max={maxHourlySales} formatCurrency={formatCurrency} />
        <PaymentMixPanel rows={analytics.paymentMix} formatCurrency={formatCurrency} note={paymentBreakdownNote} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <TopList title="Cajas con venta" icon={Users} rows={analytics.topCashRegisters} formatValue={formatCurrency} emptyText="Sin cierres por caja en el periodo" />
        <TopList title="Almacenes POS" icon={Package} rows={analytics.topWarehouses} formatValue={formatCurrency} emptyText="Sin cierres por almacen en el periodo" />
        <CurrencyPanel totals={analytics.currencyTotals} formatCurrency={formatCurrency} primaryCurrency={analytics.primaryCurrency} />
      </section>
    </div>
  );
}

function getInsight(analytics: PosKpiAnalytics) {
  if (Math.abs(analytics.netDifference) >= 1) {
    return { tone: 'risk' as const, text: `Hay una diferencia neta de caja de ${analytics.netDifference > 0 ? '+' : ''}${analytics.netDifference.toFixed(2)} ${analytics.primaryCurrency}; revisa arqueos antes de cerrar el periodo.` };
  }
  if (analytics.closings === 0) {
    return { tone: 'info' as const, text: `No hay cierres POS visibles en ${analytics.periodLabel}; los KPIs se activan cuando se cierre el primer turno.` };
  }
  if (analytics.tickets > 0) {
    return { tone: 'success' as const, text: `${analytics.tickets} tickets cerrados en ${analytics.periodLabel}; la venta POS ya esta lista para seguimiento financiero.` };
  }
  return { tone: 'info' as const, text: `${analytics.closings} cierres sin tickets en ${analytics.periodLabel}; revisa operaciones antes de comparar ventas.` };
}

function MetricCard({ icon: Icon, label, value, detail, tone }: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
}) {
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
          <p className="mt-2 truncate text-3xl font-black">{value}</p>
          <p className="mt-1 text-xs opacity-80">{detail}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-gray-950/30">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function HourlySalesChart({ rows, max, formatCurrency }: {
  rows: Array<{ hour: string; sales: number }>;
  max: number;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Ventas por cierre</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ritmo operativo segun hora de arqueo</p>
        </div>
        <BarChart3 className="h-5 w-5 text-orange-500" />
      </div>
      {rows.length === 0 ? (
        <EmptyText text="Sin cierres de caja en el periodo." />
      ) : (
        <div className="flex h-72 items-end gap-3">
          {rows.map((entry) => (
            <div key={entry.hour} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end rounded-lg bg-gray-50 px-2 dark:bg-gray-900/40">
                <div
                  className="w-full rounded-t-lg bg-orange-500 shadow-sm transition-all hover:bg-orange-600"
                  style={{ height: `${Math.max(8, max > 0 ? (entry.sales / max) * 100 : 0)}%` }}
                  title={formatCurrency(entry.sales)}
                />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{entry.hour}:00</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentMixPanel({ rows, formatCurrency, note }: {
  rows: Array<{ method: string; amount: number; percentage: number }>;
  formatCurrency: (amount: number) => string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-orange-500" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Mezcla de pago</h3>
      </div>
      {rows.length === 0 ? <EmptyText text="Sin pagos registrados en el periodo." /> : (
        <div className="space-y-4">
          {rows.map((payment) => (
            <div key={payment.method}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{payment.method}</span>
                <span className="text-gray-500 dark:text-gray-400">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${payment.percentage}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{payment.percentage}% cobrado</p>
            </div>
          ))}
        </div>
      )}
      {note && <p className="mt-4 rounded-lg bg-orange-50 p-3 text-xs font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">{note}</p>}
    </div>
  );
}

function TopList({ title, icon: Icon, rows, formatValue, emptyText }: {
  title: string;
  icon: LucideIcon;
  rows: Array<{ name: string; value: number; detail: string }>;
  formatValue: (value: number) => string;
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-orange-500" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? <EmptyText text={emptyText} /> : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.detail}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-bold text-gray-900 dark:text-white">{formatValue(row.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CurrencyPanel({ totals, formatCurrency, primaryCurrency }: {
  totals: Array<{ currency: string; amount: number }>;
  formatCurrency: (amount: number) => string;
  primaryCurrency: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-orange-500" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Divisas POS</h3>
      </div>
      <div className="space-y-3">
        {totals.map((total) => (
          <div key={total.currency} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{total.currency}</span>
            <span className="text-sm font-black text-gray-950 dark:text-white">
              {total.currency === primaryCurrency ? formatCurrency(total.amount) : `${total.amount.toLocaleString('es-MX')} ${total.currency}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-lg bg-gray-50 p-4 text-sm font-semibold text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">{text}</p>;
}
