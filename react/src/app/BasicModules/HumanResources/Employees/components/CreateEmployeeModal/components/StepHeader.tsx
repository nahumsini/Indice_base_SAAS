import type { LucideIcon } from 'lucide-react';

interface StepHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function StepHeader({ icon: Icon, title, description }: StepHeaderProps) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-blue-500/10 dark:text-blue-300">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-base font-medium text-slate-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
