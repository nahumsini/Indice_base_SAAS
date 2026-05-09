import type { ReactNode } from 'react';
import { cn } from '../../../../../../components/ui/utils';

interface FieldGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FieldGroup({ title, description, children, className }: FieldGroupProps) {
  return (
    <section
      className={cn(
        'rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45',
        className,
      )}
    >
      <div className="mb-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}
