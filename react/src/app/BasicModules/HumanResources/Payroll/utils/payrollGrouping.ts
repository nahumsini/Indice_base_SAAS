import { QUEBEC_PROVINCE_NAME } from '../config/payrollJurisdictions';
import type { PayrollJurisdiction } from '../types/payrollJurisdiction';
import { resolvePayrollJurisdiction } from './resolvePayrollJurisdiction';

type PayrollGroupingEntity = {
  country?: string | null;
  province?: string | null;
};

export function groupPayrollEntitiesByJurisdiction<T extends PayrollGroupingEntity>(items: T[]) {
  return items.reduce<Record<PayrollJurisdiction, T[]>>((groups, item) => {
    const jurisdiction = resolvePayrollJurisdiction(item.country || '', item.province || '');
    const currentGroup = groups[jurisdiction] ?? [];
    return {
      ...groups,
      [jurisdiction]: [...currentGroup, item],
    };
  }, {
    MX: [],
    CO: [],
    US: [],
    CA_STANDARD: [],
    CA_QUEBEC: [],
    BR: [],
  });
}

export function filterPayrollItemsByJurisdiction<T extends { jurisdiction: PayrollJurisdiction }>(
  items: T[],
  jurisdiction: PayrollJurisdiction,
) {
  return items.filter((item) => item.jurisdiction === jurisdiction);
}

export function resolveRunJurisdiction(
  availableJurisdictions: PayrollJurisdiction[],
  fallbackJurisdiction: PayrollJurisdiction,
): PayrollJurisdiction {
  const uniqueJurisdictions = Array.from(new Set(availableJurisdictions));

  if (uniqueJurisdictions.length === 0) {
    return fallbackJurisdiction;
  }

  if (uniqueJurisdictions.length === 1) {
    return uniqueJurisdictions[0];
  }

  if (uniqueJurisdictions.includes(fallbackJurisdiction)) {
    return fallbackJurisdiction;
  }

  if (uniqueJurisdictions.includes('CA_QUEBEC')) {
    return 'CA_QUEBEC';
  }

  if (uniqueJurisdictions.includes('CA_STANDARD')) {
    return 'CA_STANDARD';
  }

  if (uniqueJurisdictions.includes('US')) {
    return 'US';
  }

  return uniqueJurisdictions[0];
}

export function resolveJurisdictionProvinceLabel(
  provinces: string[],
  fallbackProvince = '',
  jurisdiction?: PayrollJurisdiction,
) {
  if (jurisdiction === 'CA_QUEBEC') {
    return QUEBEC_PROVINCE_NAME;
  }

  const uniqueProvinces = Array.from(
    new Set(
      provinces
        .map((province) => province.trim())
        .filter(Boolean),
    ),
  );

  if (uniqueProvinces.length === 1) {
    return uniqueProvinces[0];
  }

  return fallbackProvince.trim();
}
