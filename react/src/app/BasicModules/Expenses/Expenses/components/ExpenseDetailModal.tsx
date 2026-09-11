import { printExpenseVoucher, type ExpensePrintContext } from '../../utils/expensePrintDocument';
import { formatExpenseDate } from '../../utils/expenseDates';
import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, Clock3, FileText, HandCoins, Landmark, Loader2, Pencil, Printer, ReceiptText, ShieldCheck } from 'lucide-react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import type { Expense, ExpensePayment } from '../../types/expenses.types';
import type { PaymentAccount } from '../../PaymentAccounts/types';
import { expenseAttachmentsService, type ExpenseAttachment } from '../../services/expense-attachments.service';
import { expensesService } from '../../services/expenses.service';
import { isBackendId } from '../../adapters/adapter.utils';
import { formatCurrency } from '../../utils/expenses.utils';
import { canEditExpense, canPayExpense, getEffectiveExpenseStatus, getExpenseBalance, getExpensePaidAmount } from '../../utils/expenseFilters';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../hooks/useExpensesTranslations';
import { getExpenseDetailCopy } from './expenseDetail.copy';
import { ExpenseAttachmentLink } from './ExpenseAttachmentLink';
import { ExpensePaymentHistory } from './ExpensePaymentHistory';

type ExpenseDetailModalProps = {
  expense: Expense;
  printContext?: ExpensePrintContext;
  paymentAccounts: PaymentAccount[];
  onClose: () => void;
  onEdit: () => void;
  onOpenAttachments: () => void;
  onRecordPayment: () => void;
};

export function ExpenseDetailModal({ expense, printContext, onClose, onEdit, onOpenAttachments, onRecordPayment, paymentAccounts }: ExpenseDetailModalProps) {
  const t = useExpensesTranslations();
  const locale = useExpensesResolvedLocale();
  const copy = getExpenseDetailCopy(locale);
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const balance = getExpenseBalance(expense);
  const paid = getExpensePaidAmount(expense);
  const status = getEffectiveExpenseStatus(expense);
  const paidPercentage = expense.total > 0 ? Math.min(100, Math.max(0, Math.round((paid / expense.total) * 100))) : 0;

  useEffect(() => {
    if (!isBackendId(expense.id)) return;
    let mounted = true;
    setIsLoading(true);
    setLoadError('');
    setAttachments([]);
    setPayments([]);
    Promise.allSettled([
      expenseAttachmentsService.list(expense.id),
      expensesService.getExpensePayments(expense.id),
    ]).then(([filesResult, paymentsResult]) => {
      if (!mounted) return;
      if (filesResult.status === 'fulfilled') setAttachments(filesResult.value);
      if (paymentsResult.status === 'fulfilled') setPayments(paymentsResult.value);
      if (filesResult.status === 'rejected' || paymentsResult.status === 'rejected') setLoadError(copy.loadFailed);
    }).finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, [copy.loadFailed, expense.id]);

  const generalFiles = attachments.filter(file => !file.paymentAmount || !file.paymentDate);
  const statusLabel = t.expenses.table.statuses[status] ?? status;

  return (
    <IndiceModalFrame
      contentClassName="h-[min(90dvh,860px)] sm:max-w-[1040px]"
      description={`${expense.folio} · ${copy.subtitle}`}
      footer={(
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-medium text-white hover:bg-white/20">{copy.close}</button>
          <button type="button" onClick={() => printExpenseVoucher({ expense, locale, t, context: printContext })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20"><Printer className="h-4 w-4" />{copy.printVoucher}</button>
          {canPayExpense(expense) ? <button type="button" onClick={onRecordPayment} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#147514]"><HandCoins className="h-4 w-4" />{copy.recordPayment}</button> : null}
        </div>
      )}
      footerSummary={`${copy.balance}: ${formatCurrency(balance, expense.currency)}`}
      icon={<ReceiptText className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(open) => !open && onClose()}
      open
      title={copy.title}
      tone="green"
    >
      <IndiceModalValidation messages={loadError ? [loadError] : []} />
      <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <div className="min-w-0"><p className="text-xs text-slate-500">{expense.folio}</p><h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{expense.concept}</h3></div>
              <span className="rounded-full border border-[#147514]/20 bg-[#147514]/8 px-3 py-1 text-xs font-medium text-[#147514]">{statusLabel}</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700">
              <Metric label={copy.total} value={formatCurrency(expense.total, expense.currency)} />
              <Metric label={copy.paid} value={formatCurrency(paid, expense.currency)} />
              <Metric label={copy.balance} value={formatCurrency(balance, expense.currency)} accent={balance > 0} />
            </div>
            <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{paidPercentage}% {copy.paidProgress}</span><span>{formatCurrency(paid, expense.currency)} / {formatCurrency(expense.total, expense.currency)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-[#147514] transition-[width]" style={{ width: `${paidPercentage}%` }} /></div>
            </div>
          </section>

          <DetailSection icon={<Landmark className="h-4 w-4" />} title={copy.overview}>
            <DetailRow label={copy.provider} value={expense.providerName || t.common.unassigned} />
            <DetailRow label={t.expenses.columns.accountingAccount?.label ?? copy.classification} value={expense.originFund ? `${expense.accountingAccount || t.common.unassigned} · ${expense.originFund.name}` : expense.accountingAccount || t.common.unassigned} />
            <DetailRow label={copy.subtotal} value={formatCurrency(expense.amount, expense.currency)} />
            <DetailRow label={copy.taxes} value={formatCurrency(expense.taxes, expense.currency)} />
            <DetailRow label={t.expenses.modal.currency} value={expense.currency} />
            <DetailRow label={t.expenses.columns.description?.label ?? copy.overview} value={expense.description || '—'} multiline />
          </DetailSection>

          <DetailSection icon={<CalendarDays className="h-4 w-4" />} title={copy.dates}>
            <DetailRow label={copy.expenseDate} value={formatDisplayDate(expense.date, locale)} />
            <DetailRow label={copy.dueDate} value={formatDisplayDate(expense.dueDate, locale)} />
            <DetailRow label={copy.paymentDate} value={expense.paymentDate ? formatDisplayDate(expense.paymentDate, locale) : '—'} />
          </DetailSection>

          {canEditExpense(expense) ? <button type="button" onClick={onEdit} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-[#147514]/30 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Pencil className="h-4 w-4" />{copy.edit}</button> : null}
        </div>

        <div className="space-y-5">
          <DetailSection
            icon={<Clock3 className="h-4 w-4" />}
            title={copy.paymentHistory}
            action={payments.length ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-[#147514] dark:bg-emerald-900/20">{payments.length}</span> : undefined}
          >
            <ExpensePaymentHistory
              attachments={attachments}
              copy={copy}
              currency={expense.currency}
              fallback={{
                accountId: expense.paymentAccountId,
                amount: paid,
                createdAt: expense.updatedAt,
                paymentDate: formatExpenseDate(expense.paymentDate),
              }}
              isLoading={isLoading}
              locale={locale}
              paymentAccounts={paymentAccounts}
              payments={payments}
            />
          </DetailSection>

          <DetailSection icon={<FileText className="h-4 w-4" />} title={copy.files} action={<button type="button" onClick={onOpenAttachments} className="text-xs font-medium text-[#147514]">{t.expenses.attachments.open}</button>}>
            {isLoading ? <Loading label={copy.loading} /> : generalFiles.length ? <div className="space-y-2">{generalFiles.map(file => <ExpenseAttachmentLink key={file.id} file={file} label={copy.supportingFile} />)}</div> : <Empty label={copy.noFiles} />}
          </DetailSection>

          <DetailSection icon={<ShieldCheck className="h-4 w-4" />} title={copy.audit}>
            <DetailRow label={copy.created} value={formatAuditDate(expense.createdAt, locale)} />
            <DetailRow label={copy.updated} value={formatAuditDate(expense.updatedAt, locale)} />
            <DetailRow label={t.expenses.columns.authorizer?.label ?? t.common.unassigned} value={expense.approver || expense.approvedByUserId || t.common.unassigned} />
          </DetailSection>
        </div>
      </div>
    </IndiceModalFrame>
  );
}

function DetailSection({ action, children, icon, title }: { action?: ReactNode; children: ReactNode; icon: ReactNode; title: string }) { return <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"><span className="text-[#147514]">{icon}</span>{title}</h3>{action}</div>{children}</section>; }
function DetailRow({ label, multiline = false, value }: { label: string; multiline?: boolean; value: string }) { return <div className={`flex gap-4 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-700 ${multiline ? 'flex-col gap-1' : 'items-start justify-between'}`}><span className="text-xs text-slate-500">{label}</span><span className={`${multiline ? '' : 'text-right'} text-sm font-medium text-slate-800 dark:text-slate-100`}>{value}</span></div>; }
function Metric({ accent = false, label, value }: { accent?: boolean; label: string; value: string }) { return <div className="min-w-0 px-3 py-4 text-center"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 break-words text-sm font-medium ${accent ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>{value}</p></div>; }
function Empty({ label }: { label: string }) { return <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500 dark:bg-slate-900/60">{label}</p>; }
function Loading({ label }: { label: string }) { return <p className="flex items-center gap-2 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{label}</p>; }
function formatDisplayDate(value: Date, locale: string) { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value); }
function formatAuditDate(value: Date | undefined, locale: string) { return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(value) : '—'; }
