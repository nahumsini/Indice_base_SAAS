import { ExpenseAccountSelect } from '../table/ExpenseAccountSelect';
import { Check, CheckCircle2, HandCoins, Loader2, Paperclip, X } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import { getExpenseDetailCopy } from '../../Expenses/components/expenseDetail.copy';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import type { PaymentAccount } from '../../PaymentAccounts/types';
import type { Expense } from '../../types/expenses.types';
import { isBackendId } from '../../adapters/adapter.utils';
import { formatCurrency } from '../../utils/expenses.utils';
import { formatExpenseDate } from '../../utils/expenseDates';

type ExpensePaymentModalProps = {
  expense: Expense;
  onClose: () => void;
  onSubmit: (expenseId: string, amount: number, paymentAccountId: string, paymentDate: Date, attachmentFiles: File[], idempotencyKey?: string) => void | Promise<void>;
  paymentAccounts: PaymentAccount[];
};

const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export function ExpensePaymentModal({ expense, onClose, onSubmit, paymentAccounts }: ExpensePaymentModalProps) {
  const t = useExpensesTranslations();
  const copy = t.expenses.payment;
  const detailCopy = getExpenseDetailCopy(useExpensesResolvedLocale());
  const submission = useRef({ busy: false, key: crypto.randomUUID(), payload: '' });
  const [amount, setAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(expense.paymentAccountId ?? '');
  const [paymentDate, setPaymentDate] = useState(formatExpenseDate(new Date())!);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'payment' | 'settlement'>('payment');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const eligiblePaymentAccounts = useMemo(() => paymentAccounts.filter(account => (
    account.isActive && account.currency === expense.currency
    && account.backendType !== 'PETTY_CASH' && account.source !== 'petty_cash'
    && (!isBackendId(expense.id) || isBackendId(account.id))
  )), [expense.currency, expense.id, paymentAccounts]);
  // The operator chooses an account. Never debit the first catalog entry by default.
  const selectedPaymentAccount = eligiblePaymentAccounts.find(account => account.id === paymentAccountId);
  const selectedPaymentAccountId = selectedPaymentAccount?.id ?? '';
  const currentPaid = Math.min(Math.max(expense.amountPaid ?? 0, 0), expense.total);
  const remainingBalance = roundMoney(Math.max(expense.total - currentPaid, 0));
  const paymentAmount = Number(amount);
  const validAmount = Number.isFinite(paymentAmount) && paymentAmount > 0 && roundMoney(paymentAmount) === paymentAmount;
  const newBalance = roundMoney(Math.max(remainingBalance - (validAmount ? paymentAmount : 0), 0));
  const exceedsBalance = paymentAmount > remainingBalance;
  const parsedDate = new Date(`${paymentDate}T00:00:00`);
  const validDate = Boolean(paymentDate) && formatExpenseDate(parsedDate) === paymentDate;
  const canSettle = remainingBalance > 0 && Boolean(selectedPaymentAccountId) && validDate && !isSubmitting;
  const canSubmit = canSettle && validAmount && !exceedsBalance;
  const progress = expense.total > 0 ? Math.min(100, Math.max(0, currentPaid / expense.total * 100)) : 100;
  const money = (value: number) => formatCurrency(value, expense.currency);

  const handleClose = () => { if (!submission.current.busy) onClose(); };
  const submitPayment = async (settle: boolean) => {
    if (!(settle ? canSettle : canSubmit) || submission.current.busy) return;
    const submittedAmount = settle ? remainingBalance : paymentAmount;
    const payload = JSON.stringify([submittedAmount, selectedPaymentAccountId, paymentDate]);
    if (submission.current.payload && submission.current.payload !== payload) submission.current.key = crypto.randomUUID();
    submission.current.payload = payload;
    submission.current.busy = true;
    setError('');
    setIsSubmitting(true);
    setSubmittingAction(settle ? 'settlement' : 'payment');
    try {
      await onSubmit(expense.id, submittedAmount, selectedPaymentAccountId, parsedDate, attachmentFiles, submission.current.key);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.expenses.messages.saveFailed);
    } finally {
      submission.current.busy = false;
      setIsSubmitting(false);
    }
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submitPayment(false); };

  return (
    <IndiceModalFrame busy={isSubmitting} contentClassName="sm:max-w-[680px]" description={copy.subtitle}
      footer={(
        <div className="flex w-full flex-wrap justify-end gap-2">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="min-h-11 rounded-xl border border-white/30 px-4 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50">{t.common.cancel}</button>
          <button type="button" onClick={() => void submitPayment(true)} disabled={!canSettle} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting && submittingAction === 'settlement' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{copy.settle}
          </button>
          <button form="expense-payment-form" type="submit" disabled={!canSubmit} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#147514] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting && submittingAction === 'payment' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{copy.save}
          </button>
        </div>
      )}
      footerSummary={`${copy.remainingBalance}: ${money(remainingBalance)} ${expense.currency}`}
      icon={<HandCoins className="h-5 w-5" />} modalType="standard-form" onOpenChange={open => !open && handleClose()} open title={copy.title} tone="green">
      <form id="expense-payment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <IndiceModalValidation messages={[error]} tone="error" />}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div className="min-w-0"><p className="break-words text-lg font-medium text-slate-950 dark:text-white">{expense.concept}</p><p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{expense.folio}</p></div>
            <span className="shrink-0 rounded-lg bg-[#147514]/10 px-3 py-1.5 text-xs font-medium text-[#147514] dark:text-emerald-300">{expense.currency}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            <PaymentMetric label={copy.total} value={money(expense.total)} />
            <PaymentMetric label={copy.currentPaid} value={money(currentPaid)} />
            <PaymentMetric label={copy.remainingBalance} value={money(remainingBalance)} highlighted />
          </div>
          <div role="progressbar" aria-label={copy.currentPaid} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="h-1.5 bg-slate-100 dark:bg-slate-700"><div className="h-full bg-[#147514] transition-all" style={{ width: `${progress}%` }} /></div>
        </section>

        <fieldset disabled={isSubmitting} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><FieldLabel label={copy.amount} required /><div className="relative"><input autoFocus aria-label={copy.amount} inputMode="decimal" max={remainingBalance} min="0.01" step="0.01" placeholder="0.00" type="number" value={amount} onChange={event => setAmount(event.target.value)} className={`${inputClass} pr-16 tabular-nums`} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{expense.currency}</span></div></label>
            <label><FieldLabel label={copy.date} required /><input aria-label={copy.date} required type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} className={inputClass} /></label>
          </div>
          <div><FieldLabel label={copy.account} required /><ExpenseAccountSelect label={copy.account} value={selectedPaymentAccountId} onChange={setPaymentAccountId} disabled={isSubmitting}
            allowEmpty={false} emptyLabel={t.common.select}
            options={eligiblePaymentAccounts.map(account => ({ value: account.id, label: `${account.name} · ${money(account.balance)} ${account.currency}` }))} />
            <p className={`mt-2 text-xs ${eligiblePaymentAccounts.length ? 'text-slate-500 dark:text-slate-400' : 'text-amber-700 dark:text-amber-300'}`}>{eligiblePaymentAccounts.length ? copy.chooseAccount : copy.noAccounts}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm font-medium text-[#147514] focus-within:ring-2 focus-within:ring-[#147514]/30 dark:text-emerald-300"><Paperclip className="h-5 w-5 shrink-0" /><span>{detailCopy.paymentEvidence}<span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{copy.optionalEvidence}</span></span>
              <input className="sr-only" aria-label={detailCopy.paymentEvidence} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={event => setAttachmentFiles(Array.from(event.target.files ?? []))} />
            </label>
            {attachmentFiles.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 border-t border-slate-200 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"><span className="min-w-0 break-all">{file.name}</span><button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" aria-label={`${t.common.delete}: ${file.name}`} onClick={() => setAttachmentFiles(files => files.filter((_, itemIndex) => itemIndex !== index))}><X className="h-4 w-4" /></button></div>)}
          </div>
        </fieldset>

        <section className="rounded-xl border border-[#147514]/15 bg-[#147514]/5 px-5 py-4 dark:border-emerald-500/20">
          <p className="mb-2 text-xs font-medium text-[#147514] dark:text-emerald-300">{copy.afterPayment}</p>
          <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-slate-500 dark:text-slate-400">{copy.newBalance}</p><p className="mt-1 break-all text-xl font-medium tabular-nums text-[#147514] dark:text-emerald-300">{money(newBalance)}</p></div><div><p className="text-xs text-slate-500 dark:text-slate-400">{copy.accountBalance}</p><p className="mt-1 break-all text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">{selectedPaymentAccount ? money(roundMoney(selectedPaymentAccount.balance - (validAmount ? paymentAmount : 0))) : '—'}</p></div></div>
        </section>
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">{copy.settleHint}</p>
        {remainingBalance <= 0 && <IndiceModalValidation messages={[copy.noBalance]} tone="warning" />}
        {exceedsBalance && <IndiceModalValidation messages={[copy.amountExceedsBalance]} tone="warning" />}
        {!validDate && <IndiceModalValidation messages={[copy.invalidDate]} tone="error" />}
      </form>
    </IndiceModalFrame>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>;
}
function PaymentMetric({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return <div className={`min-w-0 rounded-xl p-3 ${highlighted ? 'col-span-2 bg-amber-50 dark:bg-amber-950/30 sm:col-span-1' : 'bg-slate-50 dark:bg-slate-900/50'}`}><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className={`mt-1 break-all text-base font-medium tabular-nums ${highlighted ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p></div>;
}
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
