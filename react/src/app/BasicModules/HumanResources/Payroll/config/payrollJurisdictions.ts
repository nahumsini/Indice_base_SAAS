import type { PayrollJurisdiction } from '../types/payrollJurisdiction';

export const PAYROLL_JURISDICTION_LABELS: Record<PayrollJurisdiction, string> = {
  MX: 'Mexico',
  CO: 'Colombia',
  US: 'USA',
  CA_STANDARD: 'Canada',
  CA_QUEBEC: 'Quebec, Canada',
  BR: 'Brazil',
};

export const PAYROLL_JURISDICTION_COUNTRIES: Record<PayrollJurisdiction, string> = {
  MX: 'Mexico',
  CO: 'Colombia',
  US: 'United States',
  CA_STANDARD: 'Canada',
  CA_QUEBEC: 'Canada',
  BR: 'Brazil',
};

export const QUEBEC_PROVINCE_NAME = 'Quebec';
