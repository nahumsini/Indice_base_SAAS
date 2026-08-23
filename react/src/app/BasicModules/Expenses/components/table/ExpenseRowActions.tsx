import {
  CheckCircle2,
  Copy,
  Eye,
  HandCoins,
  Loader2,
  Pencil,
  Printer,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../../../components/ui/utils';
import { getExpenseDetailCopy } from '../../Expenses/components/expenseDetail.copy';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';

type ExpenseRowActionsProps = {
  expenseId: string;
  onAudit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onMarkPaid: (expenseId: string) => void;
  onPrint: () => void;
  onRecordPayment: (expenseId: string) => void;
  onStartEdit: () => void;
  onView: () => void;
  isDeletePending?: boolean;
  showAudit?: boolean;
  showDelete?: boolean;
  showMarkPaid?: boolean;
  showRecordPayment?: boolean;
  showView?: boolean;
};

const tableActionButtonBaseClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function ExpenseRowActions({
  expenseId,
  onAudit,
  onDelete,
  onDuplicate,
  onMarkPaid,
  onPrint,
  onRecordPayment,
  onStartEdit,
  onView,
  isDeletePending = false,
  showAudit = true,
  showDelete = true,
  showMarkPaid = true,
  showRecordPayment = true,
  showView = true,
}: ExpenseRowActionsProps) {
  const t = useExpensesTranslations();
  const detailCopy = getExpenseDetailCopy(useExpensesResolvedLocale());

  return (
    <div className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
      {showView ? (
        <ActionButton
          className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
          label={detailCopy.title}
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </ActionButton>
      ) : null}
      {showRecordPayment ? (
        <ActionButton
          className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
          label={t.expenses.payment.action}
          onClick={() => onRecordPayment(expenseId)}
        >
          <HandCoins className="h-4 w-4" />
        </ActionButton>
      ) : null}
      {showMarkPaid ? (
        <ActionButton
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          label={t.expenses.rowActions.markPaid}
          onClick={() => onMarkPaid(expenseId)}
        >
          <CheckCircle2 className="h-4 w-4" />
        </ActionButton>
      ) : null}
      <ActionButton
        className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
        label={t.common.edit}
        onClick={onStartEdit}
      >
        <Pencil className="h-4 w-4" />
      </ActionButton>
      <ActionButton
        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        label={detailCopy.printVoucher}
        onClick={onPrint}
      >
        <Printer className="h-4 w-4" />
      </ActionButton>
      <ActionButton
        className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
        label={t.common.duplicate}
        onClick={() => onDuplicate(expenseId)}
      >
        <Copy className="h-4 w-4" />
      </ActionButton>
      {showAudit ? (
        <ActionButton
          className="border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/60 dark:text-cyan-300 dark:hover:bg-cyan-900/60"
          label={t.statuses.audited}
          onClick={() => onAudit(expenseId)}
        >
          <ShieldCheck className="h-4 w-4" />
        </ActionButton>
      ) : null}
      {showDelete ? (
        <ActionButton
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
          disabled={isDeletePending}
          label={t.expenses.rowActions.deleteExpense}
          onClick={() => onDelete(expenseId)}
        >
          {isDeletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </ActionButton>
      ) : null}
    </div>
  );
}

function ActionButton({
  children,
  className,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(tableActionButtonBaseClass, className)}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
