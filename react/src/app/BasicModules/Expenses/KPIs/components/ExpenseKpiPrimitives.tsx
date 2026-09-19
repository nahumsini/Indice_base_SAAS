import type { ReactNode } from 'react';

export function MetricCard({ title, value, helper, description, icon, progress, onAction, actionLabel }: {
  title: string; value: string; helper: string; description: string; icon: ReactNode;
  progress?: number; onAction?: () => void; actionLabel?: string;
}) {
  return <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] [&>svg]:h-5 [&>svg]:w-5 dark:text-emerald-300">{icon}</span><h3 className="pt-1 text-sm font-medium text-slate-600 dark:text-slate-200">{title}</h3></div>
    <p className="mt-4 break-words text-2xl font-medium tracking-tight text-slate-950 dark:text-white">{value}</p>
    {typeof progress === 'number' ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full bg-[#147514]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div> : null}
    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    {onAction ? <button type="button" onClick={onAction} className="mt-4 self-start rounded text-sm font-medium text-[#147514] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514] dark:text-emerald-300">{actionLabel}</button> : null}
  </article>;
}

export function SectionCard({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3>
    {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
    <div className="mt-5">{children}</div>
  </section>;
}
