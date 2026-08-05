import type {
  PayrollManualItemPayload,
  PayrollRunLine,
  PayrollTreatment,
} from '../../../../../api/humanResources';

export type PayrollLineDraft = {
  payroll_treatment: PayrollTreatment;
  include_in_fiscal: boolean;
  notes: string;
  manual_items: PayrollManualItemPayload[];
};

export const normalizePayrollTreatmentValue = (
  value?: string | null,
  includeInFiscal = true,
): PayrollTreatment => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'operational_payroll' || normalized === 'operational' || normalized === 'internal') {
    return 'operational_payroll';
  }
  if (
    normalized === 'accounts_payable'
    || normalized === 'expense'
    || normalized === 'expenses'
    || normalized === 'payable'
  ) {
    return 'accounts_payable';
  }
  if (normalized === 'no_payroll' || normalized === 'excluded' || normalized === 'none') {
    return 'no_payroll';
  }

  return includeInFiscal ? 'fiscal_payroll' : 'operational_payroll';
};

export const includeFiscalForPayrollTreatment = (treatment: PayrollTreatment) => (
  treatment === 'fiscal_payroll'
);

export const paymentRouteLabelForTreatment = (treatment: PayrollTreatment) => {
  if (treatment === 'accounts_payable') return 'Cuenta por pagar en Gastos';
  if (treatment === 'no_payroll') return 'Sin ruta de pago';
  if (treatment === 'operational_payroll') return 'Pago por nómina operativa';
  return 'Pago por nómina fiscal';
};

export const buildPayrollLineDraft = (line: PayrollRunLine): PayrollLineDraft => {
  const treatment = normalizePayrollTreatmentValue(line.payroll_treatment, line.include_in_fiscal);

  return {
    payroll_treatment: treatment,
    include_in_fiscal: includeFiscalForPayrollTreatment(treatment),
    notes: line.notes || '',
    manual_items: line.items
      .filter((item) => item.source_type === 'manual')
      .map((item) => ({
        category: item.category,
        label: item.label,
        amount: item.amount,
      })),
  };
};

const comparableDraft = (draft: PayrollLineDraft) => ({
  payroll_treatment: draft.payroll_treatment,
  include_in_fiscal: draft.include_in_fiscal,
  notes: draft.notes.trim(),
  manual_items: draft.manual_items.map((item) => ({
    category: item.category,
    label: item.label.trim(),
    amount: Number(item.amount) || 0,
  })),
});

export const arePayrollLineDraftsEqual = (left: PayrollLineDraft, right: PayrollLineDraft) => (
  JSON.stringify(comparableDraft(left)) === JSON.stringify(comparableDraft(right))
);

export const payrollLineWarningCount = (line: PayrollRunLine) => (
  (line.attendance_warnings?.length ?? 0) + (line.calculation_warnings?.length ?? 0)
);

export const isColombiaJurisdiction = (
  countryCode?: string | null,
  jurisdictionCode?: string | null,
) => [countryCode, jurisdictionCode]
  .some((value) => String(value || '').trim().toUpperCase() === 'CO');

export const isColombiaFiscalPayrollLine = (line?: PayrollRunLine | null) => (
  Boolean(line)
  && isColombiaJurisdiction(line?.country_code, line?.jurisdiction_code)
  && normalizePayrollTreatmentValue(
    line?.payroll_treatment,
    line?.include_in_fiscal ?? true,
  ) === 'fiscal_payroll'
);
