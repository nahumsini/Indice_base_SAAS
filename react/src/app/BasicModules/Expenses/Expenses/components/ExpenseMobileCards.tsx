import { Paperclip, Search } from 'lucide-react';
import { Checkbox } from '../../../../components/ui/checkbox';
import { ExpenseRowActions } from '../../components/table/ExpenseRowActions';
import { getStatusBadgeColor, type SelectOption } from '../../components/table/ExpenseInlineControls';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../hooks/useExpensesTranslations';
import type { Expense } from '../../types/expenses.types';
import { formatCurrency, formatDate } from '../../utils/expenses.utils';
import { getEffectiveExpenseStatus, isExpenseEffectivelyOverdue } from '../../utils/expenseFilters';
import type { EditableExpenseRowOptions, ExpenseRowActionVisibility } from './EditableExpenseRow';
import { printExpenseVoucher } from '../../utils/expensePrintDocument';

type ExpenseMobileCardsProps = {
  actionVisibility?: ExpenseRowActionVisibility;
  emptyMessage: string;
  emptyTitle: string;
  expenses: Expense[];
  deletingExpenseIds?: Set<string>;
  getAttachments: (expense: Expense) => string[];
  isColumnVisible: (key: string) => boolean;
  isSelected: (expenseId: string) => boolean;
  options: EditableExpenseRowOptions;
  onAudit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onEdit: (expense: Expense) => void;
  onMarkPaid: (expenseId: string) => void;
  onOpenAttachments: (expense: Expense) => void;
  onRecordPayment: (expenseId: string) => void;
  onSelectionChange: (expenseId: string, selected: boolean) => void;
};

export function ExpenseMobileCards({
  actionVisibility,
  emptyMessage,
  emptyTitle,
  expenses,
  deletingExpenseIds = new Set<string>(),
  getAttachments,
  isColumnVisible,
  isSelected,
  onAudit,
  onDelete,
  onDuplicate,
  onEdit,
  onMarkPaid,
  onOpenAttachments,
  onRecordPayment,
  onSelectionChange,
  options,
}: ExpenseMobileCardsProps) {
  const t = useExpensesTranslations();

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800 md:hidden">
        <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-base font-bold text-slate-800 dark:text-slate-100">{emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {expenses.map(expense => (
        <ExpenseMobileCard
          key={expense.id}
          actionVisibility={actionVisibility}
          attachmentsCount={expense.attachmentCount ?? getAttachments(expense).length}
          expense={expense}
          isColumnVisible={isColumnVisible}
          isDeletePending={deletingExpenseIds.has(expense.id)}
          isSelected={isSelected(expense.id)}
          options={options}
          onAudit={onAudit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onEdit={() => onEdit(expense)}
          onMarkPaid={onMarkPaid}
          onOpenAttachments={() => onOpenAttachments(expense)}
          onRecordPayment={onRecordPayment}
          onSelectionChange={(selected) => onSelectionChange(expense.id, selected)}
        />
      ))}
    </div>
  );
}

function ExpenseMobileCard({
  actionVisibility,
  attachmentsCount,
  expense,
  isColumnVisible,
  isDeletePending,
  isSelected,
  onAudit,
  onDelete,
  onDuplicate,
  onEdit,
  onMarkPaid,
  onOpenAttachments,
  onRecordPayment,
  onSelectionChange,
  options,
}: {
  actionVisibility?: ExpenseRowActionVisibility;
  attachmentsCount: number;
  expense: Expense;
  isColumnVisible: (key: string) => boolean;
  isDeletePending: boolean;
  isSelected: boolean;
  options: EditableExpenseRowOptions;
  onAudit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onEdit: () => void;
  onMarkPaid: (expenseId: string) => void;
  onOpenAttachments: () => void;
  onRecordPayment: (expenseId: string) => void;
  onSelectionChange: (selected: boolean) => void;
}) {
  const t = useExpensesTranslations();
  const locale = useExpensesResolvedLocale();
  const total = expense.total || expense.amount || 0;
  const paid = expense.amountPaid ?? 0;
  const balance = Math.max(total - paid, 0);
  const canRecordPayment = balance > 0;
  const canMarkPaid = expense.type !== 'budget' && balance > 0;
  const effectiveStatus = getEffectiveExpenseStatus(expense);
  const statusLabel = t.expenses.table.statuses[effectiveStatus] ?? effectiveStatus;
  const hasOverduePartialBalance = effectiveStatus === 'partial' && isExpenseEffectivelyOverdue(expense);

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors dark:bg-slate-800 ${
      isSelected
        ? 'border-[#147514]/30 ring-2 ring-[#147514]/10 dark:border-emerald-400/40'
        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/75'
    }`}>
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={t.expenses.table.selectExpense(expense.folio)}
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(checked === true)}
          className="mt-1 border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {expense.folio}
              </p>
              <h3 className="mt-1 line-clamp-2 text-base font-extrabold text-slate-950 dark:text-white">
                {expense.concept || '-'}
              </h3>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeColor(effectiveStatus)}`}>
                {statusLabel}
              </span>
              {hasOverduePartialBalance ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
                  {t.expenses.table.statuses.overdue}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MobileValue label={t.expenses.columns.total?.label ?? 'Total'} value={formatCurrency(total, expense.currency)} strong />
            <MobileValue label={t.expenses.columns.amountPaid?.label ?? 'Paid'} value={formatCurrency(paid, expense.currency)} />
            <MobileValue label={t.expenses.columns.balance?.label ?? 'Balance'} value={formatCurrency(balance, expense.currency)} />
            <MobileValue label={t.expenses.modal.currency} value={expense.currency} />
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            {isColumnVisible('providerName') ? (
              <MobilePair label={t.expenses.columns.providerName?.label} value={expense.providerName || '-'} />
            ) : null}
            {isColumnVisible('businessUnit') ? (
              <MobilePair label={t.expenses.columns.businessUnit?.label} value={getOptionLabel(options.businessUnits, expense.businessUnit)} />
            ) : null}
            {isColumnVisible('business') ? (
              <MobilePair label={t.expenses.columns.business?.label} value={getOptionLabel(options.businesses, expense.business)} />
            ) : null}
            {isColumnVisible('accountingAccount') ? (
              <MobilePair label={t.expenses.columns.accountingAccount?.label} value={getOptionLabel(options.accountingAccounts, expense.accountingAccount ?? '')} />
            ) : null}
            {isColumnVisible('dueDate') ? (
              <MobilePair label={t.expenses.columns.dueDate?.label} value={formatDate(expense.dueDate)} />
            ) : null}
            {isColumnVisible('paymentDate') ? (
              <MobilePair label={t.expenses.columns.paymentDate?.label} value={expense.paymentDate ? formatDate(expense.paymentDate) : '-'} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-700/70">
        <button
          type="button"
          onClick={onOpenAttachments}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <Paperclip className="h-4 w-4" />
          {t.expenses.columns.attachments?.label ?? t.common.addFiles}: {attachmentsCount}
        </button>
        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ExpenseRowActions
            expenseId={expense.id}
            onAudit={onAudit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMarkPaid={onMarkPaid}
            onPrint={() => printExpenseVoucher({ expense, locale, t })}
            onRecordPayment={onRecordPayment}
            onStartEdit={onEdit}
            isDeletePending={isDeletePending}
            showAudit={actionVisibility?.showAudit}
            showMarkPaid={canMarkPaid && (actionVisibility?.showMarkPaid ?? true)}
            showRecordPayment={canRecordPayment && (actionVisibility?.showRecordPayment ?? true)}
          />
        </div>
      </div>
    </article>
  );
}

function MobileValue({ label, strong = false, value }: { label?: string; strong?: boolean; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm ${strong ? 'font-extrabold text-[#147514]' : 'font-bold text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function MobilePair({ label, value }: { label?: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right font-semibold text-slate-800 dark:text-slate-100">{value || '-'}</span>
    </div>
  );
}

function getOptionLabel(options: SelectOption[], value: string) {
  if (!value) return '-';
  return options.find(option => option.value === value)?.label ?? value;
}
