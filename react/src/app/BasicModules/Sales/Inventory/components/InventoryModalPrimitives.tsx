import type { ReactNode } from 'react';
import { cn } from '../../../../components/ui/utils';

export const inventoryModalControlClassName = 'h-11 rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export function InventoryModalField({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: ReactNode;
}) {
  return (
    <label className={cn('grid gap-2', className)}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

export function InventoryModalSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40', className)}>
      {title || description ? (
        <div className="mb-4">
          {title ? <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm font-normal leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
