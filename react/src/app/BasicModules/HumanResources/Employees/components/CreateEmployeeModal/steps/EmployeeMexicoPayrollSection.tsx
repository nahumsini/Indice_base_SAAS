import { Landmark } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { MexicoPayrollProfileFields } from '../../../../Payroll/components/MexicoPayrollProfileFields';
import { mexicoPayrollProfileCopy } from '../../../../Payroll/components/mexicoPayrollProfileCopy';
import type { useEmployeeMexicoPayrollProfile } from '../hooks/useEmployeeMexicoPayrollProfile';

export function EmployeeMexicoPayrollSection({ draft, locale, busy }: {
  draft: ReturnType<typeof useEmployeeMexicoPayrollProfile>; locale: string; busy: boolean;
}) {
  const copy = mexicoPayrollProfileCopy(locale);
  return <section ref={draft.fieldsRef} aria-label={copy.title} className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 dark:border-emerald-800 dark:bg-emerald-950/10">
    <h3 className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200"><Landmark className="h-5 w-5" />{copy.title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-300">{copy.embeddedHelp}</p>
    {draft.loading ? <p role="status" className="text-sm">{copy.loading}</p> : draft.failed ? <div role="alert" className="space-y-2 text-sm">
      <p>{copy.embeddedUnavailable}</p><Button type="button" variant="outline" onClick={draft.retry} disabled={busy}>{copy.retry}</Button>
    </div> : draft.response ? <>
      {!draft.response.canConfigure ? <p className="text-sm text-slate-500">{copy.readonly}</p> : null}
      <MexicoPayrollProfileFields form={draft.form} choices={draft.choices} patch={draft.patch} choose={draft.choose}
        disabled={busy || !draft.response.canConfigure} locale={locale} />
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy.recalculate}</p>
    </> : null}
  </section>;
}
