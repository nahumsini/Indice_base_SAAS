import { AlertTriangle, BadgeCheck, ClipboardList, FileCheck2, Landmark, ReceiptText, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { KpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import type { PettyCashKpiSelection } from '../pettyCashKpiSelectors';
import type { buildPettyCashKpiQueries } from '../pettyCashKpiQueries';
import { completeAmount } from '../usePettyCashKpiAggregates';
import type { PettyCashKpiCopy } from '../workspaceCopy';

export type DetailFocus = 'all' | 'pending' | 'missing' | 'open' | 'negative' | 'shortage';
export type PettyCashKpiCard = { key: string; title: string; value: string; helper: string; description: string; icon: ReactNode; focus?: DetailFocus; progress?: number };
export const kpiMoney = (value: number | null, currency: string, locale: string, unavailable: string) => value === null ? unavailable : new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }).format(value);

export function buildPettyCashKpiCards(selection: PettyCashKpiSelection, aggregates: Record<string, KpiMonetaryAggregate>, copy: PettyCashKpiCopy, currency: string, locale: string): PettyCashKpiCard[] {
  const money = (key: string) => kpiMoney(completeAmount(aggregates[key]), currency, locale, copy.unavailable);
  const native = (key: string) => aggregates[key]?.nativeTotals.map(item => kpiMoney(item.amount, item.currency, locale, copy.unavailable)).join(' / ') || '';
  const count = (value: number, label: string) => `${value.toLocaleString(locale)} ${label}`;
  return [
    { key: 'funded', title: copy.funded, value: money('funded'), helper: native('funded'), description: copy.fundedHelp, icon: <WalletCards /> },
    { key: 'captured', title: copy.captured, value: money('captured'), helper: count(selection.validLines.length, copy.purchases), description: copy.capturedHelp, icon: <ReceiptText />, focus: 'all' },
    { key: 'authorized', title: copy.authorized, value: money('authorized'), helper: count(selection.authorizedLines.length, copy.purchases), description: copy.authorizedHelp, icon: <BadgeCheck /> },
    { key: 'pending', title: copy.pending, value: money('pending'), helper: count(selection.pendingLines.length, copy.purchases), description: copy.pendingHelp, icon: <ClipboardList />, focus: 'pending' },
    { key: 'balance', title: copy.balance, value: money('balance'), helper: `${count(selection.currentFunds.length, copy.funds)} · ${native('balance')}`, description: copy.balanceHelp, icon: <Landmark />, focus: 'negative' },
    { key: 'shortage', title: copy.shortage, value: money('shortage'), helper: native('shortage'), description: copy.shortageHelp, icon: <AlertTriangle />, focus: 'shortage' },
    { key: 'evidence', title: copy.evidence, value: selection.evidencePercent === null ? '—' : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(selection.evidencePercent / 100), helper: selection.validLines.length ? `${count(selection.validLines.length - selection.withoutEvidence.length, copy.purchases)} / ${selection.validLines.length.toLocaleString(locale)}` : copy.noSample, description: copy.evidenceHelp, icon: <FileCheck2 />, progress: selection.evidencePercent ?? undefined, focus: 'missing' },
    { key: 'open', title: copy.open, value: selection.openStatements.length.toLocaleString(locale), helper: count(selection.statements.length, copy.statements), description: copy.openHelp, icon: <ClipboardList />, focus: 'open' },
  ];
}

export function KpiSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3>{description ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}<div className="mt-5">{children}</div></section>;
}

export function PettyCashKpiOverview({ cards, copy, selection, onFocus }: { cards: PettyCashKpiCard[]; copy: PettyCashKpiCopy; selection: PettyCashKpiSelection; onFocus: (focus: DetailFocus) => void }) {
  return <div className="grid gap-6"><section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <article key={card.key} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] [&>svg]:h-5 [&>svg]:w-5 dark:text-emerald-300">{card.icon}</span><h3 className="pt-1 text-sm font-medium text-slate-600 dark:text-slate-200">{card.title}</h3></div>
    <p className="mt-4 break-words text-2xl font-medium text-slate-950 dark:text-white">{card.value}</p>
    {card.progress !== undefined ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full bg-[#147514]" style={{ width: `${card.progress}%` }} /></div> : null}
    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{card.helper}</p><p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
    {card.focus ? <button type="button" onClick={() => onFocus(card.focus!)} className="mt-4 self-start rounded text-sm font-medium text-[#147514] hover:underline focus-visible:ring-2 focus-visible:ring-[#147514] dark:text-emerald-300">{copy.viewDetail}</button> : null}
  </article>)}</section>
    <KpiSection title={copy.attention} description={copy.evidenceNote}><div className="flex flex-wrap gap-3">{([
      ['pending', copy.pending, selection.pendingLines.length], ['missing', copy.missing, selection.withoutEvidence.length], ['negative', copy.negative, selection.negativeFunds.length], ['open', copy.open, selection.openStatements.length],
    ] as const).map(([focus, label, count]) => <button key={focus} type="button" onClick={() => onFocus(focus)} className="rounded-xl border border-[#147514]/20 bg-[#147514]/5 px-4 py-3 text-sm text-[#147514] hover:bg-[#147514]/10 focus-visible:ring-2 focus-visible:ring-[#147514] dark:text-emerald-300">{label}: <span className="font-medium">{count}</span></button>)}</div></KpiSection>
  </div>;
}

export function PettyCashKpiAnalysis({ selection, groups, aggregates, copy, currency, locale }: { selection: PettyCashKpiSelection; groups: ReturnType<typeof buildPettyCashKpiQueries>; aggregates: Record<string, KpiMonetaryAggregate>; copy: PettyCashKpiCopy; currency: string; locale: string }) {
  const money = (value: number | null) => kpiMoney(value, currency, locale, copy.unavailable);
  const captured = completeAmount(aggregates.captured);
  const authorized = completeAmount(aggregates.authorized);
  const pending = completeAmount(aggregates.pending);
  const hasComposition = captured !== null && captured > 0 && authorized !== null && pending !== null;
  const trend = groups.periods.map(period => ({ period: period.key, captured: completeAmount(aggregates[`period:${period.key}:captured`]), authorized: completeAmount(aggregates[`period:${period.key}:authorized`]) }));
  return <div className="grid gap-6 lg:grid-cols-2">
    <KpiSection title={copy.composition} description={copy.compositionHelp}>
      <dl className="grid grid-cols-2 gap-4">{[[copy.authorized, authorized], [copy.pending, pending]].map(([label, value]) => <div key={String(label)}><dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt><dd className="mt-2 text-xl font-medium text-slate-950 dark:text-white">{money(value as number | null)}</dd></div>)}</dl>
      {hasComposition ? <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" aria-hidden="true"><div className="bg-[#147514]" style={{ width: `${Math.min(100, authorized / captured * 100)}%` }} /><div className="bg-amber-400" style={{ width: `${Math.min(100, pending / captured * 100)}%` }} /></div> : <p className="mt-6 text-sm text-slate-500">{captured === 0 ? copy.noSample : copy.unavailable}</p>}
      {hasComposition ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{copy.authorized}: {new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(authorized / captured)}</p> : null}
    </KpiSection>
    <KpiSection title={copy.evidence} description={copy.evidenceNote}><p className="text-3xl font-medium text-[#147514] dark:text-emerald-300">{selection.evidencePercent === null ? '—' : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(selection.evidencePercent / 100)}</p><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{copy.missing}: {selection.withoutEvidence.length} / {selection.validLines.length} {copy.purchases}</p></KpiSection>
    <div className="min-w-0 lg:col-span-2"><KpiSection title={copy.trend} description={copy.trendHelp}>
      {trend.length ? <><div className="overflow-x-auto"><div style={{ minWidth: Math.max(480, trend.length * 70), height: 300 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={value => new Intl.NumberFormat(locale, { notation: 'compact' }).format(Number(value))} /><Tooltip formatter={value => money(typeof value === 'number' ? value : null)} /><Legend /><Bar name={copy.captured} dataKey="captured" fill="#59C3A5" radius={[4, 4, 0, 0]} /><Bar name={copy.authorized} dataKey="authorized" fill="#147514" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <details className="mt-4 text-sm text-slate-600 dark:text-slate-300"><summary className="cursor-pointer rounded py-2 focus-visible:ring-2 focus-visible:ring-[#147514]">{copy.viewDetail}</summary><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{[copy.period, copy.captured, copy.authorized].map(label => <th className="p-2 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{trend.map(row => <tr key={row.period}><td className="p-2">{row.period}</td><td className="p-2">{money(row.captured)}</td><td className="p-2">{money(row.authorized)}</td></tr>)}</tbody></table></div></details></> : <p className="py-12 text-center text-sm text-slate-500">{copy.empty}</p>}
    </KpiSection></div>
  </div>;
}
