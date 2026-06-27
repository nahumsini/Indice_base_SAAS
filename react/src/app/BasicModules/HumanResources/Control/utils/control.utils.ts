import { ApiClientError } from '../../../../lib/apiClient';
import type {
  AttendanceControlAssignment,
  AttendanceControlAssignmentPayload,
  AttendanceControlLocation,
  AttendanceControlLocationPayload,
  AttendanceControlTemplate,
  AttendanceControlTemplatePayload,
  AttendanceKioskDevicePayload,
} from '../../../../api/humanResources';
import type { ControlWorkSiteForm } from '../types/controlTypes';
import type { AttendanceControlCopy } from '../components/ControlAttendanceWidgets';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');

export const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const todayIsoDate = () => localDateString(new Date());

export const hrAttendanceSelectedEmployeeStorageKey = 'indice.hr.attendance.selectedEmployeeId';
export const allFilterValue = 'all';
export const emptyFilterValue = '__empty__';
export const attendanceStatusFilterValues = [
  'on_time',
  'late',
  'absence',
  'leave',
  'rest',
  'pending',
  'not_scheduled',
] as const;

export const toMonthValue = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
};

export const assignmentUnitFilterKey = (assignment: AttendanceControlAssignment) =>
  assignment.unit_id != null
    ? `id:${assignment.unit_id}`
    : assignment.unit_name
    ? `name:${assignment.unit_name}`
    : emptyFilterValue;

export const assignmentBusinessFilterKey = (assignment: AttendanceControlAssignment) =>
  assignment.business_id != null
    ? `id:${assignment.business_id}`
    : assignment.business_name
    ? `name:${assignment.business_name}`
    : emptyFilterValue;

export const weekdayNumbers = [1, 2, 3, 4, 5, 6, 7] as const;
export const CONTROL_SAVE_MINIMUM_LOADING_MS = 1000;
export const attendanceListBatchSize = 10;

const isDefaultNoShiftDay = (dayOfWeek: number) => dayOfWeek === 6 || dayOfWeek === 7;

export const waitForNextPaint = () => (
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
      return;
    }

    setTimeout(resolve, 0);
  })
);

export const createDefaultTemplateDays = () =>
  weekdayNumbers.map((day) => ({
    day_of_week: day,
    start_time: '08:00:00',
    end_time: '16:00:00',
    meal_minutes: 0,
    rest_minutes: 0,
    late_after_minutes: 10,
    is_rest_day: isDefaultNoShiftDay(day),
  }));

export const todayInputValue = () => todayIsoDate();

export const defaultLocationForm = (): AttendanceControlLocationPayload => ({
  unit_id: null,
  business_id: null,
  contract_start_date: todayInputValue(),
  contract_end_date: todayInputValue(),
  name: '',
  latitude: 25.686614,
  longitude: -100.316113,
  radius_meters: 120,
  required_hours_per_day: 8,
  required_start_time: '08:00:00',
  required_end_time: '16:00:00',
  status: 'active',
});

export const defaultTemplateForm = (): AttendanceControlTemplatePayload => ({
  name: '',
  status: 'active',
  schedule_mode: 'strict',
  block_after_grace_period: false,
  enforce_location: false,
  location_id: null,
  days: createDefaultTemplateDays(),
});

export const defaultAssignmentForm = (): AttendanceControlAssignmentPayload => ({
  user_company_ids: [],
  template_id: 0,
  effective_start_date: todayIsoDate(),
  effective_end_date: todayIsoDate(),
});

export const defaultWorkSiteForm = (): ControlWorkSiteForm => ({
  user_company_ids: [],
  location_ids: [],
  location_id: 0,
  effective_start_date: todayIsoDate(),
  effective_end_date: todayIsoDate(),
  start_time: '08:00',
  end_time: '16:00',
});

export const laterDate = (...dates: Array<string | null | undefined>) => {
  const values = dates.filter((date): date is string => Boolean(date));
  values.sort();
  return values.length > 0 ? values[values.length - 1] : '';
};

export const isDateWithinContractSiteWindow = (location: AttendanceControlLocation, date: string) => (
  (!location.contract_start_date || date >= location.contract_start_date) &&
  (!location.contract_end_date || date <= location.contract_end_date)
);

export const contractSiteAssignmentDates = (location: AttendanceControlLocation | undefined, requestedDate: string) => {
  const today = todayIsoDate();
  if (!location) {
    const startDate = laterDate(today, requestedDate) || today;
    return { startDate, endDate: startDate };
  }

  const minimumStartDate = laterDate(today, location.contract_start_date);
  const requestedStartDate = requestedDate && requestedDate >= minimumStartDate ? requestedDate : minimumStartDate;
  const maximumEndDate = location.contract_end_date;
  const startDate = maximumEndDate && requestedStartDate > maximumEndDate ? maximumEndDate : requestedStartDate;
  const endDate = maximumEndDate && maximumEndDate >= startDate ? maximumEndDate : startDate;
  return { startDate, endDate };
};

export const defaultKioskForm = (): AttendanceKioskDevicePayload => ({
  code: '',
  name: '',
  unit_id: null,
  business_id: null,
  location_id: null,
  status: 'active',
  metadata: {
    kiosk_type: 'open_attendance',
    supports_face_recognition: false,
  },
});

export const normalizeKioskPayload = (payload: AttendanceKioskDevicePayload): AttendanceKioskDevicePayload => {
  const rawKioskType = typeof payload.metadata?.kiosk_type === 'string'
    ? payload.metadata.kiosk_type
    : '';
  const hasScopedTarget = Boolean(payload.unit_id || payload.business_id || payload.location_id);
  const kioskType = rawKioskType || (hasScopedTarget ? 'business_unit' : 'open_attendance');

  if (kioskType === 'open_attendance') {
    return {
      ...payload,
      unit_id: null,
      business_id: null,
      location_id: null,
      metadata: {
        ...(payload.metadata ?? {}),
        kiosk_type: 'open_attendance',
        supports_face_recognition: Boolean(payload.metadata?.supports_face_recognition),
      },
    };
  }

  return {
    ...payload,
    metadata: {
      ...(payload.metadata ?? {}),
      kiosk_type: kioskType,
      supports_face_recognition: Boolean(payload.metadata?.supports_face_recognition),
    },
  };
};

export const findRuleForSelectedDay = (
  template: AttendanceControlTemplate | null,
  selectedDate: string,
) => {
  if (!template) {
    return null;
  }

  const parsed = new Date(`${selectedDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const dayOfWeek = parsed.getDay() === 0 ? 7 : parsed.getDay();
  return template.days.find((day) => day.day_of_week === dayOfWeek) ?? null;
};

export const timeInputValue = (value?: string | null) => (value ? value.slice(0, 5) : '');

export const templateDayMatchesHours = (
  day: AttendanceControlTemplate['days'][number] | undefined,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
) => {
  if (!day) {
    return false;
  }
  return !day.is_rest_day && timeInputValue(day.start_time) === startTime && timeInputValue(day.end_time) === endTime;
};

export const toErrorMessage = (error: unknown, copy: AttendanceControlCopy) => {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return copy.notFound;
    }
    if (error.status === 401) {
      return copy.unauthorized;
    }
    return error.message || copy.genericError;
  }

  return error instanceof Error ? error.message : copy.genericError;
};
