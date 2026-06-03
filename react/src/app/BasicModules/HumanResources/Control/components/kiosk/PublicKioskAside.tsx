import {
  BadgeCheck,
  CircleDot,
  Clock3,
  MapPin,
} from 'lucide-react';
import type { PublicKioskBootstrapResponse } from '../../../../../api/humanResources';
import {
  KioskStepGuide,
  type KioskStepItem,
} from './PublicKioskComponents';
import type { KioskLocale, KioskTranslations } from './translations';

interface PublicKioskAsideProps {
  bootstrap: PublicKioskBootstrapResponse | null;
  copy: KioskTranslations;
  currentTime: Date;
  kioskLocationLabel: string;
  kioskSteps: KioskStepItem[];
  nextActionLabel: string;
  selectedLocale: KioskLocale;
}

export function PublicKioskAside({
  bootstrap,
  copy,
  currentTime,
  kioskLocationLabel,
  kioskSteps,
  nextActionLabel,
  selectedLocale,
}: PublicKioskAsideProps) {
  return (
    <aside className="min-h-0 overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(89,195,165,0.45)] dark:border-slate-800 dark:bg-slate-950">
      <div className="rounded-[24px] border border-[#59C3A5]/20 bg-[#59C3A5]/6 p-4 dark:border-[#8FE0CA]/20 dark:bg-[#8FE0CA]/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#59C3A5] dark:text-[#8FE0CA]">
              {copy.pointStatus}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {bootstrap?.kiosk_device.name ?? copy.kioskDevice}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {copy.pointActive}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-950/70">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.location}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{kioskLocationLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-950/70">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.accessPoint}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.pointReady}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-950/70">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{copy.currentTime}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                {currentTime.toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {copy.nextAction}
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#59C3A5] ring-1 ring-slate-200 dark:bg-slate-950 dark:text-[#8FE0CA] dark:ring-slate-700">
            <CircleDot className="h-3.5 w-3.5" />
            {nextActionLabel}
          </div>
        </div>
        <KioskStepGuide stepLabel={copy.stepLabel} steps={kioskSteps} />
      </div>
    </aside>
  );
}
