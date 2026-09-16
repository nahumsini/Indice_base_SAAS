import type { ReactNode } from 'react';

export type SalesKpiChartRow = { label: string; value: number; detail?: string };

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3>
    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    <div className="mt-5 space-y-4">{children}</div>
  </section>;
}

function Bars({ rows, empty }: { rows: SalesKpiChartRow[]; empty: string }) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  if (!rows.length || max === 0) return <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-700">{empty}</p>;
  return <div className="space-y-3">{rows.map((row) => <div key={row.label} className="grid grid-cols-[minmax(7rem,1fr)_minmax(8rem,2fr)_auto] items-center gap-3 text-sm">
    <span className="truncate text-slate-700 dark:text-slate-200" title={row.label}>{row.label}</span>
    <span className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><span className="block h-full rounded-full bg-[#FF6B5E]" style={{ width: `${max ? Math.max(3, (row.value / max) * 100) : 0}%` }} /></span>
    <span className="min-w-10 text-right font-medium text-slate-950 dark:text-white" title={row.detail}>{row.detail ?? row.value.toLocaleString()}</span>
  </div>)}</div>;
}

export function SalesKpiWorkspaceCharts({ funnel, trend, quoteStatus, labels, empty }: {
  funnel: SalesKpiChartRow[];
  trend: SalesKpiChartRow[];
  quoteStatus: SalesKpiChartRow[];
  labels: { funnel: string; funnelHelp: string; trend: string; trendHelp: string; quoteStatus: string; quoteStatusHelp: string };
  empty: string;
}) {
  return <div className="grid gap-6 xl:grid-cols-2">
    <ChartCard title={labels.funnel} description={labels.funnelHelp}><Bars rows={funnel} empty={empty} /></ChartCard>
    <ChartCard title={labels.trend} description={labels.trendHelp}><Bars rows={trend} empty={empty} /></ChartCard>
    <div className="xl:col-span-2"><ChartCard title={labels.quoteStatus} description={labels.quoteStatusHelp}><Bars rows={quoteStatus} empty={empty} /></ChartCard></div>
  </div>;
}
