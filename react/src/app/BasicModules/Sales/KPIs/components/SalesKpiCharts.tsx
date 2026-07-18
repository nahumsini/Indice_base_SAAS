import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import type { SalesKpisTranslations } from '../translations';

type ChartRow = { label: string; value: number };

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <article className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
      <div className="mt-4 h-64">{children}</div>
    </article>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
      0 {label.toLocaleLowerCase()}
    </div>
  );
}

export function SalesKpiCharts({
  copy,
  funnel,
  sellerComparison,
  trend,
}: {
  copy: SalesKpisTranslations;
  funnel: ChartRow[];
  sellerComparison: Array<{ label: string; quotes: number; wins: number }>;
  trend: ChartRow[];
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <ChartCard title={copy.cards.pipeline.label} subtitle={copy.signals.subtitle}>
        {funnel.some((row) => row.value > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={94} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(255,107,94,.06)' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {funnel.map((row, index) => <Cell key={row.label} fill={['#FF6B5E', '#F4C84A', '#59C3A5', '#2563EB'][index % 4]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart label={copy.context.records} />}
      </ChartCard>

      <ChartCard title={copy.cards.salesRevenue.label} subtitle={copy.cards.averageTicket.detail}>
        {trend.some((row) => row.value > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={52} />
              <Tooltip cursor={{ fill: 'rgba(255,107,94,.06)' }} />
              <Bar dataKey="value" fill="#FF6B5E" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart label={copy.context.records} />}
      </ChartCard>

      <ChartCard title={copy.sellerTable.title} subtitle={copy.sellerTable.subtitle}>
        {sellerComparison.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sellerComparison} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip cursor={{ fill: 'rgba(37,99,235,.05)' }} />
              <Bar name={copy.cards.quotes.label} dataKey="quotes" fill="#F4C84A" radius={[6, 6, 0, 0]} />
              <Bar name={copy.sellerTable.columns.closed} dataKey="wins" fill="#59C3A5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart label={copy.context.records} />}
      </ChartCard>
    </section>
  );
}
