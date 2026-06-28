import type {
  BackendHrUser,
  BackendHrUserDocument,
  BackendHrUserProfile,
  HrUserDetailsResponse,
} from '../../../../api/humanResources';
import { createEmptyEmployeeFormData } from '../components/CreateEmployeeModal/model';
import type { EmployeeFormData } from '../components/CreateEmployeeModal/types';
import {
  allFilterValue,
  documentTypeOrder,
} from '../constants/employees.constants';
import type { EmployeeViewModel } from '../types/employees.types';
import { createEmptyDocumentRecord } from './employees.utils';

const mapEmployeeDocument = (document: BackendHrUserDocument) => ({
  downloadUrl: document.download_url ?? '',
  fileName: document.original_filename || document.status || 'uploaded',
  mimeType: document.mime_type ?? '',
  status: document.status ?? '',
});

type BackendHrUserWithOptionalProfile = BackendHrUser & {
  profile?: BackendHrUserProfile | null;
  documents?: BackendHrUserDocument[];
  date_of_birth?: string | null;
  address?: string;
  national_id?: string;
  tax_id?: string;
  social_security_number?: string;
  registration_country?: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  alternate_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  workday_hours?: number | null;
  workdays_per_week?: number | null;
};

export const mapEmployee = (
  employee: BackendHrUser,
  fallbackUnitLabel: string,
  fallbackBusinessLabel: string,
): EmployeeViewModel => {
  const employeeWithProfile = employee as BackendHrUserWithOptionalProfile;
  const profile: BackendHrUserProfile = employeeWithProfile.profile ?? {};
  const documents = createEmptyDocumentRecord();
  employeeWithProfile.documents?.forEach((document) => {
    documents[document.document_type] = mapEmployeeDocument(document);
  });

  return {
    id: employee.id,
    code: employee.user_code?.trim() || `RH-${String(employee.id).padStart(3, '0')}`,
    firstName: employee.first_name || '',
    lastName: employee.last_name || '',
    fullName: employee.full_name || `${employee.first_name} ${employee.last_name}`.trim(),
    email: employee.email || '',
    phone: employee.phone || '',
    dateOfBirth: profile.date_of_birth ? String(profile.date_of_birth) : employeeWithProfile.date_of_birth ? String(employeeWithProfile.date_of_birth) : '',
    address: profile.address ?? employeeWithProfile.address ?? '',
    nationalId: profile.national_id ?? employeeWithProfile.national_id ?? '',
    taxId: profile.tax_id ?? employeeWithProfile.tax_id ?? '',
    socialSecurityNumber: profile.social_security_number ?? employeeWithProfile.social_security_number ?? '',
    registrationCountry: profile.registration_country ?? employeeWithProfile.registration_country ?? '',
    stateProvince: profile.state_province ?? employeeWithProfile.state_province ?? '',
    city: profile.city ?? employeeWithProfile.city ?? '',
    postalCode: profile.postal_code ?? employeeWithProfile.postal_code ?? '',
    alternatePhone: profile.alternate_phone ?? employeeWithProfile.alternate_phone ?? '',
    emergencyContactName: profile.emergency_contact_name ?? employeeWithProfile.emergency_contact_name ?? '',
    emergencyContactRelationship:
      profile.emergency_contact_relationship ?? employeeWithProfile.emergency_contact_relationship ?? '',
    emergencyContactPhone: profile.emergency_contact_phone ?? employeeWithProfile.emergency_contact_phone ?? '',
    position: employee.position_title || employee.position || '',
    department: employee.department || '',
    unitId: employee.unit_id ? String(employee.unit_id) : allFilterValue,
    unitLabel: employee.unit_name || fallbackUnitLabel,
    businessId: employee.business_id ? String(employee.business_id) : allFilterValue,
    businessLabel: employee.business_name || fallbackBusinessLabel,
    joinDate: employee.hire_date ? String(employee.hire_date) : '',
    scheduleOnHire: null,
    scheduleStartDate: '',
    scheduleEndDate: '',
    scheduleStartTime: '',
    scheduleEndTime: '',
    scheduleMealMinutes: null,
    scheduleRestMinutes: null,
    scheduleLateAfterMinutes: null,
    scheduleLocationRule: '',
    scheduleLocationId: '',
    salary: Number(employee.salary ?? 0),
    payPeriod: employee.pay_period,
    salaryType: employee.salary_type,
    workdayHours:
      profile.workday_hours !== null && profile.workday_hours !== undefined
        ? Number(profile.workday_hours)
        : employeeWithProfile.workday_hours !== null && employeeWithProfile.workday_hours !== undefined
          ? Number(employeeWithProfile.workday_hours)
          : null,
    workdaysPerWeek:
      profile.workdays_per_week !== null && profile.workdays_per_week !== undefined
        ? Number(profile.workdays_per_week)
        : employeeWithProfile.workdays_per_week !== null && employeeWithProfile.workdays_per_week !== undefined
          ? Number(employeeWithProfile.workdays_per_week)
          : 5,
    hourlyRate: Number(employee.hourly_rate ?? 0),
    contractType: employee.contract_type,
    contractStartDate: employee.contract_start_date ? String(employee.contract_start_date) : '',
    contractEndDate: employee.contract_end_date ? String(employee.contract_end_date) : '',
    status: employee.status,
    documents,
  };
};

export const toEmployeeFormData = (details?: HrUserDetailsResponse | null): EmployeeFormData => {
  const base = createEmptyEmployeeFormData();
  if (!details) {
    return base;
  }

  const next = {
    ...base,
    employeeId: details.user.id,
    employeeNumber: details.user.user_code ?? '',
    firstName: details.user.first_name ?? '',
    lastName: details.user.last_name ?? '',
    email: details.user.email ?? '',
    mobilePhone: details.user.phone ?? '',
    dateOfBirth: details.profile.date_of_birth ? String(details.profile.date_of_birth) : '',
    address: details.profile.address ?? '',
    nationalId: details.profile.national_id ?? '',
    taxId: details.profile.tax_id ?? '',
    socialSecurityNumber: details.profile.social_security_number ?? '',
    registrationCountry: details.profile.registration_country ?? '',
    stateProvince: details.profile.state_province ?? '',
    city: details.profile.city ?? '',
    postalCode: details.profile.postal_code ?? '',
    alternatePhone: details.profile.alternate_phone ?? '',
    emergencyContactName: details.profile.emergency_contact_name ?? '',
    emergencyContactRelationship: details.profile.emergency_contact_relationship ?? '',
    emergencyContactPhone: details.profile.emergency_contact_phone ?? '',
    department: details.user.department ?? '',
    position: details.user.position_title || details.user.position || '',
    businessUnitId: details.user.unit_id ? String(details.user.unit_id) : '',
    businessId: details.user.business_id ? String(details.user.business_id) : '',
    hireDate: details.user.hire_date ? String(details.user.hire_date) : '',
    salaryType: details.user.salary_type ?? 'daily',
    workdayHours:
      details.profile.workday_hours !== null && details.profile.workday_hours !== undefined
        ? String(details.profile.workday_hours)
        : '8',
    workdaysPerWeek:
      details.profile.workdays_per_week !== null && details.profile.workdays_per_week !== undefined
        ? String(details.profile.workdays_per_week)
        : '5',
    salary:
      details.user.salary !== null && details.user.salary !== undefined
        ? String(details.user.salary)
        : '',
    hourlyRate:
      details.user.hourly_rate !== null && details.user.hourly_rate !== undefined
        ? String(details.user.hourly_rate)
        : '',
    payPeriod: details.user.pay_period ?? 'weekly',
    contractType: details.user.contract_type ?? 'permanent',
    contractStartDate: details.user.contract_start_date ? String(details.user.contract_start_date) : '',
    contractEndDate: details.user.contract_end_date ? String(details.user.contract_end_date) : '',
  } satisfies EmployeeFormData;

  documentTypeOrder.forEach((documentType) => {
    const existingDocument = details.documents.find((document) => document.document_type === documentType);
    if (!existingDocument) {
      return;
    }

    next.documents[documentType] = {
      documentType,
      existingId: existingDocument.id,
      existingFileName: existingDocument.original_filename,
      existingDownloadUrl: existingDocument.download_url ?? undefined,
      file: null,
      removeExisting: false,
    };
  });

  return next;
};

export const mapEmployeeDetails = (
  details: HrUserDetailsResponse,
  fallbackUnitLabel: string,
  fallbackBusinessLabel: string,
): EmployeeViewModel => {
  const baseEmployee = mapEmployee(details.user, fallbackUnitLabel, fallbackBusinessLabel);
  const documents = createEmptyDocumentRecord();
  details.documents.forEach((document) => {
    documents[document.document_type] = mapEmployeeDocument(document);
  });

  return {
    ...baseEmployee,
    dateOfBirth: details.profile.date_of_birth ? String(details.profile.date_of_birth) : '',
    address: details.profile.address ?? '',
    nationalId: details.profile.national_id ?? '',
    taxId: details.profile.tax_id ?? '',
    socialSecurityNumber: details.profile.social_security_number ?? '',
    registrationCountry: details.profile.registration_country ?? '',
    stateProvince: details.profile.state_province ?? '',
    city: details.profile.city ?? '',
    postalCode: details.profile.postal_code ?? '',
    alternatePhone: details.profile.alternate_phone ?? '',
    emergencyContactName: details.profile.emergency_contact_name ?? '',
    emergencyContactRelationship: details.profile.emergency_contact_relationship ?? '',
    emergencyContactPhone: details.profile.emergency_contact_phone ?? '',
    workdayHours:
      details.profile.workday_hours !== null && details.profile.workday_hours !== undefined
        ? Number(details.profile.workday_hours)
        : null,
    workdaysPerWeek:
      details.profile.workdays_per_week !== null && details.profile.workdays_per_week !== undefined
        ? Number(details.profile.workdays_per_week)
        : 5,
    documents,
  };
};
