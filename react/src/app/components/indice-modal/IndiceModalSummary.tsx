import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export type IndiceModalSummaryItem = {
  emphasized?: boolean;
  id?: string;
  label: ReactNode;
  value: ReactNode;
};

export type IndiceModalSummaryColumns = 2 | 3 | 4;
export type IndiceModalSummaryVariant = 'accent' | 'muted' | 'plain' | 'success';

export type IndiceModalSummaryProps = {
  className?: string;
  columns?: IndiceModalSummaryColumns;
  description?: ReactNode;
  icon?: ReactNode;
  items: readonly IndiceModalSummaryItem[];
  title?: ReactNode;
  variant?: IndiceModalSummaryVariant;
};

const columnStyles: Record<IndiceModalSummaryColumns, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

const variantStyles: Record<IndiceModalSummaryVariant, { container: string; divider: string; heading: string }> = {
  accent: {
    container: 'border-[#FF6B5E]/20 bg-[#FF6B5E]/5',
    divider: 'border-[#FF6B5E]/20',
    heading: 'text-slate-900 dark:text-white',
  },
  muted: {
    container: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60',
    divider: 'border-slate-200 dark:border-slate-700',
    heading: 'text-slate-900 dark:text-white',
  },
  plain: {
    container: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
    divider: 'border-slate-200 dark:border-slate-700',
    heading: 'text-slate-900 dark:text-white',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20',
    divider: 'border-emerald-200 dark:border-emerald-800',
    heading: 'text-emerald-800 dark:text-emerald-200',
  },
};

export function IndiceModalSummary({
  className,
  columns = 3,
  description,
  icon,
  items,
  title,
  variant = 'plain',
}: IndiceModalSummaryProps) {
  const variantStyle = variantStyles[variant];
  const hasHeading = Boolean(title || description || icon);

  return (
    <section className={cn('rounded-2xl border p-4', variantStyle.container, className)}>
      {hasHeading ? (
        <div className="flex items-start gap-2">
          {icon ? <span className={cn('mt-0.5 shrink-0', variantStyle.heading)} aria-hidden="true">{icon}</span> : null}
          <div className="min-w-0">
            {title ? <h3 className={cn('text-sm font-medium', variantStyle.heading)}>{title}</h3> : null}
            {description ? <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p> : null}
          </div>
        </div>
      ) : null}
      <dl className={cn('grid gap-x-5 gap-y-4', columnStyles[columns], hasHeading && 'mt-4 border-t pt-4', hasHeading && variantStyle.divider)}>
        {items.map((item, index) => (
          <div key={item.id ?? index} className="min-w-0 px-1 py-1">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
              <dd className={cn('mt-1 truncate text-sm text-slate-950 dark:text-white', item.emphasized ? 'font-medium' : 'font-normal')}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
