import { apiClient } from '../lib/apiClient';
export type CanadaClaimMode = 'BASIC' | 'DECLARED' | 'NONE' | 'EXEMPT';
export interface CanadaPayrollProfile {
  effectiveFrom: string; taxYear: number; provinceOfEmployment: string; payPeriodsPerYear: number; paymentLagDays: number;
  federalClaimMode: CanadaClaimMode; federalClaimAmount: number; provincialClaimMode: CanadaClaimMode; provincialClaimAmount: number;
  additionalTax: number; additionalQuebecTax: number; ontarioDependants: number;
  pensionStatus: 'CONTRIBUTING' | 'UNDER_18' | 'AGE_LIMIT' | 'ELECTION' | 'DISABILITY' | 'EXCLUDED_EMPLOYMENT';
  pensionableMonths: number; eiExempt: boolean; qpipExempt: boolean; declarationReference: string;
  registeredPlanDeduction: number; unionDues: number; vacationAccrualPercent: number; employerEiMultiplier: number;
  quebecHealthFundPercent: number | null;
  openingBalances: { asOf: string; pensionableEarnings: number; cpp: number; qpp: number; cpp2: number; qpp2: number; ei: number; qpip: number; employerQpip: number };
}
export interface CanadaPayrollProfileResponse {
  revision: number; profile: CanadaPayrollProfile | null; canConfigure: boolean;
  history: { revision: number; profile: CanadaPayrollProfile }[];
}
export interface CanadaPayrollProfileSaveRequest { expectedRevision: number; requestId: string; profile: CanadaPayrollProfile }
export const payrollCanadaApi = {
  get: (id: number) => apiClient<CanadaPayrollProfileResponse>(`/api/v1/hr/payroll/canada/profiles/${id}`),
};
export const emptyCanadaPayrollProfile = (frequency = 'weekly'): CanadaPayrollProfile => {
  const year = new Date().getFullYear();
  return { effectiveFrom: `${year}-01-01`, taxYear: year, provinceOfEmployment: '',
    payPeriodsPerYear: ({ weekly: 52, biweekly: 26, semimonthly: 24, quincenal: 24, monthly: 12 } as Record<string, number>)[frequency] ?? 52,
    paymentLagDays: 0, federalClaimMode: 'BASIC', federalClaimAmount: 0, provincialClaimMode: 'BASIC', provincialClaimAmount: 0,
    additionalTax: 0, additionalQuebecTax: 0, ontarioDependants: 0, pensionStatus: 'CONTRIBUTING', pensionableMonths: 12,
    eiExempt: false, qpipExempt: false, declarationReference: '', registeredPlanDeduction: 0, unionDues: 0,
    vacationAccrualPercent: 0, employerEiMultiplier: 1.4, quebecHealthFundPercent: null,
    openingBalances: { asOf: `${year}-01-01`, pensionableEarnings: 0, cpp: 0, qpp: 0, cpp2: 0, qpp2: 0, ei: 0, qpip: 0, employerQpip: 0 } };
};
