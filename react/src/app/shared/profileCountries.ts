import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export type ProfileCountry = 'AR' | 'BR' | 'CA' | 'CL' | 'CO' | 'ES' | 'MX' | 'PE' | 'US';

export type ProfileCountryOption = {
  code: ProfileCountry;
  dialCode: string;
  flag: string;
  fallbackName: string;
};

export const DEFAULT_PROFILE_COUNTRY: ProfileCountry = 'MX';

export const PROFILE_COUNTRY_OPTIONS: ProfileCountryOption[] = [
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', fallbackName: 'Mexico' },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', fallbackName: 'United States' },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', fallbackName: 'Canada' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', fallbackName: 'Spain' },
  { code: 'CO', dialCode: '+57', flag: '🇨🇴', fallbackName: 'Colombia' },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', fallbackName: 'Argentina' },
  { code: 'BR', dialCode: '+55', flag: '🇧🇷', fallbackName: 'Brazil' },
  { code: 'CL', dialCode: '+56', flag: '🇨🇱', fallbackName: 'Chile' },
  { code: 'PE', dialCode: '+51', flag: '🇵🇪', fallbackName: 'Peru' },
];

const PROFILE_COUNTRY_BY_CODE = new Map(
  PROFILE_COUNTRY_OPTIONS.map((country) => [country.code, country] as const),
);

const COUNTRY_BY_DIAL_CODE: Partial<Record<string, ProfileCountry>> = {
  '+1': 'US',
  '+34': 'ES',
  '+51': 'PE',
  '+52': 'MX',
  '+54': 'AR',
  '+55': 'BR',
  '+56': 'CL',
  '+57': 'CO',
};

const PHONE_PREFIX_PATTERN = /^(\+\d{1,3})\s*(.*)$/;

export function isProfileCountry(value: string): value is ProfileCountry {
  return PROFILE_COUNTRY_BY_CODE.has(value as ProfileCountry);
}

export function normalizeProfileCountry(value?: string): ProfileCountry | undefined {
  const normalizedValue = (value ?? '').trim().toUpperCase();
  return isProfileCountry(normalizedValue) ? normalizedValue : undefined;
}

const COUNTRY_NAME_TO_CODE: Record<string, ProfileCountry> = {
  argentina: 'AR',
  brazil: 'BR',
  brasil: 'BR',
  canada: 'CA',
  chile: 'CL',
  colombia: 'CO',
  espana: 'ES',
  spain: 'ES',
  mexico: 'MX',
  peru: 'PE',
  estadosunidos: 'US',
  unitedstates: 'US',
};

const normalizeCountryName = (value?: string) => (
  (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
);

export function resolveProfileCountry(value?: string): ProfileCountry | undefined {
  const normalizedCode = normalizeProfileCountry(value);
  if (normalizedCode) {
    return normalizedCode;
  }

  const normalizedName = normalizeCountryName(value);
  return normalizedName ? COUNTRY_NAME_TO_CODE[normalizedName] : undefined;
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
