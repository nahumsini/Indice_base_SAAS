import { CalendarDays, MapPin, ShieldCheck, Table2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';

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
    <div className="mb-5 rounded-lg border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-6 shadow-sm dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            <span className="text-2xl">📅</span>
            {copy.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{copy.subtitle}</p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center lg:justify-end">
          <Button variant="outline" className={actionButtonClassName} onClick={onOpenContractSites}>
            <MapPin className="h-4 w-4" />
            {copy.sections.locations}
          </Button>
          <Button variant="outline" className={actionButtonClassName} onClick={onOpenTimeTable}>
            <Table2 className="h-4 w-4" />
            {copy.labels.timeTable}
          </Button>
          <Button variant="outline" className={actionButtonClassName} onClick={onOpenSchedules}>
            <CalendarDays className="h-4 w-4" />
            {copy.labels.setSchedules}
          </Button>
          <Button className={primaryActionButtonClassName} onClick={onOpenKiosks}>
            <ShieldCheck className="h-4 w-4" />
            Attendance Points
          </Button>
        </div>
      </div>
    </div>
  );
}
