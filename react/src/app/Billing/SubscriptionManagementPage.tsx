import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useLanguage } from '../shared/context';
import { BillingConfigurationPanel } from './components/BillingConfigurationPanel';
import { BillingDecisionGuide } from './components/BillingDecisionGuide';
import { BillingHero } from './components/BillingHero';
import { BillingInvoiceHistory } from './components/BillingInvoiceHistory';
import { BillingOverviewBar } from './components/BillingOverviewBar';
import { ModuleSelectionPanel } from './components/ModuleSelectionPanel';
import { useBillingManagement } from './hooks/useBillingManagement';
import { useBillingPaymentMethod } from './hooks/useBillingPaymentMethod';
import { getBillingCopy } from './translations';

export default function SubscriptionManagementPage() {
  const { currentLanguage } = useLanguage();
  const copy = getBillingCopy(currentLanguage.code);
  const billing = useBillingManagement(copy);
  const paymentMethod = useBillingPaymentMethod(!billing.loading && Boolean(billing.selection), billing.readOnly);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_8%_0%,rgba(37,99,235,0.09),transparent_28rem),radial-gradient(circle_at_92%_12%,rgba(96,165,250,0.08),transparent_30rem)] px-4 pb-10 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div data-billing-sticky-header className="sticky top-0 z-30 -mx-4 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <BillingHero
            copy={copy}
            selection={billing.selection}
            subscription={billing.subscription}
            loading={billing.loading}
            leaving={billing.action === 'back'}
            onBack={() => void billing.goBack()}
            onRefresh={() => void billing.load()}
          />
          {!billing.loading && billing.selection ? (
            <div className="mt-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <BillingDecisionGuide
                copy={copy}
                languageCode={currentLanguage.code}
                licensedUsers={(billing.preview ?? billing.selection).included_seats + billing.draft.extraSeats}
                paymentMethod={paymentMethod}
                selectedCount={billing.draft.productCodes.length}
              />
            </div>
          ) : null}
        </div>

        {billing.managedContext?.active_company ? (
          <section className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-100">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-blue-900/60 dark:text-blue-200">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {billing.managedContext.authority_mode === 'PLATFORM_ROOT'
                  ? copy.rootReview
                  : copy.portfolioClient}
                {' · '}{billing.managedContext.active_company.name}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-blue-800 dark:text-blue-200">
                {copy.readOnlyDescription}
              </p>
            </div>
          </section>
        ) : null}

        {billing.error ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {billing.error}</span>
            {billing.loading ? null : <Button type="button" variant="outline" onClick={() => void billing.load()}>{copy.retry}</Button>}
          </div>
        ) : null}
        {billing.success ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> {billing.success}
          </div>
        ) : null}

        {billing.loading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{copy.loading}</div>
        ) : billing.selection ? (
          <>
            <BillingOverviewBar
              copy={copy}
              selection={billing.preview ?? billing.selection}
              subscription={billing.subscription}
              paymentMethod={paymentMethod}
              languageCode={currentLanguage.code}
            />
            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
              <ModuleSelectionPanel
                copy={copy}
                products={(billing.preview ?? billing.selection).available_products}
                selectedCodes={billing.draft.productCodes}
                disabled={Boolean(billing.action) || billing.readOnly}
                languageCode={currentLanguage.code}
                currency={(billing.preview ?? billing.selection).currency}
                billingInterval={billing.draft.billingInterval}
                onToggle={billing.toggleProduct}
              />
              <BillingConfigurationPanel
                copy={copy}
                selection={billing.selection}
                preview={billing.preview}
                subscription={billing.subscription}
                paymentMethod={paymentMethod}
                draft={billing.draft}
                action={billing.action}
                hasChanges={billing.hasChanges}
                readOnly={billing.readOnly}
                languageCode={currentLanguage.code}
                onChange={billing.updateDraft}
                onReset={billing.reset}
                onSave={() => void billing.save()}
                onActivate={() => void billing.activate()}
                onSubscriptionAction={(name) => void billing.subscriptionAction(name)}
              />
            </div>
            <BillingInvoiceHistory
              copy={copy}
              invoices={billing.invoices}
              selection={billing.selection}
              languageCode={currentLanguage.code}
              action={billing.action}
              hasChanges={billing.hasChanges}
              readOnly={billing.readOnly}
              onOpenPortal={() => void billing.subscriptionAction('portal')}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
