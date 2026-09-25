import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { platformAdminApi, type SquareActivationStatus } from '../../api/platformAdmin';
import { ApiClientError } from '../../lib/apiClient';
import { usePlatformAdminTranslations } from '../translations/usePlatformAdminTranslations';
import { WorkspaceSection } from './CompanyAccountPrimitives';
import { squareActivationCopy } from './squareActivationCopy';

const states: SquareActivationStatus['activationState'][] = ['DISABLED', 'PILOT', 'ACTIVE', 'SUSPENDED'];

export function SquareActivationPanel({ companyId }: { companyId: number }) {
  const { locale } = usePlatformAdminTranslations();
  const copy = squareActivationCopy[locale];
  const [status, setStatus] = useState<SquareActivationStatus | null>(null);
  const [state, setState] = useState<SquareActivationStatus['activationState']>('DISABLED');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const apply = (next: SquareActivationStatus) => {
    setStatus(next); setState(next.activationState); setReason(next.reason ?? ''); setMissing(false);
  };
  const load = useCallback(async () => {
    setBusy(true); setMessage(null);
    try { apply(await platformAdminApi.getSquareActivation(companyId)); }
    catch (error) {
      setStatus(null); setMissing(error instanceof ApiClientError && error.status === 404);
      if (!(error instanceof ApiClientError && error.status === 404)) setMessage({ tone: 'error', text: copy.error });
    } finally { setBusy(false); }
  }, [companyId, copy.error]);
  useEffect(() => { void load(); }, [load]);
  const dirty = useMemo(() => Boolean(status)
    && (state !== status?.activationState || reason.trim() !== (status?.reason ?? '')), [reason, state, status]);
  const save = async () => {
    if (!status || reason.trim().length < 8) return;
    setBusy(true); setMessage(null);
    try {
      apply(await platformAdminApi.updateSquareActivation(companyId, state, reason.trim(), status.version));
      setMessage({ tone: 'success', text: copy.saved });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        try { apply(await platformAdminApi.getSquareActivation(companyId)); } catch { /* Preserve the current draft. */ }
        setMessage({ tone: 'error', text: copy.conflict });
      } else setMessage({ tone: 'error', text: copy.error });
    } finally { setBusy(false); }
  };
  return <WorkspaceSection title={copy.title} description={copy.description} icon={ShieldCheck}
    action={<button type="button" onClick={() => void load()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{copy.refresh}</button>}>
    <div className="space-y-4 p-4">
      {missing ? <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{copy.missing}</p> : null}
      {message ? <p role="status" aria-live="polite" className={`rounded-lg px-4 py-3 text-sm ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{message.text}</p> : null}
      {status ? <><div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">{copy.state}<select value={state} onChange={event => setState(event.target.value as typeof state)} disabled={busy} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900">{states.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <div className="rounded-lg border border-slate-200 px-4 py-3"><p className="text-xs text-slate-500">{copy.gate}</p><p className={`mt-1 text-sm font-medium ${status.liveChargeAllowed ? 'text-emerald-700' : 'text-rose-700'}`}>{status.liveChargeAllowed ? copy.allowed : copy.blocked}</p><p className="mt-1 text-xs text-slate-500">{copy.version}: {status.version}</p></div>
      </div><label className="block text-sm font-medium text-slate-700">{copy.reason}<textarea value={reason} onChange={event => setReason(event.target.value)} disabled={busy} maxLength={500} rows={3} placeholder={copy.placeholder} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" /></label>
      <div className="flex justify-end"><button type="button" onClick={() => void save()} disabled={busy || !dirty || reason.trim().length < 8} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#177D66] px-4 text-sm font-medium text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{copy.save}</button></div></> : null}
    </div>
  </WorkspaceSection>;
}
