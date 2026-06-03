import { CalendarRange } from 'lucide-react';
import type { ControlTranslations } from '../../../translations';
import type { OperationalScheduleSummary } from '../../../types/scheduleTypes';
import { formatEffectiveDate } from '../../../utils/scheduleDates';

interface ScheduleImpactSummaryProps {
  assignmentDateError: string;
  compact?: boolean;
  copy: ControlTranslations;
  effectiveStartDate: string;
  operationalSummary: OperationalScheduleSummary;
  selectedEmployeeCount: number;
}

export function ScheduleImpactSummary({
  assignmentDateError,
  compact = false,
  copy,
  effectiveStartDate,
  operationalSummary,
  selectedEmployeeCount,
}: ScheduleImpactSummaryProps) {
  const formattedStartDate = formatEffectiveDate(effectiveStartDate);
  const hasSelectedEmployees = selectedEmployeeCount > 0;
  const startMessage = copy.schedule.impact.startMessage(formattedStartDate);
  const overrideMessage = hasSelectedEmployees
    ? copy.schedule.impact.overrideMessageSelected
    : copy.schedule.impact.overrideMessageEmpty;

  if (compact) {
    return (
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-white">{operationalSummary.compact}</p>
        <p className="mt-0.5 max-w-2xl truncate text-white/75">{assignmentDateError || `${startMessage} ${overrideMessage}`}</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
      <div className="flex items-start gap-3">
        <CalendarRange className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-[#8FE0CA]" />
        <div>
          <p className="font-semibold">{copy.schedule.impact.selectedUsers(selectedEmployeeCount)}</p>
          <p className="mt-1 text-blue-800/80 dark:text-blue-100/75">{assignmentDateError || startMessage}</p>
          {!assignmentDateError ? (
            <p className="mt-1 text-blue-800/80 dark:text-blue-100/75">{overrideMessage}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
