import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
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
  onSubmit: (input: NewPettyCashExpenseInput) => void | Promise<void>;
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
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!cashFundId || !collaborator.trim() || !concept.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSubmit({
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
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The expense could not be saved.');
      setIsSaving(false);
      return;
    }

    setCollaborator('');
    setDepartment('');
    setCategory('Operating supplies');
    setConcept('');
    setDescription('');
    setAmount('');
    setPaymentMethod('cash');
    setApprover('');
    setIsSaving(false);
    onClose();
  };

  return (
    <IndiceModalFrame
      busy={isSaving}
      contentClassName="sm:max-w-3xl"
      description="Register cash assigned to a collaborator and keep receipt control visible."
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" disabled={isSaving} onClick={onClose} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50">Cancel</button>
          <button form="upload-petty-cash-expense-form" type="submit" disabled={isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] transition hover:bg-green-50 disabled:opacity-50">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload expense
          </button>
        </div>
      )}
      footerSummary={amount ? `${amount} · ${selectedFund?.name ?? 'Cash fund'}` : selectedFund?.name ?? 'Cash fund'}
      icon={<Upload className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => !open && onClose()}
      open={isOpen}
      title="Upload expense"
      tone="green"
    >
      <form
        id="upload-petty-cash-expense-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Cash fund</span>
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
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Collaborator</span>
              <input
                value={collaborator}
                onChange={(event) => setCollaborator(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Who receives the cash"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Department</span>
              <input
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={selectedFund?.department ?? 'Operations'}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</span>
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
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Concept</span>
              <input
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Short operational reason"
                required
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="What is the cash for?"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount</span>
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
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Due date</span>
              <input
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                type="date"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Payment method</span>
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
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Approver</span>
              <input
                value={approver}
                onChange={(event) => setApprover(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-green-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={selectedFund?.custodian ?? 'Operations Manager'}
              />
            </label>
          </div>
      </form>
    </IndiceModalFrame>
  );
}
