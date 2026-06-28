import type { EmployeesTranslations } from '../translations';
import type { EmployeeViewModel } from '../types/employees.types';

const csvEscape = (value: string | number) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function downloadEmployeesCsv({
  copy,
  employees,
}: {
  copy: EmployeesTranslations;
  employees: EmployeeViewModel[];
}) {
  if (typeof document === 'undefined' || employees.length === 0) {
    return;
  }

  const headers = [
    copy.columns.employeeNumber,
    copy.columns.employee,
    copy.columns.email,
    copy.columns.position,
    copy.columns.department,
    copy.columns.unit,
    copy.columns.business,
    copy.columns.status,
    copy.columns.payPeriod,
    copy.columns.salary,
  ];
  const rows = employees.map((employee) => [
    employee.code,
    employee.fullName,
    employee.email,
    employee.position,
    employee.department,
    employee.unitLabel,
    employee.businessLabel,
    copy.statusLabels[employee.status],
    copy.payPeriodLabels[employee.payPeriod],
    employee.salaryType === 'hourly' ? employee.hourlyRate : employee.salary,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = copy.bulk.exportFileName(date);
  anchor.click();
  URL.revokeObjectURL(url);
}
