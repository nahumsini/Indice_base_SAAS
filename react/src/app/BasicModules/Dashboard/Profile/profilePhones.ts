import type { ConfigCenterCurrentUser } from '../../../api/configCenter';
import {
  DEFAULT_PROFILE_COUNTRY,
  splitProfilePhone,
} from '../../../shared/profileCountries';
import {
  normalizePhoneInputForCountry,
  normalizePhoneInputForCountrySelection,
} from '../../../shared/validation/phone';

export type ProfilePhoneFormValue = {
  key: string;
  id?: number;
  label: string;
  country: string;
  number: string;
};

export const createProfilePhoneValue = (
  index = 0,
  value: Partial<ProfilePhoneFormValue> = {},
): ProfilePhoneFormValue => {
  const country = value.country ?? DEFAULT_PROFILE_COUNTRY;

  return {
    key: value.key ?? `phone-${Date.now()}-${index}`,
    id: value.id,
    label: value.label ?? (index === 0 ? 'Mobile' : `Phone ${index + 1}`),
    country,
    number: normalizePhoneInputForCountry(value.number ?? '', country),
  };
};

export const createProfilePhoneValues = (
  user?: ConfigCenterCurrentUser | null,
  fallbackCountry = DEFAULT_PROFILE_COUNTRY,
) => {
  const sourcePhones = user?.phone_numbers?.length
    ? user.phone_numbers
    : user?.telefono
      ? [{ label: 'Mobile', phone: user.telefono, country: user.country }]
      : [];

  const phoneNumbers = sourcePhones.map((phone, index) => {
    const phoneParts = splitProfilePhone(phone.phone, phone.country ?? user?.country);
    return createProfilePhoneValue(index, {
      key: phone.id ? `saved-${phone.id}` : `phone-${index}`,
      id: phone.id,
      label: phone.label || (index === 0 ? 'Mobile' : `Phone ${index + 1}`),
      country: phoneParts.country,
      number: phoneParts.number,
    });
  });

  return phoneNumbers.length ? phoneNumbers : [createProfilePhoneValue(0, { country: fallbackCountry })];
};

export const updatePhoneCountry = (
  phone: ProfilePhoneFormValue,
  country: string,
) => ({
  ...phone,
  country,
  number: normalizePhoneInputForCountrySelection(phone.number, country, phone.country),
});

export const areProfilePhonesEqual = (
  currentPhones: ProfilePhoneFormValue[],
  baselinePhones: ProfilePhoneFormValue[],
) => JSON.stringify(currentPhones) === JSON.stringify(baselinePhones);
