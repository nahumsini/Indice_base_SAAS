import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Search, Plus, X, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Columns3, GripVertical, Upload } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { mockExpenses, mockProviders } from '../data/expenses.mock';
import { Expense, ExpenseStatus } from '../types/expenses.types';
import { formatCurrency } from '../utils/expenses.utils';
import { AttachmentsModal } from './components/AttachmentsModal';
import {
  EditableExpenseRow,
  type EditableExpenseRowOptions,
  type ExpenseWorkflowState,
} from './components/EditableExpenseRow';

type PeriodFilter = 'this_month' | 'last_month' | 'two_months_ago' | 'this_year' | 'last_year' | 'custom';
type SortField = keyof Expense;
type SortDirection = 'asc' | 'desc' | null;

type ColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
  fixed?: boolean; // Para columnas que no se pueden ocultar
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

const formatDateInputValue = (date?: Date): string => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

const getDefaultExpenseWorkflow = (expense: Expense): ExpenseWorkflowState => ({
  authorizer: expense.approver ?? '',
  performer: '',
  auditNotes: '',
});

interface ExpensesProps {
  expenses?: Expense[];
  onExpensesChange?: Dispatch<SetStateAction<Expense[]>>;
}

export default function Expenses({ expenses: controlledExpenses, onExpensesChange }: ExpensesProps = {}) {
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(mockExpenses);
  const expenses = controlledExpenses ?? localExpenses;
  const setExpenses = onExpensesChange ?? setLocalExpenses;
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Column visibility modal state
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  
  // Add expense modal state
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [attachmentsExpense, setAttachmentsExpense] = useState<Expense | null>(null);
  const [attachmentsByExpenseId, setAttachmentsByExpenseId] = useState<Record<string, string[]>>({});
  const [workflowByExpenseId, setWorkflowByExpenseId] = useState<Record<string, ExpenseWorkflowState>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  
  // Columns configuration
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'folio', label: 'Folio', visible: true, fixed: true },
    { key: 'businessUnit', label: 'Unidad', visible: true },
    { key: 'business', label: 'Negocio', visible: true },
    { key: 'providerName', label: 'Proveedor', visible: true },
    { key: 'concept', label: 'Concepto', visible: true },
    { key: 'description', label: 'Descripción', visible: true },
    { key: 'total', label: 'Total', visible: true },
    { key: 'taxes', label: 'Impuestos (IVA / HST / VAT)', visible: true },
    { key: 'amount', label: 'Monto', visible: true },
    { key: 'amountPaid', label: 'Abonado', visible: true },
    { key: 'balance', label: 'Saldo', visible: true },
    { key: 'dueDate', label: 'Fecha de vencimiento', visible: true },
    { key: 'paymentDate', label: 'Fecha de pago', visible: true },
    { key: 'paymentMethod', label: 'Método de pago', visible: true },
    { key: 'accountingAccount', label: 'Cuenta contable', visible: true },
    { key: 'status', label: 'Estado', visible: true },
    { key: 'attachments', label: 'Archivos adjuntos', visible: true },
    { key: 'authorizer', label: 'Autoriza', visible: true },
    { key: 'performer', label: 'Realiza', visible: true },
    { key: 'audit', label: 'Auditoría', visible: true },
    { key: 'actions', label: 'Acciones', visible: true, fixed: true },
  ]);
  
  // Column resizing states
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
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
    audit: 160,
    actions: 270,
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Get unique business units
  const businessUnits = useMemo(() => {
    const units = expenses.map(e => e.businessUnit);
    return ['all', ...Array.from(new Set(units))];
  }, [expenses]);

  const businesses = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.business)));
  }, [expenses]);

  // Get providers for filter
  const providers = useMemo(() => {
    return [{ id: 'all', name: 'Todos los proveedores' }, ...mockProviders];
  }, []);

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
    businessUnits: businessUnits
      .filter(unit => unit !== 'all')
      .map(unit => ({ value: unit, label: unit })),
    businesses: businesses.map(business => ({ value: business, label: business })),
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

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.folio.toLowerCase().includes(search) ||
        expense.concept.toLowerCase().includes(search) ||
        expense.description?.toLowerCase().includes(search) ||
        expense.providerName?.toLowerCase().includes(search)
      );
    }

    // Period filter
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (periodFilter) {
      case 'this_month':
        filtered = filtered.filter(e => {
          const date = new Date(e.date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        break;
      case 'last_month':
        filtered = filtered.filter(e => {
          const date = new Date(e.date);
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        });
        break;
      case 'two_months_ago':
        filtered = filtered.filter(e => {
          const date = new Date(e.date);
          const twoMonthsAgo = currentMonth - 2;
          const targetMonth = twoMonthsAgo < 0 ? 12 + twoMonthsAgo : twoMonthsAgo;
          const targetYear = twoMonthsAgo < 0 ? currentYear - 1 : currentYear;
          return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
        });
        break;
      case 'this_year':
        filtered = filtered.filter(e => new Date(e.date).getFullYear() === currentYear);
        break;
      case 'last_year':
        filtered = filtered.filter(e => new Date(e.date).getFullYear() === currentYear - 1);
        break;
    }

    // Business unit filter
    if (businessUnitFilter !== 'all') {
      filtered = filtered.filter(e => e.businessUnit === businessUnitFilter);
    }

    // Provider filter
    if (providerFilter !== 'all') {
      filtered = filtered.filter(e => e.providerId === providerFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
    }

    return filtered;
  }, [expenses, searchTerm, periodFilter, businessUnitFilter, providerFilter, statusFilter, sortField, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const paid = filteredExpenses.reduce((sum, e) => sum + (e.amountPaid || 0), 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [filteredExpenses]);

  // Sorting handler with 3 states: neutral → asc → desc → neutral
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Same field, cycle through states
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        // Reset to neutral
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon based on current state (using green color #147514)
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 text-[#147514]" />;
    }
    return <ArrowDown className="h-4 w-4 text-[#147514]" />;
  };

  // Column resizing handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    setResizingColumn(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  // Column resizing effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return;

      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff); // Minimum 80px

      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  const handleDelete = (id: string) => {
    console.log('Delete expense:', id);
    // TODO: Implement delete
  };

  const handleDuplicate = (id: string) => {
    console.log('Duplicate expense:', id);
    // TODO: Implement duplicate
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prevExpenses =>
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
    // TODO: Implement audit
  };

  const getExpenseAttachments = (expense: Expense) => {
    return attachmentsByExpenseId[expense.id] ?? expense.attachments ?? [];
  };

  const openAttachmentsModal = (expense: Expense) => {
    setAttachmentsExpense(expense);
  };

  const closeAttachmentsModal = () => {
    setAttachmentsExpense(null);
  };

  const saveExpenseAttachments = (attachments: string[]) => {
    if (!attachmentsExpense) return;

    setAttachmentsByExpenseId(prev => ({
      ...prev,
      [attachmentsExpense.id]: attachments,
    }));
  };

  const getExpenseWorkflow = (expense: Expense) => {
    return workflowByExpenseId[expense.id] ?? getDefaultExpenseWorkflow(expense);
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

  const openCreateExpenseModal = () => {
    setEditingRowId(null);
    setEditingExpense(null);
    setIsAddExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsAddExpenseModalOpen(false);
    setEditingExpense(null);
  };

  // Helper function to check if column is visible
  const isColumnVisible = (key: string) => {
    const column = columns.find(c => c.key === key);
    return column ? column.visible : true;
  };

  // Drag and drop handlers for column reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...columns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    setColumns(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar - Green Background */}
      <div className="bg-[#147514] dark:bg-[#0b3f1b] rounded-2xl shadow-sm dark:shadow-black/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <span className="text-4xl">💰</span>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Gestión de Gastos
              </h1>
              <p className="text-white/90 text-sm mt-1">
                Controla y administra todos los gastos de tu empresa
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setIsColumnModalOpen(true)}
              className="gap-2 bg-white/15 dark:bg-white/10 text-white hover:bg-white/25 dark:hover:bg-white/20 border border-white/20 shadow-sm font-semibold transition-all rounded-lg px-4 py-2.5"
            >
              <Columns3 className="w-4 h-4" />
              Columnas
            </Button>

            <Button
              onClick={openCreateExpenseModal}
              className="gap-2 bg-white text-[#147514] hover:bg-gray-50 dark:bg-white dark:text-[#0b3f1b] dark:hover:bg-gray-100 shadow-md font-bold transition-all rounded-lg px-5 py-2.5"
            >
              <Plus className="w-4 h-4" />
              Nuevo Gasto
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {/* Search - Takes 2 columns */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Folio, concepto o proveedor..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Period Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Periodo
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
            >
              <option value="this_month">Este mes</option>
              <option value="last_month">Mes pasado</option>
              <option value="two_months_ago">Hace dos meses</option>
              <option value="this_year">Este año</option>
              <option value="last_year">Año pasado</option>
              <option value="custom">Personalizada</option>
            </select>
          </div>

          {/* Business Unit Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Unidad
            </label>
            <select
              value={businessUnitFilter}
              onChange={(e) => setBusinessUnitFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
            >
              <option value="all">Todas</option>
              {businessUnits.filter(u => u !== 'all').map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          {/* Business Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Negocio
            </label>
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
            >
              <option value="all">Todos</option>
              <option value="restaurant">Restaurante</option>
              <option value="hotel">Hotel</option>
              <option value="retail">Retail</option>
              <option value="services">Servicios</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Proveedor
            </label>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
            >
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | 'all')}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagado</option>
              <option value="pending">Por Pagar</option>
              <option value="partial">Pago Parcial</option>
              <option value="overdue">Vencido</option>
              <option value="audited">Auditado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats - Inline Style with Enhancements */}
      <div className="space-y-4">
        {/* KPIs with descriptive labels and status indicators */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {/* Total */}
            <div className="flex items-center gap-2">
              <span className="text-lg">💵</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.total)}</span>
              <span className="text-xs">total</span>
            </div>

            <span className="text-gray-300 dark:text-gray-600">•</span>

            {/* Pagado */}
            <div className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(totals.paid)}</span>
              <span className="text-xs">pagado</span>
            </div>

            <span className="text-gray-300 dark:text-gray-600">•</span>

            {/* Pendiente with status */}
            <div className="flex items-center gap-2">
              <span className="text-lg">💸</span>
              <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totals.pending)}</span>
              <span className="text-xs">pendiente</span>
              <span className="text-xs text-gray-400">(por pagar)</span>
              {totals.pending > totals.paid && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                  ALTO
                </span>
              )}
            </div>

            <span className="text-gray-300 dark:text-gray-600">•</span>

            {/* Porcentaje Liquidado with label */}
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                {totals.total > 0 ? ((totals.paid / totals.total) * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-xs">liquidado</span>
              <span className="text-xs text-gray-400">(pagos realizados)</span>
            </div>
          </div>

          {/* Alert badges */}
          <div className="flex items-center gap-2">
            {filteredExpenses.filter(e => e.status === 'overdue').length > 0 && (
              <span className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800">
                ⚠ {filteredExpenses.filter(e => e.status === 'overdue').length} vencido{filteredExpenses.filter(e => e.status === 'overdue').length !== 1 ? 's' : ''}
              </span>
            )}
            {totals.pending > totals.paid && (
              <span className="px-3 py-1 text-xs font-medium bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-full border border-yellow-200 dark:border-yellow-800">
                ⚠ Alto pendiente
              </span>
            )}
          </div>
        </div>

        {/* Mini Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="flex h-full">
              <div
                className="bg-green-500 dark:bg-green-400 transition-all duration-300"
                style={{ width: `${totals.total > 0 ? (totals.paid / totals.total) * 100 : 0}%` }}
              />
              <div
                className="bg-yellow-500 dark:bg-yellow-400 transition-all duration-300"
                style={{ width: `${totals.total > 0 ? ((totals.pending / totals.total) * 100) - (filteredExpenses.filter(e => e.status === 'overdue').reduce((sum, e) => sum + e.amount, 0) / totals.total * 100) : 0}%` }}
              />
              <div
                className="bg-red-500 dark:bg-red-400 transition-all duration-300"
                style={{ width: `${totals.total > 0 ? (filteredExpenses.filter(e => e.status === 'overdue').reduce((sum, e) => sum + e.amount, 0) / totals.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Pagado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>Pendiente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>Vencido</span>
            </div>
          </div>
        </div>

        {/* Smart Insight Strip */}
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-lg px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">
              <span className="font-medium">Resumen del mes:</span>{' '}
              {totals.total > 0 ? ((totals.paid / totals.total) * 100).toFixed(0) : '0'}% liquidado •
              {' '}{filteredExpenses.filter(e => e.status === 'overdue').length > 0 ? (
                <span className="font-medium text-red-600 dark:text-red-400">
                  {filteredExpenses.filter(e => e.status === 'overdue').length} gasto{filteredExpenses.filter(e => e.status === 'overdue').length !== 1 ? 's' : ''} vencido{filteredExpenses.filter(e => e.status === 'overdue').length !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>Sin gastos vencidos</span>
              )} •
              {' '}{filteredExpenses.length} registro{filteredExpenses.length !== 1 ? 's' : ''} este periodo
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                {/* Folio */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.folio, minWidth: columnWidths.folio }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('folio')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Folio</span>
                      {getSortIcon('folio')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'folio')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'folio' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Business Unit */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.businessUnit, minWidth: columnWidths.businessUnit }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('businessUnit')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Unidad</span>
                      {getSortIcon('businessUnit')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'businessUnit')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'businessUnit' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Business */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.business, minWidth: columnWidths.business }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('business')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Negocio</span>
                      {getSortIcon('business')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'business')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'business' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Provider */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.providerName, minWidth: columnWidths.providerName }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('providerName')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Proveedor</span>
                      {getSortIcon('providerName')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'providerName')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'providerName' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Concept */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.concept, minWidth: columnWidths.concept }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('concept')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Concepto</span>
                      {getSortIcon('concept')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'concept')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'concept' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Description */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.description, minWidth: columnWidths.description }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('description')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Descripción</span>
                      {getSortIcon('description')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'description')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'description' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Total */}
                {isColumnVisible('total') && (
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                    style={{ width: columnWidths.total, minWidth: columnWidths.total }}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSort('total')}
                        className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                      >
                        <span>Total</span>
                        {getSortIcon('total')}
                      </button>
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'total')}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: resizingColumn === 'total' ? '#147514' : '' }}
                      />
                    </div>
                  </th>
                )}

                {/* Taxes (IVA / HST / VAT) */}
                {isColumnVisible('taxes') && (
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                    style={{ width: columnWidths.taxes, minWidth: columnWidths.taxes }}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSort('taxes')}
                        className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                      >
                        <span>Impuestos</span>
                        {getSortIcon('taxes')}
                      </button>
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'taxes')}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: resizingColumn === 'taxes' ? '#147514' : '' }}
                      />
                    </div>
                  </th>
                )}

                {/* Amount */}
                {isColumnVisible('amount') && (
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                    style={{ width: columnWidths.amount, minWidth: columnWidths.amount }}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                      >
                        <span>Monto</span>
                        {getSortIcon('amount')}
                      </button>
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'amount')}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: resizingColumn === 'amount' ? '#147514' : '' }}
                      />
                    </div>
                  </th>
                )}

                {/* Amount Paid */}
                {isColumnVisible('amountPaid') && (
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                    style={{ width: columnWidths.amountPaid, minWidth: columnWidths.amountPaid }}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSort('amountPaid')}
                        className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                      >
                        <span>Abonado</span>
                        {getSortIcon('amountPaid')}
                      </button>
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'amountPaid')}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: resizingColumn === 'amountPaid' ? '#147514' : '' }}
                      />
                    </div>
                  </th>
                )}

                {/* Balance */}
                {isColumnVisible('balance') && (
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                    style={{ width: columnWidths.balance, minWidth: columnWidths.balance }}
                  >
                    <div className="flex items-center justify-between">
                      <span>Saldo</span>
                    </div>
                  </th>
                )}

                {/* Due Date */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.dueDate, minWidth: columnWidths.dueDate }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('dueDate')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>F. Vencimiento</span>
                      {getSortIcon('dueDate')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'dueDate')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'dueDate' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Payment Date */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.paymentDate, minWidth: columnWidths.paymentDate }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('paymentDate')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>F. Pago</span>
                      {getSortIcon('paymentDate')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'paymentDate')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'paymentDate' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Payment Method */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.paymentMethod, minWidth: columnWidths.paymentMethod }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('paymentMethod')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Método de Pago</span>
                      {getSortIcon('paymentMethod')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'paymentMethod')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'paymentMethod' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Accounting Account */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.accountingAccount, minWidth: columnWidths.accountingAccount }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('accountingAccount')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Cuenta Contable</span>
                      {getSortIcon('accountingAccount')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'accountingAccount')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'accountingAccount' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Status */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.status, minWidth: columnWidths.status }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Estado</span>
                      {getSortIcon('status')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'status')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'status' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Attachments */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.attachments, minWidth: columnWidths.attachments }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSort('attachments')}
                      className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                    >
                      <span>Archivos Adjuntos</span>
                      {getSortIcon('attachments')}
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'attachments')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'attachments' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                {/* Workflow columns */}
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.authorizer, minWidth: columnWidths.authorizer }}
                >
                  <div className="flex items-center justify-between">
                    <span>Autoriza</span>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'authorizer')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'authorizer' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.performer, minWidth: columnWidths.performer }}
                >
                  <div className="flex items-center justify-between">
                    <span>Realiza</span>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'performer')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'performer' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths.audit, minWidth: columnWidths.audit }}
                >
                  <div className="flex items-center justify-between">
                    <span>Auditoría</span>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'audit')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: resizingColumn === 'audit' ? '#147514' : '' }}
                    />
                  </div>
                </th>

                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <Search className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No se encontraron gastos</p>
                      <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <EditableExpenseRow
                    key={expense.id}
                    expense={expense}
                    attachmentsCount={getExpenseAttachments(expense).length}
                    columnWidths={columnWidths}
                    isEditing={editingRowId === expense.id}
                    isColumnVisible={isColumnVisible}
                    options={editableRowOptions}
                    workflow={getExpenseWorkflow(expense)}
                    onStartEdit={setEditingRowId}
                    onUpdateExpense={updateExpense}
                    onUpdateWorkflow={updateExpenseWorkflow}
                    onOpenAttachments={openAttachmentsModal}
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

      {/* Column Configuration Modal */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#147514] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurar columnas</h2>
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="text-gray-800 dark:text-white/80 hover:text-gray-900 dark:hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Selecciona y ordena las columnas que deseas visualizar en la tabla.
              </p>

              {/* Summary and Actions */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {columns.filter(c => c.visible).length} de {columns.length} columnas visibles
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setColumns(columns.map(c => ({ ...c, visible: true })));
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Seleccionar todas
                  </button>
                  <button
                    onClick={() => {
                      setColumns(columns.map(c => 
                        c.fixed ? c : { ...c, visible: false }
                      ));
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Deseleccionar todas
                  </button>
                </div>
              </div>

              {/* Column List */}
              <div className="space-y-2">
                {columns.map((column, index) => (
                  <div
                    key={column.key}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      column.visible
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    }`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Drag Handle */}
                    <div className="text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Checkbox */}
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.visible}
                        disabled={column.fixed}
                        onChange={(e) => {
                          const newColumns = [...columns];
                          newColumns[index] = { ...column, visible: e.target.checked };
                          setColumns(newColumns);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-[#147514] focus:ring-[#147514] disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {column.label}
                        </span>
                        {column.fixed && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            (Fija)
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsColumnModalOpen(false);
                  // TODO: Save column configuration to localStorage
                }}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#147514] hover:bg-[#105010] rounded-lg transition-colors shadow-sm"
              >
                Aplicar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {attachmentsExpense && (
        <AttachmentsModal
          isOpen={true}
          onClose={closeAttachmentsModal}
          expenseFolio={attachmentsExpense.folio}
          expenseConcept={attachmentsExpense.concept}
          attachments={getExpenseAttachments(attachmentsExpense)}
          onSave={saveExpenseAttachments}
        />
      )}

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            {/* Modal Header */}
            <div className="bg-[#147514] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center">
                  {editingExpense ? (
                    <Pencil className="w-6 h-6 text-gray-900 dark:text-white" />
                  ) : (
                    <Plus className="w-6 h-6 text-gray-900 dark:text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
                  </h2>
                  <p className="text-gray-800 dark:text-white/90 text-sm">
                    {editingExpense ? 'Actualiza los datos del gasto seleccionado' : 'Registra un nuevo gasto en el sistema'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeExpenseModal}
                className="text-gray-800 dark:text-white/80 hover:text-gray-900 dark:hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Información Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Folio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Folio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue={editingExpense?.folio ?? ''}
                      placeholder="EXP-2026-001"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Unidad de Negocio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Unidad de Negocio <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={editingExpense?.businessUnit ?? ''}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      {businessUnits.filter(unit => unit !== 'all').map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  {/* Negocio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Negocio <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={editingExpense?.business ?? ''}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      {businesses.map(business => (
                        <option key={business} value={business}>{business}</option>
                      ))}
                    </select>
                  </div>

                  {/* Proveedor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Proveedor <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={editingExpense?.providerId ?? ''}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar proveedor...</option>
                      {mockProviders.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Expense Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Detalles del Gasto
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {/* Concepto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Concepto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue={editingExpense?.concept ?? ''}
                      placeholder="Ej: Servicios de consultoría"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={editingExpense?.description ?? ''}
                      placeholder="Descripción detallada del gasto..."
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Información Financiera
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Total <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        defaultValue={editingExpense?.total ?? ''}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Impuestos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Impuestos (IVA/HST/VAT) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        defaultValue={editingExpense?.taxes ?? ''}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Monto (auto-calculado) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Monto (Total - Impuestos)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        defaultValue={editingExpense?.amount ?? ''}
                        placeholder="0.00"
                        readOnly
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Cuenta Contable */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Cuenta Contable
                    </label>
                    <input
                      type="text"
                      defaultValue={editingExpense?.accountingAccount ?? ''}
                      placeholder="Ej: 5110"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all font-mono"
                    />
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Método de Pago <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={editingExpense?.paymentMethod ?? ''}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="cash">Efectivo</option>
                      <option value="credit_card">Tarjeta de Crédito</option>
                      <option value="debit_card">Tarjeta de Débito</option>
                      <option value="transfer">Transferencia</option>
                      <option value="check">Cheque</option>
                    </select>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Estado <span className="text-red-500">*</span>
                    </label>
                    <select
                      defaultValue={editingExpense?.status ?? 'pending'}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    >
                      <option value="pending">Por Pagar</option>
                      <option value="paid">Pagado</option>
                      <option value="partial">Pago Parcial</option>
                      <option value="overdue">Vencido</option>
                      <option value="audited">Auditado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Fechas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fecha de Vencimiento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Fecha de Vencimiento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      defaultValue={formatDateInputValue(editingExpense?.dueDate)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Fecha de Pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Fecha de Pago (opcional)
                    </label>
                    <input
                      type="date"
                      defaultValue={formatDateInputValue(editingExpense?.paymentDate)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Archivos Adjuntos
                </h3>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-[#147514] transition-colors">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Arrastra archivos aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Formatos soportados: PDF, JPG, PNG, Excel (Máx. 10MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-[#147514] bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    >
                      Seleccionar archivos
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="text-red-500">*</span> Campos obligatorios
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeExpenseModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement create/update expense logic
                    closeExpenseModal();
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#147514] hover:bg-[#105010] rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  {editingExpense ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingExpense ? 'Guardar cambios' : 'Crear Gasto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
