import { usePaymentRequestCopy } from "../../Billing/usePaymentRequestCopy";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarPlus, CreditCard, LoaderCircle, RefreshCw } from 'lucide-react';
import { platformAdminApi } from '../../api/platformAdmin';
import type { PaymentRequestWorkspace } from '../../api/paymentRequests';
import { ApiClientError } from '../../lib/apiClient';
import { IndiceModalFrame, IndiceModalValidation } from '../../components/indice-modal';
import { formatBillingMoney } from '../../Billing/billingFormatters';
import { canSubmitPaymentRequest, paymentDeliveryStatus, paymentRequestBlocker, paymentRequestDate, paymentRequestProtectionMessage, paymentRequestFailure } from '../../Billing/paymentRequestPresentation';

export function PaymentRequestModal({ company, english, onClose, onChanged }: {
  company: { id: number; name: string };
  english: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { t, locale, number } = usePaymentRequestCopy();
  const [workspace, setWorkspace] = useState<PaymentRequestWorkspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'warning'>('success');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'request' | 'extend'>('request');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const request = workspace?.request;
  const openRequest = request?.status === 'OPEN';
  const protectedIndefinitely = openRequest && request.protected_indefinitely === true;
  const quote = openRequest ? request : workspace?.quote;
  const canSubmit = !busy && canSubmitPaymentRequest(workspace, action, reason);

  const load = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await platformAdminApi.getPaymentRequest(company.id);
      if (mounted.current) setWorkspace(result);
    } catch (failure) {
      if (mounted.current) {
        setWorkspace(null);
        setError(paymentRequestFailure(failure, locale, "loadFailed"));
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [company.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || !canSubmit || !workspace) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    let saved = false;
    try {
      const result = action === 'extend'
        ? await platformAdminApi.extendPaymentRequest(company.id, { reason: reason.trim(), expected_request_id: request!.id, expected_version: request!.version })
        : await platformAdminApi.requestPayment(company.id, { reason: reason.trim(), expected_quote_token: workspace.quote!.token });
      saved = true;
      if (!mounted.current) return;
      setWorkspace(result);
      setReason('');
      setAction('request');
      setNoticeTone('success');
      setNotice(t("saved"));
      await onChanged();
    } catch (failure) {
      if (!mounted.current) return;
      if (saved) {
        setNoticeTone('warning');
        setNotice(t("savedRefreshFailed"));
      } else {
        setError(paymentRequestFailure(failure, locale, "saveFailed"));
        if (failure instanceof ApiClientError && failure.status === 409) {
          try {
            const latest = await platformAdminApi.getPaymentRequest(company.id);
            if (mounted.current) setWorkspace(latest);
          } catch { /* Keep the original conflict visible; Refresh remains available. */ }
        }
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <IndiceModalFrame open busy={busy} onOpenChange={(open) => !open && onClose()}
      modalType="standard-form" contentClassName="sm:max-w-2xl" tone="aqua"
      icon={<CreditCard className="h-5 w-5" />} title={t("requestPayment")}
      description={company.name}
      footerSummary={protectedIndefinitely ? t("pausedFooter") : t("sevenDaysFooter")}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy}>{t("close")}</button>
        <button type="submit" form="payment-request-form" disabled={!canSubmit} className="inline-flex items-center gap-2">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {action === 'extend' ? t("addSevenDays") : t("sendRequest")}
        </button>
      </>}
    >
      <form id="payment-request-form" onSubmit={(event) => void submit(event)} className="space-y-4">
        <IndiceModalValidation messages={error ? [error] : []} />
        <IndiceModalValidation messages={notice ? [notice] : []} tone={noticeTone} />
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{busy && !workspace ? t("loadingDetails") : t("reviewAmountOwner")}</p>
            <button type="button" onClick={() => void load()} className="inline-flex shrink-0 items-center gap-1.5 text-sm text-[#177D66]">
              <RefreshCw className="h-4 w-4" />{t("refresh")}
            </button>
          </div>
          {workspace ? <>
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div><p className="text-xs text-slate-500">{t("owner")}</p><p className="text-sm font-medium">{workspace.owner?.name || (t("noOwner"))}</p>{workspace.owner?.email ? <p className="break-all text-sm text-slate-500">{workspace.owner.email}</p> : null}</div>
              <div><p className="text-xs text-slate-500">{quote?.kind === 'INVOICE' ? t("invoiceTotal") : t("estimatedBeforeTax")}</p><p className="text-2xl font-medium tabular-nums">{formatBillingMoney(quote?.amount_cents ?? null, quote?.currency || 'USD', locale)}</p>
                {quote?.billing_interval ? <p className="text-xs text-slate-500">{quote.billing_interval === 'YEAR' ? t("annualBilling") : t("monthlyBilling")}</p> : null}
                {quote?.kind === 'ACTIVATION' ? <p className="mt-1 text-xs text-slate-500">{t("taxConfirmed")}</p> : null}
              </div>
              {workspace.quote?.paid_through ? <p className="text-sm">{t("paidThrough")}: {paymentRequestDate(workspace.quote.paid_through, locale)}</p> : null}
              {request ? <div className="border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
                <p className="font-medium">{request.status === 'PAID' ? t("verified") : t("requested")}</p>
                {!protectedIndefinitely ? <p>{t("deadline")}: {paymentRequestDate(request.deadline_at, locale)}</p> : null}
                {request.paid_at ? <p>{t("paid")}: {paymentRequestDate(request.paid_at, locale)}</p> : null}
                <p className="mt-1 whitespace-pre-wrap text-slate-500">{request.reason}</p>
              </div> : null}
            </section>
            {!openRequest && workspace.blockers.length ? <IndiceModalValidation tone="warning" messages={workspace.blockers.map((blocker) => paymentRequestBlocker(blocker, locale))} /> : null}
            {openRequest && action !== 'extend' ? <button type="button" onClick={() => { setAction('extend'); setReason(''); setNotice(''); }} className="inline-flex items-center gap-2 text-sm font-medium text-[#177D66]">
              <CalendarPlus className="h-4 w-4" />{t("extendSevenDays")}
            </button> : <label className="block space-y-1.5 text-sm font-medium">
              <span>{action === 'extend' ? t("extensionReason") : t("requestReason")} <span aria-hidden="true">*</span></span>
              <textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-600 dark:bg-slate-900" />
            </label>}
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {protectedIndefinitely ? paymentRequestProtectionMessage(locale) : t("windowHelp")}
            </p>
            {(workspace.deliveries.length > 0 || workspace.history.length > 0) ? <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <summary className="cursor-pointer text-sm font-medium">{t("history")}</summary>
              <ul className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                {workspace.deliveries.map((delivery, index) => <li key={`delivery-${index}`}>
                  <p>{paymentRequestDate(delivery.scheduled_at, locale)} · {delivery.channel === 'EMAIL' ? t("email") : t("inApp")} · {paymentDeliveryStatus(delivery.status, locale)}</p>
                  <p>{t("attempts")}: {number(delivery.attempts)}{delivery.sent_at ? ` · ${paymentRequestDate(delivery.sent_at, locale)}` : ''}</p>
                </li>)}
                {workspace.history.map((entry, index) => <li key={`history-${index}`}><p>{paymentRequestDate(entry.occurred_at, locale)} · {entry.actor_name || (t("system"))}</p><p className="whitespace-pre-wrap">{entry.reason}</p>{entry.deadline_at ? <p>{t("deadline")}: {paymentRequestDate(entry.deadline_at, locale)}</p> : null}</li>)}
              </ul>
            </details> : null}
            <p className="text-xs text-slate-500">{t("localDates")}</p>
          </> : null}
        </fieldset>
      </form>
    </IndiceModalFrame>
  );
}
