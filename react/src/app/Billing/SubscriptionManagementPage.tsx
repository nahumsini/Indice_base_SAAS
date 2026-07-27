import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Layers3,
  RotateCcw,
  ShieldCheck,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { billingApi, type BillingSubscriptionResponse } from '../api/billing';
import { Button } from '../components/ui/button';
import { formatDate, formatMoney, planLabel, selectedModuleLabels } from './subscriptionFormat';

export default function SubscriptionManagementPage() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<BillingSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');

  const selectedModules = useMemo(() => selectedModuleLabels(subscription), [subscription]);
  const monthlyTotal = subscription ? formatMoney(subscription.monthly_amount_cents, subscription.currency) : '$0';

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
              <p className="text-xs font-semibold uppercase text-slate-300">Monthly estimate</p>
              <p className="mt-3 text-3xl font-bold">{monthlyTotal}</p>
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
                    {formatMoney(subscription.monthly_amount_cents, subscription.currency)} per month, taxes excluded.
                  </p>
                </div>
                <CreditCard className="h-9 w-9 text-[var(--indice-structural-blue)]" />
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
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-base font-bold">Billing actions</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Update payment details, invoices, and subscription settings in Stripe.
              </p>
              <div className="mt-4 grid gap-3">
                <Button onClick={openPortal} disabled={Boolean(action)} className="justify-between bg-[var(--indice-structural-blue)] hover:bg-[var(--indice-structural-blue-hover)]">
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
                    <span key={label} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[var(--indice-structural-blue)]">
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
    <Icon className="h-4 w-4 text-[var(--indice-structural-blue)]" />
    <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold">{value}</p>
  </div>;
}

function Alert({ tone, message }: { tone: 'error' | 'info'; message: string }) {
  const classes = tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-[var(--indice-structural-blue-hover)]';
  return <div className={`my-4 rounded-lg border px-4 py-3 text-sm ${classes}`}>{message}</div>;
}
