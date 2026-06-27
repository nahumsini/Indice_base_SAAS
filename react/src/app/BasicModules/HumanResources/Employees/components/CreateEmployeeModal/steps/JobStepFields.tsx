import type { EmployeeModalTranslations } from '../../../translations/types';
import { AutoAssignedOrganizationField } from '../fields/AutoAssignedOrganizationField';
import { CreatableOptionField } from '../fields/CreatableOptionField';
import { OrganizationSelectField } from '../fields/OrganizationSelectField';
import { SelectField } from '../fields/SelectField';
import { TextField } from '../fields/TextField';
import type {
  CustomJobOptionKind,
  EmployeeFieldKey,
  EmployeeFormData,
  EmployeeFormFieldChangeHandler,
  OrganizationOption,
} from '../types';
import type { EmployeeValidationErrors } from '../validation';
import { JobStep } from './JobStep';
import { ScheduleOnHireFields } from './ScheduleOnHireFields';

interface JobStepFieldsProps {
  businessBelongingHelper: string;
  businessBelongingHelperTone: 'default' | 'warning';
  copy: EmployeeModalTranslations;
  departmentOptions: string[];
  filteredBusinessOptions: OrganizationOption[];
  formData: EmployeeFormData;
  isCreateMode: boolean;
  onAddCustomJobOption: (kind: CustomJobOptionKind, value: string) => boolean;
  onFieldChange: EmployeeFormFieldChangeHandler;
  positionOptions: string[];
  scheduleLocationOptions: Array<{ value: string; label: string }>;
  selectedBusinessOption: OrganizationOption | null;
  selectedUnitIsCorporateOffice: boolean;
  touchedFields: Partial<Record<EmployeeFieldKey, boolean>>;
  unitOptionsWithBelonging: OrganizationOption[];
  validationErrors: EmployeeValidationErrors;
}

export function JobStepFields({
  businessBelongingHelper,
  businessBelongingHelperTone,
  copy,
  departmentOptions,
  filteredBusinessOptions,
  formData,
  isCreateMode,
  onAddCustomJobOption,
  onFieldChange,
  positionOptions,
  scheduleLocationOptions,
  selectedBusinessOption,
  selectedUnitIsCorporateOffice,
  touchedFields,
  unitOptionsWithBelonging,
  validationErrors,
}: JobStepFieldsProps) {
  const belongingCopy = copy.belonging;
  const positionHelperText = formData.department.trim()
    ? copy.creatableOptions.suggestedForDepartment(formData.department)
    : undefined;
  const selectedPayPeriodLabel = copy.options.payPeriods.find((option) => option.value === formData.payPeriod)?.label;
  const fixedSalaryLabel = selectedPayPeriodLabel
    ? `${copy.labels.salary} (${selectedPayPeriodLabel})`
    : copy.labels.salary;
  const compensationHelperText = formData.salaryType === 'hourly'
    ? copy.helpers.hourlySalaryMeaning
    : copy.helpers.salaryPeriodMeaning;

  return (
    <JobStep
      title={copy.sections.role}
      description={copy.sections.roleDescription}
      groups={{
        role: copy.groups.role,
        organization: copy.groups.organization,
        schedule: copy.groups.schedule,
        compensation: copy.groups.compensation,
        contract: copy.groups.contract,
      }}
      fields={{
        department: (
          <CreatableOptionField
            copy={copy.creatableOptions}
            name="department"
            label={copy.labels.department}
            value={formData.department}
            onChange={(value) => onFieldChange('department', value)}
            options={departmentOptions}
            placeholder={copy.placeholders.select}
            required
            error={touchedFields.department ? validationErrors.department : undefined}
            onAddOption={(value) => onAddCustomJobOption('departments', value)}
          />
        ),
        position: (
          <CreatableOptionField
            copy={copy.creatableOptions}
            name="position"
            label={copy.labels.position}
            value={formData.position}
            onChange={(value) => onFieldChange('position', value)}
            options={positionOptions}
            placeholder={copy.placeholders.select}
            required
            error={touchedFields.position ? validationErrors.position : undefined}
            helperText={positionHelperText}
            onAddOption={(value) => onAddCustomJobOption('positions', value)}
          />
        ),
        businessUnit: (
          <OrganizationSelectField
            name="businessUnitId"
            label={copy.labels.businessUnitId}
            value={formData.businessUnitId}
            onChange={(value) => onFieldChange('businessUnitId', value)}
            options={unitOptionsWithBelonging}
            placeholder={copy.placeholders.select}
            required
            error={touchedFields.businessUnitId ? validationErrors.businessUnitId : undefined}
            helperText={belongingCopy.businessUnitHelper}
          />
        ),
        business: selectedUnitIsCorporateOffice ? (
          <AutoAssignedOrganizationField
            name="businessId"
            label={copy.labels.businessId}
            value={formData.businessId}
            displayValue={selectedBusinessOption?.label ?? belongingCopy.corporateBusinessBadge}
            badge={belongingCopy.autoAssignedBadge}
            helperText={businessBelongingHelper}
          />
        ) : (
          <OrganizationSelectField
            name="businessId"
            label={copy.labels.businessId}
            value={formData.businessId}
            onChange={(value) => onFieldChange('businessId', value)}
            options={filteredBusinessOptions}
            placeholder={copy.placeholders.select}
            required
            error={touchedFields.businessId ? validationErrors.businessId : undefined}
            helperText={businessBelongingHelper}
            helperTone={businessBelongingHelperTone}
            disabled={!formData.businessUnitId}
          />
        ),
        hireDate: (
          <TextField
            name="hireDate"
            label={copy.labels.hireDate}
            value={formData.hireDate}
            onChange={(value) => onFieldChange('hireDate', value)}
            type="date"
          />
        ),
        schedule: isCreateMode ? (
          <ScheduleOnHireFields
            copy={copy}
            formData={formData}
            touchedFields={touchedFields}
            validationErrors={validationErrors}
            scheduleLocationOptions={scheduleLocationOptions}
            onFieldChange={onFieldChange}
          />
        ) : undefined,
        salaryType: (
          <SelectField
            name="salaryType"
            label={copy.labels.salaryType}
            value={formData.salaryType}
            onChange={(value) => onFieldChange('salaryType', value as EmployeeFormData['salaryType'])}
            options={copy.options.salaryTypes}
          />
        ),
        workdayHours: (
          <TextField
            name="workdayHours"
            label={copy.labels.workdayHours}
            value={formData.workdayHours}
            onChange={(value) => onFieldChange('workdayHours', value)}
            placeholder={copy.placeholders.workdayHours}
            type="number"
            required
            error={touchedFields.workdayHours ? validationErrors.workdayHours : undefined}
            helperText={compensationHelperText}
          />
        ),
        workdaysPerWeek: (
          <TextField
            name="workdaysPerWeek"
            label={copy.labels.workdaysPerWeek}
            value={formData.workdaysPerWeek}
            onChange={(value) => onFieldChange('workdaysPerWeek', value)}
            placeholder={copy.placeholders.workdaysPerWeek}
            type="number"
            required
            error={touchedFields.workdaysPerWeek ? validationErrors.workdaysPerWeek : undefined}
          />
        ),
        compensationAmount: formData.salaryType === 'daily' ? (
          <TextField
            name="salary"
            label={fixedSalaryLabel}
            value={formData.salary}
            onChange={(value) => onFieldChange('salary', value)}
            placeholder={copy.placeholders.salary}
            type="number"
            required
            error={touchedFields.salary ? validationErrors.salary : undefined}
          />
        ) : (
          <TextField
            name="hourlyRate"
            label={copy.labels.hourlyRate}
            value={formData.hourlyRate}
            onChange={(value) => onFieldChange('hourlyRate', value)}
            placeholder={copy.placeholders.hourlyRate}
            type="number"
            required
            error={touchedFields.hourlyRate ? validationErrors.hourlyRate : undefined}
          />
        ),
        payPeriod: (
          <SelectField
            name="payPeriod"
            label={copy.labels.payPeriod}
            value={formData.payPeriod}
            onChange={(value) => onFieldChange('payPeriod', value as EmployeeFormData['payPeriod'])}
            options={copy.options.payPeriods}
          />
        ),
        contractType: (
          <SelectField
            name="contractType"
            label={copy.labels.contractType}
            value={formData.contractType}
            onChange={(value) => onFieldChange('contractType', value as EmployeeFormData['contractType'])}
            options={copy.options.contractTypes}
          />
        ),
        contractDates: formData.contractType === 'temporary' ? (
          <>
            <TextField
              name="contractStartDate"
              label={copy.labels.contractStartDate}
              value={formData.contractStartDate}
              onChange={(value) => onFieldChange('contractStartDate', value)}
              type="date"
              required
              error={touchedFields.contractStartDate ? validationErrors.contractStartDate : undefined}
            />
            <TextField
              name="contractEndDate"
              label={copy.labels.contractEndDate}
              value={formData.contractEndDate}
              onChange={(value) => onFieldChange('contractEndDate', value)}
              type="date"
              required
              error={touchedFields.contractEndDate ? validationErrors.contractEndDate : undefined}
            />
          </>
        ) : undefined,
      }}
    />
  );
}
