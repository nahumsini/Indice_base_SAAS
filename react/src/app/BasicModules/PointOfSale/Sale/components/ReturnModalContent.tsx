import { AlertCircle, CheckCircle, RefreshCcw, Search } from 'lucide-react';
import type { PointOfSaleLocale } from '../../translations';
import { isActiveRefund, isReviewableRefund, posReturnProviderLabel, posReturnReasonLimit, type PosReturnRefundWorkflow } from '../hooks/usePosReturnRefund';
import { getPosReturnCopy } from './posReturnCopy';
import { posReturnStatusText } from './posReturnStatus';

interface Props {
  workflow: PosReturnRefundWorkflow;
  locale: PointOfSaleLocale;
  copy: ReturnType<typeof getPosReturnCopy>;
}

const errorText = (copy: Props['copy'], error: PosReturnRefundWorkflow['error']) => ({
  reference: copy.errorReference, reason: copy.errorReason, amount: copy.errorAmount,
  review_reason: copy.errorReviewReason, recheck: copy.errorRecheck, conflict: copy.errorConflict,
  amount_exceeds: copy.errorAmountExceeds, lookup: copy.errorLookup,
  submit: copy.errorSubmit, refresh: copy.errorRefresh,
}[error ?? 'reference']);

const money = (locale: PointOfSaleLocale, value: number | string, currency: string) => {
  const amount = Number(value);
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
};

export function ReturnModalContent({ workflow, locale, copy }: Props) {
  const { summary } = workflow;
  const active = isActiveRefund(summary);
  const reviewable = isReviewableRefund(summary);
  const latestStatus = summary?.latestRefund?.status.toUpperCase();
  const manual = latestStatus === 'RECONCILIATION_REQUIRED' || latestStatus === 'DEAD_LETTER';
  const safeFailure = latestStatus === 'REJECTED' || latestStatus === 'FAILED' || latestStatus === 'NOT_SUBMITTED';
  const matchingStatus = workflow.operation && summary?.latestRefund?.requestKey === workflow.operation.idempotencyKey
    ? summary.latestRefund.status.toUpperCase() : null;
  const confirmed = matchingStatus === 'CONFIRMED';
  const locked = Boolean(workflow.operation);

  return <div className="space-y-4">
    {workflow.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
      {errorText(copy, workflow.error)}{workflow.failureDetail ? <span className="mt-1 block text-xs opacity-80">{workflow.failureDetail}</span> : null}
    </div> : null}

    <section className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/30 dark:bg-yellow-500/10">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700 dark:text-yellow-200" />
      <div className="text-sm text-yellow-800 dark:text-yellow-100"><p className="font-medium">{copy.sensitive}</p><p className="mt-1 font-medium">{copy.disclaimer}</p></div>
    </section>

    <section>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.saleNumber}</label>
      <div className="flex gap-2">
        <input value={workflow.reference} maxLength={80} disabled={Boolean(summary) || workflow.busy} onChange={(event) => workflow.setReference(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !summary) void workflow.lookup(); }} placeholder={copy.placeholder} className="min-h-12 min-w-0 flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800" autoFocus />
        {!summary ? <button type="button" disabled={workflow.busy || !workflow.reference.trim()} onClick={() => void workflow.lookup()} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-gray-300 px-4 font-medium text-gray-800 disabled:opacity-40 dark:border-gray-600 dark:text-white"><Search className="h-4 w-4" />{copy.lookup}</button>
          : <button type="button" disabled={workflow.busy} onClick={workflow.reset} className="min-h-12 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">{copy.anotherSale}</button>}
      </div>
    </section>

    {summary ? <>
      <section className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-3">
        <Info label={copy.provider} value={posReturnProviderLabel(summary.providerCode)} />
        <Info label={copy.providerStatus} value={posReturnStatusText(locale, summary.providerStatus)} />
        <Info label={copy.saleTotal} value={money(locale, summary.saleAmount, summary.currencyCode)} />
        <Info label={copy.terminalPayment} value={money(locale, summary.paymentAmount, summary.currencyCode)} />
        <Info label={copy.refunded} value={money(locale, summary.refundedAmount, summary.currencyCode)} />
        <Info label={copy.refundable} value={money(locale, summary.refundableAmount, summary.currencyCode)} strong />
      </section>

      {summary.latestRefund ? <section className={`rounded-lg border p-4 text-sm ${manual || safeFailure ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100' : active ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'}`}>
        <div className="flex items-center gap-2">{manual || safeFailure ? <AlertCircle className="h-4 w-4" /> : active ? <RefreshCcw className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}<span className="font-medium">{copy.latest}: {posReturnStatusText(locale, summary.latestRefund.status)}</span></div>
        <p className="mt-1">{money(locale, summary.latestRefund.amount, summary.currencyCode)} · {summary.latestRefund.reason}</p>
        <p className="mt-2 font-medium">{manual ? copy.attention : safeFailure ? copy.notSubmitted : active ? copy.pending : latestStatus === 'CONFIRMED' ? copy.confirmed : ''}</p>
      </section> : null}

      {reviewable ? <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.reviewReason}
        <span id="pos-refund-review-help" className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">{copy.reviewHelp}</span>
        <textarea value={workflow.reviewReason} onChange={(event) => workflow.setReviewReason(event.target.value)} maxLength={500} rows={3} disabled={workflow.busy} aria-describedby="pos-refund-review-help" placeholder={copy.reviewPlaceholder} className="mt-2 w-full rounded-lg border-2 border-amber-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-60 dark:border-amber-500/50 dark:bg-gray-900 dark:text-white" />
      </label> : null}

      {!summary.providerCode ? <Notice>{copy.unavailable}</Notice> : Number(summary.refundableAmount) <= 0 ? <Notice>{copy.complete}</Notice> : null}
      {summary.refundAvailable && !confirmed ? <RefundFields workflow={workflow} copy={copy} locked={locked} /> : null}
      {confirmed && Number(summary.refundableAmount) > 0 ? <button type="button" onClick={workflow.startAnother} className="min-h-11 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">{copy.newRefund}</button> : null}
    </> : null}
  </div>;
}

function RefundFields({ workflow, copy, locked }: { workflow: PosReturnRefundWorkflow; copy: Props['copy']; locked: boolean }) {
  return <section className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <Choice active={workflow.kind === 'full'} disabled={locked} title={copy.full} help={copy.fullHelp} onClick={() => workflow.setKind('full')} />
      <Choice active={workflow.kind === 'partial'} disabled={locked} title={copy.partial} help={copy.partialHelp} onClick={() => workflow.setKind('partial')} />
    </div>
    {workflow.kind === 'partial' ? <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.amount}<input inputMode="decimal" value={workflow.amount} disabled={locked} onChange={(event) => workflow.setAmount(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border-2 border-gray-300 bg-white px-4 text-base text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white" /></label> : null}
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.reason}<textarea value={workflow.reason} disabled={locked} onChange={(event) => workflow.setReason(event.target.value)} maxLength={posReturnReasonLimit(workflow.summary?.providerCode)} rows={3} placeholder={copy.reasonPlaceholder} className="mt-2 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white" /></label>
  </section>;
}

function Choice({ active, disabled, title, help, onClick }: { active: boolean; disabled: boolean; title: string; help: string; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-lg border-2 p-4 text-left transition ${active ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#A7352C] dark:text-[#FFB5AE]' : 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'} disabled:opacity-70`}><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs font-medium">{help}</p></button>;
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="min-w-0"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p><p className={`mt-1 truncate ${strong ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'font-medium text-gray-900 dark:text-white'}`}>{value}</p></div>;
}

function Notice({ children }: { children: string }) {
  return <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">{children}</div>;
}
