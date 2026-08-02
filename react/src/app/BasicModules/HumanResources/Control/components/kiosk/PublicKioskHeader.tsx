import { Clock3, MapPin } from 'lucide-react';
import type { PublicKioskBootstrapResponse } from '../../../../../api/humanResources';
import type { KioskLocale, KioskTranslations } from './translations';

interface PublicKioskHeaderProps {
  bootstrap: PublicKioskBootstrapResponse | null;
  copy: KioskTranslations;
  currentTime: Date;
  selectedLocale: KioskLocale;
}

export function PublicKioskHeader({
  bootstrap,
  copy,
  currentTime,
  selectedLocale,
}: PublicKioskHeaderProps) {
  const timeLabel = currentTime.toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit' });
  const attendancePointLabel = bootstrap?.kiosk_device.name ?? copy.kioskDevice;
  const rawLocationLabel = bootstrap?.location?.name ?? bootstrap?.scope_label ?? copy.pointReady;
  const locationLabel = /all employees|location not enforced/i.test(rawLocationLabel)
    ? copy.deviceGpsRequired
    : rawLocationLabel;

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[11px] font-medium text-[#177D66] dark:text-[#8FE0CA]">{copy.terminalBadge}</p>
      <h1 className="mt-1 line-clamp-2 break-words text-xl font-medium leading-tight tracking-tight text-slate-950 dark:text-white">{attendancePointLabel}</h1>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
          {timeLabel}
        </span>
      </div>
    </header>
  );
}
