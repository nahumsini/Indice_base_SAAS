import { Country } from 'country-state-city';
import {
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';

export type ProfileCountry = string;

export type ProfileCountryOption = {
  code: ProfileCountry;
  dialCode: string;
  flag: string;
  fallbackName: string;
};

export const DEFAULT_PROFILE_COUNTRY: ProfileCountry = 'MX';

const PRIORITY_PROFILE_COUNTRY_CODES = ['MX', 'US', 'CA', 'ES', 'CO', 'AR', 'BR', 'CL', 'PE'] as const;

const normalizePhoneCode = (phoneCode: string) => {
  const primaryPhoneCode = phoneCode.split(/\s+and\s+/i)[0]?.trim() ?? '';
  return primaryPhoneCode.startsWith('+') ? primaryPhoneCode : `+${primaryPhoneCode}`;
};

const getDialCodeForCountry = (countryCode: string, phoneCode: string) => (
  isSupportedCountry(countryCode as CountryCode)
    ? `+${getCountryCallingCode(countryCode as CountryCode)}`
    : normalizePhoneCode(phoneCode)
);

const allCountryOptions = Country.getAllCountries().map((country) => ({
  code: country.isoCode,
  dialCode: getDialCodeForCountry(country.isoCode, country.phonecode),
  flag: country.flag,
  fallbackName: country.name,
}));

const priorityCountryOptions = PRIORITY_PROFILE_COUNTRY_CODES
  .map((countryCode) => allCountryOptions.find((country) => country.code === countryCode))
  .filter((country): country is ProfileCountryOption => Boolean(country));

const priorityCountryCodes = new Set(priorityCountryOptions.map((country) => country.code));

export const PROFILE_COUNTRY_OPTIONS: ProfileCountryOption[] = [
  ...priorityCountryOptions,
  ...allCountryOptions
    .filter((country) => !priorityCountryCodes.has(country.code))
    .sort((firstCountry, secondCountry) => (
      firstCountry.fallbackName.localeCompare(secondCountry.fallbackName, 'en')
    )),
];

const PROFILE_COUNTRY_BY_CODE = new Map(
  PROFILE_COUNTRY_OPTIONS.map((country) => [country.code, country] as const),
);

const COUNTRY_BY_DIAL_CODE: Partial<Record<string, ProfileCountry>> = PROFILE_COUNTRY_OPTIONS.reduce(
  (countryByDialCode, country) => {
    if (!countryByDialCode[country.dialCode]) {
      countryByDialCode[country.dialCode] = country.code;
    }

    return countryByDialCode;
  },
  {} as Partial<Record<string, ProfileCountry>>,
);

const PHONE_PREFIX_PATTERN = /^(\+\d{1,3})\s*(.*)$/;

export function isProfileCountry(value: string): value is ProfileCountry {
  return PROFILE_COUNTRY_BY_CODE.has(value);
}

export function normalizeProfileCountry(value?: string): ProfileCountry | undefined {
  const normalizedValue = (value ?? '').trim().toUpperCase();
  return isProfileCountry(normalizedValue) ? normalizedValue : undefined;
}

const normalizeCountryName = (value?: string) => (
  (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
);

const COUNTRY_NAME_ALIASES: Record<string, ProfileCountry> = {
  brasil: 'BR',
  espana: 'ES',
  estadosunidos: 'US',
  unitedstatesofamerica: 'US',
  usa: 'US',
};

const COUNTRY_NAME_TO_CODE = new Map<string, ProfileCountry>([
  ...PROFILE_COUNTRY_OPTIONS.map((country) => [normalizeCountryName(country.fallbackName), country.code] as const),
  ...Object.entries(COUNTRY_NAME_ALIASES),
]);

export function resolveProfileCountry(value?: string): ProfileCountry | undefined {
  const normalizedCode = normalizeProfileCountry(value);
  if (normalizedCode) {
    return normalizedCode;
  }

  const normalizedName = normalizeCountryName(value);
  return normalizedName ? COUNTRY_NAME_TO_CODE.get(normalizedName) : undefined;
}

export function getDefaultProfileCountry(): ProfileCountry {
  return DEFAULT_PROFILE_COUNTRY;
}

export function getProfileCountry(code?: string): ProfileCountryOption {
  const normalizedCode = normalizeProfileCountry(code);
  return PROFILE_COUNTRY_BY_CODE.get(normalizedCode ?? DEFAULT_PROFILE_COUNTRY)
    ?? PROFILE_COUNTRY_BY_CODE.get(DEFAULT_PROFILE_COUNTRY)
    ?? PROFILE_COUNTRY_OPTIONS[0];
}

export function getDialCodeForProfileCountry(code?: string): string {
  return getProfileCountry(code).dialCode;
}

export function splitProfilePhone(
  phone?: string,
  country?: string,
) {
  const normalizedPhone = (phone ?? '').trim();
  const normalizedCountry = normalizeProfileCountry(country);

  if (!normalizedPhone) {
    const fallbackCountry = normalizedCountry ?? getDefaultProfileCountry();
    return {
      country: fallbackCountry,
      dialCode: getDialCodeForProfileCountry(fallbackCountry),
      number: '',
    };
  }

  const phoneMatch = normalizedPhone.match(PHONE_PREFIX_PATTERN);

  if (normalizedCountry) {
    return {
      country: normalizedCountry,
      dialCode: getDialCodeForProfileCountry(normalizedCountry),
      number: phoneMatch ? phoneMatch[2] : normalizedPhone,
    };
  }

  const parsedPhone = parsePhoneNumberFromString(normalizedPhone);
  if (parsedPhone?.country && isProfileCountry(parsedPhone.country)) {
    return {
      country: parsedPhone.country,
      dialCode: getDialCodeForProfileCountry(parsedPhone.country),
      number: parsedPhone.nationalNumber,
    };
  }

  if (phoneMatch) {
    const inferredCountry = COUNTRY_BY_DIAL_CODE[phoneMatch[1]]
      ?? getDefaultProfileCountry();

    return {
      country: inferredCountry,
      dialCode: getDialCodeForProfileCountry(inferredCountry),
      number: phoneMatch[2],
    };
  }

  const fallbackCountry = getDefaultProfileCountry();
  return {
    country: fallbackCountry,
    dialCode: getDialCodeForProfileCountry(fallbackCountry),
    number: normalizedPhone,
  };
}

export function getProfileCountryLabel(country: ProfileCountryOption, locale: string): string {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    const localizedName = displayNames.of(country.code);

    if (localizedName) {
      return `${country.flag} ${localizedName}`;
    }
  } catch {
    // Fallback to the bundled English name when Intl.DisplayNames is unavailable.
  }

  return `${country.flag} ${country.fallbackName}`;
}
