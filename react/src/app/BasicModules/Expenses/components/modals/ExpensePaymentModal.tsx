import { Check, HandCoins, Loader2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import type { PaymentAccount } from '../../PaymentAccounts/types';
import type { Expense } from '../../types/expenses.types';
import { isBackendId } from '../../adapters/adapter.utils';
import { formatCurrency } from '../../utils/expenses.utils';

type ExpensePaymentModalProps = {
  expense: Expense;
  onClose: () => void;
  onSubmit: (expenseId: string, amount: number, paymentAccountId: string, paymentDate: Date) => void | Promise<void>;
  paymentAccounts: PaymentAccount[];
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function ExpensePaymentModal({ expense, onClose, onSubmit, paymentAccounts }: ExpensePaymentModalProps) {
  const t = useExpensesTranslations();
  const [amount, setAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(expense.paymentAccountId ?? '');
  const [paymentDate, setPaymentDate] = useState(formatDateInputValue(new Date()));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eligiblePaymentAccounts = useMemo(() => (
    paymentAccounts.filter(account => (
      account.isActive
      && account.currency === expense.currency
      && (!isBackendId(expense.id) || isBackendId(account.id))
    ))
  ), [expense.currency, expense.id, paymentAccounts]);
  const activePaymentAccountId = eligiblePaymentAccounts.some(account => account.id === paymentAccountId) ? paymentAccountId : '';
  const selectedPaymentAccountId = activePaymentAccountId || eligiblePaymentAccounts[0]?.id || '';
  const selectedPaymentAccount = eligiblePaymentAccounts.find(account => account.id === selectedPaymentAccountId);
  const currentPaid = Math.min(expense.amountPaid ?? 0, expense.total);
  const remainingBalance = Math.max(expense.total - currentPaid, 0);
  const paymentAmount = toMoneyNumber(amount);
  const nextPaid = Math.min(expense.total, currentPaid + paymentAmount);
  const newBalance = Math.max(expense.total - nextPaid, 0);
  const exceedsBalance = paymentAmount > remainingBalance;
  const canSubmit = remainingBalance > 0 && paymentAmount > 0 && Boolean(selectedPaymentAccountId) && !exceedsBalance && !isSubmitting;

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(expense.id, paymentAmount, selectedPaymentAccountId, toDateValue(paymentDate));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo registrar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IndiceModalFrame
      busy={isSubmitting}
      contentClassName="sm:max-w-[560px]"
      description={t.expenses.payment.subtitle}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50">
            {t.common.cancel}
          </button>
          <button form="expense-payment-form" type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t.expenses.payment.save}
          </button>
        </div>
      )}
      footerSummary={formatCurrency(newBalance, expense.currency)}
      icon={<HandCoins className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => !open && handleClose()}
      open
      title={t.expenses.payment.title}
      tone="green"
    >
      <form
        id="expense-payment-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error ? <IndiceModalValidation messages={[error]} tone="error" /> : null}
          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-950 dark:text-white">{expense.concept}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{expense.folio}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#147514]/20 bg-[#147514]/8 px-3 py-1 text-xs font-bold text-[#147514]">
                  {expense.currency}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 dark:divide-slate-700 dark:border-slate-700">
              <PaymentMetric label={t.expenses.payment.total} value={formatCurrency(expense.total, expense.currency)} />
              <PaymentMetric label={t.expenses.payment.currentPaid} value={formatCurrency(currentPaid, expense.currency)} />
              <PaymentMetric label={t.expenses.payment.remainingBalance} value={formatCurrency(remainingBalance, expense.currency)} warning={remainingBalance > 0} />
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <FieldLabel label={t.expenses.payment.amount} required />
                <div className="relative">
                  <input
                    autoFocus
                    inputMode="decimal"
                    max={remainingBalance}
                    min="0"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={`${inputClass} pr-16 text-lg font-bold`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400">{expense.currency}</span>
                </div>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <FieldLabel label={t.paymentAccounts.columns.name?.label ?? t.paymentAccounts.headerTitle} required />
                  <select
                    required
                    value={selectedPaymentAccountId}
                    onChange={(event) => setPaymentAccountId(event.target.value)}
                    className={inputClass}
                  >
                    {eligiblePaymentAccounts.length === 0 ? (
                      <option value="">{t.paymentAccounts.table.emptyTitle}</option>
                    ) : null}
                    {eligiblePaymentAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {formatCurrency(account.balance, account.currency)}
                      </option>
                    ))}
                  </select>
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

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">{t.expenses.payment.newBalance}</p>
                  <p className="mt-1 text-xl font-semibold text-[#147514]">{formatCurrency(newBalance, expense.currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">{t.paymentAccounts.columns.balance?.label ?? t.paymentAccounts.headerTitle}</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {selectedPaymentAccount ? formatCurrency(selectedPaymentAccount.balance - paymentAmount, selectedPaymentAccount.currency) : '-'}
                  </p>
                </div>
              </div>

              {remainingBalance <= 0 && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">{t.expenses.payment.noBalance}</p>
              )}
              {exceedsBalance && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">{t.expenses.payment.amountExceedsBalance}</p>
              )}
            </div>
          </section>
      </form>
    </IndiceModalFrame>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>;
}

function PaymentMetric({ label, strong, value, warning }: { label: string; strong?: boolean; value: string; warning?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-4 text-center sm:px-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-sm ${strong ? 'font-semibold text-[#147514]' : warning ? 'font-semibold text-amber-700 dark:text-amber-300' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>{value}</p>
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
