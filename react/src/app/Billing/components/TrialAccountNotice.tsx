import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Clock3, CreditCard } from 'lucide-react';
import type { AuthSessionResponse } from '../../api/auth.types';
import { trialPaymentApi, type TrialPaymentWorkspaceData } from '../../api/trialPayment';
import { Button } from '../../components/ui/button';
import { useLanguage } from '../../shared/context';
import { trialAccountPresentation } from '../trialAccountPresentation';
import { getTrialAccountCopy } from '../translations/trialAccount';
import { getTrialPaymentCopy } from '../translations/trialPayment';

export function TrialAccountNotice({ session, authorizationRevision, recovery = false, fallback = null }: {
  session: AuthSessionResponse | null | undefined;
  authorizationRevision: number;
  recovery?: boolean;
  fallback?: ReactNode;
}) {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = getTrialAccountCopy(locale);
  const paymentCopy = getTrialPaymentCopy(locale);
  const navigate = useNavigate();
  const userId = session?.user.id;
  const companyId = session?.company.id;
  const scope = `${userId}:${companyId}:${authorizationRevision}`;
  const [state, setState] = useState<{ scope: string; data: TrialPaymentWorkspaceData | null } | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!userId || !companyId) return;
    let active = true;
    let sequence = 0;
    const refresh = async () => {
      const request = ++sequence;
      setNow(Date.now());
      try {
        // Server verifies current company, owner and non-delegated payment context.
        const data = await trialPaymentApi.workspace();
        if (active && request === sequence) setState({ scope, data });
      } catch {
        // No stale owner/payment prompt after an authorization failure or network error.
        if (active && request === sequence) setState({ scope, data: null });
      }
    };
    const refreshVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(refreshVisible, 60_000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [userId, companyId, authorizationRevision, scope]);

  const blocked = session?.company.subscription?.access_allowed === false
    && session.company.subscription.lock_reason === 'trial_expired';
  const data = state?.scope === scope ? state.data : null;
  const view = trialAccountPresentation(data, now, blocked);
  if (!view || (recovery && !blocked)) return recovery ? fallback : null;
  const title = view.expired ? copy.expired : copy.active;
  const countdown = view.lastDay ? copy.lastDay : view.days === 1 ? copy.day
    : copy.days.replace('{days}', new Intl.NumberFormat(locale).format(view.days));
  const action = view.canChoosePlan ? view.expired ? copy.activate : copy.choosePlan : copy.review;
  const Icon = view.expired ? CreditCard : Clock3;
  const content = <>
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[var(--indice-structural-blue)] dark:bg-slate-800 dark:text-blue-300">
      <Icon aria-hidden="true" className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {recovery ? <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          : <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>}
        {!view.expired && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-slate-800 dark:text-blue-200">{countdown}</span>}
      </div>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        {paymentCopy.demo}: <time dateTime={data!.trialEndsAt!}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(view.deadline)}</time>
      </p>
      {view.expired && <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.preserved}</p>}
      {(view.registered || view.pending) && <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{view.registered ? paymentCopy.registered : paymentCopy.pending}</p>}
      {!view.paymentReady && <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{view.expired ? copy.unavailableExpired : paymentCopy.unavailable}</p>}
    </div>
    <Button type="button" onClick={() => navigate('/billing')}
      className="h-auto min-h-11 w-full shrink-0 whitespace-normal bg-[var(--indice-structural-blue)] px-4 py-3 text-white hover:bg-[var(--indice-structural-blue-hover)] sm:w-auto">
      {action}<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
    </Button>
  </>;
  const style = 'flex flex-col items-start gap-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center';
  return recovery ? <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl items-center px-4 py-8 sm:px-6">
    <section data-trial-account-notice="recovery" className={style}>{content}</section>
  </main> : <aside data-trial-account-notice="banner" aria-label={title} className={style}>{content}</aside>;
}
