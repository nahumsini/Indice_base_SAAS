import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

export type SalesKpiCardTone = 'blue' | 'coral' | 'green' | 'yellow' | 'red' | 'slate';

const toneClasses: Record<SalesKpiCardTone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200',
  coral: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FFB0AA]/25 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
  red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200',
  slate: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export type SalesKpiCardItem = {
  actionLabel?: string;
  context?: string;
  detail: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  tone?: SalesKpiCardTone;
  value: string;
};

export function SalesKpiCard({ actionLabel, context, detail, icon: Icon, label, onClick, tone = 'coral', value }: SalesKpiCardItem) {
  const content = <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-normal text-slate-950 dark:text-white">{value}</p>
      {context ? <p className="mt-1 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{context}</p> : null}
      <p className="mt-2 min-h-[40px] text-sm leading-5 text-slate-600 dark:text-slate-300">{detail}</p>
      {actionLabel ? <p className="mt-3 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA]">{actionLabel} →</p> : null}
    </>;
  return onClick
    ? <button type="button" onClick={onClick} aria-label={`${label}: ${actionLabel ?? value}`} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#FF6B5E]/50 hover:bg-[#FF6B5E]/5 focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-slate-800 dark:bg-slate-900">{content}</button>
    : <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">{content}</article>;
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
