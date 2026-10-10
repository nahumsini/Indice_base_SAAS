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
  busyId,
  cards,
  copy,
  employeeName,
  moduleLabel,
  onOpen,
}: EmployeeKioskHomeProps) {
  return (
    <div className="space-y-5 [[data-kiosk-large-text=true]_&_.text-xs]:text-base [[data-kiosk-large-text=true]_&_.text-sm]:text-base" data-employee-kiosk-home>
      <MultiKioskLauncherDashboard
        compact
        sessionLabel={employeeName}
        busyId={busyId}
        cards={cards}
        className="[&>p:last-child]:hidden"
        copy={copy.launcher}
        moduleLabel={moduleLabel}
        onOpen={onOpen}
      />
    </div>
  );
}
