import type { ComponentProps } from 'react';
import type { AttendanceCorrectionStatus } from '../../../../api/humanResources';
import { Skeleton } from '../../../../components/ui/skeleton';
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
    isSelectionMode: boolean;
    isUpdatingCalendarDay: boolean;
    selectedCount: number;
    onBulkApply: () => void;
    onBulkStatusChange: (status: AttendanceCorrectionStatus | '') => void;
    onClearSelection: () => void;
    onExitSelectionMode: () => void;
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
  return (
    <>
      <AttendanceSettingsActions {...settingsActions} />

      <AttendanceControlFilters {...filters} />

      {showKpiStrip ? (
        <ControlKpiStrip {...kpiStrip} />
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
              calendar={<EmployeeCalendarPanel {...calendarPanel} bulkActions={calendarBulkActions} />}
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
