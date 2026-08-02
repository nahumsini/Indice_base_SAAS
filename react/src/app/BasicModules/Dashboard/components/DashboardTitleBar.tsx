import type { ReactNode } from 'react';
import { LearningModeTitleBarBridge } from '../../../learningMode';

interface DashboardTitleBarProps {
  actions?: ReactNode;
  emoji: string;
  helper?: string;
  subtitle: string;
  title: string;
}

export function DashboardTitleBar({ actions, emoji, helper, subtitle, title }: DashboardTitleBarProps) {
  return (
    <LearningModeTitleBarBridge actions={actions}>
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/70 dark:bg-blue-900/10 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-xl shadow-sm dark:border-blue-800 dark:bg-slate-900">
              {emoji}
            </span>
            <div>
              <h2 className="text-xl font-medium text-slate-950 dark:text-white sm:text-2xl">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
              {helper ? <p className="mt-2 text-sm leading-6 text-blue-700 dark:text-blue-200">{helper}</p> : null}
            </div>
          </div>
          {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
        </div>
      </section>
    </LearningModeTitleBarBridge>
  );
}
