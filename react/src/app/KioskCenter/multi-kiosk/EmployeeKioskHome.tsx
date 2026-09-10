import { BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import type { MultiKioskCard } from '../../api/multiKiosks';
import type { MultiKioskMobileCopy } from '../multiKioskMobileTranslations';
import { MultiKioskLauncherDashboard } from './MultiKioskLauncherDashboard';

interface EmployeeKioskHomeProps {
  accent: {
    color: string;
    soft: string;
  };
  busyId: number | null;
  cards: readonly MultiKioskCard[];
  copy: MultiKioskMobileCopy;
  employeeName: string;
  moduleLabel: (ownerModule: string) => string;
  onOpen: (card: MultiKioskCard) => void | Promise<void>;
}

export function EmployeeKioskHome({
  accent,
  busyId,
  cards,
  copy,
  employeeName,
  moduleLabel,
  onOpen,
}: EmployeeKioskHomeProps) {
  return (
    <div className="space-y-5" data-employee-kiosk-home>
      <section
        className="rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-950 sm:p-4"
        style={{ borderColor: `${accent.color}55` }}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: accent.soft, color: accent.color }}
          >
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-xs font-medium" style={{ color: accent.color }}>{copy.launcher.available}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                {copy.launcher.activeSession}
              </span>
            </div>
            <h2 className="mt-1 truncate text-lg font-medium leading-6 text-slate-950 dark:text-white sm:text-xl">
              {employeeName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">{copy.launcher.intro}</p>
              <p aria-live="polite" className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {copy.launcher.accessCount(cards.length)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <MultiKioskLauncherDashboard
        busyId={busyId}
        cards={cards}
        className="[&>header]:hidden [&>p:last-child]:hidden"
        copy={copy.launcher}
        moduleLabel={moduleLabel}
        onOpen={onOpen}
      />
    </div>
  );
}
