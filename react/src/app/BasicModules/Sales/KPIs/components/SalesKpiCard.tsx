import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

type SalesKpiCardTone = 'blue' | 'coral' | 'green' | 'yellow' | 'red';

const toneClasses: Record<SalesKpiCardTone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200',
  coral: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FFB0AA]/25 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
  red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200',
};

export type SalesKpiCardItem = {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone?: SalesKpiCardTone;
  value: string;
};

export function SalesKpiCard({ detail, icon: Icon, label, tone = 'coral', value }: SalesKpiCardItem) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-normal text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 min-h-[40px] text-sm leading-5 text-slate-600 dark:text-slate-300">{detail}</p>
    </article>
  );
}

export function SalesKpiGrid({ items }: { items: SalesKpiCardItem[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <SalesKpiCard key={item.label} {...item} />
      ))}
    </section>
  );
}
