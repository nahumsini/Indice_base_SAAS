import { validatePostalCodeForCountry } from '../../../../../components/ManualLocationFields';
import { resolveProfileCountry } from '../../../../../shared/profileCountries';
import { validateEmail } from '../../../../../shared/validation/email';
import { validatePhoneForProfileCountry } from '../../../../../shared/validation/phone';
import type { EmployeeModalTranslations } from '../../translations/types';
import { dateInputValue } from './model';
import type { EmployeeFieldKey, EmployeeFormData } from './model';

export type EmployeeValidationErrors = Partial<Record<EmployeeFieldKey, string>>;

interface EmployeeValidationParams {
  copy: EmployeeModalTranslations;
  data: EmployeeFormData;
  isCreateMode: boolean;
}

export function validateEmployeeFormData({
  copy,
  data,
  isCreateMode,
}: EmployeeValidationParams): EmployeeValidationErrors {
  const errors: EmployeeValidationErrors = {};
  const resolvedCountry = resolveProfileCountry(data.registrationCountry);
  const validatePhoneField = (value: string) => (
    !value.trim()
      ? true
      : resolvedCountry
        ? validatePhoneForProfileCountry(value, resolvedCountry).ok
        : false
  );

  if (!data.firstName.trim()) {
    errors.firstName = copy.validation.required;
  }
  if (!data.lastName.trim()) {
    errors.lastName = copy.validation.required;
  }
  if (!data.email.trim()) {
    errors.email = copy.validation.required;
  } else if (!validateEmail(data.email).ok) {
    errors.email = copy.validation.invalidEmail;
  }

  if (!data.mobilePhone.trim()) {
    errors.mobilePhone = copy.validation.required;
  } else if (!validatePhoneField(data.mobilePhone)) {
    errors.mobilePhone = copy.validation.invalidPhone;
  }
  if (data.alternatePhone.trim() && !validatePhoneField(data.alternatePhone)) {
    errors.alternatePhone = copy.validation.invalidPhone;
  }
  if (data.emergencyContactPhone.trim() && !validatePhoneField(data.emergencyContactPhone)) {
    errors.emergencyContactPhone = copy.validation.invalidPhone;
  }

  if (!data.registrationCountry.trim()) {
    errors.registrationCountry = copy.validation.required;
  }
  const postalValidation = validatePostalCodeForCountry(data.registrationCountry, data.postalCode);
  if ('message' in postalValidation) {
    errors.postalCode = postalValidation.message;
  }

  if (!data.department.trim()) {
    errors.department = copy.validation.required;
  }
  if (!data.position.trim()) {
    errors.position = copy.validation.required;
  }
  if (!data.businessUnitId.trim()) {
    errors.businessUnitId = copy.validation.required;
  }
  if (!data.businessId.trim()) {
    errors.businessId = copy.validation.required;
  }

  const parsedHours = Number(data.workdayHours);
  if (!data.workdayHours.trim() || Number.isNaN(parsedHours) || parsedHours < 1 || parsedHours > 24) {
    errors.workdayHours = copy.validation.invalidHours;
  }

  if (data.salaryType === 'daily') {
    const parsedSalary = Number(data.salary);
    if (!data.salary.trim() || Number.isNaN(parsedSalary) || parsedSalary <= 0) {
      errors.salary = copy.validation.invalidAmount;
    }
  }

  if (data.salaryType === 'hourly') {
    const parsedHourlyRate = Number(data.hourlyRate);
    if (!data.hourlyRate.trim() || Number.isNaN(parsedHourlyRate) || parsedHourlyRate <= 0) {
      errors.hourlyRate = copy.validation.invalidAmount;
    }
  }

  if (data.contractType === 'temporary') {
    if (!data.contractStartDate) {
      errors.contractStartDate = copy.validation.required;
    }
    if (!data.contractEndDate) {
      errors.contractEndDate = copy.validation.required;
    } else if (
      data.contractStartDate &&
      new Date(data.contractEndDate).getTime() < new Date(data.contractStartDate).getTime()
    ) {
      errors.contractEndDate = copy.validation.contractDates;
    }
  }

  populateScheduleValidationErrors(errors, data, copy, isCreateMode);
  return errors;
}

export function getEmployeeModalStepFields({
  data,
  isCreateMode,
}: {
  data: EmployeeFormData;
  isCreateMode: boolean;
}): Record<number, EmployeeFieldKey[]> {
  const contractStepFields: EmployeeFieldKey[] =
    data.contractType === 'temporary'
      ? ['contractStartDate', 'contractEndDate']
      : [];
  const compensationStepFields: EmployeeFieldKey[] =
    data.salaryType === 'hourly'
      ? ['hourlyRate']
      : ['salary'];
  const scheduleStepFields: EmployeeFieldKey[] =
    isCreateMode && data.scheduleOnHire
      ? [
        'scheduleStartDate',
        'scheduleEndDate',
        'scheduleStartTime',
        'scheduleEndTime',
        'scheduleMealMinutes',
        'scheduleRestMinutes',
        'scheduleLateAfterMinutes',
        ...(data.scheduleLocationRule === 'exact' ? ['scheduleLocationId' as const] : []),
      ]
      : [];

  return {
    1: ['firstName', 'lastName', 'email'],
    2: ['registrationCountry', 'postalCode', 'mobilePhone', 'alternatePhone', 'emergencyContactPhone'],
    3: [
      'department',
      'position',
      'businessUnitId',
      'businessId',
      'workdayHours',
      ...scheduleStepFields,
      ...compensationStepFields,
      ...contractStepFields,
    ],
    4: [],
  };
}

function populateScheduleValidationErrors(
  errors: EmployeeValidationErrors,
  data: EmployeeFormData,
  copy: EmployeeModalTranslations,
  isCreateMode: boolean,
) {
  if (!isCreateMode || !data.scheduleOnHire) {
    return;
  }

  if (!data.scheduleStartDate) {
    errors.scheduleStartDate = copy.validation.required;
  } else if (data.scheduleStartDate < dateInputValue()) {
    errors.scheduleStartDate = copy.validation.scheduleStartPast;
  }
  if (!data.scheduleEndDate) {
    errors.scheduleEndDate = copy.validation.required;
  } else if (data.scheduleStartDate && data.scheduleEndDate < data.scheduleStartDate) {
    errors.scheduleEndDate = copy.validation.scheduleEndBeforeStart;
  }
  if (!data.scheduleStartTime) {
    errors.scheduleStartTime = copy.validation.required;
  }
  if (!data.scheduleEndTime) {
    errors.scheduleEndTime = copy.validation.required;
  } else if (data.scheduleStartTime && data.scheduleEndTime === data.scheduleStartTime) {
    errors.scheduleEndTime = copy.validation.invalidScheduleTime;
  }

  ([
    ['scheduleMealMinutes', data.scheduleMealMinutes],
    ['scheduleRestMinutes', data.scheduleRestMinutes],
    ['scheduleLateAfterMinutes', data.scheduleLateAfterMinutes],
  ] as const).forEach(([field, value]) => {
    const parsed = Number(value);
    if (!String(value).trim() || Number.isNaN(parsed) || parsed < 0) {
      errors[field] = copy.validation.invalidMinutes;
    }
  });

  if (data.scheduleLocationRule === 'exact' && !data.scheduleLocationId) {
    errors.scheduleLocationId = copy.validation.required;
  }
}
