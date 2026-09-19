import { Banknote, CalendarClock, ExternalLink, FileCheck2, ReceiptText } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import type { ReactNode } from 'react';
import type { ReceivableDetailCopy } from '../receivableDetail.copy';
import { ReceivablesStatusBadge } from '../ReceivablesStatusBadge';
import {
  financeTextClass,
  moduleModalOutlineButtonClassName,
  moduleModalPrimaryButtonClassName,
} from '../../constants/receivables.constants';
import type { ReceivablesTranslations } from '../../translations';
import type { ReceivableAccount, ReceivableInstallment, ReceivablePayment } from '../../types';
import { formatMoney, formatPercent } from '../../utils';
import { ReceivablesModalFrame } from './ReceivablesModalFrame';

const receiptUrl = (payment: ReceivablePayment) => payment.receiptDataUrl ?? payment.receiptImageDataUrl ?? '';

export function ReceivableDetailModal({
  account,
  copy,
  detailCopy,
  installments,
  onClose,
  onRegisterPayment,
  payments,
}: {
  account: ReceivableAccount;
  copy: ReceivablesTranslations;
  detailCopy: ReceivableDetailCopy;
  installments: ReceivableInstallment[];
  onClose: () => void;
  onRegisterPayment?: () => void;
  payments: ReceivablePayment[];
}) {
  const accountInstallments = installments
    .filter((installment) => installment.receivableId === account.id)
    .sort((left, right) => left.installmentNumber - right.installmentNumber);
  const accountPayments = payments
    .filter((payment) => payment.receivableId === account.id)
    .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate));

  return (
    <ReceivablesModalFrame
      closeLabel={copy.common.close}
      description={`${account.saleNumber} · ${account.customerName}`}
      footerSummary={`${copy.views.accountsReceivable.table.balance}: ${formatMoney(account.balance, account.currency)}`}
      icon={<ReceiptText className="h-5 w-5" />}
      maxWidthClassName="max-w-6xl"
      modalType="operational-workspace"
      onClose={onClose}
      title={detailCopy.title}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className={moduleModalOutlineButtonClassName} onClick={onClose}>
            {copy.common.close}
          </Button>
          {account.balance > 0 && onRegisterPayment ? (
            <Button type="button" className={cn('gap-2', moduleModalPrimaryButtonClassName)} onClick={onRegisterPayment}>
              <Banknote className="h-4 w-4" />
              {detailCopy.registerPayment}
            </Button>
          ) : null}
        </div>
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailMetric label={copy.modals.creditSale.originalAmount} value={formatMoney(account.originalAmount, account.currency)} />
        <DetailMetric label={detailCopy.paid} value={formatMoney(account.paidAmount, account.currency)} tone="success" />
        <DetailMetric label={copy.views.accountsReceivable.table.balance} value={formatMoney(account.balance, account.currency)} tone={account.balance > 0 ? 'accent' : 'success'} />
        <DetailMetric label={detailCopy.dueDate} value={account.nextPaymentDate || account.dueDate} />
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <h3 className="text-sm font-medium text-slate-950 dark:text-white">{detailCopy.accountData}</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <DetailPair label={copy.views.accountsReceivable.table.customer} value={account.customerName} />
          <DetailPair label={copy.views.accountsReceivable.table.unit} value={account.unit} />
          <DetailPair label={copy.views.accountsReceivable.table.business} value={account.business} />
          <DetailPair label={copy.modals.creditSale.term} value={`${account.termMonths} ${copy.modals.creditSale.months.toLowerCase()} · ${formatPercent(account.annualInterestRate)}`} />
        </dl>
      </section>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        <HistoryPanel icon={<CalendarClock className="h-4 w-4" />} title={detailCopy.installments} count={accountInstallments.length}>
          {accountInstallments.length ? accountInstallments.map((installment) => (
            <div key={installment.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">#{installment.installmentNumber}</p>
                  <ReceivablesStatusBadge copy={copy} status={installment.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.views.accountsReceivable.table.dueDate}: {installment.dueDate}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-sm font-medium tabular-nums', financeTextClass)}>{formatMoney(installment.balance, installment.currency)}</p>
                <p className="mt-1 text-xs text-slate-500">{detailCopy.paid}: {formatMoney(installment.paidAmount, installment.currency)}</p>
              </div>
            </div>
          )) : <EmptyPanel label={detailCopy.noInstallments} />}
        </HistoryPanel>

        <HistoryPanel icon={<Banknote className="h-4 w-4" />} title={detailCopy.payments} count={accountPayments.length}>
          {accountPayments.length ? accountPayments.map((payment) => {
            const url = receiptUrl(payment);
            return (
              <div key={payment.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{copy.paymentMethods[payment.method]} · {payment.reference || copy.common.noReference}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{payment.paymentDate} · {payment.registeredBy}</p>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#147514] hover:underline dark:text-emerald-300">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      {detailCopy.openReceipt}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <p className={cn('text-sm font-medium tabular-nums', financeTextClass)}>{formatMoney(payment.amount, payment.currency ?? account.currency)}</p>
              </div>
            );
          }) : <EmptyPanel label={detailCopy.noPayments} />}
        </HistoryPanel>
      </div>
    </ReceivablesModalFrame>
  );
}

function DetailMetric({ label, tone = 'neutral', value }: { label: string; tone?: 'accent' | 'neutral' | 'success'; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('mt-1 text-lg font-medium tabular-nums text-slate-950 dark:text-white', tone === 'accent' && financeTextClass, tone === 'success' && 'text-[#147514] dark:text-emerald-300')}>{value}</p>
    </div>
  );
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-100">{value}</dd></div>;
}

function HistoryPanel({ children, count, icon, title }: { children: ReactNode; count: number; icon: ReactNode; title: string }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <span className="text-[#147514] dark:text-emerald-300">{icon}</span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-950 dark:text-white">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span>
      </header>
      <div className="max-h-80 overflow-y-auto">{children}</div>
    </section>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{label}</p>;
}
