import type {
  AttendanceControlLocation,
  AttendanceControlLocationPayload,
} from '../../../../api/humanResources';
import type { KioskType } from '../types/controlTypes';

export const timeToInput = (value?: string | null) => (value ?? '').slice(0, 5);

export const dateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const laterDate = (...dates: Array<string | null | undefined>) => {
  const values = dates.filter((date): date is string => Boolean(date));
  values.sort();
  return values.length > 0 ? values[values.length - 1] : '';
};

export const contractSiteAssignmentDates = (
  location: AttendanceControlLocation | undefined,
  requestedStartDate: string,
  todayDate: string,
) => {
  if (!location) {
    const startDate = laterDate(todayDate, requestedStartDate) || todayDate;
    return { startDate, endDate: startDate };
  }

  const minimumStartDate = laterDate(todayDate, location.contract_start_date);
  const startCandidate = requestedStartDate && requestedStartDate >= minimumStartDate
    ? requestedStartDate
    : minimumStartDate;
  const startDate = location.contract_end_date && startCandidate > location.contract_end_date
    ? location.contract_end_date
    : startCandidate;
  const endDate = location.contract_end_date && location.contract_end_date >= startDate
    ? location.contract_end_date
    : startDate;
  return { startDate, endDate };
};

export const withContractSiteTime = (
  payload: AttendanceControlLocationPayload,
  field: 'required_start_time' | 'required_end_time',
  value: string,
): AttendanceControlLocationPayload => {
  return {
    ...payload,
    [field]: value ? `${value}:00` : null,
  };
};

const kioskTypeOptions: KioskType[] = ['business_unit', 'contract_site', 'head_office', 'open_attendance'];

export const kioskTypeFromMetadata = (metadata?: Record<string, unknown>): KioskType => {
  const value = typeof metadata?.kiosk_type === 'string' ? metadata.kiosk_type : '';
  return kioskTypeOptions.includes(value as KioskType) ? value as KioskType : 'business_unit';
};

export const withKioskType = (metadata: Record<string, unknown> | undefined, kioskType: KioskType) => ({
  ...(metadata ?? {}),
  kiosk_type: kioskType,
});

const isContractSiteLocation = (location: AttendanceControlLocation) =>
  (location.managed_source ?? '').toLowerCase() === 'contract_site';

export const isBusinessStructureLocation = (location: AttendanceControlLocation) =>
  (location.managed_source ?? '').toLowerCase() === 'business_structure';

const normalizeLocationLabel = (value?: string | null) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const headOfficeExactKeys = new Set([
  'corporateoffice',
  'oficinacorporativa',
  'sedecorporativa',
  'headquarter',
  'headquarters',
  'headoffice',
  'mainoffice',
  'oficinacentral',
]);

const headOfficeContainsKeys = [
  'corporateoffice',
  'oficinacorporativa',
  'sedecorporativa',
  'headoffice',
  'mainoffice',
  'oficinacentral',
];

const isHeadOfficeLocation = (location: AttendanceControlLocation) => {
  if (!isBusinessStructureLocation(location)) {
    return false;
  }
  if (!location.business_id) {
    return true;
  }

  const labels = [location.name, location.unit_name, location.business_name]
    .map(normalizeLocationLabel)
    .filter(Boolean);

  return labels.some((label) =>
    headOfficeExactKeys.has(label) || headOfficeContainsKeys.some((key) => label.includes(key))
  );
};

export const locationMatchesKioskType = (location: AttendanceControlLocation, kioskType: KioskType) => {
  if (kioskType === 'contract_site') {
    return isContractSiteLocation(location);
  }
  if (kioskType === 'open_attendance') {
    return false;
  }
  if (kioskType === 'head_office') {
    return isHeadOfficeLocation(location);
  }
  return isBusinessStructureLocation(location) && Boolean(location.business_id) && !isHeadOfficeLocation(location);
};

export const isActiveLocation = (location: AttendanceControlLocation) => (location.status ?? 'active') !== 'inactive';

const slugifyKioskPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

export const defaultKioskCode = (location: AttendanceControlLocation, kioskType: KioskType) => {
  const prefix = kioskType === 'contract_site'
    ? 'site'
    : kioskType === 'head_office'
      ? 'hq'
      : 'business';
  const slug = slugifyKioskPart(location.name) || `${prefix}-${location.id}`;
  return `${slug}-point`;
};

export const defaultKioskScopeCode = (label: string, fallback: string) =>
  `${slugifyKioskPart(label) || fallback}-point`;
