import {
  getCountries,
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
const PROFILE_PHONE_DIAL_CODE_COUNTRIES = new Set(['MX', 'CO', 'US', 'CA', 'BR']);

const REGION_CODE_PATTERN = /^[A-Z]{2}$/;

const getCountryFlag = (countryCode: string) => {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  if (!REGION_CODE_PATTERN.test(normalizedCountryCode)) {
    return normalizedCountryCode;
  }

  return String.fromCodePoint(
    ...Array.from(normalizedCountryCode).map((character) =>
      0x1f1e6 + character.charCodeAt(0) - 65,
    ),
  );
};

const getFallbackCountryName = (countryCode: CountryCode) => {
  try {
    const englishDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return englishDisplayNames.of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
};

const allCountryOptions: ProfileCountryOption[] = getCountries().map((countryCode) => ({
  code: countryCode,
  dialCode: `+${getCountryCallingCode(countryCode)}`,
  flag: getCountryFlag(countryCode),
  fallbackName: getFallbackCountryName(countryCode),
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

export function shouldUseProfilePhoneDialCode(value?: string): boolean {
  const normalizedValue = normalizeProfileCountry(value);
  return Boolean(normalizedValue && PROFILE_PHONE_DIAL_CODE_COUNTRIES.has(normalizedValue));
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
    const parsedPhone = parsePhoneNumberFromString(normalizedPhone, normalizedCountry as CountryCode);
    if (parsedPhone?.country === normalizedCountry) {
      return {
        country: normalizedCountry,
        dialCode: getDialCodeForProfileCountry(normalizedCountry),
        number: parsedPhone.nationalNumber,
      };
    }

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
