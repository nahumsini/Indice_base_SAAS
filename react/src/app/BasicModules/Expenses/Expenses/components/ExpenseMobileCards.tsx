import { Eye, Search } from 'lucide-react';
import { Checkbox } from '../../../../components/ui/checkbox';
import { ExpenseRowActions } from '../../components/table/ExpenseRowActions';
import { getStatusBadgeColor } from '../../components/table/ExpenseInlineControls';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../hooks/useExpensesTranslations';
import type { Expense } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { canDeleteExpense, canEditExpense, getEffectiveExpenseStatus, isExpenseEffectivelyOverdue } from '../../utils/expenseFilters';
import type { ExpenseRowActionVisibility } from './EditableExpenseRow';
import { getExpenseDetailCopy } from './expenseDetail.copy';
import { printExpenseVoucher } from '../../utils/expensePrintDocument';

type ExpenseMobileCardsProps = {
  actionVisibility?: ExpenseRowActionVisibility;
  emptyMessage: string;
  emptyTitle: string;
  expenses: Expense[];
  carryoverExpenseIds?: ReadonlySet<string>;
  deletingExpenseIds?: Set<string>;
  isSelected: (expenseId: string) => boolean;
  onAudit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onEdit: (expense: Expense) => void;
  onMarkPaid: (expenseId: string) => void;
  onRecordPayment: (expenseId: string) => void;
  onSelectionChange: (expenseId: string, selected: boolean) => void;
  onView: (expense: Expense) => void;
};

export function ExpenseMobileCards({
  actionVisibility,
  emptyMessage,
  emptyTitle,
  expenses,
  carryoverExpenseIds = new Set<string>(),
  deletingExpenseIds = new Set<string>(),
  isSelected,
  onAudit,
  onDelete,
  onDuplicate,
  onEdit,
  onMarkPaid,
  onRecordPayment,
  onSelectionChange,
  onView,
}: ExpenseMobileCardsProps) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-800 md:hidden">
        <Search className="mx-auto mb-3 h-9 w-9 text-slate-300" />
        <p className="text-base font-medium text-slate-800 dark:text-slate-100">{emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 md:hidden">
      {expenses.map(expense => (
        <ExpenseMobileCard
          key={expense.id}
          actionVisibility={actionVisibility}
          expense={expense}
          isCarryover={carryoverExpenseIds.has(expense.id)}
          isDeletePending={deletingExpenseIds.has(expense.id)}
          isSelected={isSelected(expense.id)}
          onAudit={onAudit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onEdit={() => onEdit(expense)}
          onMarkPaid={onMarkPaid}
          onRecordPayment={onRecordPayment}
          onSelectionChange={(selected) => onSelectionChange(expense.id, selected)}
          onView={() => onView(expense)}
        />
      ))}
    </div>
  );
}

function ExpenseMobileCard({
  actionVisibility,
  expense,
  isCarryover,
  isDeletePending,
  isSelected,
  onAudit,
  onDelete,
  onDuplicate,
  onEdit,
  onMarkPaid,
  onRecordPayment,
  onSelectionChange,
  onView,
}: {
  actionVisibility?: ExpenseRowActionVisibility;
  expense: Expense;
  isCarryover: boolean;
  isDeletePending: boolean;
  isSelected: boolean;
  onAudit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onEdit: () => void;
  onMarkPaid: (expenseId: string) => void;
  onRecordPayment: (expenseId: string) => void;
  onSelectionChange: (selected: boolean) => void;
  onView: () => void;
}) {
  const t = useExpensesTranslations();
  const locale = useExpensesResolvedLocale();
  const copy = getExpenseDetailCopy(locale);
  const total = expense.total || expense.amount || 0;
  const paid = expense.amountPaid ?? 0;
  const balance = Math.max(total - paid, 0);
  const effectiveStatus = getEffectiveExpenseStatus(expense);
  const statusLabel = t.expenses.table.statuses[effectiveStatus] ?? effectiveStatus;
  const hasOverduePartialBalance = effectiveStatus === 'partial' && isExpenseEffectivelyOverdue(expense);

  return (
    <article className={`rounded-xl border bg-white p-3 transition-colors dark:bg-slate-800 ${
      isSelected
        ? 'border-[#147514]/30 ring-2 ring-[#147514]/10 dark:border-emerald-400/40'
        : 'border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={t.expenses.table.selectExpense(expense.folio)}
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(checked === true)}
          className="mt-1 border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{expense.folio}</p>
              {isCarryover && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{t.expenses.summary.carryoverBadge}</p>}
              <h3 className="mt-0.5 line-clamp-1 text-sm font-medium text-slate-950 dark:text-white">{expense.concept || '—'}</h3>
              <p className="mt-1 truncate text-xs text-slate-500">{expense.providerName || t.common.unassigned}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(effectiveStatus)}`}>{statusLabel}</span>
              {hasOverduePartialBalance ? <span className="text-xs font-medium text-rose-600">{t.expenses.table.statuses.overdue}</span> : null}
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 divide-x divide-slate-100 border-y border-slate-100 py-2 dark:divide-slate-700 dark:border-slate-700">
            <MobileValue label={copy.total} value={formatCurrency(total, expense.currency)} strong />
            <MobileValue label={copy.balance} value={formatCurrency(balance, expense.currency)} />
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:border-[#147514]/30 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:text-slate-200"
        >
          <Eye className="h-4 w-4" />
          {copy.title}
        </button>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <ExpenseRowActions
            expenseId={expense.id}
            onAudit={onAudit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMarkPaid={onMarkPaid}
            onPrint={() => printExpenseVoucher({ expense, locale, t })}
            onRecordPayment={onRecordPayment}
            onStartEdit={onEdit}
            onView={onView}
            isDeletePending={isDeletePending}
            showAudit={actionVisibility?.showAudit}
            showDelete={canDeleteExpense(expense)}
            showEdit={canEditExpense(expense)}
            showMarkPaid={expense.type !== 'budget' && balance > 0 && (actionVisibility?.showMarkPaid ?? true)}
            showRecordPayment={balance > 0 && (actionVisibility?.showRecordPayment ?? true)}
            showView={false}
          />
        </div>
      </div>
    </article>
  );
}

function MobileValue({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="min-w-0 px-2.5 first:pl-0 last:pr-0">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-medium ${strong ? 'text-[#147514]' : 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}
