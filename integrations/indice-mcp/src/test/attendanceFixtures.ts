import type { HrChange } from "../hrContracts.js";
import type { attendanceActions } from "../hrAttendanceContracts.js";
const schedule = { name: "Synthetic schedule", status: "active" as const, mode: "strict" as const, enforceLocation: false,
  days: [{ dayOfWeek: 1, startTime: "08:00", endTime: "16:00", mealMinutes: 0, restMinutes: 0, lateAfterMinutes: 10, restDay: false }] };
const location = { name: "Synthetic site", latitude: 45.4, longitude: -75.7, radiusMeters: 150,
  contractStartDate: "2026-10-01", contractEndDate: "2027-10-01", requiredStartTime: "08:00", requiredEndTime: "16:00", requiredDaysPerWeek: 5 };
export const attendanceFixtures: Record<(typeof attendanceActions)[number], HrChange> = {
  assign_hr_rest_days:{attendance:{restPlan:{assignments:[{userCompanyId:3,dates:["2026-10-12","2026-10-13"]}],notes:"Synthetic rest plan"}}},
  create_hr_schedule: { attendance: { schedule } }, update_hr_schedule: { id: 9, attendance: { schedule } },
  create_hr_location: { attendance: { location } }, update_hr_location: { id: 9, attendance: { location } },
  assign_hr_schedule: { attendance: { assignment: { templateId: 9, userCompanyIds: [3], startDate: "2026-10-12" } } },
  assign_hr_work_site: { attendance: { assignment: { locationId: 9, userCompanyIds: [3], startDate: "2026-10-12", endDate: "2026-10-13" } } },
  clear_hr_work_assignments: { attendance: { assignment: { userCompanyIds: [3], startDate: "2026-10-12" } } },
  set_hr_allowed_locations: { attendance: { allowedLocations: { userCompanyId: 3, locationIds: [] } } },
  correct_hr_attendance: { attendance: { correction: { userCompanyId: 3, dates: ["2026-10-01"], status: "rest" } } },
  record_hr_attendance_event: { attendance: { manualEvent: { userCompanyId: 3, date: "2026-10-01", kind: "check_in", timestamp: "2026-10-01T08:00:00", notes: "Synthetic adjustment" } } }
};
