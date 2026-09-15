import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import type { BillingCopy } from '../translations';
import type { BillingPaymentMethodState } from '../types';
import { getPaymentMethodCopy } from '../translations/paymentMethod';
import { paymentMethodPresentation, formatPaymentMethodCheckedAt } from '../paymentMethodPresentation';

type Props = {
  copy: BillingCopy;
  selection: BillingSelectionResponse;
  subscription: BillingSubscriptionResponse | null;
  paymentMethod: BillingPaymentMethodState;
  languageCode: string;
  action: string;
  hasChanges: boolean;
  readOnly: boolean;
  onSubscriptionAction: (name: 'portal' | 'cancel' | 'resume') => void;
};

export function BillingPaymentSection(props: Props) {
  const paymentRequired = props.selection.payment_method_required;
  const cardCopy = getPaymentMethodCopy(props.languageCode);
  const card = paymentMethodPresentation(props.readOnly ? { loading: false, ownerOnly: true, summary: null } : props.paymentMethod, cardCopy);
  const checkedAt = formatPaymentMethodCheckedAt(card.checkedAt, props.languageCode);
  const statusClass = card.tone === 'saved'
    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
    : card.tone === 'attention'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  const busy = Boolean(props.action);
  const activationHelp = props.selection.activation_block_reason === 'OWNER_REQUIRED'
    ? cardCopy.ownerDescription
    : props.selection.activation_block_reason === 'STRIPE_UNAVAILABLE'
      ? cardCopy.stripeDisabled
      : cardCopy.stripeCatalogPending;

  return (
    <section id="billing-payment" tabIndex={-1} className="scroll-mt-40 border-t border-slate-200 p-4 outline-none focus-visible:bg-[var(--indice-brand-soft)] dark:border-slate-800 dark:focus-visible:bg-blue-950/20">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${statusClass}`}>
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-950 dark:text-white">{cardCopy.paymentMethod}</h3>
            <span role="status" className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
              {card.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {card.description}
          </p>
          {card.card ? <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{card.card}</p> : null}
          {checkedAt ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{cardCopy.checkedAt}: {checkedAt}</p> : null}
        </div>
      </div>

      <div className="mt-3 flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--indice-brand-action)] dark:text-blue-300" />
        {cardCopy.stripeSecurity}
      </div>

      {props.readOnly || paymentRequired ? null : (
        <>
          {!props.paymentMethod.ownerOnly ? (
            <>
              <Button type="button" variant="outline" onClick={() => props.onSubscriptionAction('portal')} disabled={busy || props.hasChanges || !props.selection.payment_management_available} className="mt-3 h-auto min-h-11 w-full justify-between whitespace-normal rounded-xl bg-white py-3 text-[#143675] hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-950/30">
                <span className="min-w-0 text-left">{props.action === 'portal' ? cardCopy.openingPortal : cardCopy.manageCards}</span><ExternalLink className="h-4 w-4 shrink-0" />
              </Button>
              {props.hasChanges ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{cardCopy.saveBeforePayment}</p> : null}
            </>
          ) : null}
          {props.subscription ? (
            <Button type="button" variant="ghost" onClick={() => props.onSubscriptionAction(props.subscription!.cancel_at_period_end ? 'resume' : 'cancel')} disabled={busy} className="mt-1 h-9 w-full rounded-xl text-slate-600 dark:text-slate-300">
              {props.subscription.cancel_at_period_end
                ? (props.action === 'resume' ? props.copy.resuming : props.copy.resume)
                : (props.action === 'cancel' ? props.copy.cancelling : props.copy.cancel)}
            </Button>
          ) : null}
        </>
      )}
      {!props.readOnly && paymentRequired && !props.selection.activation_available ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          {activationHelp}
        </p>
      ) : null}
    </section>
  );
}
