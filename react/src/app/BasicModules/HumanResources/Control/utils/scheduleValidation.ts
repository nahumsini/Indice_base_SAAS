import type { AttendanceControlAssignment } from '../../../../api/humanResources';

export const getScheduleBlockReason = (assignment: AttendanceControlAssignment) =>
  assignment.schedule_busy_reason?.trim() ?? '';

const blocksScheduleSave = (assignment: AttendanceControlAssignment) => {
  if (assignment.can_assign_schedule !== false) {
    return false;
  }
  const reason = getScheduleBlockReason(assignment).toLowerCase();
  if (!reason) {
    return true;
  }
  return !reason.includes('schedule already assigned');
};

export const isScheduleAssignable = (assignment: AttendanceControlAssignment) => !blocksScheduleSave(assignment);
