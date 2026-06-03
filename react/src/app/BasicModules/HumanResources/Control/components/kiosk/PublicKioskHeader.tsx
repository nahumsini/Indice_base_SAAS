import {
  CircleDot,
  Clock3,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import type { PublicKioskBootstrapResponse } from '../../../../../api/humanResources';
import {
  KioskLanguageSelector,
  KioskStatusMetric,
} from './PublicKioskComponents';
import type { KioskLocale, KioskTranslations } from './translations';

interface PublicKioskHeaderProps {
  bootstrap: PublicKioskBootstrapResponse | null;
  copy: KioskTranslations;
  currentTime: Date;
  detectedLocale: KioskLocale | null;
  kioskLocationLabel: string;
  localeOptions: ReadonlyArray<{ code: KioskLocale; label: string }>;
  selectedLocale: KioskLocale;
  onLocaleChange: (locale: KioskLocale) => void;
}

export function PublicKioskHeader({
  bootstrap,
  copy,
  currentTime,
  detectedLocale,
  kioskLocationLabel,
  localeOptions,
  selectedLocale,
  onLocaleChange,
}: PublicKioskHeaderProps) {
  return (
    <div className="border-b border-slate-200/80 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#59C3A5] text-white shadow-sm dark:bg-[#8FE0CA] dark:text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">indice</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-[#8FE0CA]">
                {copy.terminalBadge}
              </p>
            </div>
          </div>
          <KioskLanguageSelector
            copy={copy}
            detectedLocale={detectedLocale}
            locale={selectedLocale}
            localeOptions={localeOptions}
            onLocaleChange={onLocaleChange}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[34rem]">
          <KioskStatusMetric
            label={copy.kioskDevice}
            value={bootstrap?.kiosk_device.name ?? '—'}
            Icon={CircleDot}
            isStrong
          />
          <KioskStatusMetric
            label={copy.location}
            value={kioskLocationLabel}
            Icon={MapPin}
          />
          <KioskStatusMetric
            label={copy.currentTime}
            value={currentTime.toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit' })}
            Icon={Clock3}
          />
        </div>
      </div>
    </div>
  );
}
