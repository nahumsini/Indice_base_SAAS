import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Flame,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

type MetricTone = 'orange' | 'emerald' | 'blue' | 'purple';
type InsightTone = 'critical' | 'warning' | 'success' | 'info' | 'hot';
type InsightCategory = 'Control' | 'Risk' | 'Opportunity' | 'Action';

interface KpiMetric {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
  icon: typeof ShoppingCart;
}

interface Insight {
  category: InsightCategory;
  title: string;
  description: string;
  tone: InsightTone;
  icon: typeof AlertTriangle;
}

const toneClasses: Record<MetricTone, string> = {
  orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
};

const insightClasses: Record<InsightTone, string> = {
  critical: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100',
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100',
  hot: 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-100',
};

const categoryClasses: Record<InsightCategory, string> = {
  Control: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Risk: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Opportunity: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Action: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function KPIs() {
  const salesByHour = useMemo(
    () => [
      { hour: '08', sales: 1420 },
      { hour: '09', sales: 2280 },
      { hour: '10', sales: 4180 },
      { hour: '11', sales: 5250 },
      { hour: '12', sales: 7930 },
      { hour: '13', sales: 6120 },
      { hour: '14', sales: 4660 },
      { hour: '15', sales: 5380 },
    ],
    [],
  );

  const topSellers = useMemo(
    () => [
      { name: 'Ana Rivera', value: formatCurrency(18420), detail: '42 tickets' },
      { name: 'Luis Chen', value: formatCurrency(15180), detail: '36 tickets' },
      { name: 'Maya Patel', value: formatCurrency(12340), detail: '29 tickets' },
    ],
    [],
  );

  const topProducts = useMemo(
    () => [
      { name: 'Signature bundle', value: '84 units', detail: '32% margin' },
      { name: 'Premium refill', value: '63 units', detail: 'Fast mover' },
      { name: 'Starter kit', value: '41 units', detail: 'Low stock' },
    ],
    [],
  );

  const paymentMix = useMemo(
    () => [
      { method: 'Card', amount: 45600, percentage: 58 },
      { method: 'Cash', amount: 21800, percentage: 28 },
      { method: 'Transfer', amount: 10980, percentage: 14 },
    ],
    [],
  );

  const metrics: KpiMetric[] = [
    { label: 'Today sales', value: formatCurrency(78380), detail: '+18% vs yesterday', tone: 'orange', icon: Wallet },
    { label: 'Tickets', value: '342', detail: '24 active in last hour', tone: 'blue', icon: Receipt },
    { label: 'Average ticket', value: formatCurrency(229), detail: '+7% vs baseline', tone: 'emerald', icon: ShoppingCart },
    { label: 'Gross margin', value: '34.8%', detail: 'Commercial mix under control', tone: 'purple', icon: TrendingUp },
  ];

  const insights: Insight[] = [
    {
      category: 'Action',
      title: 'Peak hour detected',
      description: '12:00 is driving the highest commercial load. Keep one extra cashier ready.',
      tone: 'hot',
      icon: Flame,
    },
    {
      category: 'Risk',
      title: 'Critical stock',
      description: 'Starter kit is selling fast and may run out before closing.',
      tone: 'warning',
      icon: Package,
    },
    {
      category: 'Opportunity',
      title: 'Sales growing',
      description: 'Current pace is 18% above yesterday with stable ticket size.',
      tone: 'success',
      icon: ArrowUpRight,
    },
    {
      category: 'Control',
      title: 'Pending reception',
      description: 'One supplier order is waiting for partial reception.',
      tone: 'info',
      icon: Clock3,
    },
  ];

  const maxHourlySales = Math.max(...salesByHour.map((entry) => entry.sales));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-orange-200 bg-orange-50 px-6 py-5 dark:border-orange-800 dark:bg-orange-900/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Commercial Control Center</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Indice reads the operation, highlights risk, and points to the next action.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-orange-700 shadow-sm dark:bg-gray-900 dark:text-orange-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Indice Signal
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={`rounded-lg border p-5 shadow-sm ${toneClasses[metric.tone]}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{metric.label}</p>
                  <p className="mt-2 text-3xl font-black">{metric.value}</p>
                  <p className="mt-1 text-xs opacity-80">{metric.detail}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 dark:bg-gray-950/30">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Sales by hour</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Operational rhythm for the current shift</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              +18%
            </span>
          </div>

          <div className="flex h-72 items-end gap-3">
            {salesByHour.map((entry) => (
              <div key={entry.hour} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end rounded-lg bg-gray-50 px-2 dark:bg-gray-900/40">
                  <div
                    className="w-full rounded-t-lg bg-orange-500 shadow-sm transition-all hover:bg-orange-600"
                    style={{ height: `${Math.max(8, (entry.sales / maxHourlySales) * 100)}%` }}
                    title={formatCurrency(entry.sales)}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{entry.hour}:00</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Indice Signals</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Control, risk, and opportunity in one operational view</p>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.title} className={`rounded-lg border p-4 ${insightClasses[insight.tone]}`}>
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-gray-950/30">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryClasses[insight.category]}`}>
                        {insight.category}
                      </span>
                      <p className="text-sm font-bold">{insight.title}</p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <TopList title="Top sellers" icon={Users} rows={topSellers} />
        <TopList title="Top products" icon={Package} rows={topProducts} />

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Payment mix</h3>
          </div>
          <div className="space-y-4">
            {paymentMix.map((payment) => (
              <div key={payment.method}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{payment.method}</span>
                  <span className="text-gray-500 dark:text-gray-400">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${payment.percentage}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{payment.percentage}% of collected sales</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TopList({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof Users;
  rows: Array<{ name: string; value: string; detail: string }>;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-orange-500" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{row.detail}</p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-bold text-gray-900 dark:text-white">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
