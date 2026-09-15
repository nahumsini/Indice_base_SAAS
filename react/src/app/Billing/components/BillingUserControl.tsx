import { Minus, Plus, Users } from 'lucide-react';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  visible: BillingSelectionResponse;
  subscription: BillingSubscriptionResponse | null;
  extraSeats: number;
  disabled: boolean;
  paymentRequired: boolean;
  onChange: (extraSeats: number) => void;
};

export function BillingUserControl(props: Props) {
  const minimumExtra = Math.max(0, props.visible.used_seats - props.visible.included_seats);
  const minimumCapacity = props.visible.included_seats + minimumExtra;
  const licensedUsers = props.visible.included_seats + props.extraSeats;
  const activeUsers = props.subscription?.active_seats ?? props.visible.used_seats;
  const pendingInvitations = props.subscription?.pending_invitations ?? 0;
  const availableUsers = Math.max(0, licensedUsers - props.visible.used_seats);

  const updateLicensedUsers = (value: number) => {
    const normalized = Math.max(minimumCapacity, Math.min(505, Math.trunc(value || minimumCapacity)));
    props.onChange(Math.max(0, normalized - props.visible.included_seats));
  };

  return (
    <section id="billing-people" tabIndex={-1} className="scroll-mt-40 border-t border-slate-200 p-4 outline-none focus-visible:bg-[var(--indice-brand-soft)] dark:border-slate-800 dark:focus-visible:bg-blue-950/20">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)] dark:bg-blue-950/50 dark:text-blue-300">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-medium text-slate-950 dark:text-white">{props.copy.exactUsers}</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{props.copy.exactUsersHelp}</p>
        </div>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">{props.copy.licensedUsers}</span>
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            aria-label={`-1 ${props.copy.licensedUsers}`}
            disabled={props.disabled || licensedUsers <= minimumCapacity}
            onClick={() => updateLicensedUsers(licensedUsers - 1)}
            className="grid h-11 place-items-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:hover:bg-slate-800"
          ><Minus className="h-4 w-4" /></button>
          <input
            type="number"
            min={minimumCapacity}
            max={505}
            value={licensedUsers}
            disabled={props.disabled}
            onChange={(event) => updateLicensedUsers(Number(event.target.value))}
            className="h-11 min-w-0 border-x border-slate-200 bg-white text-center text-lg font-medium text-slate-950 outline-none focus:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-blue-950/30"
          />
          <button
            type="button"
            aria-label={`+1 ${props.copy.licensedUsers}`}
            disabled={props.disabled || licensedUsers >= 505}
            onClick={() => updateLicensedUsers(licensedUsers + 1)}
            className="grid h-11 place-items-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:hover:bg-slate-800"
          ><Plus className="h-4 w-4" /></button>
        </div>
      </label>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span><strong className="font-medium text-slate-900 dark:text-white">{props.visible.included_seats}</strong> {props.copy.includedUsers.toLowerCase()}</span>
        <span><strong className="font-medium text-slate-900 dark:text-white">{props.extraSeats}</strong> {props.copy.additionalUsers.toLowerCase()}</span>
        <span><strong className="font-medium text-slate-900 dark:text-white">{activeUsers}</strong> {props.copy.activeUsers.toLowerCase()}</span>
        <span><strong className="font-medium text-[var(--indice-brand-action)] dark:text-blue-300">{availableUsers}</strong> {props.copy.availableUsers.toLowerCase()}</span>
      </div>
      {pendingInvitations > 0 ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{props.copy.pendingInvitations}: {pendingInvitations}</p> : null}
      {minimumExtra > 0 ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{props.copy.minimumCapacity}: {minimumCapacity}</p> : null}
      {props.paymentRequired && props.extraSeats > 0 ? <p className="mt-2 text-xs font-medium leading-5 text-amber-700 dark:text-amber-300">{props.copy.courtesySeats}</p> : null}
    </section>
  );
}
