import type { ComponentProps } from 'react';
import { Check, X } from 'lucide-react';
import type { AttendanceCorrectionStatus } from '../../../../api/humanResources';
import { Skeleton } from '../../../../components/ui/skeleton';
import { OperationalBulkActionsBar } from '../../../shared/operational';
import { AttendanceControlFilters } from './AttendanceControlFilters';
import { AttendanceDailyBoard } from './AttendanceDailyBoard';
import { AttendanceQuickActions } from './AttendanceQuickActions';
import { AttendanceSettingsActions } from './AttendanceSettingsActions';
import { EmployeeAttendanceDetailPanel } from './EmployeeAttendanceDetailPanel';
import { EmployeeCalendarPanel } from './EmployeeCalendarPanel';
import { ControlKpiStrip } from './ControlKpiStrip';

export interface ControlOperationsWorkspaceProps {
  calendarBulkActions: {
    bulkCalendarStatus: AttendanceCorrectionStatus | '';
    isUpdatingCalendarDay: boolean;
    selectedCount: number;
    onBulkApply: () => void;
    onBulkStatusChange: (status: AttendanceCorrectionStatus | '') => void;
    onClearSelection: () => void;
  };
  calendarPanel: ComponentProps<typeof EmployeeCalendarPanel>;
  dailyBoard: ComponentProps<typeof AttendanceDailyBoard>;
  detailPanel: Omit<ComponentProps<typeof EmployeeAttendanceDetailPanel>, 'calendar' | 'quickActions'>;
  filters: ComponentProps<typeof AttendanceControlFilters>;
  hasOverview: boolean;
  isLoading: boolean;
  kpiStrip: ComponentProps<typeof ControlKpiStrip>;
  loadingLabel: string;
  quickActions: ComponentProps<typeof AttendanceQuickActions>;
  settingsActions: ComponentProps<typeof AttendanceSettingsActions>;
  showKpiStrip: boolean;
}

export function ControlOperationsWorkspace({
  calendarBulkActions,
  calendarPanel,
  dailyBoard,
  detailPanel,
  filters,
  hasOverview,
  isLoading,
  kpiStrip,
  loadingLabel,
  quickActions,
  settingsActions,
  showKpiStrip,
}: ControlOperationsWorkspaceProps) {
  const copy = settingsActions.copy;
  const selectedCalendarDayCount = calendarBulkActions.selectedCount;

  return (
    <>
      <AttendanceSettingsActions {...settingsActions} />

      <AttendanceControlFilters {...filters} />

      {showKpiStrip ? (
        <ControlKpiStrip {...kpiStrip} />
      ) : null}

      {selectedCalendarDayCount > 1 ? (
        <OperationalBulkActionsBar
          selectedLabel={copy.labels.bulkCalendarSelectedLabel(selectedCalendarDayCount)}
          title={copy.labels.bulkCalendarTitle}
          actions={[
            {
              id: 'apply-calendar-status',
              label: copy.labels.bulkCalendarApply,
              icon: <Check className="h-4 w-4" />,
              tone: 'brand',
              disabled: calendarBulkActions.isUpdatingCalendarDay,
              onClick: calendarBulkActions.onBulkApply,
            },
            {
              id: 'clear-calendar-selection',
              label: copy.labels.bulkCalendarClear,
              icon: <X className="h-4 w-4" />,
              disabled: calendarBulkActions.isUpdatingCalendarDay,
              onClick: calendarBulkActions.onClearSelection,
            },
          ]}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {copy.labels.bulkCalendarDescription}
            </p>
            <label className="flex w-full flex-col gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:w-auto sm:min-w-64">
              <span>{copy.labels.bulkCalendarStatusLabel}</span>
              <select
                value={calendarBulkActions.bulkCalendarStatus}
                disabled={calendarBulkActions.isUpdatingCalendarDay}
                onChange={(event) => calendarBulkActions.onBulkStatusChange(event.target.value as AttendanceCorrectionStatus | '')}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="on_time">{copy.labels.markAsAttendance}</option>
                <option value="absence">{copy.labels.markAsAbsent}</option>
                <option value="late">{copy.labels.markAsDelay}</option>
                <option value="rest">{copy.labels.markAsRest}</option>
                <option value="">{copy.labels.clearManualCorrection}</option>
              </select>
            </label>
          </div>
        </OperationalBulkActionsBar>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg bg-[#f6f8fc] p-3 dark:bg-gray-950/30 sm:p-4">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.8fr]">
            <Skeleton className="h-[900px] rounded-lg" />
            <Skeleton className="h-[900px] rounded-lg" />
          </div>
        </div>
      ) : hasOverview ? (
        <div className="rounded-lg bg-[#f6f8fc] p-3 dark:bg-gray-950/30 sm:p-4">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.92fr_1.78fr]">
            <AttendanceDailyBoard {...dailyBoard} />

            <EmployeeAttendanceDetailPanel
              {...detailPanel}
              quickActions={<AttendanceQuickActions {...quickActions} />}
              calendar={<EmployeeCalendarPanel {...calendarPanel} />}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
          {loadingLabel}
        </div>
      )}
    </>
  );
}
