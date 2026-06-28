import {
  CalendarCheck2,
  Clock3,
  ShieldCheck,
  Sparkles,
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
  kioskGreeting: string;
  kioskMessage: KioskTranslations['messages']['default'][number];
  localeOptions: ReadonlyArray<{ code: KioskLocale; label: string }>;
  selectedLocale: KioskLocale;
  onLocaleChange: (locale: KioskLocale) => void;
}

export function PublicKioskHeader({
  bootstrap,
  copy,
  currentTime,
  detectedLocale,
  kioskGreeting,
  kioskMessage,
  localeOptions,
  selectedLocale,
  onLocaleChange,
}: PublicKioskHeaderProps) {
  const timeLabel = currentTime.toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit' });
  const attendancePointLabel = bootstrap?.kiosk_device.name ?? copy.kioskDevice;

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:static sm:px-5 sm:py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-stretch">
        <div className="rounded-lg border border-[#59C3A5]/20 bg-[linear-gradient(135deg,_#f1fffb_0%,_#ffffff_58%,_#eef9f6_100%)] p-3 shadow-sm dark:border-[#8FE0CA]/20 dark:bg-[linear-gradient(135deg,_#05231d_0%,_#020617_58%,_#0f172a_100%)] sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#59C3A5] text-white shadow-sm dark:bg-[#8FE0CA] dark:text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-2xl font-black leading-none tracking-tight text-slate-950 dark:text-white">
                    Indice
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#177d66] dark:text-[#8FE0CA]">
                    {copy.terminalBadge}
                  </p>
                </div>
                <div className="w-full min-w-0 sm:w-auto">
                  <KioskLanguageSelector
                    copy={copy}
                    detectedLocale={detectedLocale}
                    locale={selectedLocale}
                    localeOptions={localeOptions}
                    onLocaleChange={onLocaleChange}
                  />
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[#59C3A5]/20 bg-white/80 px-3 py-3 dark:border-[#8FE0CA]/20 dark:bg-slate-950/55">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#59C3A5] dark:text-[#8FE0CA]" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#177d66] dark:text-[#8FE0CA]">
                      {kioskGreeting}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-950 dark:text-white">
                      {kioskMessage.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {kioskMessage.body} {kioskMessage.note}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <KioskStatusMetric
            label={copy.kioskDevice}
            value={attendancePointLabel}
            Icon={CalendarCheck2}
            isStrong
          />
          <KioskStatusMetric
            label={copy.currentTime}
            value={timeLabel}
            Icon={Clock3}
          />
        </div>
      </div>
    </div>
  );
}
