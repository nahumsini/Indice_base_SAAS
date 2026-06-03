import type {
  AttendanceControlTemplate,
  AttendanceControlTemplatePayload,
} from '../../../../api/humanResources';
import type { EmployeeFormData } from '../components/CreateEmployeeModal';
import { weekdayConfig } from '../constants/employees.constants';

export const normalizeScheduleTemplatePayload = (payload: AttendanceControlTemplatePayload) =>
  JSON.stringify({
    schedule_mode: payload.schedule_mode ?? 'strict',
    block_after_grace_period: false,
    enforce_location: Boolean(payload.enforce_location),
    location_id: payload.location_id ?? null,
    days: payload.days.map((day) => ({
      day_of_week: day.day_of_week,
      start_time: day.start_time ?? null,
      end_time: day.end_time ?? null,
      meal_minutes: day.meal_minutes,
      rest_minutes: day.rest_minutes,
      late_after_minutes: day.late_after_minutes,
      is_rest_day: day.is_rest_day,
    })),
  });

export const payloadFromAttendanceTemplate = (template: AttendanceControlTemplate): AttendanceControlTemplatePayload => ({
  name: template.name,
  status: template.status === 'inactive' ? 'inactive' : 'active',
  schedule_mode: template.schedule_mode === 'open' ? 'open' : 'strict',
  block_after_grace_period: false,
  enforce_location: Boolean(template.enforce_location),
  location_id: template.location_id ?? null,
  days: template.days.map((day) => ({
    day_of_week: day.day_of_week,
    start_time: day.start_time ?? null,
    end_time: day.end_time ?? null,
    meal_minutes: day.meal_minutes ?? 0,
    rest_minutes: day.rest_minutes ?? 0,
    late_after_minutes: day.late_after_minutes,
    is_rest_day: day.is_rest_day,
  })),
});

export const buildHireScheduleTemplatePayload = (data: EmployeeFormData): AttendanceControlTemplatePayload => {
  const startTime = `${data.scheduleStartTime}:00`;
  const endTime = `${data.scheduleEndTime}:00`;
  const mealMinutes = Math.max(0, Number(data.scheduleMealMinutes) || 0);
  const restMinutes = Math.max(0, Number(data.scheduleRestMinutes) || 0);
  const lateAfterMinutes = Math.max(0, Number(data.scheduleLateAfterMinutes) || 0);
  const enforceLocation = data.scheduleLocationRule === 'exact' && Boolean(data.scheduleLocationId);
  const locationId = enforceLocation ? Number(data.scheduleLocationId) : null;
  const templateScope = enforceLocation ? `Location ${locationId}` : 'Employee business location';

  return {
    name: `Hire schedule ${data.scheduleStartTime}-${data.scheduleEndTime} ${templateScope}`,
    status: 'active',
    schedule_mode: 'strict',
    block_after_grace_period: false,
    enforce_location: enforceLocation,
    location_id: locationId,
    days: weekdayConfig.map((dayOfWeek) => {
      const isRestDay = dayOfWeek > 5;
      return {
        day_of_week: dayOfWeek,
        start_time: isRestDay ? null : startTime,
        end_time: isRestDay ? null : endTime,
        meal_minutes: isRestDay ? 0 : mealMinutes,
        rest_minutes: isRestDay ? 0 : restMinutes,
        late_after_minutes: isRestDay ? 0 : lateAfterMinutes,
        is_rest_day: isRestDay,
      };
    }),
  };
};
