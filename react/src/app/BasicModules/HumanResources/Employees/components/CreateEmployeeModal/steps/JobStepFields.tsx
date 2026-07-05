import { Ban, FileCheck2, ReceiptText, WalletCards } from 'lucide-react';
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

const payrollTreatmentOptions = [
  {
    value: 'fiscal_payroll',
    label: 'Nómina fiscal',
    description: 'Calcula impuestos, seguridad social y aportaciones patronales.',
    Icon: FileCheck2,
    tone: 'emerald',
  },
  {
    value: 'operational_payroll',
    label: 'Nómina operativa',
    description: 'Paga desde nómina interna sin cálculo fiscal.',
    Icon: WalletCards,
    tone: 'sky',
  },
  {
    value: 'accounts_payable',
    label: 'Cuenta por pagar',
    description: 'Al aprobar la corrida crea una cuenta por pagar en Gastos.',
    Icon: ReceiptText,
    tone: 'amber',
  },
  {
    value: 'no_payroll',
    label: 'Sin nómina',
    description: 'No se incluye en corridas automáticas.',
    Icon: Ban,
    tone: 'slate',
  },
] as const;

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
  const activePayrollTreatment = payrollTreatmentOptions.find((option) => option.value === formData.payrollTreatment)
    ?? payrollTreatmentOptions[0];

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
        payrollTreatment: (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <input type="hidden" name="payrollTreatment" value={activePayrollTreatment.value} />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Ruta de pago
                </p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {activePayrollTreatment.label}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
                Motor de nómina
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {payrollTreatmentOptions.map(({ value, label, description, Icon }) => {
                const isSelected = formData.payrollTreatment === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onFieldChange('payrollTreatment', value)}
                    className={[
                      'flex min-h-[88px] items-start gap-3 rounded-xl border p-3 text-left transition',
                      isSelected
                        ? 'border-emerald-300 bg-white text-slate-950 shadow-sm ring-2 ring-emerald-100 dark:border-emerald-700 dark:bg-slate-900 dark:text-white dark:ring-emerald-900/40'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-emerald-800',
                    ].join(' ')}
                  >
                    <span className={[
                      'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                      isSelected
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                    ].join(' ')}>
                      <Icon size={17} strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{label}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ),
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
