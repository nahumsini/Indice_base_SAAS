import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';

export interface OperationalViewOption<TView extends string> {
  id: TView;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface OperationalViewSwitcherProps<TView extends string> {
  ariaLabel: string;
  options: ReadonlyArray<OperationalViewOption<TView>>;
  value: TView;
  onChange: (view: TView) => void;
}

export function OperationalViewSwitcher<TView extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: OperationalViewSwitcherProps<TView>) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section className="mb-5 flex justify-start">
      <div
        aria-label={ariaLabel}
        className="inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {options.map((option) => {
          const isActive = option.id === value;

          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={option.disabled}
              onClick={() => onChange(option.id)}
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                isActive
                  ? 'bg-[#59C3A5] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/70',
              )}
            >
              {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
