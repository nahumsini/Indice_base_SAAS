import { cloneElement, useId, type ReactElement } from 'react';
import type { MexicoPayrollProfile } from '../../../../api/payrollMexico';
import { mexicoPayrollProfileCopy } from './mexicoPayrollProfileCopy';
import { mexicoRiskClasses, mexicoStateTaxChoice, type MexicoProfileChoices } from './mexicoPayrollProfileChoices';

const states = [
  ['AGU', 'Aguascalientes'], ['BCN', 'Baja California'], ['BCS', 'Baja California Sur'], ['CAM', 'Campeche'],
  ['CHP', 'Chiapas'], ['CHH', 'Chihuahua'], ['CMX', 'Ciudad de México'], ['COA', 'Coahuila'], ['COL', 'Colima'],
  ['DUR', 'Durango'], ['GUA', 'Guanajuato'], ['GRO', 'Guerrero'], ['HID', 'Hidalgo'], ['JAL', 'Jalisco'],
  ['MEX', 'Estado de México'], ['MIC', 'Michoacán'], ['MOR', 'Morelos'], ['NAY', 'Nayarit'], ['NLE', 'Nuevo León'],
  ['OAX', 'Oaxaca'], ['PUE', 'Puebla'], ['QUE', 'Querétaro'], ['ROO', 'Quintana Roo'], ['SLP', 'San Luis Potosí'],
  ['SIN', 'Sinaloa'], ['SON', 'Sonora'], ['TAB', 'Tabasco'], ['TAM', 'Tamaulipas'], ['TLA', 'Tlaxcala'],
  ['VER', 'Veracruz'], ['YUC', 'Yucatán'], ['ZAC', 'Zacatecas'],
];
const controlClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]';

type Control = ReactElement<{ id?: string; 'aria-describedby'?: string; required?: boolean }>;
function Field({ label, children, help }: { label: string; children: Control; help?: string }) {
  const id = useId();
  return <div className="min-w-0"><label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{children.props.required ? <span aria-hidden="true"> *</span> : null}</label>
    {cloneElement(children, { id, 'aria-describedby': help ? `${id}-help` : undefined })}
    {help ? <p id={`${id}-help`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{help}</p> : null}</div>;
}

export function MexicoPayrollProfileFields({ form, choices, patch, choose, disabled, locale }: {
  form: MexicoPayrollProfile; choices: MexicoProfileChoices;
  patch: (changes: Partial<MexicoPayrollProfile>) => void;
  choose: (changes: Partial<MexicoProfileChoices>) => void;
  disabled: boolean; locale: string;
}) {
  const copy = mexicoPayrollProfileCopy(locale);
  const taxChoice = mexicoStateTaxChoice(form.stateCode, form.effectiveFrom);
  const update = <K extends keyof MexicoPayrollProfile>(key: K, value: MexicoPayrollProfile[K]) => patch({ [key]: value });
  const updateCredit = <K extends keyof MexicoPayrollProfile['infonavit']>(key: K, value: MexicoPayrollProfile['infonavit'][K]) => {
    update('infonavit', { ...form.infonavit, [key]: value,
      ...(key === 'mode' ? { value: 0, legacyPercentageCredit: false } : {}) });
  };
  const updateTaxContext = (key: 'stateCode' | 'effectiveFrom', value: string) => {
    const changedContext = key === 'stateCode' || form.effectiveFrom.slice(0, 4) !== value.slice(0, 4);
    if (changedContext) choose({ tax: '' });
    patch({ [key]: value, ...(changedContext ? { statePayrollTaxPercent: 0, statePayrollTaxReference: '' } : {}) });
  };
  const field = (label: string, child: Control, help?: string) => <Field key={label} label={label} help={help}>{child}</Field>;
  const salaryNumber = (key: 'dailySalary' | 'contributionDailySalary', label: string) =>
    field(label, <input className={controlClass} required type="number" min="0.01" max="1000000" step="0.01" value={form[key] || ''} onChange={event => update(key, Number(event.target.value))} />, copy.salaryHelp);
  const valueLabel = form.infonavit.mode === 'FIXED_MONTHLY' ? copy.monthlyAmount : form.infonavit.mode === 'SBC_PERCENT' ? copy.percentAmount : copy.factorAmount;

  return <div className="space-y-5 text-slate-900 dark:text-slate-100">
          <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <legend className="px-2 font-semibold">{copy.salary}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field(copy.effective, <input className={controlClass} type="date" required value={form.effectiveFrom} onChange={event => updateTaxContext('effectiveFrom', event.target.value)} />)}
              {field(copy.registration, <input className={controlClass} required maxLength={11} pattern="[A-Z0-9]{11}" value={form.employerRegistration} onChange={event => update('employerRegistration', event.target.value.toUpperCase())} />, copy.registrationHelp)}
              {salaryNumber('dailySalary', copy.daily)}{salaryNumber('contributionDailySalary', copy.sbc)}
              {field(copy.basis, <select className={controlClass} value={form.salaryBasis} onChange={event => update('salaryBasis', event.target.value as MexicoPayrollProfile['salaryBasis'])}><option value="FIXED">{copy.fixed}</option><option value="VARIABLE">{copy.variable}</option><option value="MIXED">{copy.mixed}</option></select>)}
              {field(copy.zone, <select className={controlClass} value={form.minimumWageZone} onChange={event => update('minimumWageZone', event.target.value as MexicoPayrollProfile['minimumWageZone'])}><option value="GENERAL">{copy.general}</option><option value="NORTHERN_BORDER">{copy.border}</option></select>)}
              {field(copy.riskSource, <select className={controlClass} required value={choices.risk} onChange={event => {
                choose({ risk: event.target.value as MexicoProfileChoices['risk'], riskClass: '' }); update('riskPremiumPercent', 0);
              }}><option value="">{copy.select}</option><option value="REGISTERED">{copy.registeredRisk}</option><option value="CLASS">{copy.classRisk}</option></select>)}
              {choices.risk === 'REGISTERED' ? field(copy.risk, <input className={controlClass} required type="number" min="0.5" max="15" step="0.00001" value={form.riskPremiumPercent || ''} onChange={event => update('riskPremiumPercent', Number(event.target.value))} />) : null}
              {choices.risk === 'CLASS' ? field(copy.riskClass, <select className={controlClass} required value={choices.riskClass} onChange={event => {
                choose({ riskClass: event.target.value }); update('riskPremiumPercent', mexicoRiskClasses.find(item => item.code === event.target.value)?.percent ?? 0);
              }}><option value="">{copy.select}</option>{mexicoRiskClasses.map(item => <option key={item.code} value={item.code}>{item.code} · {item.percent.toFixed(5)} %</option>)}</select>) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.riskHelp}</p>
          </fieldset>
          <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <legend className="px-2 font-semibold">{copy.taxTitle}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field(copy.state, <select className={controlClass} required value={form.stateCode} onChange={event => updateTaxContext('stateCode', event.target.value)}><option value="">{copy.select}</option>{states.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>)}
              {field(copy.taxSource, <select className={controlClass} required disabled={!form.stateCode || !form.effectiveFrom} value={choices.tax} onChange={event => {
                const tax = event.target.value as MexicoProfileChoices['tax']; choose({ tax });
                patch({ statePayrollTaxPercent: tax === 'GENERAL' && taxChoice ? taxChoice.percent : 0,
                  statePayrollTaxReference: tax === 'GENERAL' && taxChoice ? taxChoice.reference : '' });
              }}><option value="">{copy.select}</option>{taxChoice ? <option value="GENERAL">{copy.generalTax} · {taxChoice.percent} % · 2026</option> : null}<option value="CUSTOM">{copy.customTax}</option></select>)}
              {choices.tax === 'CUSTOM' ? <>
                {field(copy.rate, <input className={controlClass} required type="number" min="0" max="10" step="0.0001" value={form.statePayrollTaxPercent} onChange={event => update('statePayrollTaxPercent', Number(event.target.value))} />)}
                {field(copy.reference, <input className={controlClass} required pattern={'.*\\S.*'} maxLength={300} value={form.statePayrollTaxReference} onChange={event => update('statePayrollTaxReference', event.target.value)} />, copy.referenceHelp)}
              </> : null}
            </div>
            {choices.tax === 'GENERAL' && taxChoice ? <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <p>{taxChoice.reference}</p><a href={taxChoice.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline">{copy.sourceLink}</a>
            </div> : null}
            <p className="text-xs text-slate-500 dark:text-slate-400">{taxChoice ? copy.taxHelp : copy.noTaxChoice}</p>
          </fieldset>
          <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <legend className="px-2 font-semibold">{copy.credit}</legend>
            {field(copy.creditStatus, <select className={controlClass} value={form.infonavit.enabled ? 'YES' : 'NO'} onChange={event => {
              updateCredit('enabled', event.target.value === 'YES');
              if (event.target.value === 'YES') choose({ insurance: form.infonavit.insuranceBimonthly > 0 ? 'NOTICE' : '' });
            }}><option value="NO">{copy.noCredit}</option><option value="YES">{copy.yesCredit}</option></select>)}
            {form.infonavit.enabled ? <>
              <div className="grid gap-4 sm:grid-cols-2">
                {field(copy.number, <input className={controlClass} required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.infonavit.creditNumber} onChange={event => updateCredit('creditNumber', event.target.value)} />, copy.creditNumberHelp)}
                {field(copy.notice, <input className={controlClass} required maxLength={200} value={form.infonavit.noticeReference} onChange={event => updateCredit('noticeReference', event.target.value)} />)}
                {field(copy.start, <input className={controlClass} required type="date" value={form.infonavit.startDate ?? ''} onChange={event => updateCredit('startDate', event.target.value || null)} />)}
                {field(copy.endRule, <select className={controlClass} value={choices.end} onChange={event => {
                  choose({ end: event.target.value as MexicoProfileChoices['end'] }); updateCredit('endDate', null);
                }}><option value="OPEN">{copy.openEnd}</option><option value="DATED">{copy.datedEnd}</option></select>)}
                {choices.end === 'DATED' ? field(copy.end, <input className={controlClass} required type="date" min={form.infonavit.startDate ?? undefined} value={form.infonavit.endDate ?? ''} onChange={event => updateCredit('endDate', event.target.value || null)} />) : null}
                {field(copy.mode, <select className={controlClass} value={form.infonavit.mode} onChange={event => updateCredit('mode', event.target.value as MexicoPayrollProfile['infonavit']['mode'])}><option value="FIXED_MONTHLY">{copy.monthly}</option><option value="SBC_PERCENT">{copy.percentage}</option><option value="UMI_FACTOR">{copy.factor}</option></select>)}
                {field(valueLabel, <input className={controlClass} required type="number" min={form.infonavit.mode === 'FIXED_MONTHLY' ? '0.01' : '0.000001'} max={form.infonavit.mode === 'SBC_PERCENT' ? '100' : '1000000'} step={form.infonavit.mode === 'FIXED_MONTHLY' ? '0.01' : '0.000001'} value={form.infonavit.value || ''} onChange={event => updateCredit('value', Number(event.target.value))} />, copy.amountHelp)}
                {field(copy.insuranceRule, <select className={controlClass} required value={choices.insurance} onChange={event => {
                  choose({ insurance: event.target.value as MexicoProfileChoices['insurance'] }); updateCredit('insuranceBimonthly', 0);
                }}><option value="">{copy.select}</option><option value="NONE">{copy.noInsurance}</option><option value="NOTICE">{copy.noticeInsurance}</option></select>)}
                {choices.insurance === 'NOTICE' ? field(copy.insurance, <input className={controlClass} required type="number" min="0.01" max="1000" step="0.01" value={form.infonavit.insuranceBimonthly || ''} onChange={event => updateCredit('insuranceBimonthly', Number(event.target.value))} />, copy.insuranceHelp) : null}
              </div>
              {form.infonavit.mode === 'SBC_PERCENT' ? field(copy.creditAge, <select className={controlClass} value={form.infonavit.legacyPercentageCredit ? 'LEGACY' : 'MODERN'} onChange={event => updateCredit('legacyPercentageCredit', event.target.value === 'LEGACY')}><option value="MODERN">{copy.modernCredit}</option><option value="LEGACY">{copy.legacyCredit}</option></select>) : null}
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noticeHelp}</p>
            </> : null}
          </fieldset>
  </div>;
}
