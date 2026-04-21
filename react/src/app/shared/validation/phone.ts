import {
  AsYouType,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js/max';

import {
  isProfileCountry,
  type ProfileCountry,
} from '../profileCountries';

export type PhoneValidationError =
  | 'unsupported_country'
  | 'invalid_phone';

export type PhoneValidationResult =
  | {
      ok: true;
      country: CountryCode;
      e164: string;
      international: string;
      national: string;
    }
  | {
      ok: false;
      error: PhoneValidationError;
    };

const MAX_PHONE_DIGITS = 15;
const PHONE_DIGIT_LIMIT_CACHE = new Map<CountryCode, number>();

function stripToDigits(rawNumber: string): string {
  return rawNumber.replace(/\D/g, '');
}

export function normalizePhoneCountry(country?: string): CountryCode | undefined {
  const normalizedCountry = (country ?? '').trim().toUpperCase();
  if (!normalizedCountry) {
    return undefined;
  }

  return isSupportedCountry(normalizedCountry as CountryCode)
    ? (normalizedCountry as CountryCode)
    : undefined;
}

function inferNationalDigitLimit(country: CountryCode): number {
  const cachedLimit = PHONE_DIGIT_LIMIT_CACHE.get(country);
  if (cachedLimit !== undefined) {
    return cachedLimit;
  }

  for (let digitCount = 1; digitCount <= MAX_PHONE_DIGITS; digitCount += 1) {
    const lengthResult = validatePhoneNumberLength('0'.repeat(digitCount), country);
    if (lengthResult === 'TOO_LONG') {
      const inferredLimit = digitCount - 1;
      PHONE_DIGIT_LIMIT_CACHE.set(country, inferredLimit);
      return inferredLimit;
    }
  }

  PHONE_DIGIT_LIMIT_CACHE.set(country, MAX_PHONE_DIGITS);
  return MAX_PHONE_DIGITS;
}

function extractNationalDigitsForCountry(rawNumber: string, country: CountryCode): string {
  const digits = stripToDigits(rawNumber ?? '');
  if (!digits) {
    return '';
  }

  const trimmedNumber = rawNumber.trim();
  const internationalCandidate = parsePhoneNumberFromString(
    trimmedNumber.startsWith('+') ? trimmedNumber : `+${digits}`,
  );

  if (internationalCandidate?.country === country) {
    return internationalCandidate.nationalNumber;
  }

  const countryCallingCode = getCountryCallingCode(country);
  if (digits.length > countryCallingCode.length && digits.startsWith(countryCallingCode)) {
    const withoutCountryCode = digits.slice(countryCallingCode.length);
    if (validatePhoneNumberLength(withoutCountryCode, country) !== 'TOO_LONG') {
      return withoutCountryCode;
    }
  }

  return digits;
}

function trimToCountryPhoneLength(rawDigits: string, country: CountryCode): string {
  let acceptedDigits = '';

  for (const digit of rawDigits) {
    const nextDigits = `${acceptedDigits}${digit}`;
    if (validatePhoneNumberLength(nextDigits, country) === 'TOO_LONG') {
      break;
    }
    acceptedDigits = nextDigits;
  }

  return acceptedDigits;
}

export function getPhoneDigitLimitForCountry(country?: string): number | undefined {
  const normalizedCountry = normalizePhoneCountry(country);
  if (!normalizedCountry) {
    return undefined;
  }

  return inferNationalDigitLimit(normalizedCountry);
}

export function normalizePhoneInputForCountry(
  rawNumber: string,
  country?: string,
): string {
  const normalizedCountry = normalizePhoneCountry(country);
  if (!normalizedCountry) {
    return rawNumber;
  }

  const nationalDigits = extractNationalDigitsForCountry(rawNumber, normalizedCountry);
  if (!nationalDigits) {
    return '';
  }

  const trimmedDigits = trimToCountryPhoneLength(nationalDigits, normalizedCountry);
  return new AsYouType(normalizedCountry).input(trimmedDigits);
}

/**
 * Validates a phone number using libphonenumber metadata for the given country.
 * Accepts national numbers (e.g. "416 555 1234") and full international numbers (e.g. "+1 416 555 1234").
 */
export function validatePhoneForCountry(
  rawNumber: string,
  country: string,
): PhoneValidationResult {
  const normalizedCountry = normalizePhoneCountry(country);
  if (!normalizedCountry) {
    return { ok: false, error: 'unsupported_country' };
  }

  const normalized = rawNumber.trim();
  if (!normalized) {
    return { ok: false, error: 'invalid_phone' };
  }

  const phoneNumber = parsePhoneNumberFromString(normalized, normalizedCountry);
  if (!phoneNumber || !phoneNumber.isValid()) {
    return { ok: false, error: 'invalid_phone' };
  }

  if (phoneNumber.country && phoneNumber.country !== normalizedCountry) {
    return { ok: false, error: 'invalid_phone' };
  }

  return {
    ok: true,
    country: normalizedCountry,
    e164: phoneNumber.number,
    international: phoneNumber.formatInternational(),
    national: phoneNumber.formatNational(),
  };
}

export function validatePhoneForProfileCountry(
  rawNumber: string,
  country?: string,
): PhoneValidationResult {
  if (!country || !isProfileCountry(country)) {
    return { ok: false, error: 'unsupported_country' };
  }

  return validatePhoneForCountry(rawNumber, country);
}

export function formatPhoneAsYouType(
  rawNumber: string,
  country?: string,
): string {
  const normalized = rawNumber ?? '';

  const normalizedCountry = normalizePhoneCountry(country);
  if (!normalizedCountry) {
    return normalized;
  }

  return new AsYouType(normalizedCountry).input(normalized);
}
