import { CheckCircle2, Copy, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

type ExpenseRowActionsProps = {
  expenseId: string;
  onAudit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onMarkPaid: (expenseId: string) => void;
  onStartEdit: () => void;
  showAudit?: boolean;
  showMarkPaid?: boolean;
};

const tableActionButtonBaseClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-sm';

export function ExpenseRowActions({
  expenseId,
  onAudit,
  onDelete,
  onDuplicate,
  onMarkPaid,
  onStartEdit,
  showAudit = true,
  showMarkPaid = true,
}: ExpenseRowActionsProps) {
  return (
    <div className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <ActionButton label="Duplicar" colorClass="border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300" onClick={() => onDuplicate(expenseId)}>
        <Copy className="h-4 w-4 text-blue-600" />
      </ActionButton>
      <ActionButton label="Eliminar" colorClass="border-rose-100 bg-rose-50/60 text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20" onClick={() => onDelete(expenseId)}>
        <Trash2 className="h-4 w-4 text-red-600" />
      </ActionButton>
      <ActionButton label="Editar" colorClass="border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300" onClick={onStartEdit}>
        <Pencil className="h-4 w-4 text-amber-600" />
      </ActionButton>
      {showMarkPaid && (
        <ActionButton label="Marcar como pagado" colorClass="border-[#147514]/25 bg-[#147514]/12 text-[#147514] hover:bg-[#147514]/18 dark:border-[#147514]/35 dark:bg-[#147514]/15" onClick={() => onMarkPaid(expenseId)}>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </ActionButton>
      )}
      {showAudit && (
        <ActionButton label="Auditar" colorClass="border-violet-200 bg-violet-50/80 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300" onClick={() => onAudit(expenseId)}>
          <ShieldCheck className="h-4 w-4 text-violet-600" />
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  children,
  colorClass,
  label,
  onClick,
}: {
  children: ReactNode;
  colorClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`${tableActionButtonBaseClass} ${colorClass}`} title={label} aria-label={label} type="button">
      {children}
    </button>
  );
}
