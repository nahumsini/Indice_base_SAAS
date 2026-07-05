import { Briefcase, FileText, Phone, User } from 'lucide-react';
import type { AttendanceControlLocation } from '../../../../../api/humanResources';
import type {
  CustomJobOptions,
  EmployeeDocumentSlot,
  EmployeeDocumentType,
  EmployeeFormData,
  OrganizationOptionTone,
} from './types';

export type {
  CustomJobOptionKind,
  CustomJobOptions,
  EmployeeDocumentSlot,
  EmployeeDocumentType,
  EmployeeFieldKey,
  EmployeeFormData,
  EmployeeModalProps,
  OrganizationOption,
  OrganizationOptionTone,
} from './types';

export const DOCUMENT_TYPES: EmployeeDocumentType[] = [
  'birth_certificate',
  'government_id',
  'proof_of_address',
  'resume',
  'profile_photo',
];

export const SUPPORTED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const modalStepIcons = [User, Phone, Briefcase, FileText] as const;

const customJobOptionsStorageKey = 'rh-employee-custom-job-options-v1';

const organizationToneOrder: Record<OrganizationOptionTone, number> = {
  corporate: 0,
  unit: 1,
  business: 2,
  default: 3,
};

export const compareOrganizationTones = (
  first?: OrganizationOptionTone,
  second?: OrganizationOptionTone,
) => organizationToneOrder[first ?? 'default'] - organizationToneOrder[second ?? 'default'];

export const dateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDocumentSlot = (documentType: EmployeeDocumentType): EmployeeDocumentSlot => ({
  documentType,
  file: null,
  removeExisting: false,
});

export const createEmptyCustomJobOptions = (): CustomJobOptions => ({
  departments: [],
  positions: [],
});

export const createEmptyEmployeeFormData = (): EmployeeFormData => ({
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  mobilePhone: '',
  dateOfBirth: '',
  address: '',
  nationalId: '',
  taxId: '',
  socialSecurityNumber: '',
  registrationCountry: '',
  stateProvince: '',
  city: '',
  postalCode: '',
  alternatePhone: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  department: '',
  position: '',
  businessUnitId: '',
  businessId: '',
  hireDate: '',
  scheduleOnHire: false,
  scheduleStartDate: '',
  scheduleEndDate: '',
  scheduleStartTime: '08:00',
  scheduleEndTime: '16:00',
  scheduleMealMinutes: '0',
  scheduleRestMinutes: '0',
  scheduleLateAfterMinutes: '10',
  scheduleBlockAfterGracePeriod: false,
  scheduleLocationRule: 'business',
  scheduleLocationId: '',
  salaryType: 'daily',
  workdayHours: '8',
  workdaysPerWeek: '5',
  payrollTreatment: 'fiscal_payroll',
  salary: '',
  hourlyRate: '',
  payPeriod: 'weekly',
  contractType: 'permanent',
  contractStartDate: '',
  contractEndDate: '',
  documents: {
    birth_certificate: createDocumentSlot('birth_certificate'),
    government_id: createDocumentSlot('government_id'),
    proof_of_address: createDocumentSlot('proof_of_address'),
    resume: createDocumentSlot('resume'),
    profile_photo: createDocumentSlot('profile_photo'),
  },
});

export const formatAttendanceLocationOption = (location: AttendanceControlLocation) => {
  const scope = location.business_name || location.unit_name || '';
  return scope ? `${location.name} - ${scope}` : location.name;
};

export const normalizeOptionLabel = (value: string) => value.trim().replace(/\s+/g, ' ');

export const mergeTextOptions = (...optionGroups: ReadonlyArray<ReadonlyArray<string>>) => {
  const optionMap = new Map<string, string>();

  optionGroups.flat().forEach((option) => {
    const normalized = normalizeOptionLabel(option);
    if (!normalized) {
      return;
    }

    const key = normalized.toLocaleLowerCase();
    if (!optionMap.has(key)) {
      optionMap.set(key, normalized);
    }
  });

  return Array.from(optionMap.values());
};

export const normalizeOrganizationLabel = (value?: string | null) => (
  normalizeOptionLabel(value ?? '').toLocaleLowerCase()
);

export const isCorporateHeadquartersLabel = (label?: string | null) => {
  const normalized = normalizeOrganizationLabel(label);
  return normalized === 'corporate office'
    || normalized === 'headquarter'
    || normalized === 'headquarters'
    || normalized === 'oficina corporativa'
    || normalized === 'sede corporativa';
};

export const isCorporateOfficeUnitLabel = (label?: string | null) => (
  isCorporateHeadquartersLabel(label)
);

export const getUnitHeadquartersLabel = (unitLabel?: string | null) => (
  `${normalizeOptionLabel(unitLabel ?? '') || 'Unit'} headquarters`
);

export const isUnitHeadquartersLabel = (businessLabel?: string | null, unitLabel?: string | null) => {
  const normalizedBusiness = normalizeOrganizationLabel(businessLabel);
  const normalizedUnit = normalizeOptionLabel(unitLabel ?? '');
  if (!normalizedBusiness || !normalizedUnit) {
    return false;
  }

  return normalizedBusiness === normalizeOrganizationLabel(getUnitHeadquartersLabel(normalizedUnit))
    || normalizedBusiness === normalizeOrganizationLabel(`${normalizedUnit} headquarter`)
    || normalizedBusiness === normalizeOrganizationLabel(`${normalizedUnit} sede`)
    || normalizedBusiness === normalizeOrganizationLabel(`sede ${normalizedUnit}`);
};

export const loadCustomJobOptions = (): CustomJobOptions => {
  if (typeof window === 'undefined') {
    return createEmptyCustomJobOptions();
  }

  try {
    const rawValue = window.localStorage.getItem(customJobOptionsStorageKey);
    if (!rawValue) {
      return createEmptyCustomJobOptions();
    }

    const parsedValue = JSON.parse(rawValue) as Partial<CustomJobOptions>;
    return {
      departments: Array.isArray(parsedValue.departments)
        ? mergeTextOptions(parsedValue.departments)
        : [],
      positions: Array.isArray(parsedValue.positions)
        ? mergeTextOptions(parsedValue.positions)
        : [],
    };
  } catch {
    return createEmptyCustomJobOptions();
  }
};

export const saveCustomJobOptions = (options: CustomJobOptions) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(customJobOptionsStorageKey, JSON.stringify(options));
};

export function toggleDocumentSlotRemoval(slot: EmployeeDocumentSlot): EmployeeDocumentSlot {
  if (!slot.existingId) {
    return slot;
  }

  return {
    ...slot,
    removeExisting: !slot.removeExisting,
  };
}
