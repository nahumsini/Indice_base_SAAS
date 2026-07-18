import { ArrowRight, CalendarCheck2, Clock3, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { PublicTaskKioskIdentifyResponse } from '../processTaskKioskApi';
import type { TaskKioskLocale, TaskKioskTranslations } from '../translations';
import { TaskKioskLanguageSelector, TaskPinKeypad } from './PublicTaskKioskControls';

export function PublicTaskKioskSessionBanners({
  isOnline,
  isSessionExpiring,
  copy,
}: {
  isOnline: boolean;
  isSessionExpiring: boolean;
  copy: TaskKioskTranslations;
}) {
  return (
    <>
      {!isOnline ? (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {copy.session.offline}
        </div>
      ) : null}
      {isSessionExpiring ? (
        <div role="status" className="border-b border-blue-300 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
          {copy.session.expiring}
        </div>
      ) : null}
    </>
  );
}

export function PublicTaskKioskHeader({
  copy,
  currentTimeLabel,
  detectedLocale,
  identity,
  localeOptions,
  onLocaleChange,
  pointLabel,
  selectedLocale,
}: {
  copy: TaskKioskTranslations;
  currentTimeLabel: string;
  detectedLocale: TaskKioskLocale | null;
  identity: PublicTaskKioskIdentifyResponse | null;
  localeOptions: ReadonlyArray<{ code: TaskKioskLocale; label: string }>;
  onLocaleChange: (locale: TaskKioskLocale) => void;
  pointLabel: string;
  selectedLocale: TaskKioskLocale;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:static sm:px-5 sm:py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-stretch">
        <div className="rounded-lg border border-[#F4C84A]/30 bg-[linear-gradient(135deg,_#fff8dc_0%,_#ffffff_58%,_#fff4c2_100%)] p-3 shadow-sm dark:border-[#F4C84A]/25 dark:bg-[linear-gradient(135deg,_#3a2700_0%,_#020617_58%,_#0f172a_100%)] sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A] text-slate-950 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-2xl font-black leading-none text-slate-950 dark:text-white">Indice</p>
                  <p className="mt-1 text-sm font-bold text-[#9A6B05] dark:text-[#FDE68A]">{copy.header.badge}</p>
                </div>
                <TaskKioskLanguageSelector
                  copy={copy}
                  detectedLocale={detectedLocale}
                  locale={selectedLocale}
                  localeOptions={localeOptions}
                  onLocaleChange={onLocaleChange}
                />
              </div>
              <div className="mt-3 rounded-lg border border-[#F4C84A]/25 bg-white/80 px-3 py-3 dark:border-[#F4C84A]/20 dark:bg-slate-950/60">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6B05] dark:text-[#FDE68A]" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6B05] dark:text-[#FDE68A]">
                      {identity ? copy.identity.eyebrow : copy.header.title}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-950 dark:text-white">
                      {identity ? identity.user.full_name : copy.header.subtitle}
                    </p>
                    {identity ? (
                      <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {identity.user.position_title || identity.user.department || identity.user.user_code || copy.identity.fallbackStatus}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric icon={<CalendarCheck2 className="h-4 w-4 shrink-0" />} label={copy.header.point} value={pointLabel} accent />
          <Metric icon={<Clock3 className="h-4 w-4 shrink-0" />} label={copy.header.time} value={currentTimeLabel} />
        </div>
      </div>
    </header>
  );
}

export function PublicTaskKioskPinAccess({
  copy,
  isOnline,
  isSubmitting,
  onIdentify,
  pin,
  setPin,
}: {
  copy: TaskKioskTranslations;
  isOnline: boolean;
  isSubmitting: boolean;
  onIdentify: () => void;
  pin: string;
  setPin: (pin: string) => void;
}) {
  return (
    <section className="mt-3 rounded-lg border border-[#F4C84A]/25 bg-[#F4C84A]/8 p-3 shadow-sm dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10 sm:mt-0 sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9A6B05] dark:text-[#FDE68A]">{copy.steps.pin}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{copy.pin.title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.pin.description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F4C84A] text-slate-950 shadow-sm">
          <KeyRound className="h-6 w-6" />
        </div>
      </div>
      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{copy.pin.placeholder}</label>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem]">
        <Input
          value={pin}
          inputMode="numeric"
          maxLength={5}
          placeholder={copy.pin.placeholder}
          autoFocus
          autoComplete="off"
          enterKeyHint="done"
          className="h-16 rounded-lg border-[#F4C84A]/35 bg-white text-center text-2xl font-black tracking-[0.35em] text-slate-950 shadow-inner outline-none placeholder:tracking-normal dark:border-[#F4C84A]/30 dark:bg-slate-950 dark:text-white sm:h-24 sm:text-4xl sm:tracking-[0.42em]"
          disabled={!isOnline || isSubmitting}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 5))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onIdentify();
            }
          }}
        />
        <Button
          type="button"
          className="h-14 rounded-lg bg-[#F4C84A] px-6 text-base font-black text-slate-950 shadow-sm hover:bg-[#E5B835] disabled:opacity-45 sm:h-24"
          disabled={!isOnline || pin.length < 5 || isSubmitting}
          onClick={onIdentify}
        >
          <KeyRound className="h-5 w-5" />
          {copy.pin.continue}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
      <div className="mt-4 max-w-none sm:max-w-xl">
        <TaskPinKeypad value={pin} disabled={!isOnline || isSubmitting} deleteLabel={copy.pin.deleteKey} onChange={setPin} />
      </div>
    </section>
  );
}

function Metric({
  accent = false,
  icon,
  label,
  value,
}: {
  accent?: boolean;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg border px-4 py-3 ${accent ? 'border-[#F4C84A]/25 bg-[#F4C84A]/8 dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10' : 'border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-950/75'}`}>
      <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {icon}<span className="truncate">{label}</span>
      </div>
      <p className={`mt-2 truncate text-base font-bold ${accent ? 'text-[#9A6B05] dark:text-[#FDE68A]' : 'text-slate-950 dark:text-white'}`}>{value}</p>
    </div>
  );
}
