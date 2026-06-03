import {
  ManualLocationFields,
  type ManualLocationValues,
} from '../../../../../../components/ManualLocationFields';
import type {
  EmployeeIdentifierCountryKey,
  EmployeeModalTranslations,
} from '../../../translations/types';
import { HelperText } from '../components/HelperText';
import { TextField } from '../fields/TextField';
import {
  modalControlClassName,
  modalLabelClassName,
} from '../styles';
import type {
  EmployeeFieldKey,
  EmployeeFormData,
  EmployeeFormFieldChangeHandler,
} from '../types';
import type { EmployeeValidationErrors } from '../validation';
import { ContactStep } from './ContactStep';

const identifierProfileCountries = new Set<EmployeeIdentifierCountryKey>(['BR', 'CA', 'CO', 'MX', 'US']);

const getIdentifierCountryKey = (countryCode: string): EmployeeIdentifierCountryKey | null => {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  return identifierProfileCountries.has(normalizedCountryCode as EmployeeIdentifierCountryKey)
    ? normalizedCountryCode as EmployeeIdentifierCountryKey
    : null;
};

interface ContactStepFieldsProps {
  copy: EmployeeModalTranslations;
  countryOptions: Array<{ value: string; label: string }>;
  formData: EmployeeFormData;
  onFieldChange: EmployeeFormFieldChangeHandler;
  onLocationChange: (updates: Partial<ManualLocationValues>) => void;
  touchedFields: Partial<Record<EmployeeFieldKey, boolean>>;
  validationErrors: EmployeeValidationErrors;
}

export function ContactStepFields({
  copy,
  countryOptions,
  formData,
  onFieldChange,
  onLocationChange,
  touchedFields,
  validationErrors,
}: ContactStepFieldsProps) {
  const identifierCountryKey = getIdentifierCountryKey(formData.registrationCountry);
  const identifierProfile = identifierCountryKey
    ? copy.identifierProfiles[identifierCountryKey]
    : null;

  return (
    <ContactStep
      title={copy.sections.contact}
      description={copy.sections.contactDescription}
      groups={{
        location: copy.groups.location,
        phones: copy.groups.phones,
        identifiers: identifierProfile?.group ?? copy.groups.identifiers,
      }}
      fields={{
        location: (
          <>
            <ManualLocationFields
              values={{
                pais: formData.registrationCountry,
                estado: formData.stateProvince,
                ciudad: formData.city,
                cp: formData.postalCode,
              }}
              countries={countryOptions}
              labels={{
                country: copy.labels.registrationCountry,
                selectCountry: copy.placeholders.select,
                state: copy.labels.stateProvince,
                city: copy.labels.city,
                postalCode: copy.labels.postalCode,
              }}
              placeholders={{
                state: copy.placeholders.stateProvince,
                city: copy.placeholders.city,
                postalCode: copy.placeholders.postalCode,
              }}
              fieldNames={{
                pais: 'registrationCountry',
                estado: 'stateProvince',
                ciudad: 'city',
                cp: 'postalCode',
              }}
              countryError={touchedFields.registrationCountry ? validationErrors.registrationCountry : undefined}
              controlClassName={modalControlClassName}
              labelClassName={modalLabelClassName}
              onChange={onLocationChange}
            />
            {touchedFields.postalCode && validationErrors.postalCode ? (
              <HelperText tone="error">{validationErrors.postalCode}</HelperText>
            ) : null}
          </>
        ),
        address: (
          <TextField
            name="address"
            label={copy.labels.address}
            value={formData.address}
            onChange={(value) => onFieldChange('address', value)}
            placeholder={copy.placeholders.address}
            autoComplete="street-address"
          />
        ),
        dateOfBirth: (
          <TextField
            name="dateOfBirth"
            label={copy.labels.dateOfBirth}
            value={formData.dateOfBirth}
            onChange={(value) => onFieldChange('dateOfBirth', value)}
            type="date"
          />
        ),
        mobilePhone: (
          <TextField
            name="mobilePhone"
            label={copy.labels.mobilePhone}
            value={formData.mobilePhone}
            onChange={(value) => onFieldChange('mobilePhone', value)}
            placeholder={copy.placeholders.phone}
            autoComplete="tel"
            required
            error={touchedFields.mobilePhone ? validationErrors.mobilePhone : undefined}
          />
        ),
        alternatePhone: (
          <TextField
            name="alternatePhone"
            label={copy.labels.alternatePhone}
            value={formData.alternatePhone}
            onChange={(value) => onFieldChange('alternatePhone', value)}
            placeholder={copy.placeholders.phone}
            error={touchedFields.alternatePhone ? validationErrors.alternatePhone : undefined}
            helperText={copy.helpers.alternatePhone}
          />
        ),
        emergencyContactName: (
          <TextField
            name="emergencyContactName"
            label={copy.labels.emergencyContactName}
            value={formData.emergencyContactName}
            onChange={(value) => onFieldChange('emergencyContactName', value)}
            placeholder={copy.placeholders.emergencyContactName}
          />
        ),
        emergencyContactRelationship: (
          <TextField
            name="emergencyContactRelationship"
            label={copy.labels.emergencyContactRelationship}
            value={formData.emergencyContactRelationship}
            onChange={(value) => onFieldChange('emergencyContactRelationship', value)}
            placeholder={copy.placeholders.emergencyContactRelationship}
          />
        ),
        emergencyContactPhone: (
          <TextField
            name="emergencyContactPhone"
            label={copy.labels.emergencyContactPhone}
            value={formData.emergencyContactPhone}
            onChange={(value) => onFieldChange('emergencyContactPhone', value)}
            placeholder={copy.placeholders.phone}
            error={touchedFields.emergencyContactPhone ? validationErrors.emergencyContactPhone : undefined}
          />
        ),
        nationalId: (
          <TextField
            name="nationalId"
            label={identifierProfile?.labels.nationalId ?? copy.labels.nationalId}
            value={formData.nationalId}
            onChange={(value) => onFieldChange('nationalId', value)}
            placeholder={identifierProfile?.placeholders.nationalId ?? copy.placeholders.nationalId}
          />
        ),
        taxId: (
          <TextField
            name="taxId"
            label={identifierProfile?.labels.taxId ?? copy.labels.taxId}
            value={formData.taxId}
            onChange={(value) => onFieldChange('taxId', value)}
            placeholder={identifierProfile?.placeholders.taxId ?? copy.placeholders.taxId}
            helperText={identifierProfile?.helpers.taxId ?? copy.helpers.taxId}
          />
        ),
        socialSecurityNumber: (
          <TextField
            name="socialSecurityNumber"
            label={identifierProfile?.labels.socialSecurityNumber ?? copy.labels.socialSecurityNumber}
            value={formData.socialSecurityNumber}
            onChange={(value) => onFieldChange('socialSecurityNumber', value)}
            placeholder={identifierProfile?.placeholders.socialSecurityNumber ?? copy.placeholders.socialSecurityNumber}
            helperText={identifierProfile?.helpers.socialSecurityNumber ?? copy.helpers.socialSecurityNumber}
          />
        ),
      }}
    />
  );
}
