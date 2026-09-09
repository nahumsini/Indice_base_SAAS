import { usePaymentRequestCopy } from "../usePaymentRequestCopy";
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, LoaderCircle, RefreshCw } from 'lucide-react';
import { authApi } from '../../api/auth';
import { paymentRequestsApi, type OwnerPaymentRequestSnapshot } from '../../api/paymentRequests';
import { ApiClientError } from '../../lib/apiClient';
import { formatBillingMoney } from '../billingFormatters';
import { paymentRequestDate, paymentRequestProtectionMessage, paymentRequestFailure } from '../paymentRequestPresentation';

export function PaymentRequestRecovery({ snapshot, loading, error, blocked, english, onReload, onSnapshot }: {
  snapshot: OwnerPaymentRequestSnapshot | null;
  loading: boolean;
  error: string;
  blocked: boolean;
  english: boolean;
  onReload: () => Promise<void>;
  onSnapshot: (snapshot: OwnerPaymentRequestSnapshot) => void;
}) {
  const { t, locale, number } = usePaymentRequestCopy();
  const [action, setAction] = useState<'pay' | 'refresh' | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const payKeys = useRef(new Map<string, string>());
  const request = snapshot?.request;
  const protectedIndefinitely = request?.status === 'OPEN' && request.protected_indefinitely === true;
  const canPay = snapshot?.can_pay === true && request?.status === 'OPEN' && !protectedIndefinitely;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = async (kind: 'pay' | 'refresh') => {
    if (inFlight.current || (kind === 'pay' && !canPay)) return;
    inFlight.current = true;
    setAction(kind);
    setActionError('');
    setNotice('');
    try {
      if (kind === 'pay' && request) {
        const operation = `${request.id}:${request.version}`;
        const key = payKeys.current.get(operation) ?? crypto.randomUUID();
        payKeys.current.set(operation, key);
        const result = await paymentRequestsApi.pay(key, { expected_request_id: request.id, expected_version: request.version });
        if (mounted.current) window.location.assign(result.url);
      } else {
        if (canPay) {
          const latest = await paymentRequestsApi.refresh();
          if (mounted.current) {
            onSnapshot(latest);
            setNotice(latest.request?.status === 'PAID'
              ? t("verifiedRefresh")
              : t("notConfirmed"));
          }
        } else {
          await onReload();
        }
        await authApi.me();
      }
    } catch (failure) {
      if (mounted.current) {
        setActionError(paymentRequestFailure(failure, locale, "checkFailed"));
        if (failure instanceof ApiClientError && failure.status === 409) await onReload();
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setAction(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <div className="mb-5 flex items-start gap-3">
          <span className="rounded-xl bg-[#e8f5f2] p-3 text-[#177D66]">{request?.status === 'PAID' ? <CheckCircle2 className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}</span>
          <div><h1 className="text-xl font-medium text-slate-900 dark:text-white">{request?.status === 'PAID' ? t("verified") : protectedIndefinitely ? t("paused") : blocked ? t("required") : t("reviewRequest")}</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{protectedIndefinitely ? paymentRequestProtectionMessage(locale) : blocked
              ? t("pausedAccess")
              : t("completeBeforeDeadline")}</p>
          </div>
        </div>
        {(error || actionError) ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{actionError || error}</p> : null}
        {notice ? <p role="status" className="mb-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{notice}</p> : null}
        {request ? <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
          <div><dt className="text-slate-500">{request.kind === 'INVOICE' ? t("invoiceTotal") : t("estimatedBeforeTax")}</dt><dd className="mt-1 text-2xl font-medium tabular-nums">{formatBillingMoney(request.amount_cents, request.currency, locale)}</dd></div>
          {request.kind === 'ACTIVATION' ? <div><dd className="text-xs text-slate-500">{t("taxConfirmed")}</dd></div> : null}
          {request.kind === 'INVOICE' ? <div><dd className="text-xs leading-5 text-slate-500">{t("multiInvoiceHelp")}</dd></div> : null}
          {!protectedIndefinitely ? <div><dt className="text-slate-500">{t("localDeadline")}</dt><dd>{paymentRequestDate(request.deadline_at, locale)}</dd></div> : null}
          {request.paid_at ? <div><dt className="text-slate-500">{t("verifiedAt")}</dt><dd>{paymentRequestDate(request.paid_at, locale)}</dd></div> : null}
        </dl> : <p className="py-4 text-sm text-slate-500">{loading ? t("loadingDetails") : t("refreshRequest")}</p>}
        {snapshot && !snapshot.is_owner && request?.status === 'OPEN' && !protectedIndefinitely ? <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t('onlyOwner', { name: snapshot.owner_name || '' })}
        </p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {canPay ? <button type="button" disabled={Boolean(action) || loading} onClick={() => void run('pay')} className="inline-flex items-center gap-2 rounded-xl bg-[#177D66] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {action === 'pay' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{t("securePayment")}
          </button> : null}
          <button type="button" disabled={Boolean(action) || loading} onClick={() => void run('refresh')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-slate-600">
            {action === 'refresh' || loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{canPay ? t("checkStatus") : t("refreshStatus")}
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">{t("otherHolds")}</p>
      </section>
    </main>
  );
}
