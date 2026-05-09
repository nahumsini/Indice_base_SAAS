import { type ReactNode } from 'react';

export interface KioskFormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function KioskFormSection({ title, description, children }: KioskFormSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div>
        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
