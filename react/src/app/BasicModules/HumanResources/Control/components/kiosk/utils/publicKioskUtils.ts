const padDatePart = (value: number) => `${value}`.padStart(2, '0');

export const publicKioskMinimumLoadingMs = 2000;

export const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const localDateTimeString = (date: Date) =>
  `${localDateString(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;

export const isObjectStorageDisabledError = (error: unknown) =>
  error instanceof Error && /object storage is not enabled/i.test(error.message);
