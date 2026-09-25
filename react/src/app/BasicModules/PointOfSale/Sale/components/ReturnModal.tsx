import { CheckCircle, LoaderCircle, RefreshCcw, RotateCcw, X } from 'lucide-react';
import { usePointOfSaleResolvedLocale } from '../../hooks/usePointOfSaleTranslations';
import { isActiveRefund, isReviewableRefund, usePosReturnRefund } from '../hooks/usePosReturnRefund';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';
import { getPosReturnCopy } from './posReturnCopy';
import { ReturnModalContent } from './ReturnModalContent';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceMode?: boolean;
}

export function ReturnModal({ isOpen, onClose, workspaceMode = false }: ReturnModalProps) {
  const locale = usePointOfSaleResolvedLocale();
  const copy = getPosReturnCopy(locale);
  const workflow = usePosReturnRefund();
  if (!isOpen) return null;

  const active = isActiveRefund(workflow.summary);
  const reviewable = isReviewableRefund(workflow.summary);
  const matchingStatus = workflow.operation
    && workflow.summary?.latestRefund?.requestKey === workflow.operation.idempotencyKey
    ? workflow.summary.latestRefund.status.toUpperCase() : null;
  const confirmed = matchingStatus === 'CONFIRMED';
  const canSubmit = Boolean(workflow.summary?.refundAvailable && !confirmed);
  const action = !workflow.summary ? workflow.lookup : reviewable ? workflow.review : active ? workflow.refresh : workflow.submit;
  const actionLabel = workflow.busy ? copy.loading : !workflow.summary ? copy.lookup
    : reviewable ? copy.recheck : active ? copy.refresh : workflow.operation ? copy.retry : copy.submit;
  const actionDisabled = workflow.busy || (!workflow.summary && !workflow.reference.trim())
    || (reviewable && (workflow.reviewReason.trim().length < 8 || workflow.reviewReason.trim().length > 500))
    || (Boolean(workflow.summary) && !active && !canSubmit);
  const close = () => { workflow.reset(); onClose(); };
  const actionIcon = workflow.busy ? <LoaderCircle className="h-5 w-5 animate-spin" />
    : active ? <RefreshCcw className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />;
  const body = <ReturnModalContent workflow={workflow} locale={locale} copy={copy} />;
  const summary = workflow.summary
    ? `${workflow.summary.ticketNumber} · ${copy.refundable}: ${workflow.summary.refundableAmount} ${workflow.summary.currencyCode}`
    : copy.subtitle;
  const primary = <button type="button" onClick={() => void action()} disabled={actionDisabled} className={posModalPrimaryActionClassName}>{actionIcon}{actionLabel}</button>;

  if (workspaceMode) return (
    <section data-pos-left-workspace="return" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-gray-700 dark:bg-gray-800">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-[#222831] px-5 py-3 text-white dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/20 text-[#FFAAA2]"><RotateCcw className="h-5 w-5" /></span>
          <div className="min-w-0"><h2 className="text-xl font-medium">{copy.title}</h2><p className="truncate text-sm text-gray-300">{copy.subtitle}</p></div>
        </div>
        <button type="button" onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20" aria-label={copy.close}><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-gray-950/30"><div className="mx-auto max-w-2xl">{body}</div></div>
      <footer className="flex shrink-0 items-center gap-3 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
        <button type="button" onClick={close} className="min-h-12 rounded-lg border border-gray-300 px-5 font-medium text-[#222831] dark:border-gray-600 dark:text-white">{copy.cancel}</button>
        <p className="min-w-0 flex-1 truncate text-sm text-gray-500">{summary}</p>{primary}
      </footer>
    </section>
  );

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel={copy.close}
      eyebrow={copy.sensitive}
      icon={<RotateCcw className="h-6 w-6" />}
      onClose={close}
      size="md"
      subtitle={copy.subtitle}
      title={copy.title}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={<button type="button" onClick={close} className={posModalSecondaryActionClassName}>{copy.cancel}</button>}
      footerSummary={summary}
      footer={primary}
    >
      {body}
    </PosModalFrame>
  );
}
