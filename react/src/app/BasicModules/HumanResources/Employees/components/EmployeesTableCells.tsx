import type { EmployeesTranslations } from '../translations';
import type { EmployeeDocumentType } from './CreateEmployeeModal';
import type {
  EmployeeViewModel,
  InlineEditableEmployeeField,
  InlineEmployeeUpdateOverrides,
  OrganizationSelectOption,
} from '../types/employees.types';
import {
  EmployeeBusinessInlineCell,
  EmployeeDepartmentInlineCell,
  EmployeePositionInlineCell,
  EmployeeUnitInlineCell,
} from './EmployeeInlineEditableCells';
import {
  EmployeeBooleanCell,
  EmployeeCurrencyCell,
  EmployeeDateCell,
  EmployeeDocumentCell,
  EmployeeEmailCell,
  EmployeeIdentityCell,
  EmployeePayPeriodCell,
  EmployeePhoneCell,
  EmployeeSalaryCell,
  EmployeeStatusCell,
  EmployeeTextCell,
} from './EmployeeTableCellValues';

interface EmployeesTableCellContentProps {
  columnId: string;
  copy: EmployeesTranslations;
  employee: EmployeeViewModel;
  employeePositionOptions: string[];
  getBusinessOptionsForUnit: (unitId: string) => OrganizationSelectOption[];
  inlineDepartmentOptions: string[];
  inlineDrafts: Record<number, InlineEmployeeUpdateOverrides>;
  inlineSavingKey: string | null;
  inlineUnitOptions: OrganizationSelectOption[];
  locale: string;
  onDocumentUpload?: (employee: EmployeeViewModel, documentType: EmployeeDocumentType, file: File) => void | Promise<void>;
  onInlineEmployeeUpdate: (
    employee: EmployeeViewModel,
    field: InlineEditableEmployeeField,
    overrides: InlineEmployeeUpdateOverrides,
  ) => void | Promise<void>;
  resolveDefaultBusinessIdForUnit: (unitId: string, currentBusinessId: string) => string;
  uploadingDocumentKey?: string | null;
}

export function EmployeesTableCellContent({
  columnId,
  copy,
  employee,
  employeePositionOptions,
  getBusinessOptionsForUnit,
  inlineDepartmentOptions,
  inlineDrafts,
  inlineSavingKey,
  inlineUnitOptions,
  locale,
  onDocumentUpload,
  onInlineEmployeeUpdate,
  resolveDefaultBusinessIdForUnit,
  uploadingDocumentKey,
}: EmployeesTableCellContentProps) {
  switch (columnId) {
    case 'employee':
      return <EmployeeIdentityCell employee={employee} />;
    case 'employeeNumber':
      return <span className="text-base font-semibold text-slate-900 dark:text-white">{employee.code || '-'}</span>;
    case 'firstName':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.firstName} />;
    case 'lastName':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.lastName} />;
    case 'email':
      return <EmployeeEmailCell value={employee.email} />;
    case 'phone':
      return <EmployeePhoneCell value={employee.phone} />;
    case 'dateOfBirth':
      return <EmployeeDateCell fallback={copy.dateFallback} locale={locale} value={employee.dateOfBirth} />;
    case 'address':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.address} className="min-w-[260px]" />;
    case 'nationalId':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.nationalId} />;
    case 'taxId':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.taxId} />;
    case 'socialSecurityNumber':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.socialSecurityNumber} />;
    case 'registrationCountry':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.registrationCountry} />;
    case 'stateProvince':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.stateProvince} />;
    case 'city':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.city} />;
    case 'postalCode':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.postalCode} />;
    case 'alternatePhone':
      return <EmployeePhoneCell fallback={copy.fieldFallback} value={employee.alternatePhone} />;
    case 'emergencyContactName':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.emergencyContactName} />;
    case 'emergencyContactRelationship':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.emergencyContactRelationship} />;
    case 'emergencyContactPhone':
      return <EmployeePhoneCell fallback={copy.fieldFallback} value={employee.emergencyContactPhone} />;
    case 'position':
      return (
        <EmployeePositionInlineCell
          copy={copy}
          employee={employee}
          employeePositionOptions={employeePositionOptions}
          inlineDrafts={inlineDrafts}
          inlineSavingKey={inlineSavingKey}
          locale={locale}
          onInlineEmployeeUpdate={onInlineEmployeeUpdate}
        />
      );
    case 'department':
      return (
        <EmployeeDepartmentInlineCell
          copy={copy}
          departmentOptions={inlineDepartmentOptions}
          employee={employee}
          inlineDrafts={inlineDrafts}
          inlineSavingKey={inlineSavingKey}
          locale={locale}
          onInlineEmployeeUpdate={onInlineEmployeeUpdate}
        />
      );
    case 'unit':
      return (
        <EmployeeUnitInlineCell
          copy={copy}
          employee={employee}
          inlineDrafts={inlineDrafts}
          inlineSavingKey={inlineSavingKey}
          inlineUnitOptions={inlineUnitOptions}
          locale={locale}
          onInlineEmployeeUpdate={onInlineEmployeeUpdate}
          resolveDefaultBusinessIdForUnit={resolveDefaultBusinessIdForUnit}
        />
      );
    case 'business':
      return (
        <EmployeeBusinessInlineCell
          copy={copy}
          employee={employee}
          getBusinessOptionsForUnit={getBusinessOptionsForUnit}
          inlineDrafts={inlineDrafts}
          inlineSavingKey={inlineSavingKey}
          locale={locale}
          onInlineEmployeeUpdate={onInlineEmployeeUpdate}
        />
      );
    case 'status':
      return <EmployeeStatusCell copy={copy} employee={employee} />;
    case 'scheduleOnHire':
      return <EmployeeBooleanCell fallback={copy.fieldFallback} labels={copy.binaryLabels} value={employee.scheduleOnHire} />;
    case 'scheduleStartDate':
      return <EmployeeDateCell fallback={copy.dateFallback} locale={locale} value={employee.scheduleStartDate} />;
    case 'scheduleEndDate':
      return <EmployeeDateCell fallback={copy.dateFallback} locale={locale} value={employee.scheduleEndDate} />;
    case 'scheduleStartTime':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.scheduleStartTime} />;
    case 'scheduleEndTime':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.scheduleEndTime} />;
    case 'scheduleMealMinutes':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.scheduleMealMinutes} />;
    case 'scheduleRestMinutes':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.scheduleRestMinutes} />;
    case 'scheduleLateAfterMinutes':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.scheduleLateAfterMinutes} />;
    case 'scheduleLocationRule':
      return (
        <EmployeeTextCell
          fallback={copy.fieldFallback}
          value={employee.scheduleLocationRule ? copy.scheduleLocationRuleLabels[employee.scheduleLocationRule] : ''}
        />
      );
    case 'scheduleLocationId':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.scheduleLocationId} />;
    case 'salaryType':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={copy.salaryTypeLabels[employee.salaryType]} />;
    case 'workdayHours':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.workdayHours !== null ? employee.workdayHours : null} />;
    case 'workdaysPerWeek':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={employee.workdaysPerWeek !== null ? employee.workdaysPerWeek : null} />;
    case 'salary':
      return <EmployeeSalaryCell employee={employee} />;
    case 'hourlyRate':
      return <EmployeeCurrencyCell employee={employee} value={employee.hourlyRate} />;
    case 'payPeriod':
      return <EmployeePayPeriodCell label={copy.payPeriodLabels[employee.payPeriod]} />;
    case 'contractType':
      return <EmployeeTextCell fallback={copy.fieldFallback} value={copy.contractTypeLabels[employee.contractType]} />;
    case 'contractStartDate':
      return <EmployeeDateCell fallback={copy.dateFallback} locale={locale} value={employee.contractStartDate} />;
    case 'contractEndDate':
      return <EmployeeDateCell fallback={copy.dateFallback} locale={locale} value={employee.contractEndDate} />;
    case 'joinDate':
      return <EmployeeDateCell fallback={copy.dateFallback} locale={locale} value={employee.joinDate} />;
    case 'birthCertificate':
      return <EmployeeDocumentCell employee={employee} documentType="birth_certificate" labels={copy.documentStatusLabels} onDocumentUpload={onDocumentUpload} uploadingDocumentKey={uploadingDocumentKey} />;
    case 'governmentId':
      return <EmployeeDocumentCell employee={employee} documentType="government_id" labels={copy.documentStatusLabels} onDocumentUpload={onDocumentUpload} uploadingDocumentKey={uploadingDocumentKey} />;
    case 'proofOfAddress':
      return <EmployeeDocumentCell employee={employee} documentType="proof_of_address" labels={copy.documentStatusLabels} onDocumentUpload={onDocumentUpload} uploadingDocumentKey={uploadingDocumentKey} />;
    case 'resume':
      return <EmployeeDocumentCell employee={employee} documentType="resume" labels={copy.documentStatusLabels} onDocumentUpload={onDocumentUpload} uploadingDocumentKey={uploadingDocumentKey} />;
    case 'profilePhoto':
      return <EmployeeDocumentCell employee={employee} documentType="profile_photo" labels={copy.documentStatusLabels} onDocumentUpload={onDocumentUpload} uploadingDocumentKey={uploadingDocumentKey} />;
    default:
      return null;
  }
}
