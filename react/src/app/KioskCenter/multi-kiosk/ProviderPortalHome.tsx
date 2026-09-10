import { ArrowRight, Boxes, BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import type { MultiKioskCard } from '../../api/multiKiosks';
import type { MultiKioskMobileCopy } from '../multiKioskMobileTranslations';
import { MultiKioskLauncherDashboard } from './MultiKioskLauncherDashboard';
import { getMultiKioskToolIdentity } from './toolPresentation';
import { getProviderPortalCopy } from './providerPortalTranslations';

interface ProviderPortalHomeProps {
  busyId: number | null;
  cards: readonly MultiKioskCard[];
  copy: MultiKioskMobileCopy;
  locale: string;
  moduleLabel: (ownerModule: string) => string;
  onOpen: (card: MultiKioskCard) => void | Promise<void>;
  providerName: string;
}

export function ProviderPortalHome({ busyId, cards, copy, locale, moduleLabel, onOpen, providerName }: ProviderPortalHomeProps) {
  const portalCopy = getProviderPortalCopy(locale);
  const localizedModuleLabel = (ownerModule: string) => ownerModule === 'PROCUREMENT'
    ? portalCopy.procurementModule
    : ownerModule === 'EXPENSES' ? portalCopy.expensesModule : moduleLabel(ownerModule);
  const proposals = cards.find(card => getMultiKioskToolIdentity(card) === 'provider.proposals@1');
  const payables = cards.find(card => getMultiKioskToolIdentity(card) === 'provider.payables@1');

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-[#59C3A5]/45 bg-white shadow-sm dark:border-emerald-800 dark:bg-slate-950">
        <div className="bg-[linear-gradient(135deg,rgba(89,195,165,0.22),rgba(255,255,255,0.92)_55%)] px-4 py-5 dark:bg-[linear-gradient(135deg,rgba(23,125,102,0.35),rgba(2,6,23,0.96)_58%)] sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#177D66] dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {portalCopy.safeSession}
              </p>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-slate-950 dark:text-white sm:text-[28px]">{portalCopy.homeTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{portalCopy.homeDescription}</p>
            </div>
            <p className="max-w-full truncate rounded-full border border-[#59C3A5]/35 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 dark:bg-slate-950/70 dark:text-slate-200">{providerName}</p>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <button
            type="button"
            disabled={!proposals || busyId !== null}
            onClick={() => proposals && void onOpen(proposals)}
            className="group flex min-h-36 items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50/45 p-4 text-left outline-none transition hover:border-[#E85D52] hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-500/20 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/20"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FF6B5E]/15 text-[#B63B32] dark:text-rose-300"><Boxes className="h-6 w-6" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-slate-950 dark:text-white">{portalCopy.productPathTitle}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{portalCopy.productPathDescription}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#B63B32] dark:text-rose-300">{portalCopy.openPath}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </span>
          </button>

          <button
            type="button"
            disabled={!payables || busyId !== null}
            onClick={() => payables && void onOpen(payables)}
            className="group flex min-h-36 items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/45 p-4 text-left outline-none transition hover:border-[#147514] hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/20"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#147514]/10 text-[#147514] dark:text-emerald-300"><BriefcaseBusiness className="h-6 w-6" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-slate-950 dark:text-white">{portalCopy.servicePathTitle}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{portalCopy.servicePathDescription}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#147514] dark:text-emerald-300">{portalCopy.openPath}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </span>
          </button>
        </div>
      </section>

      <section aria-labelledby="provider-portal-applications-title" className="space-y-3">
        <div>
          <h2 id="provider-portal-applications-title" className="text-lg font-medium text-slate-950 dark:text-white">{portalCopy.applicationsTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{portalCopy.applicationsDescription}</p>
        </div>
        <MultiKioskLauncherDashboard
          busyId={busyId}
          cards={cards}
          className="[&>header]:hidden [&>p:last-child]:hidden"
          copy={copy.launcher}
          moduleLabel={localizedModuleLabel}
          onOpen={onOpen}
          searchThreshold={99}
        />
      </section>
    </div>
  );
}
