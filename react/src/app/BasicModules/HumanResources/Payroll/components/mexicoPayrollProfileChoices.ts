import type { MexicoPayrollProfile } from '../../../../api/payrollMexico';

export const emptyMexicoPayrollProfile = (): MexicoPayrollProfile => ({
  effectiveFrom: '', dailySalary: 0, contributionDailySalary: 0, salaryBasis: 'FIXED', minimumWageZone: 'GENERAL',
  employerRegistration: '', riskPremiumPercent: 0, stateCode: '', statePayrollTaxPercent: 0, statePayrollTaxReference: '',
  infonavit: { enabled: false, creditNumber: '', noticeReference: '', startDate: null, endDate: null,
    mode: 'FIXED_MONTHLY', value: 0, insuranceBimonthly: 0, legacyPercentageCredit: false },
});

// Explicit entry aids, never inferred from an employee's job or used as automatic tax rules.
// LSS 73–74: https://www.imss.gob.mx/sites/all/statics/pdf/leyes/LSS.pdf
export const mexicoRiskClasses = [
  { code: 'I', percent: 0.54355 }, { code: 'II', percent: 1.13065 },
  { code: 'III', percent: 2.5984 }, { code: 'IV', percent: 4.65325 },
  { code: 'V', percent: 7.58875 },
];

// Reviewed 2026-10-25. Only general rates: no exemptions, incentives or special tax bases.
// Do not extend the dated choices to another year without reviewing the official sources.
const stateTaxChoices = [
  {
    state: 'NLE', from: '2026-01-01', through: '2026-12-31', percent: 3,
    reference: 'Nuevo León · Ley de Hacienda del Estado, art. 157 · Tasa general 3% · Ejercicio 2026',
    url: 'https://www.hcnl.gob.mx/trabajo_legislativo/leyes/leyes/ley_de_hacienda_del_estado_de_nuevo_leon/',
  },
  {
    state: 'ROO', from: '2026-01-01', through: '2026-12-31', percent: 4,
    reference: 'Quintana Roo · Ley del Impuesto sobre Nóminas, art. 6 · Tasa general 4% · Ejercicio 2026',
    url: 'https://documentos.congresoqroo.gob.mx/leyes/L167-XVIII-20251216-L1820251216190-Ley-del-Impuesto-sobre-N%C3%B3minas.pdf',
  },
];
export const mexicoStateTaxChoice = (state: string, effectiveFrom: string) =>
  stateTaxChoices.find(choice => choice.state === state && effectiveFrom >= choice.from && effectiveFrom <= choice.through);

export type MexicoProfileChoices = {
  risk: '' | 'REGISTERED' | 'CLASS'; riskClass: string;
  tax: '' | 'GENERAL' | 'CUSTOM'; insurance: '' | 'NONE' | 'NOTICE';
  end: 'OPEN' | 'DATED';
};
export function choicesForMexicoProfile(profile: MexicoPayrollProfile): MexicoProfileChoices {
  const tax = mexicoStateTaxChoice(profile.stateCode, profile.effectiveFrom);
  return {
    // A stored numeric match does not prove the employer uses a class premium.
    risk: profile.riskPremiumPercent > 0 ? 'REGISTERED' : '', riskClass: '',
    tax: tax && profile.statePayrollTaxPercent === tax.percent && profile.statePayrollTaxReference === tax.reference
      ? 'GENERAL' : profile.statePayrollTaxReference ? 'CUSTOM' : '',
    insurance: profile.infonavit.enabled ? (profile.infonavit.insuranceBimonthly > 0 ? 'NOTICE' : 'NONE') : '',
    end: profile.infonavit.endDate ? 'DATED' : 'OPEN',
  };
}
