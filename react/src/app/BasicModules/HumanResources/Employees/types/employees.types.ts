import type { EmployeeDocumentType } from '../components/CreateEmployeeModal';

export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type EmployeePayPeriod = 'weekly' | 'biweekly' | 'monthly';
export type EmployeeColumnId =
  | 'employee'
  | 'employeeNumber'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'address'
  | 'nationalId'
  | 'taxId'
  | 'socialSecurityNumber'
  | 'registrationCountry'
  | 'stateProvince'
  | 'city'
  | 'postalCode'
  | 'alternatePhone'
  | 'emergencyContactName'
  | 'emergencyContactRelationship'
  | 'emergencyContactPhone'
  | 'position'
  | 'department'
  | 'unit'
  | 'business'
  | 'status'
  | 'scheduleOnHire'
  | 'scheduleStartDate'
  | 'scheduleEndDate'
  | 'scheduleStartTime'
  | 'scheduleEndTime'
  | 'scheduleMealMinutes'
  | 'scheduleRestMinutes'
  | 'scheduleLateAfterMinutes'
  | 'scheduleLocationRule'
  | 'scheduleLocationId'
  | 'salaryType'
  | 'workdayHours'
  | 'salary'
  | 'hourlyRate'
  | 'payPeriod'
  | 'contractType'
  | 'contractStartDate'
  | 'contractEndDate'
  | 'joinDate'
  | 'birthCertificate'
  | 'governmentId'
  | 'proofOfAddress'
  | 'resume'
  | 'profilePhoto';
export type EmployeeSortDirection = 'asc' | 'desc';

export interface EmployeeSortState {
  columnId: EmployeeColumnId;
  direction: EmployeeSortDirection;
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

export type EmployeeUnitOption = Option<string>;

export interface EmployeeBusinessOption extends Option<string> {
  unitId?: string;
  unit_id?: string;
}

export interface EmployeeDocumentView {
  downloadUrl: string;
  fileName: string;
  mimeType: string;
  status: string;
}

export interface EmployeeViewModel {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  nationalId: string;
  taxId: string;
  socialSecurityNumber: string;
  registrationCountry: string;
  stateProvince: string;
  city: string;
  postalCode: string;
  alternatePhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  position: string;
  department: string;
  unitId: string;
  unitLabel: string;
  businessId: string;
  businessLabel: string;
  joinDate: string;
  scheduleOnHire: boolean | null;
  scheduleStartDate: string;
  scheduleEndDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleMealMinutes: number | null;
  scheduleRestMinutes: number | null;
  scheduleLateAfterMinutes: number | null;
  scheduleLocationRule: 'business' | 'exact' | '';
  scheduleLocationId: string;
  salary: number;
  payPeriod: EmployeePayPeriod;
  salaryType: 'daily' | 'hourly';
  workdayHours: number | null;
  hourlyRate: number;
  contractType: 'permanent' | 'temporary';
  contractStartDate: string;
  contractEndDate: string;
  status: EmployeeStatus;
  documents: Record<EmployeeDocumentType, EmployeeDocumentView | null>;
}

export interface EmployeeSummary {
  total_count: number;
  active_count: number;
  inactive_count: number;
  terminated_count: number;
  total_payroll_amount_monthly: number;
}

export type InlineEditableEmployeeField = 'department' | 'position' | 'unit' | 'business';

export interface InlineEmployeeUpdateOverrides {
  department?: string;
  position?: string;
  unitId?: string;
  businessId?: string;
}

export type OrganizationOptionTone = 'corporate' | 'unit' | 'business' | 'default';

export interface OrganizationSelectOption {
  value: string;
  label: string;
  unitId?: string;
  unit_id?: string;
  badge?: string;
  description?: string;
  tone?: OrganizationOptionTone;
  disabled?: boolean;
}
