import { useEffect, useRef, useState } from 'react';
import { payrollCanadaApi, type CanadaPayrollProfile, type CanadaPayrollProfileResponse, type CanadaPayrollProfileSaveRequest } from '../../../../../../api/payrollCanada';
import { emptyCanadaPayrollProfile } from '../../../../../../api/payrollCanada';
const snapshot = (profile: CanadaPayrollProfile) => JSON.stringify(profile);

/** The employee wizard owns the draft; Payroll still owns validation, versions and persistence. */
export function useEmployeeCanadaPayrollProfile({ employeeId, isOpen, eligible, frequency }: {
  employeeId?: number; isOpen: boolean; eligible: boolean; frequency: string;
}) {
  const [form, setForm] = useState(() => emptyCanadaPayrollProfile(frequency));
  const [response, setResponse] = useState<CanadaPayrollProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const baseline = useRef('');
  const loaded = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const fieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const empty = emptyCanadaPayrollProfile(frequency);
    setForm(empty); setResponse(null);
    setLoading(false); setFailed(false); baseline.current = ''; loaded.current = false;
    requestId.current = crypto.randomUUID();
  }, [employeeId, isOpen]);

  useEffect(() => {
    if (!isOpen || !eligible || !employeeId || loaded.current) return;
    let active = true;
    setLoading(true); setFailed(false);
    payrollCanadaApi.get(employeeId).then(value => {
      if (!active) return;
      const profile = value.profile ?? emptyCanadaPayrollProfile(frequency);
      setResponse(value); setForm(profile);
      baseline.current = snapshot(profile); loaded.current = true;
    }).catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId, isOpen, eligible, reload]);

  const dirty = response !== null && baseline.current !== snapshot(form);
  const changed = () => { requestId.current = crypto.randomUUID(); };
  const patch = (changes: Partial<CanadaPayrollProfile>) => { changed(); setForm(previous => ({ ...previous, ...changes })); };
  const invalidControl = () => Array.from(fieldsRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select') ?? [])
    .find(control => !control.disabled && !control.checkValidity());
  const valid = () => !eligible || !dirty || !invalidControl();
  const focusInvalid = () => {
    const input = invalidControl();
    for (let parent = input?.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    input?.focus(); input?.reportValidity();
  };
  const saveRequest = (): CanadaPayrollProfileSaveRequest | undefined =>
    eligible && dirty && response?.canConfigure ? { expectedRevision: response.revision, requestId: requestId.current, profile: form } : undefined;

  return { form, response, loading, failed, dirty, fieldsRef, patch, valid, focusInvalid, saveRequest,
    retry: () => { loaded.current = false; setReload(value => value + 1); } };
}
