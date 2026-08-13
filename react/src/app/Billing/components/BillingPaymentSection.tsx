import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  selection: BillingSelectionResponse;
  subscription: BillingSubscriptionResponse | null;
  action: string;
  hasChanges: boolean;
  onActivate: () => void;
  onSubscriptionAction: (name: 'portal' | 'cancel' | 'resume') => void;
};

export function BillingPaymentSection(props: Props) {
  const paymentRequired = props.selection.payment_method_required;
  const busy = Boolean(props.action);

  return (
    <section className="border-t border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${paymentRequired ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-emerald-50 text-[#177D66] dark:bg-emerald-950/50 dark:text-emerald-300'}`}>
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-950 dark:text-white">{props.copy.paymentMethod}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentRequired ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'}`}>
              {paymentRequired ? props.copy.paymentMissing : props.copy.paymentReady}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {paymentRequired ? props.copy.paymentMissingDescription : props.copy.paymentReadyDescription}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#177D66] dark:text-[#8FE0CA]" />
        {props.copy.stripeSecurity}
      </div>

      {paymentRequired ? (
        <Button type="button" onClick={props.onActivate} disabled={busy} className="mt-3 h-11 w-full rounded-xl bg-[#177D66] font-medium hover:bg-[#126653]">
          {props.action === 'activate' ? props.copy.activating : props.copy.activateStripe}<ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <>
          <Button type="button" onClick={() => props.onSubscriptionAction('portal')} disabled={busy || props.hasChanges} className="mt-3 h-11 w-full justify-between rounded-xl bg-[#177D66] hover:bg-[#126653]">
            {props.action === 'portal' ? props.copy.openingPortal : props.copy.openPortal}<ExternalLink className="h-4 w-4" />
          </Button>
          {props.hasChanges ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{props.copy.saveBeforePayment}</p> : null}
          {props.subscription ? (
            <Button type="button" variant="ghost" onClick={() => props.onSubscriptionAction(props.subscription!.cancel_at_period_end ? 'resume' : 'cancel')} disabled={busy} className="mt-1 h-9 w-full rounded-xl text-slate-600 dark:text-slate-300">
              {props.subscription.cancel_at_period_end
                ? (props.action === 'resume' ? props.copy.resuming : props.copy.resume)
                : (props.action === 'cancel' ? props.copy.cancelling : props.copy.cancel)}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
