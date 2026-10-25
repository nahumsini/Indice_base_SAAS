import { useEffect, useId, useRef, useState } from 'react';
import { Landmark, Save } from 'lucide-react';
import { payrollMexicoApi, type MexicoPayrollProfile, type MexicoPayrollProfileResponse } from '../../../../api/payrollMexico';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import { mexicoPayrollProfileCopy } from './mexicoPayrollProfileCopy';
import { choicesForMexicoProfile, emptyMexicoPayrollProfile, type MexicoProfileChoices } from './mexicoPayrollProfileChoices';
import { MexicoPayrollProfileFields } from './MexicoPayrollProfileFields';

const draftSnapshot = (profile: MexicoPayrollProfile, choices: MexicoProfileChoices) => JSON.stringify({ profile, choices });

export function MexicoPayrollProfileDialog({ employeeId, employeeName, locale, onClose }: {
  employeeId: number; employeeName: string; locale: string; onClose: () => void;
}) {
  const copy = mexicoPayrollProfileCopy(locale);
  const formId = useId();
  const [response, setResponse] = useState<MexicoPayrollProfileResponse | null>(null);
  const [form, setForm] = useState<MexicoPayrollProfile>(emptyMexicoPayrollProfile);
  const [choices, setChoices] = useState<MexicoProfileChoices>(() => choicesForMexicoProfile(emptyMexicoPayrollProfile()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reload, setReload] = useState(0);
  const [discard, setDiscard] = useState(false);
  const baseline = useRef('');
  const requestId = useRef(crypto.randomUUID());
  const dirty = !loading && baseline.current !== draftSnapshot(form, choices);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    payrollMexicoApi.get(employeeId).then(value => {
      if (!active) return;
      const profile = value.profile ?? emptyMexicoPayrollProfile();
      const nextChoices = choicesForMexicoProfile(profile);
      setResponse(value); setForm(profile); setChoices(nextChoices); baseline.current = draftSnapshot(profile, nextChoices);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : copy.failure); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId, reload, copy.failure]);

  const patch = (changes: Partial<MexicoPayrollProfile>) => {
    requestId.current = crypto.randomUUID(); setSuccess(false);
    setForm(previous => ({ ...previous, ...changes }));
  };
  const choose = (changes: Partial<MexicoProfileChoices>) => {
    requestId.current = crypto.randomUUID(); setSuccess(false);
    setChoices(previous => ({ ...previous, ...changes }));
  };
  const close = () => { if (!saving) { if (dirty) setDiscard(true); else onClose(); } };
  const save = async () => {
    if (saving || !response?.canConfigure) return;
    setSaving(true); setError(''); setSuccess(false);
    try {
      const value = await payrollMexicoApi.save(employeeId, response.revision, requestId.current, form);
      const profile = value.profile ?? form;
      setResponse(value); setForm(profile); baseline.current = draftSnapshot(profile, choices); setSuccess(true);
      requestId.current = crypto.randomUUID();
    } catch (cause) { setError(cause instanceof Error ? cause.message : copy.failure); }
    finally { setSaving(false); }
  };
  if (discard) return <IndiceModalFrame open onOpenChange={open => { if (!open) setDiscard(false); }} modalType="confirmation" tone="aqua"
    title={copy.discard} description={employeeName} closeLabel={copy.keep} icon={<Landmark className="h-5 w-5" />}
    footerLeading={<Button variant="outline" onClick={() => setDiscard(false)}>{copy.keep}</Button>}
    footer={<Button data-modal-destructive="true" onClick={onClose}>{copy.leave}</Button>}><p className="p-5 text-sm">{copy.recalculate}</p></IndiceModalFrame>;

  return <IndiceModalFrame open onOpenChange={open => { if (!open) close(); }} modalType="standard-form" tone="aqua" busy={saving}
    title={copy.title} description={`${employeeName} · ${copy.subtitle}`} closeLabel={copy.cancel} icon={<Landmark className="h-5 w-5" />}
    bodyClassName="p-0" footerLeading={<Button variant="outline" disabled={saving} onClick={close}>{copy.cancel}</Button>}
    footer={response?.canConfigure ? <Button type="submit" form={formId} disabled={saving || loading || !dirty}><Save className="h-4 w-4" />{saving ? copy.loading : copy.save}</Button> : null}>
    <div className="space-y-4 p-4 text-slate-900 dark:text-slate-100 sm:p-5">
      <IndiceModalValidation messages={error ? [error] : []} />
      {loading ? <p role="status">{copy.loading}</p> : !response ? <Button onClick={() => setReload(value => value + 1)}>{copy.retry}</Button> : <>
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{copy.scope}</p>
        {success ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{copy.saved}</p> : null}
        {!response.canConfigure ? <p className="text-sm text-slate-500">{copy.readonly}</p> : null}
        <form id={formId} onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-5">
          <MexicoPayrollProfileFields form={form} choices={choices} patch={patch} choose={choose}
            disabled={saving || !response.canConfigure} locale={locale} />
        </form>
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy.recalculate}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy.receiptNotice}</p>
        {response.history.length > 0 ? <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-medium">{copy.history} ({response.history.length})</summary><ol className="mt-2 space-y-1">{response.history.map(version => <li key={version.revision}>{copy.revision} {version.revision} · {copy.effective}: {version.profile.effectiveFrom}</li>)}</ol></details> : null}
      </>}
    </div>
  </IndiceModalFrame>;
}
