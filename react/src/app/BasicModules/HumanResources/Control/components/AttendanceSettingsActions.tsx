import { CalendarDays, MapPin, ShieldCheck, Table2 } from 'lucide-react';
import { IndiceTitleBarOverflow } from '../../../../components/frontend-os';
import { legacyOwnerKioskEntryPointsEnabled } from '../../../../components/kiosk-engine/kioskAdminNavigation';
import { Button } from '../../../../components/ui/button';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';
import { cn } from '../../../../components/ui/utils';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

export function AttendanceSettingsActions({
  copy,
  actionButtonClassName,
  primaryActionButtonClassName,
  onOpenContractSites,
  onOpenTimeTable,
  onOpenSchedules,
  onOpenKiosks,
}: {
  copy: AttendanceControlCopy;
  actionButtonClassName: string;
  primaryActionButtonClassName: string;
  onOpenContractSites: () => void;
  onOpenTimeTable: () => void;
  onOpenSchedules: () => void;
  onOpenKiosks: () => void;
}) {
  return (
    <HrTitleBar emoji="⏱️" title={copy.title} subtitle={copy.subtitle} actions={<>
          <Button variant="outline" className={cn(actionButtonClassName, hrTitleBarSecondaryActionClass)} onClick={onOpenTimeTable}>
            <Table2 className="h-4 w-4" />
            {copy.labels.timeTable}
          </Button>
          <Button variant="outline" className={cn(actionButtonClassName, hrTitleBarSecondaryActionClass)} onClick={onOpenSchedules}>
            <CalendarDays className="h-4 w-4" />
            {copy.labels.setSchedules}
          </Button>
          {legacyOwnerKioskEntryPointsEnabled ? <Button className={cn(primaryActionButtonClassName, hrTitleBarPrimaryActionClass)} onClick={onOpenKiosks}>
            <ShieldCheck className="h-4 w-4" />
            {copy.kiosk.management.title}
          </Button> : null}
          <IndiceTitleBarOverflow
            className={cn(actionButtonClassName, hrTitleBarSecondaryActionClass)}
            items={[{
              id: 'contract-sites',
              icon: <MapPin className="h-4 w-4" />,
              label: copy.sections.locations,
              onSelect: onOpenContractSites,
            }]}
            label={copy.actionsLabel}
          />
        </>}
    />
  );
}
