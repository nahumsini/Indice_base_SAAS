import {
  CheckCircle2,
  Copy,
  Eye,
  HandCoins,
  Loader2,
  MoreHorizontal,
  Pencil,
  Printer,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';
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
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#147514]/30 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

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
    <div className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-1 dark:border-slate-700 dark:bg-slate-900/60">
      {showView ? (
        <ActionButton label={detailCopy.title} onClick={onView}>
          <Eye className="h-4 w-4" />
        </ActionButton>
      ) : null}
      {showRecordPayment ? (
        <ActionButton label={t.expenses.payment.action} onClick={() => onRecordPayment(expenseId)}>
          <HandCoins className="h-4 w-4" />
        </ActionButton>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label={t.common.actions} className={tableActionButtonBaseClass} title={t.common.actions} type="button">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
          <DropdownMenuItem onClick={onStartEdit} className="rounded-lg py-2">
            <Pencil />
            {t.common.edit}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPrint} className="rounded-lg py-2">
            <Printer />
            {detailCopy.printVoucher}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(expenseId)} className="rounded-lg py-2">
            <Copy />
            {t.common.duplicate}
          </DropdownMenuItem>
          {showMarkPaid ? (
            <DropdownMenuItem onClick={() => onMarkPaid(expenseId)} className="rounded-lg py-2">
              <CheckCircle2 />
              {t.expenses.rowActions.markPaid}
            </DropdownMenuItem>
          ) : null}
          {showAudit ? (
            <DropdownMenuItem onClick={() => onAudit(expenseId)} className="rounded-lg py-2">
              <ShieldCheck />
              {t.statuses.audited}
            </DropdownMenuItem>
          ) : null}
          {showDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg py-2"
                disabled={isDeletePending}
                onClick={() => onDelete(expenseId)}
                variant="destructive"
              >
                {isDeletePending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {t.expenses.rowActions.deleteExpense}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ActionButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} className={tableActionButtonBaseClass} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}
