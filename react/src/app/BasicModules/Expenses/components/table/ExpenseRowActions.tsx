import { CheckCircle2, Copy, FilePlus2, HandCoins, Loader2, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

type ExpenseRowActionsProps = {
  expenseId: string;
  onAudit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onMarkPaid: (expenseId: string) => void;
  onRecordPayment: (expenseId: string) => void;
  onStartEdit: () => void;
  onCreatePayable?: (expenseId: string) => void;
  isDeletePending?: boolean;
  showCreatePayable?: boolean;
  showAudit?: boolean;
  showMarkPaid?: boolean;
  showRecordPayment?: boolean;
};

const tableActionButtonBaseClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-sm';

export function ExpenseRowActions({
  expenseId,
  onAudit,
  onDelete,
  onDuplicate,
  onMarkPaid,
  onRecordPayment,
  onStartEdit,
  onCreatePayable,
  isDeletePending = false,
  showCreatePayable = false,
  showAudit = true,
  showMarkPaid = true,
  showRecordPayment = true,
}: ExpenseRowActionsProps) {
  const t = useFinanceTranslations();

  return (
    <div className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <ActionButton label={t.common.duplicate} colorClass="border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300" onClick={() => onDuplicate(expenseId)}>
        <Copy className="h-4 w-4 text-blue-600" />
      </ActionButton>
      <ActionButton
        label={t.common.delete}
        colorClass="border-rose-100 bg-rose-50/60 text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20"
        disabled={isDeletePending}
        onClick={() => onDelete(expenseId)}
      >
        {isDeletePending ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4 text-red-600" />}
      </ActionButton>
      <ActionButton label={t.common.edit} colorClass="border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300" onClick={onStartEdit}>
        <Pencil className="h-4 w-4 text-amber-600" />
      </ActionButton>
      {showCreatePayable && onCreatePayable ? (
        <ActionButton label="Crear CxP" colorClass="border-cyan-200 bg-cyan-50/80 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300" onClick={() => onCreatePayable(expenseId)}>
          <FilePlus2 className="h-4 w-4 text-cyan-600" />
        </ActionButton>
      ) : null}
      {showRecordPayment && (
        <ActionButton label={t.expenses.payment.action} colorClass="border-sky-200 bg-sky-50/80 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300" onClick={() => onRecordPayment(expenseId)}>
          <HandCoins className="h-4 w-4 text-sky-600" />
        </ActionButton>
      )}
      {showMarkPaid && (
        <ActionButton label={t.statuses.paid} colorClass="border-[#147514]/25 bg-[#147514]/12 text-[#147514] hover:bg-[#147514]/18 dark:border-[#147514]/35 dark:bg-[#147514]/15" onClick={() => onMarkPaid(expenseId)}>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </ActionButton>
      )}
      {showAudit && (
        <ActionButton label={t.statuses.audited} colorClass="border-violet-200 bg-violet-50/80 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300" onClick={() => onAudit(expenseId)}>
          <ShieldCheck className="h-4 w-4 text-violet-600" />
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  children,
  colorClass,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  colorClass: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`${tableActionButtonBaseClass} ${colorClass} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
