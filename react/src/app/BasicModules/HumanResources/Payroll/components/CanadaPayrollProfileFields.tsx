import type { ReactNode } from 'react';
import type { CanadaPayrollProfile, CanadaClaimMode } from '../../../../api/payrollCanada';
import { canadaPayrollProfileCopy } from './canadaPayrollProfileCopy';

const provinces = { AB: 'Alberta', BC: 'British Columbia / Colombie-Britannique', MB: 'Manitoba', NB: 'New Brunswick / Nouveau-Brunswick', NL: 'Newfoundland and Labrador / Terre-Neuve-et-Labrador', NS: 'Nova Scotia / Nouvelle-Écosse', NT: 'Northwest Territories / Territoires du Nord-Ouest', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island / Île-du-Prince-Édouard', QC: 'Québec', SK: 'Saskatchewan', YT: 'Yukon' };
const inputClass = 'mt-1 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const gridClass = 'grid grid-cols-1 gap-4 md:grid-cols-2';
const numbers = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => i + start);

export function CanadaPayrollProfileFields({ form: f, patch, disabled, locale }: {
  form: CanadaPayrollProfile; patch: (changes: Partial<CanadaPayrollProfile>) => void; disabled: boolean; locale: string;
}) {
  const c = canadaPayrollProfileCopy(locale);
  const qc = f.provinceOfEmployment === 'QC';
  const field = (label: string, control: ReactNode) => <label className="block min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200">{label}{control}</label>;
  const select = (label: string, value: string | number, options: Record<string, string>, change: (value: string) => void) => field(label,
    <select aria-label={label} required className={inputClass} value={value} onChange={e => change(e.target.value)}><option value="" disabled>{c.select}</option>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>);
  const numeric = (label: string, value: number | null, change: (value: number | null) => void, max = 1000000, step = '0.01', min = 0) => field(label,
    <input aria-label={label} className={inputClass} type="number" inputMode="decimal" required min={min} max={max} step={step} value={value ?? ''} onChange={e => change(e.target.value === '' ? null : Number(e.target.value))} />);
  const date = (label: string, value: string, change: (value: string) => void, min = `${f.taxYear}-01-01`) => field(label,
    <input aria-label={label} className={inputClass} type="date" required min={min} max={`${f.taxYear}-12-31`} value={value} onChange={e => change(e.target.value)} />);
  const group = (title: string, content: ReactNode) => <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50" open><summary className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">{title}</summary><div className="mt-4 space-y-4">{content}</div></details>;
  const claimOptions = { BASIC: c.basic, DECLARED: c.declared, NONE: c.none, EXEMPT: c.exempt };
  const countOptions = (values: number[]) => Object.fromEntries(values.map(n => [n, String(n)]));
  const opening = (changes: Partial<CanadaPayrollProfile['openingBalances']>) => patch({ openingBalances: { ...f.openingBalances, ...changes } });
  const contributionOptions = { false: c.contributing, true: c.exemptContribution };
  // Native required fields retain blanks until validation. No guessed amounts are substituted on save.
  const exact = (value: number | null) => value as number;
  return <fieldset disabled={disabled} className="min-w-0 space-y-4 disabled:opacity-70">
    <div className={gridClass}>
      {select(c.province, f.provinceOfEmployment, provinces, provinceOfEmployment => patch({ provinceOfEmployment,
        provincialClaimMode: 'BASIC', provincialClaimAmount: 0, ontarioDependants: 0,
        additionalQuebecTax: 0, qpipExempt: false, quebecHealthFundPercent: null }))}
      {date(c.effective, f.effectiveFrom, effectiveFrom => patch({ effectiveFrom }), `${f.taxYear - 1}-12-01`)}
      {select(c.year, f.taxYear, { 2026: '2026' }, taxYear => patch({ taxYear: Number(taxYear) }))}
      {select(c.periods, f.payPeriodsPerYear, countOptions([12,24,26,27,52,53]), v => patch({ payPeriodsPerYear: Number(v) }))}
      {select(c.lag, f.paymentLagDays, countOptions(numbers(0,31)), v => patch({ paymentLagDays: Number(v) }))}
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">{c.provinceHelp} {c.calendarHelp}</p>
    {group(c.declarations, <>
      <div className={gridClass}>
        <div className="space-y-3">{select(c.federal, f.federalClaimMode, claimOptions, v => patch({ federalClaimMode: v as CanadaClaimMode, federalClaimAmount: 0 }))}
          {f.federalClaimMode === 'DECLARED' && numeric(`${c.federal} · ${c.amount}`, f.federalClaimAmount, v => patch({ federalClaimAmount: exact(v) }))}</div>
        <div className="space-y-3">{select(c.provincial, f.provincialClaimMode, claimOptions, v => patch({ provincialClaimMode: v as CanadaClaimMode, provincialClaimAmount: 0 }))}
          {f.provincialClaimMode === 'DECLARED' && numeric(`${c.provincial} · ${c.amount}`, f.provincialClaimAmount, v => patch({ provincialClaimAmount: exact(v) }))}</div>
        {numeric(c.additional, f.additionalTax, v => patch({ additionalTax: exact(v) }))}
        {qc && numeric(c.additionalQc, f.additionalQuebecTax, v => patch({ additionalQuebecTax: exact(v) }))}
        {f.provinceOfEmployment === 'ON' && select(c.dependants, f.ontarioDependants, countOptions(numbers(0,30)), v => patch({ ontarioDependants: Number(v) }))}
      </div>
      {field(c.reference, <input aria-label={c.reference} className={inputClass} required maxLength={240} value={f.declarationReference} onChange={e => patch({ declarationReference: e.target.value })} />)}
    </>)}
    {group(c.contributions, <div className={gridClass}>
      {select(c.pension, f.pensionStatus, { CONTRIBUTING: c.contributing, UNDER_18: c.under18, AGE_LIMIT: c.ageLimit, ELECTION: c.election, DISABILITY: c.disability, EXCLUDED_EMPLOYMENT: c.excluded }, v => patch({ pensionStatus: v as CanadaPayrollProfile['pensionStatus'] }))}
      {select(c.months, f.pensionableMonths, countOptions(numbers(1,12)), v => patch({ pensionableMonths: Number(v) }))}
      {select(c.ei, String(f.eiExempt), contributionOptions, v => patch({ eiExempt: v === 'true' }))}
      {qc && select(c.qpip, String(f.qpipExempt), contributionOptions, v => patch({ qpipExempt: v === 'true' }))}
      {numeric(c.plan, f.registeredPlanDeduction, v => patch({ registeredPlanDeduction: exact(v) }))}
      {numeric(c.dues, f.unionDues, v => patch({ unionDues: exact(v) }))}
    </div>)}
    {group(c.employer, <>
      <p className="text-xs text-slate-500 dark:text-slate-400">{c.employerHelp}</p>
      <div className={gridClass}>
        {numeric(c.vacation, f.vacationAccrualPercent, v => patch({ vacationAccrualPercent: exact(v) }),25)}
        {numeric(c.eiFactor, f.employerEiMultiplier, v => patch({ employerEiMultiplier: exact(v) }),1.4,'0.0001',1)}
        {qc && numeric(c.hsf, f.quebecHealthFundPercent, v => patch({ quebecHealthFundPercent: v }),4.26,'0.0001')}
      </div>
    </>)}
    {group(c.opening, <>
      <p className="text-xs text-slate-500 dark:text-slate-400">{c.openingHelp}</p>
      <div className={gridClass}>
        {date(c.asOf, f.openingBalances.asOf, asOf => opening({ asOf }))}
        {numeric(c.pensionable, f.openingBalances.pensionableEarnings, v => opening({ pensionableEarnings: exact(v) }),10000000)}
        {(['cpp','qpp','cpp2','qpp2','ei','qpip'] as const).map(key => <div key={key}>{numeric(`${key.toUpperCase()} (CAD)`, f.openingBalances[key], v => opening({ [key]: exact(v) }), { cpp:4230.45, qpp:4479.30, cpp2:416, qpp2:416, ei:1123.07, qpip:442.90 }[key])}</div>)}
        {numeric(c.employerQpip, f.openingBalances.employerQpip, v => opening({ employerQpip: exact(v) }),620.06)}
      </div>
    </>)}
  </fieldset>;
}
