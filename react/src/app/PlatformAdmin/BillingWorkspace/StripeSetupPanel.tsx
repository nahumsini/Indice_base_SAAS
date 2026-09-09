import { useLanguage } from "../../shared/context";
import { catalogLocale, getCatalogCopy } from "../CatalogWorkspace/translations";
import { Plug, RefreshCw } from 'lucide-react';
import type { PlatformCatalog } from '../../api/platformAdmin';
import { getStripeSetupStatus } from './stripeSetupStatus';

export type StripeSetupPanelProps = {
  english: boolean;
  environment: PlatformCatalog['stripe_environment'] | undefined;
  onRefresh: () => void;
  refreshing?: boolean;
  canDemoConnect?: boolean;
  demoConnected?: boolean;
  onDemoConnect?: () => void;
  onDemoDisconnect?: () => void;
};

export function StripeSetupPanel({ english, environment, onRefresh, refreshing = false, canDemoConnect = false, demoConnected = false, onDemoConnect, onDemoDisconnect }: StripeSetupPanelProps) {
  const { currentLanguage } = useLanguage();
  const languageCode = catalogLocale(currentLanguage.code);
  const status = getStripeSetupStatus(environment);
  const showDemo = canDemoConnect && demoConnected;
  const copy = {
    title: getCatalogCopy(languageCode).stripeConnection,
    description: getCatalogCopy(languageCode).theRestrictedStripeKeyAndWebhookSigningSecret,
    demoDescription: getCatalogCopy(languageCode).tryASimulatedStripeConnectionForThisLocal,
    mode: getCatalogCopy(languageCode).mode,
    unknownMode: getCatalogCopy(languageCode).unknown,
    integration: getCatalogCopy(languageCode).customerBilling,
    integrationStates: { DISABLED: getCatalogCopy(languageCode).disabled, ENABLED_UNVERIFIED: getCatalogCopy(languageCode).enabledVerificationPending, UNKNOWN: getCatalogCopy(languageCode).statusUnavailable },
    connectDemo: getCatalogCopy(languageCode).connectStripeDemo,
    disconnectDemo: getCatalogCopy(languageCode).disconnectDemo,
    demoActive: getCatalogCopy(languageCode).demoConnectedSimulated,
    serverSettings: getCatalogCopy(languageCode).actualServerSettings,
    liveSynchronization: getCatalogCopy(languageCode).livePriceSynchronization,
    liveStates: { ENABLED: getCatalogCopy(languageCode).enabledOnThisServer, LOCKED_IN_TEST: getCatalogCopy(languageCode).lockedTESTMode, LOCKED_INTEGRATION: getCatalogCopy(languageCode).lockedStripeDisabled, LOCKED_CONFIGURATION: getCatalogCopy(languageCode).lockedByServerConfiguration, UNKNOWN: getCatalogCopy(languageCode).statusUnavailable },
    verification: getCatalogCopy(languageCode).theseAreTheActualServerSettingsTheyDo,
    demoSeparation: getCatalogCopy(languageCode).theDemoDoesNotChangeThem,
    refresh: getCatalogCopy(languageCode).refreshStatus,
    refreshing: getCatalogCopy(languageCode).refreshing,
    setup: getCatalogCopy(languageCode).setupSteps,
    realSetup: getCatalogCopy(languageCode).realStripeSetup,
    steps: [getCatalogCopy(languageCode).configureTheRestrictedStripeKeyAndWebhookSigning, getCatalogCopy(languageCode).verifyTheStripeAccountAndSuccessfulProcessingOf, getCatalogCopy(languageCode).inCatalogModulesSavePricesInTheDraft]
  };

  return (
    <section aria-label={copy.title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
            <Plug aria-hidden="true" className="h-5 w-5 shrink-0 text-[#177D66] dark:text-[#8FE0CA]" />
            {copy.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{canDemoConnect ? copy.demoDescription : copy.description}</p>
          {showDemo ? <p role="status" className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{copy.demoActive}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? copy.refreshing : copy.refresh}
            </button>
            {canDemoConnect ? showDemo ? (
              <button type="button" onClick={onDemoDisconnect} disabled={!onDemoDisconnect} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">{copy.disconnectDemo}</button>
            ) : (
              <button type="button" onClick={onDemoConnect} disabled={!onDemoConnect} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 py-2 text-sm font-medium text-white hover:bg-[#126653] disabled:cursor-not-allowed disabled:opacity-50">
                <Plug aria-hidden="true" className="h-4 w-4" />{copy.connectDemo}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {canDemoConnect ? <p className="mt-5 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.serverSettings}</p> : null}
      <dl aria-live="polite" aria-busy={refreshing} className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">{copy.mode}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{status.mode ?? copy.unknownMode}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">{copy.integration}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{copy.integrationStates[status.integration]}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">{copy.liveSynchronization}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{copy.liveStates[status.liveSynchronization]}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.verification}{canDemoConnect ? ` ${copy.demoSeparation}` : ''}</p>

      <details className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">{canDemoConnect ? copy.realSetup : copy.setup}</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {copy.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </details>
    </section>
  );
}
