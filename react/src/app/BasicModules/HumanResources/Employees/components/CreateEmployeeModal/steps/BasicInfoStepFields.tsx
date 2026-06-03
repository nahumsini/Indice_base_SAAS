import type { EmployeeModalTranslations } from '../../../translations/types';
import { TextField } from '../fields/TextField';
import type {
  EmployeeFieldKey,
  EmployeeFormData,
  EmployeeFormFieldChangeHandler,
} from '../types';
import type { EmployeeValidationErrors } from '../validation';
import { BasicInfoStep } from './BasicInfoStep';

interface BasicInfoStepFieldsProps {
  copy: EmployeeModalTranslations;
  formData: EmployeeFormData;
  onFieldChange: EmployeeFormFieldChangeHandler;
  touchedFields: Partial<Record<EmployeeFieldKey, boolean>>;
  validationErrors: EmployeeValidationErrors;
}

export function BasicInfoStepFields({
  copy,
  formData,
  onFieldChange,
  touchedFields,
  validationErrors,
}: BasicInfoStepFieldsProps) {
  return (
    <BasicInfoStep
      title={copy.sections.employee}
      description={copy.sections.employeeDescription}
      groups={{
        identity: copy.groups.identity,
        account: copy.groups.account,
      }}
      fields={{
        firstName: (
          <TextField
            name="firstName"
            label={copy.labels.firstName}
            value={formData.firstName}
            onChange={(value) => onFieldChange('firstName', value)}
            placeholder={copy.placeholders.firstName}
            autoComplete="given-name"
            required
            error={touchedFields.firstName ? validationErrors.firstName : undefined}
          />
        ),
        lastName: (
          <TextField
            name="lastName"
            label={copy.labels.lastName}
            value={formData.lastName}
            onChange={(value) => onFieldChange('lastName', value)}
            placeholder={copy.placeholders.lastName}
            autoComplete="family-name"
            required
            error={touchedFields.lastName ? validationErrors.lastName : undefined}
          />
        ),
        email: (
          <TextField
            name="email"
            label={copy.labels.email}
            value={formData.email}
            onChange={(value) => onFieldChange('email', value)}
            placeholder={copy.placeholders.email}
            type="email"
            autoComplete="email"
            required
            error={touchedFields.email ? validationErrors.email : undefined}
            helperText={copy.helpers.email}
          />
        ),
      }}
    />
  );
}
