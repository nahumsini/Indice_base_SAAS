import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';
import { financeSoftSurfaceClass } from '../constants/receivables.constants';

interface ReceivablesTitleBarProps {
  actions?: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
}

export function ReceivablesTitleBar({
  actions,
  icon,
  subtitle,
  title,
}: ReceivablesTitleBarProps) {
  return (
    <section className={cn('mb-5 rounded-lg border p-6 shadow-sm', financeSoftSurfaceClass)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            <span className="inline-flex shrink-0 items-center justify-center text-3xl leading-none [&>*]:text-3xl">
              {icon}
            </span>
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
