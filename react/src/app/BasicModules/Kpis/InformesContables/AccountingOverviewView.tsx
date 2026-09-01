import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleGauge, Lightbulb, Minus } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { AccountingReportCopy } from './accountingReportTranslations';
import type { AccountingAnalytics, AccountingReport } from './accountingReportsApi';
import { formatAccountingMoney } from './AccountingReportViews';

type Props = {
  analytics: AccountingAnalytics;
  copy: AccountingReportCopy;
  locale: string;
  report: AccountingReport;
  onInsightAction: (actionCode: string) => void;
  onUnitSelect?: (unitId: string) => void;
};

export function AccountingOverviewView({ analytics, copy, locale, report, onInsightAction, onUnitSelect }: Props) {
  const currency = analytics.context.presentationCurrency;
  const shortMoney = (value: number) => new Intl.NumberFormat(locale, {
    notation: 'compact', style: 'currency', currency, maximumFractionDigits: 1,
  }).format(value);
  const trendData = analytics.monthlyTrend.map((point) => ({ ...point, label: formatMonth(point.periodKey, locale) }));

  return <div className="space-y-5">
    <section aria-labelledby="financial-pulse-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"><CircleGauge className="h-5 w-5" /></span>
        <div><h2 id="financial-pulse-title" className="text-xl font-medium text-slate-950 dark:text-white">{copy.overview.title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.overview.subtitle}</p></div>
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">{copy.overview.targetNotConfigured}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {analytics.kpis.map((metric) => <KpiCard key={metric.id} metric={metric} copy={copy} locale={locale} currency={currency} />)}
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <ChartCard title={copy.overview.profitBridge} help={copy.overview.profitBridgeHelp} summary={bridgeSummary(analytics.profitBridge, copy, currency, locale)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.profitBridge.map((point) => ({ ...point, label: copy.bridge[point.code] ?? point.code }))} margin={{ top: 10, right: 8, left: 8, bottom: 30 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={54} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={shortMoney} width={72} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => formatAccountingMoney(value, currency, locale)} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {analytics.profitBridge.map((point) => <Cell key={point.code} fill={point.kind === 'TOTAL' ? '#1d4ed8' : point.amount < 0 ? '#f59e0b' : '#59c3a5'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={copy.overview.cashBridge} help={copy.overview.cashBridgeHelp} summary={bridgeSummary(analytics.cashBridge, copy, currency, locale)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.cashBridge.map((point) => ({ ...point, label: copy.bridge[point.code] ?? point.code }))} margin={{ top: 10, right: 8, left: 8, bottom: 30 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={54} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={shortMoney} width={72} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => formatAccountingMoney(value, currency, locale)} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {analytics.cashBridge.map((point) => <Cell key={point.code} fill={point.kind === 'TOTAL' ? '#1d4ed8' : point.amount < 0 ? '#f59e0b' : '#59c3a5'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>

    <ChartCard title={copy.overview.trend} help={copy.overview.trendHelp} summary={`${copy.metrics.REVENUE}: ${formatAccountingMoney(trendData[trendData.length - 1]?.revenue ?? 0, currency, locale)}. ${copy.metrics.NET_PROFIT}: ${formatAccountingMoney(trendData[trendData.length - 1]?.netProfit ?? 0, currency, locale)}.`} wide>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trendData} margin={{ top: 10, right: 16, left: 8, bottom: 8 }} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={shortMoney} width={72} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => formatAccountingMoney(value, currency, locale)} />
          <Legend />
          <Line name={copy.metrics.REVENUE} type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={false} />
          <Line name={copy.metrics.OPERATING_PROFIT} type="monotone" dataKey="operatingProfit" stroke="#269c82" strokeWidth={2.5} dot={false} />
          <Line name={copy.metrics.NET_PROFIT} type="monotone" dataKey="netProfit" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.overview.organization}</h3>
        <p className="mt-1 text-sm text-slate-500">{copy.overview.organizationHelp}</p>
        {analytics.organizationComparison.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700"><th className="py-3 font-medium">{copy.filters.unit}</th><th className="py-3 text-right font-medium">{copy.metrics.REVENUE}</th><th className="py-3 text-right font-medium">{copy.metrics.GROSS_PROFIT}</th><th className="py-3 text-right font-medium">{copy.metrics.NET_PROFIT}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{analytics.organizationComparison.map((unit) => <tr key={unit.unitId} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/50"><td className="py-2"><button type="button" onClick={() => onUnitSelect?.(String(unit.unitId))} className="min-h-10 rounded-lg px-2 text-left font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300 dark:hover:bg-blue-950/30">{unit.unitName}</button></td><td className="py-3 text-right tabular-nums">{formatAccountingMoney(unit.revenue, currency, locale)}</td><td className="py-3 text-right tabular-nums">{formatAccountingMoney(unit.grossProfit, currency, locale)}</td><td className="py-3 text-right tabular-nums">{formatAccountingMoney(unit.netProfit, currency, locale)}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-950">{copy.overview.noOrganization}</p>}
      </section>

      <section className="rounded-[24px] border border-blue-200 bg-blue-50/60 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex items-start gap-3"><Lightbulb className="mt-0.5 h-5 w-5 text-blue-700 dark:text-blue-300" /><div><h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.overview.insights}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.overview.insightsHelp}</p></div></div>
        <div className="mt-4 space-y-3">{analytics.insights.map((insight, index) => <article key={insight.code} className="rounded-2xl border border-blue-100 bg-white p-4 dark:border-blue-900 dark:bg-slate-900"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">{index + 1}</span><div><p className="font-medium text-slate-950 dark:text-white">{copy.insightCodes[insight.code] ?? insight.code}</p><Button type="button" variant="ghost" className="mt-2 h-9 px-0 text-blue-700 hover:bg-transparent dark:text-blue-300" onClick={() => onInsightAction(insight.actionCode)}>{copy.actionCodes[insight.actionCode] ?? insight.actionCode}<ArrowRight className="h-4 w-4" /></Button></div></div></article>)}</div>
      </section>
    </div>
    <p className="sr-only">{report.readiness.message}</p>
  </div>;
}

function KpiCard({ metric, copy, locale, currency }: { metric: AccountingAnalytics['kpis'][number]; copy: AccountingReportCopy; locale: string; currency: string }) {
  const DeltaIcon = metric.changePercent == null ? Minus : metric.changePercent > 0 ? ArrowUpRight : metric.changePercent < 0 ? ArrowDownRight : Minus;
  const value = metric.value == null ? copy.overview.unavailable : metric.valueType === 'MONEY'
    ? formatAccountingMoney(metric.value, currency, locale)
    : metric.valueType === 'PERCENT' ? `${metric.value.toFixed(1)}%` : metric.value.toFixed(2);
  const deltaTone = metric.changePercent == null
    ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
    : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200';
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="h-1 bg-blue-600" /><div className="p-4"><p className="text-sm text-slate-600 dark:text-slate-300">{copy.metrics[metric.id] ?? metric.id}</p><p className="mt-2 text-2xl font-medium tabular-nums text-slate-950 dark:text-white">{value}</p><span className={cn('mt-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs', deltaTone)}><DeltaIcon className="h-3.5 w-3.5" />{metric.changePercent == null ? '—' : `${metric.changePercent.toFixed(1)}%`} {copy.overview.comparative}</span></div></article>;
}

function ChartCard({ title, help, summary, children, wide = false }: { title: string; help: string; summary: string; children: React.ReactNode; wide?: boolean }) {
  return <figure className={cn('rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900', wide && 'w-full')}><h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3><p className="mt-1 text-sm text-slate-500">{help}</p><div className="mt-4 h-[300px] min-h-[300px]">{children}</div><figcaption className="sr-only">{summary}</figcaption></figure>;
}

function bridgeSummary(points: AccountingAnalytics['profitBridge'], copy: AccountingReportCopy, currency: string, locale: string) {
  return points.map((point) => `${copy.bridge[point.code] ?? point.code}: ${formatAccountingMoney(point.amount, currency, locale)}`).join('. ');
}

function formatMonth(periodKey: string, locale: string) {
  const [year, month] = periodKey.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(year, month - 1, 1));
}
