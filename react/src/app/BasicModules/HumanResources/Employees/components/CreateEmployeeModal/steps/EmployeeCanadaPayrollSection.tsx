import { Landmark } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { CanadaPayrollProfileFields } from '../../../../Payroll/components/CanadaPayrollProfileFields';
import { canadaPayrollProfileCopy } from '../../../../Payroll/components/canadaPayrollProfileCopy';
import type { useEmployeeCanadaPayrollProfile } from '../hooks/useEmployeeCanadaPayrollProfile';

export function EmployeeCanadaPayrollSection({ draft, locale, busy }: {
  draft: ReturnType<typeof useEmployeeCanadaPayrollProfile>; locale: string; busy: boolean;
}) {
  const copy = canadaPayrollProfileCopy(locale);
  return <section ref={draft.fieldsRef} aria-label={copy.title} className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 text-slate-800 dark:border-emerald-800 dark:bg-emerald-950/10 dark:text-slate-100">
    <h3 className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200"><Landmark className="h-5 w-5" />{copy.title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-300">{copy.help}</p>
    {draft.loading ? <p role="status" className="text-sm">{copy.loading}</p> : draft.failed ? <div role="alert" className="space-y-2 text-sm">
      <p>{copy.failure}</p><Button type="button" variant="outline" onClick={draft.retry} disabled={busy}>{copy.retry}</Button>
    </div> : draft.response ? <>
      {!draft.response.canConfigure ? <p className="text-sm text-slate-500 dark:text-slate-400">{copy.readonly}</p> : null}
      <CanadaPayrollProfileFields form={draft.form} patch={draft.patch}
        disabled={busy || !draft.response.canConfigure} locale={locale} />
    </> : null}
  </section>;
}
