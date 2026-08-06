import {
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../../shared/businessCurrency';
import type { EmployeeViewModel } from '../types/employees.types';

const currencyByCountry: Record<string, string> = {
  BR: 'BRL',
  CA: 'CAD',
  CO: 'COP',
  MX: 'MXN',
  US: 'USD',
};

export function getEmployeeNativeCurrency(
  employee: Pick<EmployeeViewModel, 'registrationCountry'>,
  fallbackCurrency = defaultBusinessCurrency,
) {
  const country = String(employee.registrationCountry ?? '').trim().toUpperCase();
  return normalizeBusinessCurrencyCode(currencyByCountry[country], fallbackCurrency);
}

export function formatEmployeeCurrencyAmount(
  value: number,
  employee: Pick<EmployeeViewModel, 'registrationCountry'>,
) {
  return formatBusinessCurrencyAmount(value, getEmployeeNativeCurrency(employee));
}
