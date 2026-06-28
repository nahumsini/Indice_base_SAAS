import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { EmployeeDocumentType } from '../components/CreateEmployeeModal';
import type {
  EmployeeColumnId,
  EmployeePayPeriod,
  EmployeeStatus,
  OrganizationOptionTone,
} from '../types/employees.types';
import type { EmployeesTranslations } from '../translations';

export const columnsStorageKey = 'rh-colaboradores-columns-v6';
export const columnWidthsStorageKey = 'rh-colaboradores-column-widths-v1';
export const allFilterValue = 'all';
export const inlineUnassignedValue = '__unassigned__';
export const employeesPerPage = 10;
export const employeeSelectionColumnWidth = 64;
export const hrAccentButtonClass = 'bg-[#59C3A5] text-white hover:bg-[#3AAE90]';

export const weekdayConfig = [1, 2, 3, 4, 5, 6, 7] as const;

export const organizationToneOrder: Record<OrganizationOptionTone, number> = {
  corporate: 1,
  unit: 2,
  business: 3,
  default: 4,
};

export const employeeStatusOrder: Record<EmployeeStatus, number> = {
  active: 1,
  inactive: 2,
  terminated: 3,
};

export const employeePayPeriodOrder: Record<EmployeePayPeriod, number> = {
  weekly: 1,
  biweekly: 2,
  semimonthly: 3,
  monthly: 4,
};

export const documentTypeOrder: EmployeeDocumentType[] = [
  'birth_certificate',
  'government_id',
  'proof_of_address',
  'resume',
  'profile_photo',
];

export const employeeColumnDocumentTypeMap: Partial<Record<EmployeeColumnId, EmployeeDocumentType>> = {
  birthCertificate: 'birth_certificate',
  governmentId: 'government_id',
  proofOfAddress: 'proof_of_address',
  resume: 'resume',
  profilePhoto: 'profile_photo',
};

export function getDefaultEmployeeColumnWidth(columnId: string) {
  if (columnId === 'actions') {
    return 150;
  }

  if (columnId === 'employee') {
    return 260;
  }

  if (columnId === 'email' || columnId === 'address') {
    return 240;
  }

  if (columnId === 'unit' || columnId === 'business' || columnId === 'position' || columnId === 'department') {
    return 210;
  }

  if (columnId in employeeColumnDocumentTypeMap) {
    return 230;
  }

  return 170;
}

export function getMinimumEmployeeColumnWidth(columnId: string) {
  if (columnId === 'actions') {
    return 130;
  }

  if (columnId === 'employee') {
    return 220;
  }

  if (columnId === 'email' || columnId === 'address') {
    return 200;
  }

  if (columnId in employeeColumnDocumentTypeMap) {
    return 220;
  }

  return 140;
}

export const createDefaultColumns = (copy: EmployeesTranslations): ColumnConfig[] => [
  {
    id: 'employee',
    label: copy.columns.employee,
    visible: true,
    locked: true,
    description: copy.columnDescriptions.employee,
  },
  {
    id: 'employeeNumber',
    label: copy.columns.employeeNumber,
    visible: false,
    description: copy.columnDescriptions.employeeNumber,
  },
  { id: 'firstName', label: copy.columns.firstName, visible: false, description: copy.columnDescriptions.firstName },
  { id: 'lastName', label: copy.columns.lastName, visible: false, description: copy.columnDescriptions.lastName },
  { id: 'email', label: copy.columns.email, visible: true, description: copy.columnDescriptions.email },
  { id: 'phone', label: copy.columns.phone, visible: false, description: copy.columnDescriptions.phone },
  { id: 'dateOfBirth', label: copy.columns.dateOfBirth, visible: false, description: copy.columnDescriptions.dateOfBirth },
  { id: 'address', label: copy.columns.address, visible: false, description: copy.columnDescriptions.address },
  { id: 'nationalId', label: copy.columns.nationalId, visible: false, description: copy.columnDescriptions.nationalId },
  { id: 'taxId', label: copy.columns.taxId, visible: false, description: copy.columnDescriptions.taxId },
  {
    id: 'socialSecurityNumber',
    label: copy.columns.socialSecurityNumber,
    visible: false,
    description: copy.columnDescriptions.socialSecurityNumber,
  },
  {
    id: 'registrationCountry',
    label: copy.columns.registrationCountry,
    visible: false,
    description: copy.columnDescriptions.registrationCountry,
  },
  { id: 'stateProvince', label: copy.columns.stateProvince, visible: false, description: copy.columnDescriptions.stateProvince },
  { id: 'city', label: copy.columns.city, visible: false, description: copy.columnDescriptions.city },
  { id: 'postalCode', label: copy.columns.postalCode, visible: false, description: copy.columnDescriptions.postalCode },
  { id: 'alternatePhone', label: copy.columns.alternatePhone, visible: false, description: copy.columnDescriptions.alternatePhone },
  {
    id: 'emergencyContactName',
    label: copy.columns.emergencyContactName,
    visible: false,
    description: copy.columnDescriptions.emergencyContactName,
  },
  {
    id: 'emergencyContactRelationship',
    label: copy.columns.emergencyContactRelationship,
    visible: false,
    description: copy.columnDescriptions.emergencyContactRelationship,
  },
  {
    id: 'emergencyContactPhone',
    label: copy.columns.emergencyContactPhone,
    visible: false,
    description: copy.columnDescriptions.emergencyContactPhone,
  },
  { id: 'position', label: copy.columns.position, visible: true, description: copy.columnDescriptions.position },
  { id: 'department', label: copy.columns.department, visible: true, description: copy.columnDescriptions.department },
  { id: 'unit', label: copy.columns.unit, visible: true, description: copy.columnDescriptions.unit },
  { id: 'business', label: copy.columns.business, visible: false, description: copy.columnDescriptions.business },
  { id: 'status', label: copy.columns.status, visible: true, description: copy.columnDescriptions.status },
  { id: 'salaryType', label: copy.columns.salaryType, visible: false, description: copy.columnDescriptions.salaryType },
  { id: 'workdayHours', label: copy.columns.workdayHours, visible: false, description: copy.columnDescriptions.workdayHours },
  { id: 'workdaysPerWeek', label: copy.columns.workdaysPerWeek, visible: false, description: copy.columnDescriptions.workdaysPerWeek },
  { id: 'salary', label: copy.columns.salary, visible: true, description: copy.columnDescriptions.salary },
  { id: 'hourlyRate', label: copy.columns.hourlyRate, visible: false, description: copy.columnDescriptions.hourlyRate },
  { id: 'payPeriod', label: copy.columns.payPeriod, visible: true, description: copy.columnDescriptions.payPeriod },
  { id: 'contractType', label: copy.columns.contractType, visible: false, description: copy.columnDescriptions.contractType },
  {
    id: 'contractStartDate',
    label: copy.columns.contractStartDate,
    visible: false,
    description: copy.columnDescriptions.contractStartDate,
  },
  {
    id: 'contractEndDate',
    label: copy.columns.contractEndDate,
    visible: false,
    description: copy.columnDescriptions.contractEndDate,
  },
  { id: 'joinDate', label: copy.columns.joinDate, visible: false, description: copy.columnDescriptions.joinDate },
  {
    id: 'birthCertificate',
    label: copy.columns.birthCertificate,
    visible: false,
    description: copy.columnDescriptions.birthCertificate,
  },
  {
    id: 'governmentId',
    label: copy.columns.governmentId,
    visible: false,
    description: copy.columnDescriptions.governmentId,
  },
  {
    id: 'proofOfAddress',
    label: copy.columns.proofOfAddress,
    visible: false,
    description: copy.columnDescriptions.proofOfAddress,
  },
  { id: 'resume', label: copy.columns.resume, visible: false, description: copy.columnDescriptions.resume },
  { id: 'profilePhoto', label: copy.columns.profilePhoto, visible: false, description: copy.columnDescriptions.profilePhoto },
];
