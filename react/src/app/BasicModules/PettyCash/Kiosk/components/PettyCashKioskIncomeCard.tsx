import type { PublicPettyCashIncomeMovement } from '../pettyCashKioskApi';

interface PettyCashKioskIncomeCardProps {
  amount: string;
  date: string;
  movement: PublicPettyCashIncomeMovement;
  noReferenceLabel: string;
  referenceLabel: string;
  title: string;
}

export function PettyCashKioskIncomeCard({
  amount,
  date,
  movement,
  noReferenceLabel,
  referenceLabel,
  title,
}: PettyCashKioskIncomeCardProps) {
  return (
    <article className="w-full rounded-2xl border border-[#147514]/20 bg-white p-3 shadow-[0_12px_28px_-28px_rgba(15,23,42,0.9)] dark:border-emerald-400/20 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-emerald-700/70 dark:text-emerald-300/70">{date}</p>
          <h3 className="mt-1 truncate text-sm font-medium leading-5 text-slate-950 dark:text-white">{title}</h3>
        </div>
        <p className="shrink-0 text-sm font-medium text-[#147514] dark:text-emerald-300">{amount}</p>
      </div>

      <div className="mt-2 rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900">
        <p className="text-xs font-medium text-slate-400">{referenceLabel}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{movement.reference || noReferenceLabel}</p>
      </div>
    </article>
  );
}
