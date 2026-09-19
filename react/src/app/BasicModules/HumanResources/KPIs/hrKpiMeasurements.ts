import type { HrAsset } from '../../../api/HumanResources/assets';
import type { AttendanceControlAssignment, BackendRecordItem } from '../../../api/humanResources';

export type HrKpiSignalStatus = 'healthy' | 'watch' | 'critical' | 'unavailable';

export interface HrAttendanceMeasurements {
  absence: number;
  attendanceRate: number | null;
  completedSample: number;
  late: number;
  leave: number;
  onTime: number;
  pending: number;
  present: number;
  punctualityRate: number | null;
  rest: number;
  scheduled: number;
  unconfigured: number;
}
export interface HrRecordMeasurements {
  criticalOpen: number;
  open: number;
  pending: number;
  resolved: number;
  reviewed: number;
  total: number;
}

export interface HrAssetMeasurements {
  assignedItems: number;
  assignedPeople: number;
  available: number;
  inactive: number;
  maintenance: number;
  total: number;
}

const percent = (numerator: number, denominator: number) => (
  denominator > 0 ? Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100))) : null
);

const hasWorkingSchedule = (assignment: AttendanceControlAssignment) => (
  assignment.today_rule != null
  && assignment.today_rule.is_rest_day !== true
  && assignment.today_status !== 'not_scheduled'
);

/**
 * Measures one operational attendance date without treating future/pending work,
 * rest days, leave, or missing schedule configuration as an absence.
 */
export function measureHrAttendance(assignments: AttendanceControlAssignment[]): HrAttendanceMeasurements {
  let scheduled = 0;
  let onTime = 0;
  let late = 0;
  let leave = 0;
  let rest = 0;
  let absence = 0;
  let pending = 0;
  let unconfigured = 0;

  assignments.forEach((assignment) => {
    if (assignment.today_status === 'rest' || assignment.today_rule?.is_rest_day === true) {
      rest += 1;
      return;
    }
    if (assignment.today_status === 'leave') {
      leave += 1;
      return;
    }
    if (!hasWorkingSchedule(assignment)) {
      unconfigured += 1;
      return;
    }

    scheduled += 1;
    switch (assignment.today_status) {
      case 'on_time':
        onTime += 1;
        break;
      case 'late':
        late += 1;
        break;
      case 'absence':
        absence += 1;
        break;
      case 'pending':
        pending += 1;
        break;
      default:
        break;
    }
  });

  const present = onTime + late;
  const completedSample = present + absence;
  return {
    absence,
    attendanceRate: percent(present, completedSample),
    completedSample,
    late,
    leave,
    onTime,
    pending,
    present,
    punctualityRate: percent(onTime, present),
    rest,
    scheduled,
    unconfigured,
  };
}

export const isOpenHrRecord = (record: BackendRecordItem) => record.status !== 'resolved';

export const isCriticalOpenHrRecord = (record: BackendRecordItem) => (
  isOpenHrRecord(record) && record.severity === 'high'
);

export function measureHrRecords(records: BackendRecordItem[]): HrRecordMeasurements {
  const openRecords = records.filter(isOpenHrRecord);
  return {
    criticalOpen: openRecords.filter(isCriticalOpenHrRecord).length,
    open: openRecords.length,
    pending: records.filter((record) => record.status === 'pending').length,
    resolved: records.filter((record) => record.status === 'resolved').length,
    reviewed: records.filter((record) => record.status === 'reviewed').length,
    total: records.length,
  };
}

export function measureHrAssets(assets: HrAsset[], visibleEmployeeIds: Set<number>): HrAssetMeasurements {
  const assignedAssets = assets.filter((asset) => ['assigned', 'custody'].includes(asset.status));
  const assignedPeople = new Set(
    assignedAssets
      .map((asset) => asset.responsible_user_company_id)
      .filter((id): id is number => id != null && visibleEmployeeIds.has(id)),
  );
  return {
    assignedItems: assignedAssets.length,
    assignedPeople: assignedPeople.size,
    available: assets.filter((asset) => asset.status === 'available').length,
    inactive: assets.filter((asset) => asset.status === 'inactive').length,
    maintenance: assets.filter((asset) => asset.status === 'maintenance').length,
    total: assets.length,
  };
}

export function assetMatchesHrScope({
  asset,
  businessFilter,
  departmentFilter,
  employeeIds,
  unitFilter,
}: {
  asset: HrAsset;
  businessFilter: string;
  departmentFilter: string;
  employeeIds: Set<number>;
  unitFilter: string;
}) {
  if (asset.responsible_user_company_id != null) {
    return employeeIds.has(asset.responsible_user_company_id);
  }

  // Unassigned assets have no business/department fields. They are only safe to
  // include when those narrower scopes are not requested.
  return businessFilter === 'all'
    && departmentFilter === 'all'
    && (unitFilter === 'all' || String(asset.unit_id ?? '') === unitFilter);
}
