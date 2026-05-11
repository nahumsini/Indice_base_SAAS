import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { CashFund, PettyCashPaymentMethod } from '../../types/pettyCash.types';

export interface NewPettyCashExpenseInput {
  cashFundId: string;
  collaborator: string;
  department: string;
  category: string;
  concept: string;
  description: string;
  amount: number;
  paymentMethod: PettyCashPaymentMethod;
  approver: string;
  dueDate: Date;
}

interface UploadPettyCashExpenseModalProps {
  funds: CashFund[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewPettyCashExpenseInput) => void;
}

const defaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
};

export function UploadPettyCashExpenseModal({
  funds,
  isOpen,
  onClose,
  onSubmit,
}: UploadPettyCashExpenseModalProps) {
  const firstFundId = funds[0]?.id ?? '';
  const [cashFundId, setCashFundId] = useState(firstFundId);
  const [collaborator, setCollaborator] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('Operating supplies');
  const [concept, setConcept] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PettyCashPaymentMethod>('cash');
  const [approver, setApprover] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);

  const selectedFund = useMemo(() => funds.find(fund => fund.id === cashFundId), [cashFundId, funds]);

  useEffect(() => {
    if (isOpen) {
      setCashFundId(firstFundId);
      setDueDate(defaultDueDate());
    }
  }, [firstFundId, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!cashFundId || !collaborator.trim() || !concept.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    onSubmit({
      cashFundId,
      collaborator: collaborator.trim(),
      department: department.trim() || selectedFund?.department || 'Operations',
      category,
      concept: concept.trim(),
      description: description.trim(),
      amount: parsedAmount,
      paymentMethod,
      approver: approver.trim() || selectedFund?.custodian || 'Operations Manager',
      dueDate: new Date(`${dueDate}T12:00:00`),
    });

    setCollaborator('');
    setDepartment('');
    setCategory('Operating supplies');
    setConcept('');
    setDescription('');
    setAmount('');
    setPaymentMethod('cash');
    setApprover('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-950/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between bg-[#147514] px-5 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">Upload Expense</h2>
            <p className="mt-1 text-sm text-green-100">Register cash assigned to a collaborator and keep receipt control visible.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Close upload expense modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Cash fund</span>
              <select
                value={cashFundId}
                onChange={(event) => setCashFundId(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                required
              >
                {funds.map((fund) => (
                  <option key={fund.id} value={fund.id}>{fund.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Collaborator</span>
              <input
                value={collaborator}
                onChange={(event) => setCollaborator(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Who receives the cash"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Department</span>
              <input
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={selectedFund?.department ?? 'Operations'}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="Operating supplies">Operating supplies</option>
                <option value="Transportation">Transportation</option>
                <option value="Repairs">Repairs</option>
                <option value="Customer recovery">Customer recovery</option>
                <option value="Guest service">Guest service</option>
              </select>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Concept</span>
              <input
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Short operational reason"
                required
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="What is the cash for?"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Amount</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                min="1"
                placeholder="0"
                type="number"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Due date</span>
              <input
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                type="date"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Payment method</span>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PettyCashPaymentMethod)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="cash">Cash</option>
                <option value="debit_card">Debit card</option>
                <option value="transfer">Transfer</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Approver</span>
              <input
                value={approver}
                onChange={(event) => setApprover(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={selectedFund?.custodian ?? 'Operations Manager'}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 bg-[#147514] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#147514] shadow-sm transition hover:bg-green-50"
          >
            Upload Expense
          </button>
        </div>
      </form>
    </div>
  );
}
