import { ArrowRight, CalendarCheck2, Clock3, KeyRound, ShieldCheck } from 'lucide-react';
import {
  KioskAccessPanel,
  KioskMetricCard,
  KioskPinKeypad,
  KioskWorkspaceHeader,
} from '../../../../components/kiosk-engine/KioskWorkspacePrimitives';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { TaskKioskTranslations } from '../translations';

const processTasksKioskTone = 'yellow' as const;

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
  pointLabel,
  scopeLabel,
}: {
  copy: TaskKioskTranslations;
  currentTimeLabel: string;
  pointLabel: string;
  scopeLabel: string;
}) {
  return (
    <KioskWorkspaceHeader
      tone={processTasksKioskTone}
      icon={<ShieldCheck className="h-5 w-5" />}
      moduleLabel={copy.header.badge}
      kioskName={pointLabel}
      description={copy.header.subtitle}
      context={(
        <>
          <KioskMetricCard
            accent
            icon={<CalendarCheck2 className="h-4 w-4 shrink-0" />}
            label={copy.header.scope}
            tone={processTasksKioskTone}
            value={scopeLabel}
          />
          <KioskMetricCard
            icon={<Clock3 className="h-4 w-4 shrink-0" />}
            label={copy.header.time}
            tone={processTasksKioskTone}
            value={currentTimeLabel}
          />
        </>
      )}
    />
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
    <KioskAccessPanel
      tone={processTasksKioskTone}
      stepLabel={copy.steps.pin}
      title={copy.pin.title}
      description={copy.pin.description}
      icon={<KeyRound className="h-6 w-6" />}
    >
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
        <KioskPinKeypad
          value={pin}
          disabled={!isOnline || isSubmitting}
          deleteLabel={copy.pin.deleteKey}
          maxLength={5}
          tone={processTasksKioskTone}
          onChange={setPin}
        />
      </div>
    </KioskAccessPanel>
  );
}
