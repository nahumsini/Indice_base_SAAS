import type { ReactNode } from 'react';

export const salesFieldClassName = 'h-11 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</label>
      {children}
    </div>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</h3>;
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-4">
        <SectionTitle title={title} />
        {description ? <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
