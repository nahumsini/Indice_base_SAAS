import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertTriangle, Columns3, FileUp, Info, Search, WalletCards } from 'lucide-react';
import { ColumnasConfigModal } from '../../../components/rh/ColumnasConfigModal';
import type { CashFund, PettyCashExpense, PettyCashExpenseStatus } from '../types/pettyCash.types';
import { formatPettyCashCurrency, getPettyCashSummary } from '../utils/pettyCash.utils';
import {
  PettyCashExpenseTable,
  type PettyCashColumnConfig,
} from './components/PettyCashExpenseTable';
import {
  UploadPettyCashExpenseModal,
  type NewPettyCashExpenseInput,
} from './components/UploadPettyCashExpenseModal';

interface CashProps {
  expenses: PettyCashExpense[];
  funds: CashFund[];
  onExpensesChange: Dispatch<SetStateAction<PettyCashExpense[]>>;
  onFundsChange: Dispatch<SetStateAction<CashFund[]>>;
}

const initialColumns: PettyCashColumnConfig[] = [
  { key: 'folio', label: 'Folio', visible: true, sortKey: 'folio' },
  { key: 'cashFundName', label: 'Cash fund', visible: true, sortKey: 'cashFundName' },
  { key: 'collaborator', label: 'Collaborator', visible: true, sortKey: 'collaborator' },
  { key: 'concept', label: 'Concept', visible: true, sortKey: 'concept' },
  { key: 'amountIssued', label: 'Issued', visible: true, sortKey: 'amountIssued', align: 'right' },
  { key: 'amountSettled', label: 'Settled', visible: true, sortKey: 'amountSettled', align: 'right' },
  { key: 'balance', label: 'Balance', visible: true, sortKey: 'balance', align: 'right' },
  { key: 'status', label: 'Status', visible: true, sortKey: 'status' },
  { key: 'auditStatus', label: 'Audit', visible: true, sortKey: 'auditStatus' },
  { key: 'dueDate', label: 'Due date', visible: true, sortKey: 'dueDate' },
  { key: 'receipts', label: 'Receipts', visible: true, sortKey: 'receiptCount', align: 'center' },
  { key: 'approver', label: 'Approver', visible: false, sortKey: 'approver' },
  { key: 'actions', label: 'Actions', visible: true, align: 'right' },
];

export default function Caja({
  expenses,
  funds,
  onExpensesChange,
  onFundsChange,
}: CashProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fundFilter, setFundFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<PettyCashExpenseStatus | 'all'>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [columns, setColumns] = useState<PettyCashColumnConfig[]>(initialColumns);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch = normalizedSearch.length === 0
        || expense.folio.toLowerCase().includes(normalizedSearch)
        || expense.collaborator.toLowerCase().includes(normalizedSearch)
        || expense.concept.toLowerCase().includes(normalizedSearch)
        || expense.description.toLowerCase().includes(normalizedSearch)
        || expense.cashFundName.toLowerCase().includes(normalizedSearch);
      const matchesFund = fundFilter === 'all' || expense.cashFundId === fundFilter;
      const matchesDepartment = departmentFilter === 'all' || expense.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;

      return matchesSearch && matchesFund && matchesDepartment && matchesStatus;
    });
  }, [departmentFilter, expenses, fundFilter, searchTerm, statusFilter]);

  const departments = useMemo(() => {
    return ['all', ...Array.from(new Set(expenses.map(expense => expense.department)))];
  }, [expenses]);

  const summary = useMemo(() => getPettyCashSummary(filteredExpenses), [filteredExpenses]);
  const selectedCount = filteredExpenses.filter(expense => expense.balance > 0).length;

  const handleUploadExpense = (input: NewPettyCashExpenseInput) => {
    const selectedFund = funds.find(fund => fund.id === input.cashFundId);
    if (!selectedFund) return;

    const nextNumber = expenses.length + 1;
    const newExpense: PettyCashExpense = {
      id: `pc-exp-${Date.now()}`,
      folio: `PC-2026-${String(nextNumber).padStart(3, '0')}`,
      date: new Date(),
      cashFundId: selectedFund.id,
      cashFundName: selectedFund.name,
      businessUnit: selectedFund.businessUnit,
      business: selectedFund.business,
      department: input.department,
      collaborator: input.collaborator,
      category: input.category,
      concept: input.concept,
      description: input.description,
      amountIssued: input.amount,
      amountSettled: 0,
      balance: input.amount,
      receiptCount: 0,
      paymentMethod: input.paymentMethod,
      approver: input.approver,
      dueDate: input.dueDate,
      status: 'pending_receipt',
      auditStatus: 'not_reviewed',
    };

    onExpensesChange(currentExpenses => [newExpense, ...currentExpenses]);
    onFundsChange(currentFunds =>
      currentFunds.map(fund =>
        fund.id === selectedFund.id
          ? {
              ...fund,
              currentBalance: Math.max(0, fund.currentBalance - input.amount),
              pendingReceipts: fund.pendingReceipts + input.amount,
              openRequests: fund.openRequests + 1,
              status: fund.currentBalance - input.amount < fund.limit * 0.25 ? 'low_balance' : fund.status,
            }
          : fund,
      ),
    );
  };

  const updateExpense = (expenseId: string, updates: Partial<PettyCashExpense>) => {
    onExpensesChange(currentExpenses =>
      currentExpenses.map(expense =>
        expense.id === expenseId ? { ...expense, ...updates } : expense,
      ),
    );
  };

  const handleRegisterReceipt = (expenseId: string) => {
    const expense = expenses.find(item => item.id === expenseId);
    if (!expense) return;

    updateExpense(expenseId, {
      receiptCount: expense.receiptCount + 1,
      status: expense.status === 'pending_receipt' || expense.status === 'overdue' ? 'submitted' : expense.status,
      auditStatus: expense.auditStatus === 'not_reviewed' ? 'in_review' : expense.auditStatus,
    });
  };

  const handleSettleExpense = (expenseId: string) => {
    const expense = expenses.find(item => item.id === expenseId);
    if (!expense) return;

    updateExpense(expenseId, {
      amountSettled: expense.amountIssued,
      balance: 0,
      receiptCount: Math.max(1, expense.receiptCount),
      settledDate: new Date(),
      status: 'settled',
      auditStatus: 'audited',
      auditNotes: 'Settled and audited inside Petty Cash.',
    });

    onFundsChange(currentFunds =>
      currentFunds.map(fund =>
        fund.id === expense.cashFundId
          ? {
              ...fund,
              pendingReceipts: Math.max(0, fund.pendingReceipts - expense.balance),
              openRequests: Math.max(0, fund.openRequests - 1),
            }
          : fund,
      ),
    );
  };

  const handleRejectExpense = (expenseId: string) => {
    const expense = expenses.find(item => item.id === expenseId);
    if (!expense) return;

    updateExpense(expenseId, {
      amountSettled: 0,
      balance: 0,
      status: 'rejected',
      auditStatus: 'flagged',
      auditNotes: 'Rejected inside Petty Cash and balance returned to the fund.',
    });

    onFundsChange(currentFunds =>
      currentFunds.map(fund =>
        fund.id === expense.cashFundId
          ? {
              ...fund,
              currentBalance: fund.currentBalance + expense.balance,
              pendingReceipts: Math.max(0, fund.pendingReceipts - expense.balance),
              openRequests: Math.max(0, fund.openRequests - 1),
            }
          : fund,
      ),
    );
  };

  const handleDeleteExpense = (expenseId: string) => {
    onExpensesChange(currentExpenses => currentExpenses.filter(expense => expense.id !== expenseId));
  };

  const handleAuditExpense = (expenseId: string) => {
    const expense = expenses.find(item => item.id === expenseId);
    if (!expense) return;

    updateExpense(expenseId, {
      auditStatus: expense.balance > 0 ? 'flagged' : 'audited',
      auditNotes: expense.balance > 0
        ? 'Audit flagged an open collaborator balance inside Petty Cash.'
        : 'Internal audit completed inside Petty Cash.',
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#147514] text-white">
              <WalletCards className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cash</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Track cash assigned to collaborators, receipts, pending balances, and settlement status.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsColumnsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-[#147514] shadow-sm transition hover:bg-green-50 dark:border-green-800 dark:bg-gray-900 dark:text-green-300"
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </button>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#147514] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-700"
            >
              <FileUp className="h-4 w-4" />
              Upload Expense
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Filters</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(170px,1fr))]">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Search expense</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                placeholder="Folio, collaborator, concept, fund"
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cash fund</span>
            <select
              value={fundFilter}
              onChange={(event) => setFundFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">All funds</option>
              {funds.map((fund) => (
                <option key={fund.id} value={fund.id}>{fund.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Department</span>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              {departments.map((department) => (
                <option key={department} value={department}>{department === 'all' ? 'All departments' : department}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PettyCashExpenseStatus | 'all')}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="pending_receipt">Pending receipt</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="settled">Settled</option>
              <option value="overdue">Overdue</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <InlineMetric label="Issued" value={formatPettyCashCurrency(summary.totalIssued)} />
            <InlineMetric label="Settled" value={formatPettyCashCurrency(summary.totalSettled)} />
            <InlineMetric label="Pending balance" value={formatPettyCashCurrency(summary.pendingBalance)} tone={summary.pendingBalance > 0 ? 'warning' : 'success'} />
            <InlineMetric label="Overdue" value={String(summary.overdueCount)} tone={summary.overdueCount > 0 ? 'danger' : 'success'} />
            <InlineMetric label="Visible" value={`${filteredExpenses.length} of ${expenses.length}`} />
          </div>
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-[#147514] dark:bg-green-900/30 dark:text-green-300">
            {selectedCount} open balance{selectedCount === 1 ? '' : 's'}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Cash control summary: {formatPettyCashCurrency(summary.pendingBalance)} pending in collaborator balances, {summary.pendingReceiptCount} receipt case{summary.pendingReceiptCount === 1 ? '' : 's'} need follow-up.
          </p>
        </div>
      </section>

      <PettyCashExpenseTable
        columns={columns}
        expenses={filteredExpenses}
        funds={funds}
        onAuditExpense={handleAuditExpense}
        onDeleteExpense={handleDeleteExpense}
        onRegisterReceipt={handleRegisterReceipt}
        onRejectExpense={handleRejectExpense}
        onSettleExpense={handleSettleExpense}
      />

      {summary.overdueCount > 0 && (
        <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
            <p className="text-sm text-red-900 dark:text-red-100">
              Control risk: {summary.overdueCount} petty cash expense{summary.overdueCount === 1 ? '' : 's'} overdue. Settle or reject before closing the period.
            </p>
          </div>
        </section>
      )}

      <UploadPettyCashExpenseModal
        funds={funds}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUploadExpense}
      />

      {isColumnsModalOpen && (
        <ColumnasConfigModal
          columns={columns.map(column => ({
            description: `Show ${column.label.toLocaleLowerCase()} in the cash table.`,
            id: column.key,
            label: column.label,
            locked: column.key === 'folio' || column.key === 'actions',
            visible: column.visible,
          }))}
          defaultColumns={initialColumns.map(column => ({
            description: `Show ${column.label.toLocaleLowerCase()} in the cash table.`,
            id: column.key,
            label: column.label,
            locked: column.key === 'folio' || column.key === 'actions',
            visible: column.visible,
          }))}
          isOpen
          onClose={() => setIsColumnsModalOpen(false)}
          onSave={(nextColumns) => {
            const visibilityByKey = new Map(nextColumns.map(column => [column.id, column.visible]));
            setColumns(current => current.map(column => ({
              ...column,
              visible: visibilityByKey.get(column.key) ?? column.visible,
            })));
            setIsColumnsModalOpen(false);
          }}
          theme="expenses"
        />
      )}
    </div>
  );
}

function InlineMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const valueClass = {
    neutral: 'text-gray-900 dark:text-white',
    success: 'text-green-700 dark:text-green-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
  }[tone];

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-[#147514]" />
      <div>
        <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
