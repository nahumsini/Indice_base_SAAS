import { CheckCircle2, Copy, Paperclip, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Expense, ExpenseStatus, PaymentMethod, Provider } from '../../types/expenses.types';
import { formatCurrency, formatDate, getPaymentMethodName, getStatusLabel } from '../../utils/expenses.utils';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

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
  expense: Expense;
  attachmentsCount: number;
  columnWidths: Record<string, number>;
  isEditing: boolean;
  isColumnVisible: (key: string) => boolean;
  options: EditableExpenseRowOptions;
  workflow: ExpenseWorkflowState;
  onStartEdit: (expenseId: string) => void;
  onUpdateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  onUpdateWorkflow: (expenseId: string, updates: Partial<ExpenseWorkflowState>) => void;
  onOpenAttachments: (expense: Expense) => void;
  onDuplicate: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
  onMarkPaid: (expenseId: string) => void;
  onAudit: (expenseId: string) => void;
};

const tableActionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800/80';

const inlineInputBaseClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const readonlyCellClass = 'text-sm text-gray-900 dark:text-gray-100';

const formatDateInputValue = (date?: Date): string => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

const toDateValue = (value: string): Date | undefined => {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`);
};

const getStatusBadgeColor = (status: ExpenseStatus) => {
  switch (status) {
    case 'paid':
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300';
    case 'partial':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300';
    case 'overdue':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300';
    case 'audited':
      return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  }
};

function EditableSelect<T extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  value: T;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={inlineInputBaseClass}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function EditableTextInput({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className={inlineInputBaseClass}
      placeholder={placeholder}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function EditableTextarea({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <textarea
      aria-label={ariaLabel}
      className={`${inlineInputBaseClass} min-h-20 resize-none leading-relaxed`}
      placeholder={placeholder}
      rows={3}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function EditableDatePicker({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className={inlineInputBaseClass}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ReadonlyPill({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
    >
      {children}
    </button>
  );
}

export function EditableExpenseRow({
  expense,
  attachmentsCount,
  columnWidths,
  isEditing,
  isColumnVisible,
  options,
  workflow,
  onStartEdit,
  onUpdateExpense,
  onUpdateWorkflow,
  onOpenAttachments,
  onDuplicate,
  onDelete,
  onMarkPaid,
  onAudit,
}: EditableExpenseRowProps) {
  const startEditing = () => onStartEdit(expense.id);
  const rowHighlightClass = isEditing
    ? 'bg-green-50/50 ring-1 ring-inset ring-[#147514]/25 dark:bg-green-900/10'
    : '';
  const statusClass = getStatusBadgeColor(expense.status);
  const selectedProvider = expense.providerId ?? '';

  const handleProviderChange = (providerId: string) => {
    const provider = options.providers.find((item) => item.id === providerId);
    onUpdateExpense(expense.id, {
      providerId,
      providerName: provider?.name ?? '',
    });
  };

  return (
    <tr
      className={`
        transition-colors group relative
        ${rowHighlightClass}
        ${!isEditing && expense.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
        ${!isEditing && expense.status === 'pending' ? 'bg-yellow-50/30 dark:bg-yellow-900/5 hover:bg-yellow-50/60 dark:hover:bg-yellow-900/10' : ''}
        ${!isEditing && expense.status === 'paid' ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
        ${!isEditing && expense.status === 'partial' ? 'bg-blue-50/30 dark:bg-blue-900/5 hover:bg-blue-50/60 dark:hover:bg-blue-900/10' : ''}
        ${expense.amount > 5000 ? 'border-l-2 border-l-yellow-400' : ''}
      `}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        <span className="font-mono font-medium">{expense.folio}</span>
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.businessUnit, minWidth: columnWidths.businessUnit }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Unidad de ${expense.folio}`}
            value={expense.businessUnit}
            options={options.businessUnits}
            onChange={(businessUnit) => onUpdateExpense(expense.id, { businessUnit })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{expense.businessUnit}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.business, minWidth: columnWidths.business }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Negocio de ${expense.folio}`}
            value={expense.business}
            options={options.businesses}
            onChange={(business) => onUpdateExpense(expense.id, { business })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{expense.business}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.providerName, minWidth: columnWidths.providerName }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Proveedor de ${expense.folio}`}
            value={selectedProvider}
            options={[
              { value: '', label: 'Sin proveedor' },
              ...options.providers.map((provider) => ({ value: provider.id, label: provider.name })),
            ]}
            onChange={handleProviderChange}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{expense.providerName || '-'}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4" style={{ width: columnWidths.concept, minWidth: columnWidths.concept }}>
        {isEditing ? (
          <EditableTextInput
            ariaLabel={`Concepto de ${expense.folio}`}
            value={expense.concept}
            onChange={(concept) => onUpdateExpense(expense.id, { concept })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{expense.concept}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4" style={{ width: columnWidths.description, minWidth: columnWidths.description }}>
        {isEditing ? (
          <EditableTextarea
            ariaLabel={`Descripción de ${expense.folio}`}
            placeholder="Agregar descripción"
            value={expense.description ?? ''}
            onChange={(description) => onUpdateExpense(expense.id, { description })}
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="max-w-xs truncate rounded-xl border border-transparent px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:text-gray-400 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
          >
            {expense.description || '-'}
          </button>
        )}
      </td>

      {isColumnVisible('total') && (
        <td className={`px-6 py-4 whitespace-nowrap font-semibold ${readonlyCellClass}`} style={{ width: columnWidths.total, minWidth: columnWidths.total }}>
          {formatCurrency(expense.total)}
        </td>
      )}

      {isColumnVisible('taxes') && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400" style={{ width: columnWidths.taxes, minWidth: columnWidths.taxes }}>
          {formatCurrency(expense.taxes)}
        </td>
      )}

      {isColumnVisible('amount') && (
        <td className={`px-6 py-4 whitespace-nowrap ${readonlyCellClass}`} style={{ width: columnWidths.amount, minWidth: columnWidths.amount }}>
          <span className={`font-semibold ${expense.amount > 5000 ? 'text-gray-900 dark:text-white text-base' : ''}`}>
            {formatCurrency(expense.amount)}
          </span>
          {expense.amount > 10000 && (
            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400 font-medium">ALTO</span>
          )}
        </td>
      )}

      {isColumnVisible('amountPaid') && (
        <td className={`px-6 py-4 whitespace-nowrap ${readonlyCellClass}`} style={{ width: columnWidths.amountPaid, minWidth: columnWidths.amountPaid }}>
          <span className={`font-semibold ${(expense.amountPaid ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatCurrency(expense.amountPaid || 0)}
          </span>
        </td>
      )}

      {isColumnVisible('balance') && (
        <td className={`px-6 py-4 whitespace-nowrap ${readonlyCellClass}`} style={{ width: columnWidths.balance, minWidth: columnWidths.balance }}>
          <span className={`font-semibold ${(expense.amount - (expense.amountPaid || 0)) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatCurrency(expense.amount - (expense.amountPaid || 0))}
          </span>
        </td>
      )}

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.dueDate, minWidth: columnWidths.dueDate }}>
        {isEditing ? (
          <EditableDatePicker
            ariaLabel={`Fecha de vencimiento de ${expense.folio}`}
            value={formatDateInputValue(expense.dueDate)}
            onChange={(value) => onUpdateExpense(expense.id, { dueDate: toDateValue(value) ?? expense.dueDate })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{formatDate(expense.dueDate)}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.paymentDate, minWidth: columnWidths.paymentDate }}>
        {isEditing ? (
          <EditableDatePicker
            ariaLabel={`Fecha de pago de ${expense.folio}`}
            value={formatDateInputValue(expense.paymentDate)}
            onChange={(value) => onUpdateExpense(expense.id, { paymentDate: toDateValue(value) })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{expense.paymentDate ? formatDate(expense.paymentDate) : '-'}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.paymentMethod, minWidth: columnWidths.paymentMethod }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Método de pago de ${expense.folio}`}
            value={expense.paymentMethod}
            options={options.paymentMethods}
            onChange={(paymentMethod) => onUpdateExpense(expense.id, { paymentMethod })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{getPaymentMethodName(expense.paymentMethod)}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.accountingAccount, minWidth: columnWidths.accountingAccount }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Cuenta contable de ${expense.folio}`}
            value={expense.accountingAccount ?? ''}
            options={options.accountingAccounts}
            onChange={(accountingAccount) => onUpdateExpense(expense.id, { accountingAccount })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{expense.accountingAccount || '-'}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4" style={{ width: columnWidths.status, minWidth: columnWidths.status }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Estado de ${expense.folio}`}
            value={expense.status}
            options={options.statuses}
            onChange={(status) => onUpdateExpense(expense.id, { status })}
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className={`w-full rounded-full border px-3 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${statusClass}`}
          >
            {getStatusLabel(expense.status)}
          </button>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-center" style={{ width: columnWidths.attachments, minWidth: columnWidths.attachments }}>
        <button
          type="button"
          onClick={() => onOpenAttachments(expense)}
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${
            attachmentsCount > 0
              ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300 dark:hover:bg-green-900/60'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
          title={attachmentsCount > 0 ? 'Ver archivos adjuntos' : 'Agregar archivos'}
          aria-label={attachmentsCount > 0 ? 'Ver archivos adjuntos' : 'Agregar archivos'}
        >
          <Paperclip className="h-4 w-4" />
          <span>{attachmentsCount}</span>
        </button>
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.authorizer, minWidth: columnWidths.authorizer }}>
        <EditableSelect
          ariaLabel={`Usuario que autoriza ${expense.folio}`}
          value={workflow.authorizer}
          options={options.users}
          onChange={(authorizer) => onUpdateWorkflow(expense.id, { authorizer })}
        />
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.performer, minWidth: columnWidths.performer }}>
        <EditableSelect
          ariaLabel={`Usuario que realiza ${expense.folio}`}
          value={workflow.performer}
          options={options.users}
          onChange={(performer) => onUpdateWorkflow(expense.id, { performer })}
        />
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.audit, minWidth: columnWidths.audit }}>
        <EditableTextInput
          ariaLabel={`Notas de auditoría ${expense.folio}`}
          placeholder="Agregar auditoría"
          value={workflow.auditNotes}
          onChange={(auditNotes) => onUpdateWorkflow(expense.id, { auditNotes })}
        />
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-center" style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}>
        <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
          <button
            onClick={() => onDuplicate(expense.id)}
            className={`${tableActionButtonBaseClass} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60`}
            title="Duplicar"
            aria-label="Duplicar"
            type="button"
          >
            <Copy className="h-4 w-4 text-blue-600" />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className={`${tableActionButtonBaseClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60`}
            title="Eliminar"
            aria-label="Eliminar"
            type="button"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
          <button
            onClick={startEditing}
            className={`${tableActionButtonBaseClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60`}
            title="Editar"
            aria-label="Editar"
            type="button"
          >
            <Pencil className="h-4 w-4 text-amber-600" />
          </button>
          <button
            onClick={() => onMarkPaid(expense.id)}
            className={`${tableActionButtonBaseClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60`}
            title="Marcar como pagado"
            aria-label="Marcar como pagado"
            type="button"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </button>
          <button
            onClick={() => onAudit(expense.id)}
            className={`${tableActionButtonBaseClass} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60`}
            title="Auditar"
            aria-label="Auditar"
            type="button"
          >
            <ShieldCheck className="h-4 w-4 text-violet-600" />
          </button>
        </div>
      </td>
    </tr>
  );
}
