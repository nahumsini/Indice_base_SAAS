import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Layers3,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { billingApi, type BillingSubscriptionResponse } from '../api/billing';
import { Button } from '../components/ui/button';
import { formatDate, formatMoney, planLabel, selectedModuleLabels } from './subscriptionFormat';

const newBillingMutationKey = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `billing-seats-${crypto.randomUUID()}`
    : `billing-seats-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

export default function SubscriptionManagementPage() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<BillingSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [extraSeatDraft, setExtraSeatDraft] = useState(0);

  const selectedModules = useMemo(() => selectedModuleLabels(subscription), [subscription]);
  const recurringTotal = subscription ? formatMoney(recurringAmount(subscription), subscription.currency) : '$0';
  const seatEditor = useMemo(
    () => (subscription ? seatEditorSummary(subscription, extraSeatDraft) : null),
    [extraSeatDraft, subscription],
  );

  const loadSubscription = async () => {
    setLoading(true);
    setError('');
    try {
      setSubscription(await billingApi.subscription());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Subscription could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscription();
  }, []);

  useEffect(() => {
    if (subscription) {
      setExtraSeatDraft(Math.max(0, subscription.extra_collaborators || 0));
    }
  }, [subscription?.extra_collaborators]);

  const runAction = async (name: string, callback: () => Promise<BillingSubscriptionResponse | void>) => {
    setAction(name);
    setError('');
    try {
      const result = await callback();
      if (result) {
        setSubscription(result);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Billing action could not be completed.');
    } finally {
      setAction('');
    }
  };

  const openPortal = () => runAction('portal', async () => {
    const response = await billingApi.openPortal();
    window.location.assign(response.url);
  });

  const updateExtraSeats = () => runAction('seats', async () => {
    if (!subscription || !seatEditor?.canSave) {
      return undefined;
    }
    await billingApi.updateExtraSeats(seatEditor.targetExtraSeats, newBillingMutationKey());
    return billingApi.subscription();
  });

  const setExtraSeats = (value: number) => {
    const minimum = seatEditor?.minimumExtraSeats ?? 0;
    const normalized = Number.isFinite(value) ? Math.trunc(value) : minimum;
    setExtraSeatDraft(Math.min(100_000, Math.max(minimum, normalized)));
  };

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,rgba(21,92,255,0.12),transparent_34rem),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-6 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={goBack}
            className="w-fit rounded-full bg-white/80 px-4 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-white dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => void loadSubscription()}
            disabled={loading}
            className="w-fit rounded-full bg-white/80 shadow-sm dark:bg-slate-900/80"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <section className="mb-5 overflow-hidden rounded-lg border border-white/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_20rem]">
            <div>
              {subscription ? <StatusPill subscription={subscription} /> : null}
              <h1 className="mt-4 text-2xl font-bold tracking-normal sm:text-3xl">Subscription management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Manage company access, trial status, collaborator seats, paid modules, and Stripe billing.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Signal icon={CalendarClock} label={subscription ? `Trial ends ${formatDate(subscription.trial_end_at)}` : 'Loading trial'} tone="blue" />
                <Signal icon={Users} label={subscription ? formatSeatSignal(subscription) : 'Loading seats'} tone="emerald" />
                <Signal icon={Layers3} label={subscription ? `${selectedModules.length || subscription.module_count} paid modules` : 'Loading modules'} tone="amber" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-300">{billingIntervalTitle(subscription)}</p>
              <p className="mt-3 text-3xl font-bold">{recurringTotal}</p>
              <p className="mt-2 text-sm text-slate-300">Taxes excluded. Stripe handles secure billing.</p>
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {subscription?.access_allowed ? 'Access is active' : 'Access needs attention'}
              </div>
            </div>
          </div>
        </section>

        {error ? <Alert tone="error" message={error} /> : null}
        {loading ? <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">Loading subscription...</div> : null}

        {subscription && !loading ? (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Current plan</p>
                  <h2 className="mt-2 text-xl font-bold">{planLabel(subscription.plan_id)}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    {formatMoney(recurringAmount(subscription), subscription.currency)} {billingPeriodText(subscription)}, taxes excluded.
                  </p>
                </div>
                <CreditCard className="h-9 w-9 text-[#155CFF]" />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Metric label="Trial ends" value={formatDate(subscription.trial_end_at)} icon={ShieldCheck} />
                <Metric label="Users" value={formatUserAllowance(subscription)} icon={Users} />
                <Metric label="Paid modules" value={`${selectedModules.length || subscription.module_count}`} icon={Layers3} />
                <Metric label="Cancellation" value={subscription.cancel_at_period_end ? 'Scheduled' : 'Not scheduled'} icon={XCircle} />
              </div>

              {subscription.cancel_at_period_end ? (
                <Alert tone="info" message={`Cancellation is scheduled for ${formatDate(subscription.cancellation_effective_at || subscription.trial_end_at)}. No automatic charge is made if the trial remains cancelled before it ends.`} />
              ) : null}
              {subscription.lock_reason ? (
                <Alert tone={subscription.access_allowed ? 'info' : 'error'} message={lockReasonMessage(subscription)} />
              ) : null}

              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">Seat usage</p>
                <p className="mt-2">
                  {subscription.active_seats} active users and {subscription.pending_invitations} pending invitations.
                  {subscription.seat_limit_enforced
                    ? ` ${subscription.remaining_seats} seats remain.`
                    : ' Seat limits are not enforced for this legacy subscription.'}
                </p>
              </div>

              {seatEditor ? (
                <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Paid extra users</p>
                      <h3 className="mt-1 text-lg font-bold">Add capacity before inviting more people</h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                        Your limit updates after Stripe accepts the subscription change. Current active users and pending invitations are protected.
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {seatEditor.usedSeats}/{seatEditor.projectedLimit} used
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[14rem_1fr]">
                    <div className="grid grid-cols-[3rem_1fr_3rem] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setExtraSeats(seatEditor.targetExtraSeats - 1)}
                        disabled={Boolean(action) || seatEditor.targetExtraSeats <= seatEditor.minimumExtraSeats}
                        className="flex h-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label="Remove one paid extra user"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={seatEditor.minimumExtraSeats}
                        max={100000}
                        value={seatEditor.targetExtraSeats}
                        onChange={(event) => setExtraSeats(Number(event.target.value))}
                        disabled={Boolean(action)}
                        className="h-12 border-x border-slate-200 bg-transparent text-center text-lg font-bold outline-none dark:border-slate-700"
                        aria-label="Paid extra users"
                      />
                      <button
                        type="button"
                        onClick={() => setExtraSeats(seatEditor.targetExtraSeats + 1)}
                        disabled={Boolean(action)}
                        className="flex h-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label="Add one paid extra user"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniMetric label="Included" value={`${seatEditor.includedSeats}`} />
                      <MiniMetric label="Paid extra" value={`${seatEditor.targetExtraSeats}`} />
                      <MiniMetric label="Available after change" value={`${seatEditor.projectedAvailable}`} />
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                    <div className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="font-semibold text-slate-500">Extra user price</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {formatMoney(seatEditor.extraSeatUnitAmountCents, subscription.currency)} {billingPeriodText(subscription)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Change</p>
                        <p className={`mt-1 font-bold ${seatEditor.deltaExtraSeats >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                          {seatEditor.deltaExtraSeats > 0 ? '+' : ''}{seatEditor.deltaExtraSeats} paid users
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Projected total</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {formatMoney(seatEditor.projectedRecurringAmountCents, subscription.currency)} {billingPeriodText(subscription)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {seatEditor.deltaExtraSeats > 0
                        ? 'Stripe will update the subscription and invoice the prorated change using the payment method on file.'
                        : seatEditor.deltaExtraSeats < 0
                          ? 'Stripe will reduce the paid seat quantity. Any credit is handled by your Stripe billing settings.'
                          : 'Choose a new paid-user quantity to preview the billing impact.'}
                    </p>
                  </div>

                  {seatEditor.targetExtraSeats === seatEditor.minimumExtraSeats && seatEditor.minimumExtraSeats > 0 ? (
                    <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      You cannot go below {seatEditor.minimumExtraSeats} paid extra users because {seatEditor.usedSeats} users or invitations are already consuming seats.
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => void updateExtraSeats()}
                      disabled={!seatEditor.canSave || Boolean(action)}
                      className="bg-[#155CFF] hover:bg-[#0B45CC]"
                    >
                      {action === 'seats' ? 'Updating paid users...' : 'Confirm paid users'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setExtraSeats(subscription.extra_collaborators || 0)}
                      disabled={!seatEditor.hasChanges || Boolean(action)}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-base font-bold">Billing actions</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Update payment details, invoices, and subscription settings in Stripe.
              </p>
              <div className="mt-4 grid gap-3">
                <Button onClick={openPortal} disabled={Boolean(action)} className="justify-between bg-[#155CFF] hover:bg-[#0B45CC]">
                  {action === 'portal' ? 'Opening...' : 'Open Stripe portal'}
                  <ExternalLink className="h-4 w-4" />
                </Button>
                {subscription.cancel_at_period_end ? (
                  <Button variant="outline" onClick={() => runAction('resume', billingApi.resumeSubscription)} disabled={Boolean(action)}>
                    {action === 'resume' ? 'Resuming...' : 'Resume subscription'}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => runAction('cancel', billingApi.cancelSubscription)} disabled={Boolean(action)}>
                    {action === 'cancel' ? 'Cancelling...' : 'Cancel before trial ends'}
                  </Button>
                )}
              </div>
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-bold">Selected paid modules</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedModules.map((label) => (
                    <span key={label} className="rounded-full bg-[#155CFF]/10 px-3 py-1 text-xs font-bold text-[#155CFF]">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function StatusPill({ subscription }: { subscription: BillingSubscriptionResponse }) {
  const tone = subscription.access_allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${tone}`}>{subscription.status}</span>;
}

function formatUserAllowance(subscription: BillingSubscriptionResponse) {
  const included = subscription.included_collaborators || 5;
  const extra = subscription.extra_collaborators || 0;
  const allowed = subscription.allowed_collaborators || included + extra;
  const used = subscription.used_collaborators || 0;
  const remaining = Math.max(0, subscription.remaining_collaborators ?? allowed - used);
  const base = `${used}/${allowed} used, ${remaining} remaining`;
  return extra > 0
    ? `${base} (${included} included + ${extra} extra)`
    : `${base} (${included} included)`;
}

function formatSeatSignal(subscription: BillingSubscriptionResponse) {
  const allowed = subscription.allowed_collaborators || subscription.included_collaborators + subscription.extra_collaborators;
  return `${subscription.used_collaborators || 0}/${allowed} users`;
}

function lockReasonMessage(subscription: BillingSubscriptionResponse) {
  if (subscription.lock_reason === 'payment_grace') {
    return `Payment failed, but access remains open until ${formatDate(subscription.payment_grace_until)}. Update the payment method in Stripe portal.`;
  }
  if (subscription.lock_reason === 'payment_failed') {
    return subscription.payment_failure_reason || 'Payment failed. Update the payment method in Stripe portal to restore access.';
  }
  if (subscription.lock_reason === 'trial_expired') {
    return 'Trial access has expired. Update billing to continue using paid modules.';
  }
  if (subscription.lock_reason === 'subscription_canceled') {
    return 'Subscription is canceled and access is locked.';
  }
  return `Access status: ${subscription.lock_reason}.`;
}

function Signal({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: 'blue' | 'emerald' | 'amber' }) {
  const classes = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${classes[tone]}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <Icon className="h-4 w-4 text-[#155CFF]" />
    <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold">{value}</p>
  </div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function recurringAmount(subscription: BillingSubscriptionResponse) {
  return subscription.recurring_amount_cents ?? subscription.monthly_amount_cents ?? 0;
}

function normalizedBillingInterval(subscription: BillingSubscriptionResponse | null) {
  return subscription?.billing_interval?.toUpperCase() === 'YEAR' ? 'YEAR' : 'MONTH';
}

function billingPeriodText(subscription: BillingSubscriptionResponse | null) {
  return normalizedBillingInterval(subscription) === 'YEAR' ? 'per year' : 'per month';
}

function billingIntervalTitle(subscription: BillingSubscriptionResponse | null) {
  return normalizedBillingInterval(subscription) === 'YEAR' ? 'Annual estimate' : 'Monthly estimate';
}

function seatEditorSummary(subscription: BillingSubscriptionResponse, extraSeatDraft: number) {
  const includedSeats = Math.max(0, subscription.included_collaborators || 0);
  const currentExtraSeats = Math.max(0, subscription.extra_collaborators || 0);
  const allowedSeats = Math.max(0, subscription.allowed_collaborators || includedSeats + currentExtraSeats);
  const benefitSeats = Math.max(0, allowedSeats - includedSeats - currentExtraSeats);
  const usedSeats = Math.max(
    0,
    subscription.used_collaborators || 0,
    (subscription.active_seats || 0) + (subscription.pending_invitations || 0),
    subscription.used_seats || 0,
  );
  const minimumExtraSeats = Math.max(0, usedSeats - includedSeats - benefitSeats);
  const targetExtraSeats = Math.max(minimumExtraSeats, Math.max(0, Math.trunc(extraSeatDraft || 0)));
  const deltaExtraSeats = targetExtraSeats - currentExtraSeats;
  const extraSeatUnitAmountCents = Math.max(0, subscription.extra_seat_unit_amount_cents || 0);
  const projectedLimit = includedSeats + benefitSeats + targetExtraSeats;
  const projectedAvailable = Math.max(0, projectedLimit - usedSeats);
  const projectedRecurringAmountCents = Math.max(
    0,
    recurringAmount(subscription) + deltaExtraSeats * extraSeatUnitAmountCents,
  );
  const hasChanges = targetExtraSeats !== currentExtraSeats;
  const canSave = hasChanges
    && subscription.seat_limit_enforced
    && !subscription.cancel_at_period_end
    && targetExtraSeats >= minimumExtraSeats
    && extraSeatUnitAmountCents > 0;

  return {
    includedSeats,
    currentExtraSeats,
    benefitSeats,
    usedSeats,
    minimumExtraSeats,
    targetExtraSeats,
    deltaExtraSeats,
    extraSeatUnitAmountCents,
    projectedLimit,
    projectedAvailable,
    projectedRecurringAmountCents,
    hasChanges,
    canSave,
  };
}

function Alert({ tone, message }: { tone: 'error' | 'info'; message: string }) {
  const classes = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#155CFF]/20 bg-[#155CFF]/5 text-[#0B45CC]';
  return <div className={`my-4 rounded-lg border px-4 py-3 text-sm ${classes}`}>{message}</div>;
}
