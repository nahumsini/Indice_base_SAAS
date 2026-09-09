import { usePaymentRequestCopy } from "../usePaymentRequestCopy";
import { Clock3 } from 'lucide-react';
import type { OwnerPaymentRequestSnapshot } from '../../api/paymentRequests';
import { paymentRequestDate, paymentRequestProtectionMessage } from '../paymentRequestPresentation';

export function PaymentRequestBanner({ snapshot, english, onPay }: {
  snapshot: OwnerPaymentRequestSnapshot | null;
  english: boolean;
  onPay: () => void;
}) {
  const { t, locale, number } = usePaymentRequestCopy();
  if (snapshot?.request?.status !== 'OPEN' || snapshot.collection_blocked) return null;
  const protectedIndefinitely = snapshot.request.protected_indefinitely === true;
  return (
    <aside role="status" className="mx-4 my-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <Clock3 className="h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1">
        {protectedIndefinitely ? paymentRequestProtectionMessage(locale) : <>
          {t('requestedDeadline', { date: paymentRequestDate(snapshot.request.deadline_at, locale) })}{' '}
          {snapshot.can_pay ? t('payBeforeDeadline') : snapshot.is_owner ? t('paymentUnavailable') : t('ownerMustPay', { name: snapshot.owner_name || '' })}
        </>}
      </p>
      <button type="button" onClick={onPay} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium dark:border-amber-700 dark:bg-slate-900">
        {snapshot.can_pay && !protectedIndefinitely ? t("reviewPay") : t("viewStatus")}
      </button>
    </aside>
  );
}
