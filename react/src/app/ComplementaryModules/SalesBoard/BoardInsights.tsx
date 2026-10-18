import { BarChart3, CalendarDays, Receipt, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../../components/ui/button';
import { channelLabel, originLabel, type BoardCopy } from './boardCopy';
import { completeAmount, dateLabel, moneyLabel, type Workspace } from './boardModel';

export const panelClass = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800';
type Props = { data: Workspace; copy: BoardCopy; locale: string };
export function BoardOverview({ data, copy, locale, onSales }: Props & { onSales: () => void }) {
  const { summary: s, analytics: { comparison: p } } = data;
  const currency = s.total.preferredCurrency;
  const amount = (n: number | null) => moneyLabel(n, currency, locale);
  const change = (value: number | null) => value === null ? copy.noComparison : `${value > 0 ? '+' : ''}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
  const metrics = [
    { label: copy.total, value: amount(completeAmount(s.total)), previous: amount(completeAmount(p.total)), change: p.totalChangePercent, icon: TrendingUp },
    { label: copy.count, value: s.active.toLocaleString(locale), previous: p.active.toLocaleString(locale), change: p.volumeChangePercent, icon: Receipt },
    { label: copy.average, value: amount(s.averageTicket), previous: amount(p.averageTicket), change: p.averageChangePercent, icon: BarChart3 },
  ];
  return <div className="grid min-w-0 gap-6">
    <div className="grid gap-4 lg:grid-cols-3">{metrics.map(metric => <section key={metric.label} className={panelClass}>
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><metric.icon aria-hidden className="h-5 w-5 text-[#b63b32] dark:text-[#ff9d94]" /><h3>{metric.label}</h3></div>
      <p className="mt-4 break-words text-2xl font-medium tabular-nums">{metric.value}</p>
      <p className="mt-3 text-sm font-medium">{change(metric.change)}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.previous}: {metric.previous}</p>
    </section>)}</div>
    <section className={panelClass}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{copy.current}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{dateLabel(data.context.from, locale)} – {dateLabel(data.context.to, locale)}</p></div><Button variant="outline" className="min-h-11" onClick={onSales}>{copy.reviewSales}</Button></div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">{[[copy.beforeTax, amount(completeAmount(s.beforeTax))], [copy.tax, amount(completeAmount(s.tax))], [copy.cancelled, s.cancelled.toLocaleString(locale)]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd></div>)}</dl>
    </section>
    <div className="flex gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"><CalendarDays aria-hidden className="h-5 w-5 shrink-0" /><div><p>{copy.previous}: {dateLabel(p.from, locale)} – {dateLabel(p.to, locale)}</p><p className="mt-1">{copy.comparisonHint}</p></div></div>
  </div>;
}

export function BoardTrends({ data, copy, locale, onInterval }: Props & { onInterval: (from: string, to: string) => void }) {
  const currency = data.summary.total.preferredCurrency;
  const amount = (value: number | null) => moneyLabel(value, currency, locale);
  const points = data.analytics.trend.map(point => ({ ...point, current: completeAmount(point.total), previous: completeAmount(point.previousTotal), label: dateLabel(point.from, locale) }));
  const max = Math.max(0, ...data.analytics.weekdays.map(day => day.averagePerDay ?? 0));
  return <div className="grid min-w-0 gap-6">
    <section className={panelClass} aria-label={copy.trends}>
      <div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{copy.total} · {copy[data.analytics.granularity as 'day' | 'week' | 'month']}</h3><span className="text-sm text-slate-500 dark:text-slate-400">{currency}</span></div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.trendHint}</p>
      <div className="mt-4 h-72 min-w-0" role="img" aria-label={`${copy.trends}: ${copy.current} / ${copy.previous}`}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
          <CartesianGrid stroke="#94a3b8" strokeOpacity={0.18} vertical={false} /><XAxis dataKey="label" minTickGap={45} tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis width={60} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={value => new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)} />
          <Tooltip content={({ active, payload }) => { const point = payload?.[0]?.payload as typeof points[number] | undefined; return active && point ? <div className="max-w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-600 dark:bg-slate-900"><p className="font-medium">{copy.current}: {dateLabel(point.from, locale)} – {dateLabel(point.to, locale)}</p><p>{amount(point.current)} · {point.active} {copy.sales.toLowerCase()}</p><p className="mt-2 font-medium">{copy.previous}: {dateLabel(point.previousFrom, locale)} – {dateLabel(point.previousTo, locale)}</p><p>{amount(point.previous)} · {point.previousActive} {copy.sales.toLowerCase()}</p></div> : null; }} />
          <Line type="linear" dataKey="current" name={copy.current} stroke="#FF6B5E" strokeWidth={2.5} dot={points.length <= 31} connectNulls={false} isAnimationActive={false} />
          <Line type="linear" dataKey="previous" name={copy.previous} stroke="#64748b" strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-5 text-xs"><span><span aria-hidden className="mr-2 inline-block w-5 border-t-2 border-[#FF6B5E]" />{copy.current}</span><span><span aria-hidden className="mr-2 inline-block w-5 border-t-2 border-dashed border-slate-500" />{copy.previous}</span></div>
      <details className="mt-4 border-t border-slate-200 pt-3 text-sm dark:border-slate-700"><summary className="cursor-pointer py-2 font-medium">{copy.seriesData}</summary><ul className="max-h-80 overflow-auto">{points.map(point => <li key={point.from} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 dark:border-slate-700"><div><p>{dateLabel(point.from, locale)} – {dateLabel(point.to, locale)}</p><p>{copy.current}: {amount(point.current)} · {point.active} {copy.sales.toLowerCase()}</p><p className="text-xs text-slate-500 dark:text-slate-400">{copy.previous}: {dateLabel(point.previousFrom, locale)} – {dateLabel(point.previousTo, locale)} · {amount(point.previous)}</p></div><Button variant="ghost" className="min-h-11" onClick={() => onInterval(point.from, point.to)}>{copy.reviewSales}</Button></li>)}</ul></details>
    </section>
    <section className={panelClass}><h3 className="font-medium">{copy.weekday}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.timingHint}</p><ul className="mt-5 grid gap-4 lg:grid-cols-2">{data.analytics.weekdays.map(day => <li key={day.day} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + day.day)))}</span><span>{amount(day.averagePerDay)}</span></div>
      <div aria-hidden className="my-2 h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-700"><div className="h-full rounded bg-[#FF6B5E]" style={{ width: `${max > 0 && day.averagePerDay !== null ? Math.max(0, day.averagePerDay / max) * 100 : 0}%` }} /></div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy.averagePerDay} · {copy.occurrences}: {day.occurrences} · {copy.sales}: {day.active}</p>
    </li>)}</ul></section>
  </div>;
}

export function BoardChannels({ data, copy, locale, onChannel }: Props & { onChannel: (origin: string, channel: string) => void }) {
  return <section className={panelClass}><h3 className="font-medium">{copy.channels}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.channelHint}</p><ul className="mt-5 grid gap-4 lg:grid-cols-2">{data.channels.map(group => <li key={`${group.origin}:${group.channel}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-medium">{originLabel(group.origin, copy)} · {channelLabel(group.channel, copy)}</h4><Button variant="ghost" className="min-h-11" onClick={() => onChannel(group.origin, group.channel)}>{copy.reviewSales}</Button></div><p className="mt-3 text-xl font-medium">{moneyLabel(completeAmount(group.summary.total), group.summary.total.preferredCurrency, locale)}</p><dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.count}</dt><dd>{group.summary.active}</dd></div><div><dt className="text-xs text-slate-500 dark:text-slate-400">{copy.average}</dt><dd>{moneyLabel(group.summary.averageTicket, group.summary.total.preferredCurrency, locale)}</dd></div></dl></li>)}</ul></section>;
}
