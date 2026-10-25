import { apiClient } from '../lib/apiClient';

export interface MexicoPayrollProfile {
  effectiveFrom: string;
  dailySalary: number;
  contributionDailySalary: number;
  salaryBasis: 'FIXED' | 'VARIABLE' | 'MIXED';
  minimumWageZone: 'GENERAL' | 'NORTHERN_BORDER';
  employerRegistration: string;
  riskPremiumPercent: number;
  stateCode: string;
  statePayrollTaxPercent: number;
  statePayrollTaxReference: string;
  infonavit: {
    enabled: boolean;
    creditNumber: string;
    noticeReference: string;
    startDate: string | null;
    endDate: string | null;
    mode: 'FIXED_MONTHLY' | 'SBC_PERCENT' | 'UMI_FACTOR';
    value: number;
    insuranceBimonthly: number;
    legacyPercentageCredit: boolean;
  };
}
export interface MexicoPayrollProfileResponse {
  revision: number;
  profile: MexicoPayrollProfile | null;
  canConfigure: boolean;
  history: { revision: number; profile: MexicoPayrollProfile }[];
}
export interface MexicoPayrollProfileSaveRequest {
  expectedRevision: number;
  requestId: string;
  profile: MexicoPayrollProfile;
}
export const payrollMexicoApi = {
  get: (employeeId: number) => apiClient<MexicoPayrollProfileResponse>(`/api/v1/hr/payroll/mexico/profiles/${employeeId}`),
  save: (employeeId: number, expectedRevision: number, requestId: string, profile: MexicoPayrollProfile) =>
    apiClient<MexicoPayrollProfileResponse>(`/api/v1/hr/payroll/mexico/profiles/${employeeId}`, {
      method: 'PUT', body: JSON.stringify({ expectedRevision, requestId, profile }),
    }),
};
