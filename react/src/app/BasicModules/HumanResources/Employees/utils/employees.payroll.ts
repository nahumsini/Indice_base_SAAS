import {
  convertBusinessCurrencyAmount,
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
  type BusinessExchangeRatesPerUsd,
} from '../../../shared/businessCurrency';
import type { EmployeePayPeriod, EmployeeViewModel } from '../types/employees.types';

const currencyByCountry: Record<string, string> = {
  BR: 'BRL',
  CA: 'CAD',
  CO: 'COP',
  MX: 'MXN',
  US: 'USD',
};

export function convertEmployeePayrollCurrencyAmount(
  amount: number,
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  return convertBusinessCurrencyAmount(amount, sourceCurrency, targetCurrency, exchangeRatesPerUsd);
}

export function getEmployeeNativeCurrency(
  employee: Pick<EmployeeViewModel, 'registrationCountry'>,
  fallbackCurrency = defaultBusinessCurrency,
) {
  const country = String(employee.registrationCountry ?? '').trim().toUpperCase();
  return normalizeBusinessCurrencyCode(currencyByCountry[country], fallbackCurrency);
}

function getPayPeriodMonthlyFactor(payPeriod: EmployeePayPeriod) {
  if (payPeriod === 'monthly') {
    return 1;
  }

  if (payPeriod === 'biweekly') {
    return 26 / 12;
  }

  if (payPeriod === 'semimonthly') {
    return 2;
  }

  return 52 / 12;
}

export function getEmployeeMonthlyPayrollAmount(employee: EmployeeViewModel) {
  if (employee.status !== 'active') {
    return 0;
  }

  if (employee.salaryType === 'hourly') {
    const workdayHours = employee.workdayHours ?? 8;
    const workdaysPerWeek = employee.workdaysPerWeek ?? 5;
    return employee.hourlyRate * workdayHours * workdaysPerWeek * 52 / 12;
  }

  return employee.salary * getPayPeriodMonthlyFactor(employee.payPeriod);
}

export function summarizeEmployeePayroll(
  employees: EmployeeViewModel[],
  preferredCurrency?: string | null,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  const normalizedPreferredCurrency = normalizeBusinessCurrencyCode(preferredCurrency);
  const activeEmployees = employees.filter((employee) => employee.status === 'active');
  const nativeTotals = activeEmployees.reduce<Map<string, number>>((totals, employee) => {
    const nativeCurrency = getEmployeeNativeCurrency(employee, normalizedPreferredCurrency);
    totals.set(nativeCurrency, (totals.get(nativeCurrency) ?? 0) + getEmployeeMonthlyPayrollAmount(employee));
    return totals;
  }, new Map());
  const preferredTotal = Array.from(nativeTotals.entries()).reduce(
    (total, [currency, amount]) =>
      total + convertEmployeePayrollCurrencyAmount(
        amount,
        currency,
        normalizedPreferredCurrency,
        exchangeRatesPerUsd,
      ),
    0,
  );
  const nativeBreakdownLabel = Array.from(nativeTotals.entries())
    .sort(([leftCurrency], [rightCurrency]) => leftCurrency.localeCompare(rightCurrency))
    .map(([currency, amount]) => formatBusinessCurrencyAmount(amount, currency))
    .join(' / ');

  return {
    currencyCount: nativeTotals.size,
    nativeBreakdownLabel: nativeBreakdownLabel || formatBusinessCurrencyAmount(0, normalizedPreferredCurrency),
    preferredCurrency: normalizedPreferredCurrency,
    preferredTotal,
    preferredTotalLabel: formatBusinessCurrencyAmount(preferredTotal, normalizedPreferredCurrency),
  };
}

export function formatEmployeeCurrencyAmount(
  value: number,
  employee: Pick<EmployeeViewModel, 'registrationCountry'>,
) {
  return formatBusinessCurrencyAmount(value, getEmployeeNativeCurrency(employee));
}
