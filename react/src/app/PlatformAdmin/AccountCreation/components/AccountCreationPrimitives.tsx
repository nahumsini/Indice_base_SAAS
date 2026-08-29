import type { LucideIcon } from "lucide-react";

export const accountControlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800";

export function AccountField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function AccountStepTitle({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f5f2] text-[#177D66]">
        <Icon className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#177D66] text-[10px] font-medium text-white">
          {number}
        </span>
      </span>
      <div>
        <h3 className="font-medium text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}
