import type { AttendanceControlLocation } from '../../../../../api/humanResources';
import type { EmployeePayrollTreatment } from '../../types/employees.types';

export type EmployeeDocumentType =
  | 'birth_certificate'
  | 'government_id'
  | 'proof_of_address'
  | 'resume'
  | 'profile_photo';

export interface EmployeeDocumentSlot {
  documentType: EmployeeDocumentType;
  existingId?: number;
  existingFileName?: string;
  existingDownloadUrl?: string;
  file: File | null;
  removeExisting: boolean;
}

export interface EmployeeFormData {
  employeeId?: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
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
  department: string;
  position: string;
  businessUnitId: string;
  businessId: string;
  hireDate: string;
  scheduleOnHire: boolean;
  scheduleStartDate: string;
  scheduleEndDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleMealMinutes: string;
  scheduleRestMinutes: string;
  scheduleLateAfterMinutes: string;
  scheduleBlockAfterGracePeriod: boolean;
  scheduleLocationRule: 'business' | 'exact';
  scheduleLocationId: string;
  salaryType: 'daily' | 'hourly';
  workdayHours: string;
  workdaysPerWeek: string;
  payrollTreatment: EmployeePayrollTreatment;
  salary: string;
  hourlyRate: string;
  payPeriod: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  contractType: 'permanent' | 'temporary';
  contractStartDate: string;
  contractEndDate: string;
  documents: Record<EmployeeDocumentType, EmployeeDocumentSlot>;
}

export type EmployeeFormFieldChangeHandler = <T extends keyof EmployeeFormData>(
  field: T,
  value: EmployeeFormData[T],
) => void;

export interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => void | Promise<void>;
  initialData?: EmployeeFormData | null;
  mode?: 'create' | 'edit';
  unitOptions?: Array<{ value: string; label: string }>;
  businessOptions?: Array<{ value: string; label: string; unitId?: string; unit_id?: string }>;
  attendanceLocations?: AttendanceControlLocation[];
}

export type EmployeeFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'mobilePhone'
  | 'registrationCountry'
  | 'postalCode'
  | 'alternatePhone'
  | 'emergencyContactPhone'
  | 'department'
  | 'position'
  | 'businessUnitId'
  | 'businessId'
  | 'scheduleStartDate'
  | 'scheduleEndDate'
  | 'scheduleStartTime'
  | 'scheduleEndTime'
  | 'scheduleMealMinutes'
  | 'scheduleRestMinutes'
  | 'scheduleLateAfterMinutes'
  | 'scheduleLocationId'
  | 'workdayHours'
  | 'workdaysPerWeek'
  | 'salary'
  | 'hourlyRate'
  | 'contractStartDate'
  | 'contractEndDate';

export type CustomJobOptionKind = 'departments' | 'positions';

export type CustomJobOptions = Record<CustomJobOptionKind, string[]>;

export type OrganizationOptionTone = 'default' | 'corporate' | 'unit' | 'business';

export type OrganizationOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  tone?: OrganizationOptionTone;
  unitId?: string;
  unit_id?: string;
};
