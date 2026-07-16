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
    <article className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700/70 dark:text-emerald-300/70">{date}</p>
          <h3 className="mt-1 truncate text-sm font-black leading-5 text-slate-900 dark:text-white">{title}</h3>
        </div>
        <p className="shrink-0 text-sm font-black text-sky-600 dark:text-sky-300">{amount}</p>
      </div>

      <div className="mt-2 rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900">
        <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">{referenceLabel}</p>
        <p className="mt-0.5 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{movement.reference || noReferenceLabel}</p>
      </div>
    </article>
  );
}
