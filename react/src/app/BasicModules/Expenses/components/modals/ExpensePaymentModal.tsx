import { Check, HandCoins, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import type { Expense } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';

type ExpensePaymentModalProps = {
  expense: Expense;
  onClose: () => void;
  onSubmit: (expenseId: string, amount: number, paymentDate: Date) => void;
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function ExpensePaymentModal({ expense, onClose, onSubmit }: ExpensePaymentModalProps) {
  const t = useFinanceTranslations();
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(formatDateInputValue(new Date()));

  const currentPaid = Math.min(expense.amountPaid ?? 0, expense.total);
  const remainingBalance = Math.max(expense.total - currentPaid, 0);
  const paymentAmount = toMoneyNumber(amount);
  const nextPaid = Math.min(expense.total, currentPaid + paymentAmount);
  const newBalance = Math.max(expense.total - nextPaid, 0);
  const exceedsBalance = paymentAmount > remainingBalance;
  const canSubmit = remainingBalance > 0 && paymentAmount > 0 && !exceedsBalance;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(expense.id, paymentAmount, toDateValue(paymentDate));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-[620px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#147514] px-6 py-4 text-white dark:bg-[#0b3f1b]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <HandCoins className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-white">{t.expenses.payment.title}</h3>
              <p className="mt-1 max-w-xl text-sm leading-5 text-white/80">{t.expenses.payment.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]">
                <HandCoins className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-950 dark:text-white">{t.expenses.payment.sectionTitle}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{t.expenses.payment.sectionDescription}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{expense.folio} - {expense.concept}</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <FieldLabel label={t.expenses.payment.amount} required />
                  <input
                    autoFocus
                    inputMode="decimal"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label>
                  <FieldLabel label={t.expenses.payment.date} required />
                  <input
                    required
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-4 md:grid-cols-4">
                <PaymentMetric label={t.expenses.payment.total} value={formatCurrency(expense.total, expense.currency)} />
                <PaymentMetric label={t.expenses.payment.currentPaid} value={formatCurrency(currentPaid, expense.currency)} />
                <PaymentMetric label={t.expenses.payment.remainingBalance} value={formatCurrency(remainingBalance, expense.currency)} warning={remainingBalance > 0} />
                <PaymentMetric label={t.expenses.payment.newBalance} value={formatCurrency(newBalance, expense.currency)} strong />
              </div>

              {remainingBalance <= 0 && (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">{t.expenses.payment.noBalance}</p>
              )}
              {exceedsBalance && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">{t.expenses.payment.amountExceedsBalance}</p>
              )}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-3 bg-[#147514] px-6 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-[#0b3f1b]">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white">
            {t.common.cancel}
          </button>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] shadow-sm transition hover:bg-slate-100 hover:text-[#147514] disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-[#147514]/50">
            <Check className="h-4 w-4" />
            {t.expenses.payment.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>;
}

function PaymentMetric({ label, strong, value, warning }: { label: string; strong?: boolean; value: string; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? 'font-extrabold text-[#147514]' : warning ? 'font-bold text-amber-700 dark:text-amber-300' : 'font-bold text-slate-900 dark:text-slate-100'}`}>{value}</p>
    </div>
  );
}

function toMoneyNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateValue(value: string) {
  const parsedDate = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}
