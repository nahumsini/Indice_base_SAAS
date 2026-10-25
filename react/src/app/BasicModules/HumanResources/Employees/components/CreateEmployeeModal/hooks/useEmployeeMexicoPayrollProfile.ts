import { useEffect, useRef, useState } from 'react';
import { payrollMexicoApi, type MexicoPayrollProfile, type MexicoPayrollProfileResponse, type MexicoPayrollProfileSaveRequest } from '../../../../../../api/payrollMexico';
import { choicesForMexicoProfile, emptyMexicoPayrollProfile, type MexicoProfileChoices } from '../../../../Payroll/components/mexicoPayrollProfileChoices';

const snapshot = (profile: MexicoPayrollProfile, choices: MexicoProfileChoices) => JSON.stringify({ profile, choices });

/** The employee wizard owns the draft; Payroll still owns validation, versions and persistence. */
export function useEmployeeMexicoPayrollProfile({ employeeId, isOpen, eligible }: {
  employeeId?: number; isOpen: boolean; eligible: boolean;
}) {
  const [form, setForm] = useState(emptyMexicoPayrollProfile);
  const [choices, setChoices] = useState(() => choicesForMexicoProfile(emptyMexicoPayrollProfile()));
  const [response, setResponse] = useState<MexicoPayrollProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const baseline = useRef('');
  const loaded = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const fieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const empty = emptyMexicoPayrollProfile();
    setForm(empty); setChoices(choicesForMexicoProfile(empty)); setResponse(null);
    setLoading(false); setFailed(false); baseline.current = ''; loaded.current = false;
    requestId.current = crypto.randomUUID();
  }, [employeeId, isOpen]);

  useEffect(() => {
    if (!isOpen || !eligible || !employeeId || loaded.current) return;
    let active = true;
    setLoading(true); setFailed(false);
    payrollMexicoApi.get(employeeId).then(value => {
      if (!active) return;
      const profile = value.profile ?? emptyMexicoPayrollProfile();
      const initialChoices = choicesForMexicoProfile(profile);
      setResponse(value); setForm(profile); setChoices(initialChoices);
      baseline.current = snapshot(profile, initialChoices); loaded.current = true;
    }).catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId, isOpen, eligible, reload]);

  const dirty = response !== null && baseline.current !== snapshot(form, choices);
  const changed = () => { requestId.current = crypto.randomUUID(); };
  const patch = (changes: Partial<MexicoPayrollProfile>) => { changed(); setForm(previous => ({ ...previous, ...changes })); };
  const choose = (changes: Partial<MexicoProfileChoices>) => { changed(); setChoices(previous => ({ ...previous, ...changes })); };
  const invalidControl = () => Array.from(fieldsRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select') ?? [])
    .find(control => !control.disabled && !control.checkValidity());
  const valid = () => !eligible || !dirty || !invalidControl();
  const focusInvalid = () => { const input = invalidControl(); input?.focus(); input?.reportValidity(); };
  const saveRequest = (): MexicoPayrollProfileSaveRequest | undefined =>
    eligible && dirty && response?.canConfigure ? { expectedRevision: response.revision, requestId: requestId.current, profile: form } : undefined;

  return { form, choices, response, loading, failed, dirty, fieldsRef, patch, choose, valid, focusInvalid, saveRequest,
    retry: () => { loaded.current = false; setReload(value => value + 1); } };
}
