import { useEffect, useMemo, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type ReactNode, type SetStateAction } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { mockProviders } from '../../data/expenses.mock';
import type { Expense, ExpenseStatus } from '../../types/expenses.types';
import {
  EditableExpenseRow,
  type EditableExpenseRowOptions,
  type ExpenseWorkflowState,
} from './EditableExpenseRow';

export type ColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
  fixed?: boolean;
};

type ExpenseTableProps = {
  columns: ColumnConfig[];
  emptyMessage?: string;
  emptyTitle?: string;
  expenses: Expense[];
  getAttachments: (expense: Expense) => string[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  onOpenAttachments: (expense: Expense) => void;
};

type SortField = keyof Expense;
type SortDirection = 'asc' | 'desc' | null;

const defaultColumnWidths: Record<string, number> = {
  folio: 110,
  businessUnit: 120,
  business: 120,
  providerName: 180,
  concept: 180,
  description: 200,
  total: 120,
  taxes: 130,
  amount: 120,
  amountPaid: 120,
  balance: 120,
  dueDate: 130,
  paymentDate: 130,
  paymentMethod: 150,
  accountingAccount: 150,
  status: 140,
  attachments: 130,
  authorizer: 180,
  performer: 180,
  audit: 180,
  actions: 270,
};

const expenseUserOptions = [
  'Usuario Demo',
  'Jane Doe',
  'John Admin',
  'Marketing Manager',
  'CEO',
  'CFO',
  'Operations Manager',
  'Restaurant Manager',
  'Facilities Manager',
  'Security Director',
  'Logistics Manager',
  'IT Director',
  'IT Manager',
  'HR Director',
  'HR Manager',
  'Sales Director',
  'Office Manager',
];

const getDefaultExpenseWorkflow = (expense: Expense): ExpenseWorkflowState => ({
  authorizer: expense.approver ?? '',
  performer: '',
  auditNotes: '',
});

const compareSortValues = (leftValue: unknown, rightValue: unknown, direction: Exclude<SortDirection, null>) => {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (leftValue instanceof Date && rightValue instanceof Date) {
    return (leftValue.getTime() - rightValue.getTime()) * multiplier;
  }

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * multiplier;
};

export function ExpenseTable({
  columns,
  emptyMessage = 'Intenta ajustar los filtros de búsqueda',
  emptyTitle = 'No se encontraron gastos',
  expenses,
  getAttachments,
  onExpensesChange,
  onOpenAttachments,
}: ExpenseTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultColumnWidths);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [workflowByExpenseId, setWorkflowByExpenseId] = useState<Record<string, ExpenseWorkflowState>>({});

  const businessUnits = useMemo(() => {
    return Array.from(new Set(expenses.map(expense => expense.businessUnit))).map(unit => ({
      value: unit,
      label: unit,
    }));
  }, [expenses]);

  const businesses = useMemo(() => {
    return Array.from(new Set(expenses.map(expense => expense.business))).map(business => ({
      value: business,
      label: business,
    }));
  }, [expenses]);

  const accountingAccountOptions = useMemo(() => {
    const baseOptions = [
      { value: '', label: 'Seleccionar' },
      { value: 'Gastos Operativos', label: 'Gastos Operativos' },
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Nómina', label: 'Nómina' },
      { value: 'Servicios', label: 'Servicios' },
      { value: 'Impuestos', label: 'Impuestos' },
      { value: 'Activos', label: 'Activos' },
    ];
    const existingAccounts = Array.from(
      new Set(expenses.map(expense => expense.accountingAccount).filter(Boolean) as string[]),
    )
      .filter(account => !baseOptions.some(option => option.value === account))
      .map(account => ({ value: account, label: account }));

    return [...baseOptions, ...existingAccounts];
  }, [expenses]);

  const editableRowOptions = useMemo<EditableExpenseRowOptions>(() => ({
    accountingAccounts: accountingAccountOptions,
    businessUnits,
    businesses,
    paymentMethods: [
      { value: 'credit_card', label: 'Tarjeta de crédito' },
      { value: 'transfer', label: 'Transferencia' },
      { value: 'cash', label: 'Efectivo' },
      { value: 'debit_card', label: 'Tarjeta de débito' },
      { value: 'check', label: 'Cheque' },
    ],
    providers: mockProviders,
    statuses: [
      { value: 'paid', label: 'Pagado' },
      { value: 'pending', label: 'Pendiente' },
      { value: 'overdue', label: 'Vencido' },
      { value: 'partial', label: 'Pago Parcial' },
      { value: 'audited', label: 'Auditado' },
    ],
    users: [
      { value: '', label: 'Seleccionar' },
      ...expenseUserOptions.map(user => ({ value: user, label: user })),
    ],
  }), [accountingAccountOptions, businessUnits, businesses]);

  const sortedExpenses = useMemo(() => {
    if (!sortField || !sortDirection) return expenses;

    return [...expenses].sort((leftExpense, rightExpense) =>
      compareSortValues(leftExpense[sortField], rightExpense[sortField], sortDirection),
    );
  }, [expenses, sortDirection, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
        return;
      }

      if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
        return;
      }
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 text-[#147514]" />;
    }
    return <ArrowDown className="h-4 w-4 text-[#147514]" />;
  };

  const handleResizeStart = (event: ReactMouseEvent, columnKey: string) => {
    event.preventDefault();
    setResizingColumn(columnKey);
    setResizeStartX(event.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  useEffect(() => {
    if (!resizingColumn) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      const diff = event.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);

      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  const isColumnVisible = (key: string) => {
    const column = columns.find(item => item.key === key);
    return column ? column.visible : true;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    onExpensesChange(prevExpenses =>
      prevExpenses.map(expense =>
        expense.id === id
          ? {
              ...expense,
              ...updates,
              updatedAt: new Date(),
            }
          : expense,
      ),
    );
  };

  const updateExpenseWorkflow = (expenseId: string, updates: Partial<ExpenseWorkflowState>) => {
    const expense = expenses.find(item => item.id === expenseId);
    if (!expense) return;

    setWorkflowByExpenseId(prev => ({
      ...prev,
      [expenseId]: {
        ...getDefaultExpenseWorkflow(expense),
        ...prev[expenseId],
        ...updates,
      },
    }));
  };

  const getExpenseWorkflow = (expense: Expense) => {
    return workflowByExpenseId[expense.id] ?? getDefaultExpenseWorkflow(expense);
  };

  const handleDuplicate = (id: string) => {
    const expenseToDuplicate = expenses.find(expense => expense.id === id);
    if (!expenseToDuplicate) return;

    onExpensesChange(prevExpenses => [
      ...prevExpenses,
      {
        ...expenseToDuplicate,
        id: `${expenseToDuplicate.id}-copy-${Date.now()}`,
        folio: `${expenseToDuplicate.folio}-COPY`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  };

  const handleDelete = (id: string) => {
    onExpensesChange(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
  };

  const handlePay = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;

    updateExpense(id, {
      amountPaid: expense.amount,
      paymentDate: new Date(),
      status: 'paid',
    });
  };

  const handleAudit = (id: string) => {
    setEditingRowId(id);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <SortableHeader columnKey="folio" label="Folio" width={columnWidths.folio} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('folio')} />
              <SortableHeader columnKey="businessUnit" label="Unidad" width={columnWidths.businessUnit} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('businessUnit')} />
              <SortableHeader columnKey="business" label="Negocio" width={columnWidths.business} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('business')} />
              <SortableHeader columnKey="providerName" label="Proveedor" width={columnWidths.providerName} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('providerName')} />
              <SortableHeader columnKey="concept" label="Concepto" width={columnWidths.concept} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('concept')} />
              <SortableHeader columnKey="description" label="Descripción" width={columnWidths.description} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('description')} />
              {isColumnVisible('total') && <SortableHeader columnKey="total" label="Total" width={columnWidths.total} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('total')} />}
              {isColumnVisible('taxes') && <SortableHeader columnKey="taxes" label="Impuestos" width={columnWidths.taxes} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('taxes')} />}
              {isColumnVisible('amount') && <SortableHeader columnKey="amount" label="Monto" width={columnWidths.amount} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('amount')} />}
              {isColumnVisible('amountPaid') && <SortableHeader columnKey="amountPaid" label="Abonado" width={columnWidths.amountPaid} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('amountPaid')} />}
              {isColumnVisible('balance') && <StaticHeader columnKey="balance" label="Saldo" width={columnWidths.balance} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} />}
              <SortableHeader columnKey="dueDate" label="F. Vencimiento" width={columnWidths.dueDate} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('dueDate')} />
              <SortableHeader columnKey="paymentDate" label="F. Pago" width={columnWidths.paymentDate} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('paymentDate')} />
              <SortableHeader columnKey="paymentMethod" label="Método de Pago" width={columnWidths.paymentMethod} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('paymentMethod')} />
              <SortableHeader columnKey="accountingAccount" label="Cuenta Contable" width={columnWidths.accountingAccount} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('accountingAccount')} />
              <SortableHeader columnKey="status" label="Estado" width={columnWidths.status} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('status')} />
              <SortableHeader columnKey="attachments" label="Archivos Adjuntos" width={columnWidths.attachments} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('attachments')} />
              <StaticHeader columnKey="authorizer" label="Autoriza" width={columnWidths.authorizer} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} />
              <StaticHeader columnKey="performer" label="Realiza" width={columnWidths.performer} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} />
              <StaticHeader columnKey="audit" label="Auditoría" width={columnWidths.audit} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} />
              <th
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedExpenses.length === 0 ? (
              <tr>
                <td colSpan={21} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <Search className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">{emptyTitle}</p>
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedExpenses.map(expense => (
                <EditableExpenseRow
                  key={expense.id}
                  expense={expense}
                  attachmentsCount={getAttachments(expense).length}
                  columnWidths={columnWidths}
                  isEditing={editingRowId === expense.id}
                  isColumnVisible={isColumnVisible}
                  options={editableRowOptions}
                  workflow={getExpenseWorkflow(expense)}
                  onStartEdit={setEditingRowId}
                  onUpdateExpense={updateExpense}
                  onUpdateWorkflow={updateExpenseWorkflow}
                  onOpenAttachments={onOpenAttachments}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onMarkPaid={handlePay}
                  onAudit={handleAudit}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  columnKey,
  label,
  onResizeStart,
  onSort,
  resizingColumn,
  sortIcon,
  width,
}: {
  columnKey: SortField;
  label: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  onSort: (field: SortField) => void;
  resizingColumn: string | null;
  sortIcon: ReactNode;
  width: number;
}) {
  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
      style={{ width, minWidth: width }}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSort(columnKey)}
          className="flex items-center gap-1 hover:text-[#147514] transition-colors"
        >
          <span>{label}</span>
          {sortIcon}
        </button>
        <ColumnResizeHandle columnKey={columnKey} resizingColumn={resizingColumn} onResizeStart={onResizeStart} />
      </div>
    </th>
  );
}

function StaticHeader({
  columnKey,
  label,
  onResizeStart,
  resizingColumn,
  width,
}: {
  columnKey: string;
  label: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  resizingColumn: string | null;
  width: number;
}) {
  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
      style={{ width, minWidth: width }}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <ColumnResizeHandle columnKey={columnKey} resizingColumn={resizingColumn} onResizeStart={onResizeStart} />
      </div>
    </th>
  );
}

function ColumnResizeHandle({
  columnKey,
  onResizeStart,
  resizingColumn,
}: {
  columnKey: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  resizingColumn: string | null;
}) {
  return (
    <div
      onMouseDown={(event) => onResizeStart(event, columnKey)}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: resizingColumn === columnKey ? '#147514' : '' }}
    />
  );
}
