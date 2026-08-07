import type { ReactNode } from 'react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';

export const inventoryModalControlClassName = 'h-11 rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export type InventoryModalAction = {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
};

export function InventoryModalActionToolbar({ actions }: { actions: InventoryModalAction[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar">
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          title={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          className={cn(
            'h-9 gap-2 rounded-xl px-3 text-sm font-medium shadow-sm',
            action.tone === 'primary' && 'bg-[#FF6B5E] text-[#222831] hover:bg-[#ff8277]',
            action.tone === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
            !action.tone && 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
          )}
          variant={action.tone === 'primary' || action.tone === 'danger' ? 'default' : 'outline'}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export function sortInventoryOptions<T extends { label: string }>(options: T[]) {
  return [...options].sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
}

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
          {title ? <h3 className="text-base font-medium text-slate-950 dark:text-white">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm font-normal leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
