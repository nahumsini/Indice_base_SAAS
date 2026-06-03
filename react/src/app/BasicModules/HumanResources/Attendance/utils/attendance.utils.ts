import type { AttendanceLocation } from '../../../../api/humanResources';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');

export const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const localDateTimeString = (date: Date) =>
  `${localDateString(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;

export const todayIsoDate = () => localDateString(new Date());

export const todayMonth = () => todayIsoDate().slice(0, 7);

export const formatAttendanceTime = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return '--';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

export const formatAttendanceBusinessOption = (location: AttendanceLocation) => (
  location.business_name?.trim() || location.name
);

export const formatAttendanceLocationOption = (location: AttendanceLocation, fallback: string) => (
  location.name?.trim() || location.business_name?.trim() || fallback
);

export const attendanceLocationUnitKey = (location: AttendanceLocation) => (
  location.unit_id ? String(location.unit_id) : 'unassigned'
);

export const attendanceLocationBusinessKey = (location: AttendanceLocation) => (
  location.business_id ? String(location.business_id) : `location:${location.id}`
);
