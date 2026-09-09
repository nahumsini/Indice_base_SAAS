import { canPayExpense } from '../../utils/expenseFilters';
import { useState } from 'react';
import { ExpenseAccountSelect } from '../../components/table/ExpenseAccountSelect';
import { Paperclip, LockKeyhole } from 'lucide-react';
import { Checkbox } from '../../../../components/ui/checkbox';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../hooks/useExpensesTranslations';
import type { Expense, ExpenseStatus, PaymentMethod, Provider } from '../../types/expenses.types';
import { formatDate } from '../../utils/expenses.utils';
import {
  EditableDatePicker,
  EditableSelect,
  EditableTextarea,
  EditableTextInput,
  ReadonlyPill,
  ReadonlySelectPill,
  formatDateInputValue,
  getStatusBadgeColor,
  toDateValue,
  type SelectOption,
} from '../../components/table/ExpenseInlineControls';
import { ExpenseAmountCells } from '../../components/table/ExpenseAmountCells';
import { ExpenseRowActions } from '../../components/table/ExpenseRowActions';
import {
  canDeleteExpense,
  canEditExpense,
  canReclassifyExpense,
  getEffectiveExpenseStatus,
  getExpenseBalance,
  isExpenseEffectivelyOverdue,
} from '../../utils/expenseFilters';
import { printExpenseVoucher } from '../../utils/expensePrintDocument';

export type ExpenseWorkflowState = {
  authorizer: string;
  performer: string;
  auditNotes: string;
};

export type EditableExpenseRowOptions = {
  accountingAccounts: SelectOption[];
  businessUnits: SelectOption[];
  businesses: SelectOption[];
  paymentMethods: SelectOption<PaymentMethod>[];
  providers: Provider[];
  statuses: SelectOption<ExpenseStatus>[];
  users: SelectOption[];
};

type EditableExpenseRowProps = {
  actionVisibility?: ExpenseRowActionVisibility;
  expense: Expense;
  isCarryover?: boolean;
  attachmentsCount: number;
  columnWidths: Record<string, number>;
  isEditing: boolean;
  isColumnVisible: (key: string) => boolean;
  isDeletePending?: boolean;
  options: EditableExpenseRowOptions;
  workflow: ExpenseWorkflowState;
  isSelected: boolean;
  onStartEdit: (expenseId: string) => void;
  onSelectionChange: (expenseId: string, selected: boolean) => void;
  onStatusChange?: (expenseId: string, status: ExpenseStatus) => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onReclassifyExpense?: (expense: Expense, accountId: string) => Promise<void>;
  onUpdateWorkflow: (expenseId: string, updates: Partial<ExpenseWorkflowState>) => void;
  onOpenAttachments: (expense: Expense) => void;
  onDuplicate: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onActionEdit?: () => void;
  onMarkPaid: (expenseId: string) => void;
  onRecordPayment: (expenseId: string) => void;
  onAudit: (expenseId: string) => void;
  onView: () => void;
};

export type ExpenseRowActionVisibility = {
  showAudit?: boolean;
  showMarkPaid?: boolean;
  showRecordPayment?: boolean;
  showStatusChange?: boolean;
};

export function EditableExpenseRow({
  actionVisibility,
  expense,
  isCarryover = false,
  attachmentsCount,
  columnWidths,
  isEditing,
  isColumnVisible,
  isDeletePending = false,
  isSelected,
  options,
  workflow,
  onStartEdit,
  onSelectionChange,
  onStatusChange,
  onUpdateExpense,
  onReclassifyExpense,
  onUpdateWorkflow,
  onOpenAttachments,
  onDuplicate,
  onDelete,
  onActionEdit,
  onMarkPaid,
  onRecordPayment,
  onAudit,
  onView,
}: EditableExpenseRowProps) {
  const [isClassifying, setIsClassifying] = useState(false);
  const t = useExpensesTranslations();
  const locale = useExpensesResolvedLocale();
  const canEdit = canEditExpense(expense);
  const rowIsEditing = isEditing && canEdit;
  const startEditing = () => {
    if (canEdit) onStartEdit(expense.id);
  };
  const startActionEdit = onActionEdit ?? startEditing;
  const rowHighlightClass = rowIsEditing
    ? 'bg-slate-50/80 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/45 dark:ring-slate-700'
    : isSelected
      ? 'bg-[#147514]/5 dark:bg-[#147514]/10'
    : '';
  const effectiveStatus = getEffectiveExpenseStatus(expense);
  const hasOverduePartialBalance = effectiveStatus === 'partial' && isExpenseEffectivelyOverdue(expense);
  const statusClass = getStatusBadgeColor(effectiveStatus);
  const selectedProvider = expense.providerId ?? '';
  const accountingAccountLabel = options.accountingAccounts.find(option => option.value === expense.accountingAccount)?.label ?? expense.accountingAccount;
  const businessUnitLabel = options.businessUnits.find(option => option.value === expense.businessUnit)?.label ?? expense.businessUnit;
  const businessLabel = options.businesses.find(option => option.value === expense.business)?.label ?? expense.business;
  const businessOptionsForUnit = filterBusinessesForUnit(options.businesses, expense.businessUnit);
  const showAuditAction = actionVisibility?.showAudit ?? true;
  const showMarkPaidAction = actionVisibility?.showMarkPaid ?? true;
  const showStatusChange = actionVisibility?.showStatusChange ?? true;
  const canRecordPayment = canPayExpense(expense);
  const canMarkPaid = canPayExpense(expense);
  const statusOptions = options.statuses.filter(option => {
    if (!showMarkPaidAction && (option.value === 'paid' || option.value === 'partial')) return false;
    if (!showAuditAction && option.value === 'audited') return false;
    return true;
  });

  const handleProviderChange = (providerId: string) => {
    const provider = options.providers.find((item) => item.id === providerId);
    onUpdateExpense(expense.id, {
      providerId,
      providerName: provider?.name ?? '',
    });
  };
  const handleBusinessUnitChange = (businessUnit: string) => {
    const nextBusinessOptions = filterBusinessesForUnit(options.businesses, businessUnit);
    const currentBusinessStillValid = nextBusinessOptions.some(option => option.value === expense.business);
    onUpdateExpense(expense.id, {
      businessUnit,
      business: currentBusinessStillValid ? expense.business : '',
    });
  };

  return (
    <tr
      className={`
        transition-colors group relative
        ${rowHighlightClass}
        ${!rowIsEditing && effectiveStatus === 'overdue' ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
        ${!rowIsEditing && effectiveStatus === 'pending' ? 'bg-yellow-50/30 dark:bg-yellow-900/5 hover:bg-yellow-50/60 dark:hover:bg-yellow-900/10' : ''}
        ${!rowIsEditing && effectiveStatus === 'paid' ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
        ${!rowIsEditing && effectiveStatus === 'partial' ? 'bg-blue-50/30 dark:bg-blue-900/5 hover:bg-blue-50/60 dark:hover:bg-blue-900/10' : ''}
        ${expense.amount > 5000 ? 'border-l-2 border-l-yellow-400' : ''}
      `}
    >
      <td className="px-5 py-4 whitespace-nowrap align-middle">
        <Checkbox
          aria-label={t.expenses.table.selectExpense(expense.folio)}
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(expense.id, checked === true)}
          className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
        />
      </td>

      {isColumnVisible('folio') && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
          <span className="font-mono font-medium">{expense.folio}</span>
          {isCarryover && <span className="mt-1 block text-xs font-medium text-rose-600 dark:text-rose-400">{t.expenses.summary.carryoverBadge}</span>}
        </td>
      )}

      {isColumnVisible('date') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.date, minWidth: columnWidths.date }}>
          {rowIsEditing ? (
            <EditableDatePicker
              ariaLabel={`${t.expenses.columns.date.label} ${expense.folio}`}
              value={formatDateInputValue(expense.date)}
              onChange={(value) => onUpdateExpense(expense.id, { date: toDateValue(value) ?? expense.date })}
            />
          ) : (
            <ReadonlyPill onClick={startEditing}>{formatDate(expense.date)}</ReadonlyPill>
          )}
        </td>
      )}

      {isColumnVisible('businessUnit') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.businessUnit, minWidth: columnWidths.businessUnit }}>
          {rowIsEditing ? (
            <EditableSelect ariaLabel={t.expenses.table.unitFor(expense.folio)} value={expense.businessUnit} options={options.businessUnits} onChange={handleBusinessUnitChange} />
          ) : (
            <ReadonlySelectPill onClick={startEditing}>{businessUnitLabel || '-'}</ReadonlySelectPill>
          )}
        </td>
      )}

      {isColumnVisible('business') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.business, minWidth: columnWidths.business }}>
          {rowIsEditing ? (
            <EditableSelect ariaLabel={t.expenses.table.businessFor(expense.folio)} value={expense.business} options={businessOptionsForUnit} onChange={(business) => onUpdateExpense(expense.id, { business })} />
          ) : (
            <ReadonlySelectPill onClick={startEditing}>{businessLabel || '-'}</ReadonlySelectPill>
          )}
        </td>
      )}

      {isColumnVisible('providerName') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.providerName, minWidth: columnWidths.providerName }}>
          {rowIsEditing ? (
            <EditableSelect
              ariaLabel={t.expenses.table.providerFor(expense.folio)}
              value={selectedProvider}
              options={[
                { value: '', label: t.common.unassigned },
                ...options.providers.map((provider) => ({ value: provider.id, label: provider.name })),
              ]}
              onChange={handleProviderChange}
            />
          ) : (
            <ReadonlySelectPill onClick={startEditing}>{expense.providerName || '-'}</ReadonlySelectPill>
          )}
        </td>
      )}

      {isColumnVisible('concept') && (
        <td className="px-6 py-4" style={{ width: columnWidths.concept, minWidth: columnWidths.concept }}>
          {rowIsEditing ? (
            <EditableTextInput
              ariaLabel={t.expenses.table.conceptFor(expense.folio)}
              value={expense.concept}
              onChange={(concept) => onUpdateExpense(expense.id, { concept })}
            />
          ) : (
            <ReadonlyPill onClick={startEditing}>{expense.concept}</ReadonlyPill>
          )}
        </td>
      )}
      {isColumnVisible('description') && (
        <td className="px-6 py-4" style={{ width: columnWidths.description, minWidth: columnWidths.description }}>
          {rowIsEditing ? (
            <EditableTextarea
              ariaLabel={`${t.expenses.columns.description.label} ${expense.folio}`}
              placeholder={t.expenses.table.addDescription}
              value={expense.description ?? ''}
              onChange={(description) => onUpdateExpense(expense.id, { description })}
            />
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-sm leading-5 text-gray-600 whitespace-normal break-words transition-colors hover:border-slate-200 hover:bg-slate-50 dark:text-gray-400 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
            >
              {expense.description || '-'}
            </button>
          )}
        </td>
      )}
      <ExpenseAmountCells columnWidths={columnWidths} expense={expense} isColumnVisible={isColumnVisible} />
      {isColumnVisible('dueDate') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.dueDate, minWidth: columnWidths.dueDate }}>
          {rowIsEditing ? (
            <EditableDatePicker
              ariaLabel={`${t.expenses.columns.dueDate.label} ${expense.folio}`}
              value={formatDateInputValue(expense.dueDate)}
              onChange={(value) => onUpdateExpense(expense.id, { dueDate: toDateValue(value) ?? expense.dueDate })}
            />
          ) : (
            <ReadonlyPill onClick={startEditing}>{formatDate(expense.dueDate)}</ReadonlyPill>
          )}
        </td>
      )}
      {isColumnVisible('paymentDate') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.paymentDate, minWidth: columnWidths.paymentDate }}>
          {rowIsEditing ? (
            <EditableDatePicker
              ariaLabel={`${t.expenses.columns.paymentDate.label} ${expense.folio}`}
              value={formatDateInputValue(expense.paymentDate)}
              onChange={(value) => onUpdateExpense(expense.id, { paymentDate: toDateValue(value) })}
            />
          ) : (
            <ReadonlyPill onClick={startEditing}>{expense.paymentDate ? formatDate(expense.paymentDate) : '-'}</ReadonlyPill>
          )}
        </td>
      )}
      {isColumnVisible('paymentMethod') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.paymentMethod, minWidth: columnWidths.paymentMethod }}>
          {rowIsEditing ? (
            <EditableSelect ariaLabel={`${t.expenses.columns.paymentMethod.label} ${expense.folio}`} value={expense.paymentMethod} options={options.paymentMethods} onChange={(paymentMethod) => onUpdateExpense(expense.id, { paymentMethod })} />
          ) : (
            <ReadonlySelectPill onClick={startEditing}>{t.expenses.table.paymentMethods[expense.paymentMethod] ?? expense.paymentMethod}</ReadonlySelectPill>
          )}
        </td>
      )}
      {isColumnVisible('accountingAccount') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.accountingAccount, minWidth: columnWidths.accountingAccount }}>
          {expense.originFund ? (
            <div className="flex items-start gap-2" title="Cuenta vinculada al fondo de origen">
              <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div><span>{accountingAccountLabel || '-'}</span><span className="block text-xs text-slate-500">{expense.originFund.name}</span></div>
            </div>
          ) : canEdit || (canReclassifyExpense(expense) && onReclassifyExpense) ? (
            <ExpenseAccountSelect
              label={`${t.expenses.columns.accountingAccount.label} ${expense.folio}`}
              value={expense.accountingAccount ?? ''}
              options={options.accountingAccounts}
              disabled={isClassifying}
              onChange={async accountingAccount => {
                if (canEdit) {
                  onUpdateExpense(expense.id, { accountingAccount });
                  return;
                }
                setIsClassifying(true);
                try { await onReclassifyExpense?.(expense, accountingAccount); }
                finally { setIsClassifying(false); }
              }}
            />
          ) : (
            <span title={expense.accountingPosted ? 'Ya contabilizado; requiere un ajuste contable.' : undefined}>{accountingAccountLabel || '-'}</span>
          )}
        </td>
      )}
      {isColumnVisible('status') && (
        <td className="px-6 py-4" style={{ width: columnWidths.status, minWidth: columnWidths.status }}>
          {rowIsEditing && showStatusChange ? (
            <EditableSelect
              ariaLabel={`${t.expenses.columns.status.label} ${expense.folio}`}
              value={effectiveStatus}
              options={statusOptions}
              onChange={(status) => {
                if (onStatusChange) {
                  onStatusChange(expense.id, status);
                  return;
                }
                onUpdateExpense(expense.id, { status });
              }}
            />
          ) : (
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                onClick={startEditing}
                className={`w-full rounded-full border px-3 py-2 text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${statusClass}`}
              >
                {t.expenses.table.statuses[effectiveStatus] ?? effectiveStatus}
              </button>
              {hasOverduePartialBalance ? (
                <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
                  {t.expenses.table.statuses.overdue}
                </span>
              ) : null}
            </div>
          )}
        </td>
      )}

      {isColumnVisible('attachments') && (
        <td className="px-6 py-4 whitespace-nowrap text-center" style={{ width: columnWidths.attachments, minWidth: columnWidths.attachments }}>
          <button
            type="button"
            onClick={() => onOpenAttachments(expense)}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${
              attachmentsCount > 0
                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300 dark:hover:bg-green-900/60'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            title={attachmentsCount > 0 ? t.common.viewAttachedFiles : t.common.addFiles}
            aria-label={attachmentsCount > 0 ? t.common.viewAttachedFiles : t.common.addFiles}
          >
            <Paperclip className="h-4 w-4" />
            <span>{attachmentsCount}</span>
          </button>
        </td>
      )}

      {isColumnVisible('authorizer') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.authorizer, minWidth: columnWidths.authorizer }}>
          {canEdit ? (
            <EditableSelect
              ariaLabel={t.expenses.table.authorizerFor(expense.folio)}
              value={workflow.authorizer}
              options={options.users}
              onChange={(authorizer) => onUpdateWorkflow(expense.id, { authorizer })}
            />
          ) : <ReadonlySelectPill>{options.users.find(option => option.value === workflow.authorizer)?.label || '-'}</ReadonlySelectPill>}
        </td>
      )}

      {isColumnVisible('performer') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.performer, minWidth: columnWidths.performer }}>
          {canEdit ? (
            <EditableSelect
              ariaLabel={t.expenses.table.responsibleFor(expense.folio)}
              value={workflow.performer}
              options={options.users}
              onChange={(performer) => onUpdateWorkflow(expense.id, { performer })}
            />
          ) : <ReadonlySelectPill>{options.users.find(option => option.value === workflow.performer)?.label || '-'}</ReadonlySelectPill>}
        </td>
      )}

      {isColumnVisible('audit') && (
        <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.audit, minWidth: columnWidths.audit }}>
          {canEdit ? (
            <EditableTextInput
              ariaLabel={t.expenses.table.auditNotesFor(expense.folio)}
              placeholder={t.expenses.table.addAudit}
              value={workflow.auditNotes}
              onChange={(auditNotes) => onUpdateWorkflow(expense.id, { auditNotes })}
            />
          ) : <ReadonlyPill>{workflow.auditNotes || '-'}</ReadonlyPill>}
        </td>
      )}

      <td className="px-6 py-4 whitespace-nowrap text-center" style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}>
        <ExpenseRowActions
          expenseId={expense.id}
          onAudit={onAudit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMarkPaid={onMarkPaid}
          onPrint={() => printExpenseVoucher({ expense, locale, t })}
          onRecordPayment={onRecordPayment}
          onStartEdit={startActionEdit}
          onView={onView}
          isDeletePending={isDeletePending}
          showAudit={actionVisibility?.showAudit}
          showDelete={canDeleteExpense(expense)}
          showEdit={canEdit}
          showMarkPaid={canMarkPaid && (actionVisibility?.showMarkPaid ?? true)}
          showRecordPayment={canRecordPayment && (actionVisibility?.showRecordPayment ?? true)}
        />
      </td>
    </tr>
  );
}

function filterBusinessesForUnit(options: SelectOption[], unitId: string) {
  return options.filter(option => !option.unitId || !unitId || option.unitId === unitId || option.value === '');
}
