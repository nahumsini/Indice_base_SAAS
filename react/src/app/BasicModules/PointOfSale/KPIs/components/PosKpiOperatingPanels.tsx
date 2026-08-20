import { BarChart3, CreditCard, Package, Store, type LucideIcon } from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PosKpiAnalytics, PosKpiRankedRow } from '../utils/posKpiAnalytics';
import type { PosKpiCopy } from '../posKpiTranslations';

const paymentColors: Record<string, string> = {
  CASH: '#10B981',
  CARD: '#2563EB',
  TRANSFER: '#8B5CF6',
  CREDIT: '#F4B400',
};

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">{text}</p>;
}

export function PosKpiOperatingPanels({
  analytics,
  copy,
  formatCurrency,
  onSelectCashRegister,
  onSelectWarehouse,
}: {
  analytics: PosKpiAnalytics;
  copy: PosKpiCopy;
  formatCurrency: (amount: number) => string;
  onSelectCashRegister: (id: number) => void;
  onSelectWarehouse: (id: number) => void;
}) {
  return (
    <>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
        <SalesTrend copy={copy} rows={analytics.trend} formatCurrency={formatCurrency} />
        <PaymentMixPanel copy={copy} rows={analytics.paymentMix} formatCurrency={formatCurrency} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TopList
          title={copy.operating.topWarehouses}
          icon={Package}
          rows={analytics.topWarehouses}
          formatValue={formatCurrency}
          emptyText={copy.operating.noWarehouseClosings}
          onSelect={onSelectWarehouse}
          copy={copy}
        />
        <TopList
          title={copy.operating.topRegisters}
          icon={Store}
          rows={analytics.topCashRegisters}
          formatValue={formatCurrency}
          emptyText={copy.operating.noRegisterClosings}
          onSelect={onSelectCashRegister}
          copy={copy}
        />
      </section>
    </>
  );
}

function SalesTrend({
  copy,
  formatCurrency,
  rows,
}: {
  copy: PosKpiCopy;
  formatCurrency: (amount: number) => string;
  rows: PosKpiAnalytics['trend'];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.operating.salesTrend}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.operating.salesTrendHelp}</p>
        </div>
        <BarChart3 className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
      </div>
      {rows.length === 0 ? (
        <EmptyText text={copy.operating.noTrend} />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }}
              />
              <Legend />
              <Line name={copy.operating.currentPeriod} type="monotone" dataKey="current" stroke="#FF6B5E" strokeWidth={3} dot={{ r: 3 }} />
              <Line name={copy.operating.previousPeriod} type="monotone" dataKey="previous" stroke="#94A3B8" strokeWidth={2} strokeDasharray="6 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PaymentMixPanel({
  copy,
  formatCurrency,
  rows,
}: {
  copy: PosKpiCopy;
  formatCurrency: (amount: number) => string;
  rows: PosKpiAnalytics['paymentMix'];
}) {
  const methodLabel = (method: string) => copy.operating.paymentMethods[method as keyof typeof copy.operating.paymentMethods] ?? method;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.operating.paymentMix}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.operating.paymentMixHelp}</p>
        </div>
      </div>
      {rows.every((row) => row.amount === 0) ? (
        <EmptyText text={copy.operating.noPayments} />
      ) : (
        <>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="amount" nameKey="method" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {rows.map((row) => <Cell key={row.method} fill={paymentColors[row.method]} />)}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value ?? 0)), methodLabel(String(name))]}
                  contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {rows.map((payment) => (
              <div key={payment.method} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: paymentColors[payment.method] }} />
                  {methodLabel(payment.method)}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatCurrency(payment.amount)} · {payment.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TopList({
  copy,
  emptyText,
  formatValue,
  icon: Icon,
  onSelect,
  rows,
  title,
}: {
  copy: PosKpiCopy;
  emptyText: string;
  formatValue: (value: number) => string;
  icon: LucideIcon;
  onSelect: (id: number) => void;
  rows: PosKpiRankedRow[];
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? <EmptyText text={emptyText} /> : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-slate-50 p-3 text-left transition hover:border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/5 dark:bg-slate-950"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA]">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-950 dark:text-white">{row.name}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {copy.operating.rankingDetail(row.share, row.tickets)}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-medium text-slate-950 dark:text-white">{formatValue(row.value)}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{copy.operating.viewFilter}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
