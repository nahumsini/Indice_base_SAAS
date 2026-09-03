import type { ReactNode } from 'react';
import { Handshake } from 'lucide-react';
import { cn } from '../../../components/ui/utils';

export const squareSetupButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#FF6B5E]/30 bg-white px-4 text-sm font-medium text-[#B63B32] shadow-sm transition hover:border-[#FF6B5E]/50 hover:bg-[#FFF3F1] focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/10';
export const squareSetupSelectClass = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800';

export function SquareSetupSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFAAA2]" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p>
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function PaymentProviderCard({
  actionLabel,
  badge,
  brand,
  description,
  disabled = false,
  logo,
  onSelect,
}: {
  actionLabel: string;
  badge: string;
  brand: string;
  description: string;
  disabled?: boolean;
  logo: ReactNode;
  onSelect?: () => void;
}) {
  return (
    <article className={cn(
      'flex min-h-[15rem] flex-col rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-slate-900',
      disabled
        ? 'border-slate-200 opacity-80 dark:border-slate-700'
        : 'border-[#FF6B5E]/30 hover:-translate-y-0.5 hover:border-[#FF6B5E]/60 hover:shadow-md',
    )}>
      <div className="flex items-start justify-between gap-3">
        {logo}
        <span className={cn(
          'rounded-full px-2.5 py-1 text-xs font-medium',
          disabled
            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        )}>
          {badge}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-medium text-slate-950 dark:text-white">{brand}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p>
      <button
        type="button"
        className={cn(squareSetupButtonClass, 'mt-5 w-full', !disabled && 'border-[#FF6B5E] bg-[#FF6B5E] text-[#222831] hover:bg-[#F45D50]')}
        disabled={disabled}
        onClick={onSelect}
      >
        {actionLabel}
      </button>
    </article>
  );
}

export function SquareBrandMark() {
  return (
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#111827] shadow-sm" aria-hidden="true">
      <span className="grid h-8 w-8 place-items-center rounded-lg border-[3px] border-white">
        <span className="h-3 w-3 rounded-[3px] bg-white" />
      </span>
    </span>
  );
}

export function MercadoPagoBrandMark() {
  return (
    <span className="grid h-14 w-14 place-items-center rounded-full bg-[#D9F0FF] text-[#1675A9] shadow-sm" aria-hidden="true">
      <Handshake className="h-8 w-8" strokeWidth={1.8} />
    </span>
  );
}
