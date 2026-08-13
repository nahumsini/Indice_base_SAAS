import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useLanguage } from '../shared/context';
import { BillingConfigurationPanel } from './components/BillingConfigurationPanel';
import { BillingHero } from './components/BillingHero';
import { BillingInvoiceHistory } from './components/BillingInvoiceHistory';
import { BillingOverviewBar } from './components/BillingOverviewBar';
import { ModuleSelectionPanel } from './components/ModuleSelectionPanel';
import { useBillingManagement } from './hooks/useBillingManagement';
import { getBillingCopy } from './translations';

export default function SubscriptionManagementPage() {
  const { currentLanguage } = useLanguage();
  const copy = getBillingCopy(currentLanguage.code);
  const billing = useBillingManagement(copy);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <BillingHero
          copy={copy}
          selection={billing.selection}
          subscription={billing.subscription}
          loading={billing.loading}
          onBack={billing.goBack}
          onRefresh={() => void billing.load()}
        />

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
            />
            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
              <ModuleSelectionPanel
                copy={copy}
                products={(billing.preview ?? billing.selection).available_products}
                selectedCodes={billing.draft.productCodes}
                disabled={Boolean(billing.action)}
                onToggle={billing.toggleProduct}
              />
              <BillingConfigurationPanel
                copy={copy}
                selection={billing.selection}
                preview={billing.preview}
                subscription={billing.subscription}
                draft={billing.draft}
                action={billing.action}
                hasChanges={billing.hasChanges}
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
              onOpenPortal={() => void billing.subscriptionAction('portal')}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
