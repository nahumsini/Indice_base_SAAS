import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Filter, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { ApiClientError } from '../../../lib/apiClient';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../salesModalStyles';
import { funnelApi } from './funnelApi';
import { type FunnelInput, type FunnelStage, type FunnelChannel, type FunnelStatus, moveStage, validateFunnel } from './funnelModel';
import { campaignCopy } from './campaignCopy';
import { FunnelPreview } from './FunnelPreview';
import type { FunnelCopy } from './funnelCopy';

const actions = getSalesModalActionClassNames();
const selectClass = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900';
export function funnelChannels(copy: FunnelCopy): [FunnelChannel, string][] {
  return [['EMAIL', copy.email], ['WHATSAPP', copy.whatsapp], ['SOCIAL', copy.social], ['PHONE', copy.phone], ['IN_PERSON', copy.inPerson], ['MIXED', copy.mixed], ['OTHER', copy.other]];
}
export function funnelStatuses(copy: FunnelCopy): [FunnelStatus, string][] {
  return [['DRAFT', copy.draft], ['PLANNED', copy.planned], ['ARCHIVED', copy.archived]];
}

// Operational workspace: configure ordered stages alongside the live funnel projection.
export function FunnelEditor({ id, initial, copy, locale, onClose, onSaved }: {
  id: string; initial: FunnelInput; copy: FunnelCopy; locale: string; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [keys, setKeys] = useState(() => initial.stages.map(() => crypto.randomUUID()));
  const initialJson = useRef(JSON.stringify(initial));
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const dirty = initialJson.current !== JSON.stringify(draft);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function close() { if (!inFlight.current) { if (dirty) setDiscard(true); else onClose(); } }
  function update<K extends keyof FunnelInput>(key: K, value: FunnelInput[K]) { setDraft(d => ({ ...d, [key]: value })); setError(''); }
  function stage(index: number, patch: Partial<FunnelStage>) {
    update('stages', draft.stages.map((item, i) => i === index ? { ...item, ...patch } : item));
  }
  function move(index: number, direction: -1 | 1) {
    update('stages', moveStage(draft.stages, index, direction)); setKeys(moveStage(keys, index, direction));
  }
  async function save() {
    if (inFlight.current || conflict) return;
    const invalid = validateFunnel(draft);
    if (invalid) { setError(invalid === 'ideaRequired' || invalid === 'briefIncomplete' ? campaignCopy(locale)[invalid] : copy[invalid]); return; }
    inFlight.current = true; setBusy(true); setError('');
    try { await funnelApi.save(id, draft); onSaved(); }
    catch (failure) {
      if (failure instanceof ApiClientError && failure.status === 409) { setConflict(true); setError(copy.conflict); }
      else setError(copy.saveError);
    } finally { inFlight.current = false; setBusy(false); }
  }
  if (discard) return <SalesModalFrame open modalType="confirmation" title={copy.discardTitle} description={copy.discardHint} icon={<Filter />} closeLabel={copy.close} onOpenChange={() => setDiscard(false)}
    footer={<><Button className={actions.secondary} onClick={() => setDiscard(false)}>{copy.keepEditing}</Button><Button className={actions.primary} onClick={onClose}>{copy.discard}</Button></>}>
    <p className="break-words text-sm">{draft.name || copy.newPlan}</p>
  </SalesModalFrame>;
  return <SalesModalFrame open modalType="operational-workspace" busy={busy} title={initial.version ? copy.edit : copy.newPlan} description={copy.subtitle}
    icon={<Filter className="h-5 w-5" />} closeLabel={copy.close} onOpenChange={close}
    footerSummary={<span>{draft.stages.length} · {copy.stages}</span>}
    footer={<><Button className={actions.secondary} disabled={busy} onClick={close}>{copy.cancel}</Button><Button type="submit" form="funnel-editor" className={actions.primary} disabled={busy || conflict}>{busy ? copy.saving : copy.save}</Button></>}>
    <form id="funnel-editor" className="space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}>
      <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{copy.planHint}</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <fieldset disabled={busy || conflict} className="min-w-0 space-y-6">
          <section className="space-y-4"><h3 className="font-medium">{copy.details}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2"><span>{copy.name} *</span><Input required maxLength={180} value={draft.name} onChange={e => update('name', e.target.value)} /></label>
              <label className="space-y-1 text-sm"><span>{copy.channel}</span><select className={selectClass} value={draft.channel} onChange={e => update('channel', e.target.value as FunnelChannel)}>{funnelChannels(copy).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="space-y-1 text-sm"><span>{copy.status}</span><select className={selectClass} value={draft.status} onChange={e => update('status', e.target.value as FunnelStatus)}>{funnelStatuses(copy).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="space-y-1 text-sm"><span>{copy.objective}</span><Textarea rows={3} maxLength={1000} value={draft.objective} onChange={e => update('objective', e.target.value)} /></label>
              <label className="space-y-1 text-sm"><span>{copy.audience}</span><Textarea rows={3} maxLength={1000} value={draft.audience} onChange={e => update('audience', e.target.value)} /></label>
            </div>
            {draft.status === 'PLANNED' && <p className="text-sm text-slate-500 dark:text-slate-400">{copy.readOnlyHint}</p>}
          </section>
          <section className="space-y-3">
            <div><h3 className="font-medium">{copy.stages} <span className="text-sm font-normal text-slate-500">· {copy.stageLimit}</span></h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.stageHint}</p></div>
            {draft.stages.map((item, index) => <fieldset key={keys[index]} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <legend className="px-1 text-sm font-medium">{copy.stages} {index + 1}</legend>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 break-words text-sm font-medium">{item.name || copy.stageName}</span><div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" className="h-11 w-11 p-0" disabled={index === 0} aria-label={`${copy.moveUp}: ${index + 1}`} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" className="h-11 w-11 p-0" disabled={index === draft.stages.length - 1} aria-label={`${copy.moveDown}: ${index + 1}`} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" className="h-11 w-11 p-0" disabled={draft.stages.length <= 2} aria-label={`${copy.removeStage}: ${index + 1}`} onClick={() => { update('stages', draft.stages.filter((_, i) => i !== index)); setKeys(keys.filter((_, i) => i !== index)); }}><Trash2 className="h-4 w-4" /></Button>
              </div></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm"><span>{copy.stageName} *</span><Input required maxLength={100} value={item.name} onChange={e => stage(index, { name: e.target.value })} /></label>
                <label className="space-y-1 text-sm"><span>{copy.target}</span><Input type="number" min={0} max={10000000} step={1} value={item.target ?? ''} onChange={e => stage(index, { target: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                <label className="space-y-1 text-sm sm:col-span-2"><span>{copy.action}</span><Textarea rows={2} maxLength={1000} value={item.action} onChange={e => stage(index, { action: e.target.value })} /></label>
                <label className="space-y-1 text-sm sm:col-span-2"><span>{copy.measure}</span><Input maxLength={300} value={item.measure} onChange={e => stage(index, { measure: e.target.value })} /></label>
              </div>
            </fieldset>)}
            <Button type="button" variant="outline" disabled={draft.stages.length >= 12} className="min-h-11 gap-2" onClick={() => { update('stages', [...draft.stages, { name: '', action: '', measure: '', target: null }]); setKeys([...keys, crypto.randomUUID()]); }}><Plus className="h-4 w-4" />{copy.addStage}</Button>
          </section>
          <label className="block space-y-1 text-sm"><span>{copy.notes}</span><Textarea rows={3} maxLength={4000} value={draft.notes} onChange={e => update('notes', e.target.value)} /></label>
        </fieldset>
        <div className="min-w-0 lg:sticky lg:top-0 lg:self-start"><FunnelPreview stages={draft.stages} copy={copy} locale={locale} /></div>
      </div>
    </form>
  </SalesModalFrame>;
}
