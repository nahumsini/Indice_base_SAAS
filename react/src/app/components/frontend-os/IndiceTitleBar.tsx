import type { ReactNode } from 'react';
import { LearningModeTitleBarBridge } from '../../learningMode';
import { MODULE_COLORS, type IndiceModuleTone } from '../../styles/moduleColors';
import { cn } from '../ui/utils';

interface IndiceTitleBarProps {
  actions?: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  icon: ReactNode;
  subtitle: ReactNode;
  title: ReactNode;
  tone: IndiceModuleTone;
}

/** Shared presentation primitive for every tab-level operational title bar. */
export function IndiceTitleBar({
  actions,
  className,
  eyebrow,
  icon,
  subtitle,
  title,
  tone,
}: IndiceTitleBarProps) {
  const theme = MODULE_COLORS[tone];
  const actionLayout = actions ? (
    <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
      {actions}
    </div>
  ) : undefined;

  return (
    <LearningModeTitleBarBridge actions={actionLayout}>
      <section className={cn(
        'rounded-xl border p-5 shadow-sm',
        theme.lightBg,
        theme.darkBg,
        theme.border,
        theme.darkBorder,
        className,
      )}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white/90 text-xl leading-none shadow-sm dark:bg-slate-900',
              theme.border,
              theme.darkBorder,
              theme.text,
              theme.darkText,
            )} aria-hidden="true">
              {icon}
            </span>
            <div className="min-w-0">
              {eyebrow ? (
                <p className={cn('mb-1 text-xs font-semibold uppercase tracking-[0.08em]', theme.text, theme.darkText)}>{eyebrow}</p>
              ) : null}
              <h2 className="text-xl font-bold leading-tight text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-1 max-w-3xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">{subtitle}</p>
            </div>
          </div>
          {actionLayout}
        </div>
      </section>
    </LearningModeTitleBarBridge>
  );
}
