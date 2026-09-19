import { Banknote, CalendarClock, CirclePercent, FileCheck2, Landmark, ReceiptText, Users, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReactNode } from 'react';
import type { KpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import { agingKeys } from './receivablesKpiSelectors';
import { kpiMoney, type KpiCard } from './receivablesKpiPresentation';
import { completeAmount } from './useReceivablesKpiAggregates';
import type { ReceivablesKpiCopy } from './workspaceCopy';

const icons = [WalletCards, CalendarClock, CirclePercent, CalendarClock, Banknote, ReceiptText, Users, FileCheck2];
export function ReceivablesKpiCards({ cards }: { cards: KpiCard[] }) {
  return <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card, index) => {
    const Icon = icons[index] ?? Landmark;
    return <article key={card.key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] dark:text-emerald-300"><Icon className="h-5 w-5" /></span><h3 className="pt-1 text-sm font-medium text-slate-600 dark:text-slate-200">{card.title}</h3></div>
      <p className="mt-4 break-words text-2xl font-medium text-slate-950 dark:text-white">{card.value}</p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{card.helper}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
    </article>;
  })}</section>;
}
export function KpiSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p><div className="mt-5">{children}</div></section>;
}
export function ReceivablesKpiCharts({ data, months, copy, currency, locale }: {
  data: Record<string, KpiMonetaryAggregate>; months: string[]; copy: ReceivablesKpiCopy; currency: string; locale: string;
}) {
  const charts = [
    { key: 'aging', title: copy.aging, description: copy.agingHelp, rows: agingKeys.map(key => ({ label: copy[key], value: completeAmount(data[`aging:${key}`]) })) },
    { key: 'trend', title: copy.trend, description: copy.trendHelp, rows: months.map(month => ({ label: month, value: completeAmount(data[`month:${month}`]) })) },
  ];
  return <div className="grid gap-6 lg:grid-cols-2">{charts.map(chart => <KpiSection key={chart.key} title={chart.title} description={chart.description}>
    {chart.rows.some(row => row.value === null) ? <p className="text-sm text-slate-500">{copy.unavailable}</p> : chart.rows.length === 0 || chart.rows.every(row => row.value === 0) ? <p className="text-sm text-slate-500">{copy.noSample}</p> : <div className="h-72 min-w-0" role="img" aria-label={`${chart.title}: ${chart.rows.map(row => `${row.label} ${kpiMoney(row.value, currency, locale, copy.unavailable)}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%"><BarChart data={chart.rows} margin={{ left: 8, right: 10, bottom: 16 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={value => new Intl.NumberFormat(locale, { notation: 'compact' }).format(Number(value))} /><Tooltip formatter={value => kpiMoney(Number(value), currency, locale, copy.unavailable)} /><Bar dataKey="value" name={currency} fill="#147514" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
    </div>}
  </KpiSection>)}</div>;
}
