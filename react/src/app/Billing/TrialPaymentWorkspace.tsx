import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { billingApi, type BillingInvoiceRecord, type BillingSubscriptionResponse } from '../api/billing';
import { hostedPaymentUrl, trialPaymentApi, trialPaymentKey, type TrialPaymentWorkspaceData } from '../api/trialPayment';
import { IndiceAdminWorkspaceHeader } from '../components/frontend-os';
import { Button } from '../components/ui/button';
import { useLanguage } from '../shared/context';
import { getBillingCopy } from './translations';
import { getTrialPaymentCopy } from './translations/trialPayment';

export function TrialPaymentWorkspace({ initial }: { initial: TrialPaymentWorkspaceData }) {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = getTrialPaymentCopy(locale);
  const billingCopy = getBillingCopy(locale);
  const navigate = useNavigate();
  const [data, setData] = useState(initial);
  const [interval, setInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [selected, setSelected] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<BillingSubscriptionResponse | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoiceRecord[]>([]);
  const mutationKey = useRef<string | null>(null);
  const quote = data.offers.find(offer => offer.productCode === selected);
  const pending = data.setupStatus === 'SETUP_PENDING' || data.setupStatus === 'METHOD_REGISTERED';

  useEffect(() => { setAccepted(false); mutationKey.current = null; }, [quote?.quoteHash]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    trialPaymentApi.workspace(interval).then(result => {
      if (active) { setData(result); setSelected(''); }
    }).catch(() => { if (active) setError(copy.error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [interval, copy.error]);
  useEffect(() => {
    let active = true;
    Promise.all([billingApi.subscriptionOptional(), billingApi.invoices()]).then(([current, history]) => {
      if (active) { setSubscription(current); setInvoices(history.invoices); }
    }).catch(() => { if (active) setError(copy.error); });
    return () => { active = false; };
  }, [data.setupStatus, data.converted, copy.error]);

  const money = (cents: number, currency: string) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 2,
  }).format(cents / 100);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const refresh = async () => {
    setLoading(true); setError(''); setAccepted(false);
    try { setData(await trialPaymentApi.workspace(interval)); }
    catch { setError(copy.error); }
    finally { setLoading(false); }
  };
  const activate = async () => {
    if (!quote || !accepted || !data.paymentReady || busy || loading || pending) return;
    setBusy(true); setError('');
    mutationKey.current ??= trialPaymentKey();
    try {
      const result = await trialPaymentApi.activate(quote, accepted, mutationKey.current);
      window.location.assign(hostedPaymentUrl(result.checkoutUrl));
    } catch { setError(copy.error); setBusy(false); }
  };
  const portal = async () => {
    setBusy(true); setError('');
    try { window.location.assign(hostedPaymentUrl((await billingApi.openPortal()).url, true)); }
    catch { setError(copy.error); setBusy(false); }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 pb-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="sticky top-0 z-20 bg-slate-50/95 py-4 backdrop-blur dark:bg-slate-950/95">
          <IndiceAdminWorkspaceHeader icon={<CreditCard />} title={copy.title} subtitle={copy.subtitle}
            backLabel={copy.back} onBack={() => navigate('/dashboard')}
            actions={<Button variant="outline" disabled={busy || loading} onClick={() => void refresh()}><RefreshCw className="size-4" />{copy.retry}</Button>} />
        </div>
        {error ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">{error}</p> : null}
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-sm text-slate-600 dark:text-slate-300">{copy.demo}</p>
          <p className="mt-1 text-xl font-medium">{data.trialEndsAt ? date(data.trialEndsAt) : '—'}</p>
          <p role="status" className="mt-3 text-sm leading-relaxed">{data.converted ? copy.paid : pending ? (data.setupStatus === 'METHOD_REGISTERED' ? copy.registered : copy.pending) : copy.subtitle}</p>
          {subscription ? <p className="mt-2 text-sm">{subscription.access_allowed ? billingCopy.accessActive : billingCopy.accessAttention}</p> : null}
        </section>
        {!data.converted ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-lg font-medium">{copy.plan}</h2>
              <label className="text-sm">{copy.period}
                <select className="ml-3 h-11 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                  value={interval} disabled={busy || loading || pending} onChange={event => setInterval(event.target.value as 'MONTH' | 'YEAR')}>
                  <option value="MONTH">{copy.monthly}</option><option value="YEAR">{copy.annual}</option>
                </select>
              </label>
            </div>
            {!data.paymentReady ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{copy.unavailable}</p> : null}
            {loading ? <p role="status" className="py-6 text-sm">{copy.loading}</p> : (
              <fieldset className="mt-5 grid gap-3 sm:grid-cols-2" disabled={busy || !data.paymentReady || pending}>
                <legend className="sr-only">{copy.plan}</legend>
                {data.offers.map(offer => (
                  <label key={offer.productCode} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selected === offer.productCode ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50' : 'border-slate-200 dark:border-slate-700'}`}>
                    <input type="radio" name="regional-plan" value={offer.productCode} checked={selected === offer.productCode}
                      onChange={() => setSelected(offer.productCode)} className="mt-1 size-4 accent-blue-600" />
                    <span><span className="block font-medium">{offer.displayName}</span>
                      <span className="mt-2 block text-xl font-medium tabular-nums">{money(offer.amountBeforeTaxCents, offer.currency)}</span>
                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{offer.includedSeats} {copy.people}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{copy.taxes}</p>
            {quote && !pending ? (
              <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
                <p className="mb-3 text-sm font-medium">{copy.selected}: {quote.displayName} · {money(quote.amountBeforeTaxCents, quote.currency)} · {interval === 'MONTH' ? copy.monthly : copy.annual}</p>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed dark:border-blue-900 dark:bg-blue-950/40">
                  <input type="checkbox" checked={accepted} disabled={busy || loading || !data.paymentReady}
                    onChange={event => setAccepted(event.target.checked)} className="mt-1 size-5 shrink-0 accent-blue-600" />
                  <span>{quote.chargeTiming === 'IMMEDIATE' ? copy.immediate : copy.consent}</span>
                </label>
                <Button className="mt-4 min-h-11 w-full bg-blue-600 font-medium text-white hover:bg-blue-700 sm:w-auto"
                  disabled={!accepted || !data.paymentReady || busy || loading} onClick={() => void activate()}>
                  <ShieldCheck className="size-4" />{busy ? copy.busy : copy.continue}
                </Button>
              </div>
            ) : null}
            {data.checkoutUrl ? <Button className="mt-4" disabled={busy} onClick={() => {
              try { window.location.assign(hostedPaymentUrl(data.checkoutUrl!)); } catch { setError(copy.error); }
            }}>{copy.continue}</Button> : null}
          </section>
        ) : null}
        {subscription ? <Button variant="outline" className="mt-5 min-h-11" disabled={busy} onClick={() => void portal()}>{copy.portal}</Button> : null}
        {invoices.length ? <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-medium">{copy.receipt}</h2>
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">{invoices.map(invoice => (
            <li key={invoice.invoice_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>{invoice.period_starts_at ? date(invoice.period_starts_at) : invoice.invoice_id} · {invoice.amount_due_cents == null ? '—' : money(invoice.amount_due_cents, invoice.currency)}</span>
              {invoice.hosted_invoice_url?.startsWith('https://invoice.stripe.com/') ? <a className="text-blue-600 underline dark:text-blue-300" href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">{copy.invoice}</a> : null}
            </li>
          ))}</ul>
        </section> : null}
      </div>
    </main>
  );
}
