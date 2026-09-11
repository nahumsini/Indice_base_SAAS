import { CalendarDays, Clock3, Landmark, Loader2, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PaymentAccount } from '../../PaymentAccounts/types';
import type { ExpenseAttachment } from '../../services/expense-attachments.service';
import type { ExpensePayment } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';
import type { ExpenseDetailCopy } from './expenseDetail.copy';
import { ExpenseAttachmentLink } from './ExpenseAttachmentLink';
import { getExpenseReversalCopy } from '../../utils/expenseReversal.copy';

type ExpensePaymentHistoryProps = {
  attachments: ExpenseAttachment[];
  copy: ExpenseDetailCopy;
  currency: string;
  fallback: {
    accountId?: string;
    amount: number;
    createdAt?: Date;
    paymentDate?: string;
  };
  isLoading: boolean;
  locale: string;
  paymentAccounts: PaymentAccount[];
  payments: ExpensePayment[];
};

type PaymentRow = ExpensePayment & { files: ExpenseAttachment[] };

export function ExpensePaymentHistory({
  attachments,
  copy,
  currency,
  fallback,
  isLoading,
  locale,
  paymentAccounts,
  payments,
}: ExpensePaymentHistoryProps) {
  if (isLoading) {
    return <p className="flex items-center gap-2 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{copy.loading}</p>;
  }

  const rows = buildPaymentRows(payments, attachments, fallback, currency);
  if (!rows.length) {
    return <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500 dark:bg-slate-900/60">{copy.noPayments}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((payment, index) => {
        const sequence = rows.length - index;
        const accountName = payment.paymentAccountName
          ?? paymentAccounts.find(account => account.id === payment.paymentAccountId)?.name
          ?? '—';
        const sourceLabel = payment.source === 'LEGACY_AGGREGATE'
          ? copy.legacyPayment
          : payment.source === 'SETTLED_ON_CREATE'
            ? copy.settledOnCreate
            : copy.recordedPayment;

        return (
          <article key={payment.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.payment} #{sequence}{payment.reversedAt ? ` · ${getExpenseReversalCopy(locale).reversed}` : ''}</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${payment.source === 'LEGACY_AGGREGATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'}`}>{sourceLabel}</span>
              </div>
              <p className="shrink-0 text-base font-medium text-[#147514]">{formatCurrency(payment.amount, payment.currency || currency)}</p>
            </div>

            {payment.reversedAt && <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">{formatDateTime(payment.reversedAt, locale)} · {payment.reversalReason}</p>}
            {payment.source === 'LEGACY_AGGREGATE'
              ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">{copy.legacyPaymentHint}</p>
              : null}

            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <PaymentFact icon={<CalendarDays className="h-4 w-4" />} label={copy.paymentDate} value={formatLocalDate(payment.paymentDate, locale)} />
              <PaymentFact icon={<Landmark className="h-4 w-4" />} label={copy.paymentAccount} value={accountName} detail={formatAccountType(payment.paymentAccountType)} />
              <PaymentFact icon={<UserRound className="h-4 w-4" />} label={copy.registeredBy} value={payment.registeredByName || '—'} />
              <PaymentFact icon={<Clock3 className="h-4 w-4" />} label={copy.registeredAt} value={formatDateTime(payment.createdAt, locale)} />
            </dl>

            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs text-slate-500">{payment.files.length} {copy.evidenceFiles}</p>
              {payment.files.length
                ? <div className="space-y-2">{payment.files.map(file => <ExpenseAttachmentLink key={file.id} file={file} label={copy.paymentEvidence} />)}</div>
                : <p className="text-xs text-slate-500">{copy.noPaymentEvidence}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PaymentFact({ detail, icon, label, value }: { detail?: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 text-[#147514]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{value}</dd>
        {detail ? <dd className="text-xs text-slate-500">{detail}</dd> : null}
      </div>
    </div>
  );
}

export function buildPaymentRows(
  payments: ExpensePayment[],
  attachments: ExpenseAttachment[],
  fallback: ExpensePaymentHistoryProps['fallback'],
  currency: string,
): PaymentRow[] {
  const detailedTotal = payments.filter(payment => !payment.reversedAt).reduce((sum, payment) => sum + payment.amount, 0);
  const unexplainedAmount = Math.max(0, fallback.amount - detailedTotal);
  const completePayments = [...payments];

  if (unexplainedAmount > 0.005) {
    completePayments.push({
      id: `legacy-${fallback.paymentDate ?? 'unknown'}`,
      expenseId: '',
      paymentAccountId: fallback.accountId,
      amount: unexplainedAmount,
      currency,
      paymentDate: fallback.paymentDate ?? '',
      source: 'LEGACY_AGGREGATE',
      createdAt: fallback.createdAt ?? new Date(0),
    });
  }

  const evidenceByPayment = new Map<string, ExpenseAttachment[]>();
  attachments.filter(file => file.paymentAmount != null && file.paymentDate).forEach(file => {
    const key = contextKey(file.paymentAmount ?? 0, file.paymentDate ?? '', file.paymentAccountId);
    const candidates = completePayments.filter(payment => contextKey(payment.amount, payment.paymentDate, payment.paymentAccountId) === key);
    const uploaded = file.createdAt ? new Date(file.createdAt).getTime() : NaN;
    // A new payment with the same amount/date must not acquire the reversed payment's earlier evidence.
    const payment = candidates.length > 1 && Number.isFinite(uploaded)
      ? candidates.filter(candidate => candidate.createdAt.getTime() <= uploaded
          && (!candidate.reversedAt || uploaded <= candidate.reversedAt.getTime()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : candidates[0];
    if (payment) evidenceByPayment.set(payment.id, [...(evidenceByPayment.get(payment.id) ?? []), file]);
  });

  return completePayments.map(payment => ({ ...payment, files: evidenceByPayment.get(payment.id) ?? [] }));
}

function contextKey(amount: number, date: string, accountId?: string) {
  return `${date}:${amount.toFixed(4)}:${accountId ?? ''}`;
}

function formatLocalDate(value: string, locale: string) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—';
}

function formatDateTime(value: Date, locale: string) {
  return value.getTime() > 0
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(value)
    : '—';
}

function formatAccountType(value?: string) {
  return value ? value.toLowerCase().replace(/_/g, ' ') : undefined;
}
