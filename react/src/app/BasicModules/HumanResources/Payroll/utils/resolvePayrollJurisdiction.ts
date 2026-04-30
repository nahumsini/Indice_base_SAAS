import { PAYROLL_JURISDICTION_COUNTRIES, PAYROLL_JURISDICTION_LABELS, QUEBEC_PROVINCE_NAME } from '../config/payrollJurisdictions';
import type { PayrollJurisdiction } from '../types/payrollJurisdiction';

const normalizeValue = (value?: string | null) => (value || '').trim().toLowerCase();

export function resolvePayrollJurisdiction(country: string, province?: string): PayrollJurisdiction {
  const normalizedCountry = normalizeValue(country);
  const normalizedProvince = normalizeValue(province);

  if (normalizedCountry === 'mexico') return 'MX';
  if (normalizedCountry === 'colombia') return 'CO';
  if (normalizedCountry === 'united states' || normalizedCountry === 'usa' || normalizedCountry === 'us') return 'US';
  if (normalizedCountry === 'brazil') return 'BR';

  if (normalizedCountry === 'canada' && normalizedProvince === normalizeValue(QUEBEC_PROVINCE_NAME)) {
    return 'CA_QUEBEC';
  }

  if (normalizedCountry === 'canada') {
    return 'CA_STANDARD';
  }

  return 'MX';
}

export function formatPayrollJurisdictionLabel(
  jurisdiction: PayrollJurisdiction,
  province?: string,
): string {
  if (jurisdiction === 'CA_QUEBEC') {
    return `${QUEBEC_PROVINCE_NAME}, Canada`;
  }

  if (jurisdiction === 'CA_STANDARD') {
    const cleanProvince = (province || '').trim();
    return cleanProvince ? `${cleanProvince}, Canada` : 'Canada';
  }

  if (jurisdiction === 'US') {
    const cleanProvince = (province || '').trim();
    return cleanProvince ? `${cleanProvince}, USA` : 'USA';
  }

  return PAYROLL_JURISDICTION_LABELS[jurisdiction];
}

export function parsePayrollJurisdictionLabel(label?: string | null): {
  jurisdiction: PayrollJurisdiction;
  province: string;
} | null {
  const trimmedLabel = (label || '').trim();
  const normalizedLabel = normalizeValue(trimmedLabel);

  if (!trimmedLabel) {
    return null;
  }

  if (normalizedLabel.includes('quebec') && normalizedLabel.includes('canada')) {
    return {
      jurisdiction: 'CA_QUEBEC',
      province: QUEBEC_PROVINCE_NAME,
    };
  }

  if (normalizedLabel === 'mexico') {
    return { jurisdiction: 'MX', province: '' };
  }

  if (normalizedLabel === 'colombia') {
    return { jurisdiction: 'CO', province: '' };
  }

  if (normalizedLabel === 'usa' || normalizedLabel === 'united states' || normalizedLabel === 'us') {
    return { jurisdiction: 'US', province: '' };
  }

  if (normalizedLabel === 'brazil') {
    return { jurisdiction: 'BR', province: '' };
  }

  if (normalizedLabel.includes('canada')) {
    const province = trimmedLabel.replace(/,\s*canada$/i, '').trim();
    return {
      jurisdiction: province && normalizeValue(province) !== normalizeValue(QUEBEC_PROVINCE_NAME)
        ? 'CA_STANDARD'
        : province
          ? 'CA_QUEBEC'
          : 'CA_STANDARD',
      province,
    };
  }

  if (/(,|\s)(usa|united states|us)$/i.test(trimmedLabel)) {
    return {
      jurisdiction: 'US',
      province: trimmedLabel.replace(/,\s*(usa|united states|us)$/i, '').trim(),
    };
  }

  return null;
}

export function parseUnsupportedPayrollCountryLabel(label?: string | null): {
  country: string;
  province: string;
} | null {
  const trimmedLabel = (label || '').trim();
  const normalizedLabel = normalizeValue(trimmedLabel);

  if (!trimmedLabel) {
    return null;
  }

  if (normalizedLabel === 'usa' || normalizedLabel === 'united states' || normalizedLabel === 'us') {
    return {
      country: 'United States',
      province: '',
    };
  }

  if (/(,|\s)(usa|united states|us)$/i.test(trimmedLabel)) {
    return {
      country: 'United States',
      province: trimmedLabel.replace(/,\s*(usa|united states|us)$/i, '').trim(),
    };
  }

  return null;
}

export function resolvePayrollJurisdictionCountry(jurisdiction: PayrollJurisdiction): string {
  return PAYROLL_JURISDICTION_COUNTRIES[jurisdiction];
}
