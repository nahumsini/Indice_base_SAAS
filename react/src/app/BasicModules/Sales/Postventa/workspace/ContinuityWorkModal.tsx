import { useEffect, useRef, useState } from 'react';
import { CalendarClock, History, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { FormField, SectionCard } from '../../Sales/components/SalesModalPrimitives';
import { postSaleWorkspaceApi as api, type ContinuityDetail, type ContinuityItem, type ContinuityWorkspace, type SaveContinuityWork } from './postSaleWorkspaceApi';
import { addCalendarDays, errorStatus, workDraft, formatContinuityDate, formatContinuityEventTime } from './continuityModel';
import { stageLabel, type ContinuityCopy } from './continuityCopy';

export function ContinuityWorkModal({ item, workspace, t, locale = 'en-CA', onClose, onSaved }: {
  item: ContinuityItem; workspace: ContinuityWorkspace; t: ContinuityCopy; locale?: string; onClose: () => void; onSaved: () => void;
}) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ContinuityDetail>({ item, history: [] });
  const [draft, setDraft] = useState(() => workDraft(item));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState(`${item.title} · ${t.nextAction}`.slice(0, 220));
  const [revision, setRevision] = useState(0);
  const pending = useRef<SaveContinuityWork | null>(null);
  const activation = useRef<{ requestKey: string; version: number; opportunityName: string } | null>(null);
  const inFlight = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    let cancelled = false; setLoading(true);
    void api.detail(item.kind, item.sourceId).then((value) => {
      if (cancelled) return;
      setDetail(value); setDraft(workDraft(value.item)); setLoaded(true); setError(''); pending.current = null; activation.current = null; setUncertain(false);
    }).catch(() => { if (!cancelled) setError(t.error); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [item.kind, item.sourceId, revision, t.error]);
  const isLost = item.kind === 'lost';
  const recovered = Boolean(detail.item.recoveredOpportunityId);
  const flow = workspace.flows.find((value) => value.id === draft.flowId) ?? workspace.flows[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(workDraft(detail.item));
  const fail = (failure: unknown) => {
    const status = errorStatus(failure);
    setError(status === 409 ? t.conflict : t.saveError);
    if (status >= 400 && status < 500) { pending.current = null; activation.current = null; setUncertain(false); }
    else setUncertain(true);
  };
  const save = async () => {
    if (!loaded || inFlight.current || activation.current) return;
    if (!draft.ownerId || (isLost && !draft.lossReason.trim()) || (draft.nextActionDate && !draft.nextAction.trim())) { setError(t.required); return; }
    pending.current ??= { ...draft, requestKey: crypto.randomUUID() };
    inFlight.current = true; setBusy(true); setError('');
    try { const value = await api.save(item.kind, item.sourceId, pending.current); setDetail(value); setDraft(workDraft(value.item)); pending.current = null; setUncertain(false); onSaved(); }
    catch (failure) { fail(failure); } finally { inFlight.current = false; setBusy(false); }
  };
  const reactivate = async () => {
    if (!loaded || inFlight.current || pending.current || !name.trim() || dirty || !workspace.canReactivate) return;
    activation.current ??= { requestKey: crypto.randomUUID(), version: detail.item.version, opportunityName: name.trim() };
    inFlight.current = true; setBusy(true); setError('');
    try { const value = await api.reactivate(item.sourceId, activation.current); setDetail(value); setDraft(workDraft(value.item)); activation.current = null; setUncertain(false); onSaved(); }
    catch (failure) { fail(failure); } finally { inFlight.current = false; setBusy(false); }
  };
  const disabled = !loaded || busy || loading || uncertain || recovered;
  const field = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <SalesModalFrame open onOpenChange={(open) => { if (!open && !busy && !uncertain) onClose(); }} busy={busy || uncertain}
    title={isLost ? t.lost : t.detail} description={isLost ? t.recoveryHint : t.detailHint} icon={<CalendarClock className="h-6 w-6" />}
    modalType="operational-workspace" closeLabel={t.close} footerSummary={`${item.reference} · ${item.clientName}`}
    footer={<><Button variant="outline" onClick={onClose} disabled={busy || uncertain}>{t.close}</Button>
      {!recovered && <Button className={getSalesModalActionClassNames('coral').primary} onClick={() => { void save(); }} disabled={!loaded || busy || loading || Boolean(activation.current)}>{busy ? t.saving : t.save}</Button>}</>}>
    <div className="space-y-5">
      <IndiceModalValidation messages={error ? [error] : []} />
      {error && <Button variant="outline" disabled={busy} onClick={() => setRevision((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />{t.reload}</Button>}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-medium text-slate-500">{item.reference}</p><h3 className="mt-1 text-lg font-medium">{item.clientName}</h3>
        <p className="text-sm text-slate-500">{item.contactName} · {item.title}</p>
      </div>
      {loading ? <p role="status">{t.loading}</p> : <fieldset disabled={disabled} className="space-y-5 disabled:opacity-70">
        <SectionCard title={isLost ? t.recoveryDate : t.activeFlow}>
          <div className="grid gap-4 md:grid-cols-2">
            {!isLost && <>
              <FormField label={t.activeFlow}><Select disabled={disabled} value={String(draft.flowId)} onValueChange={(value) => {
                const next = workspace.flows.find((candidate) => candidate.id === Number(value));
                setDraft((current) => ({ ...current, flowId: Number(value), stageKey: next?.stages[0]?.key ?? 'pending' }));
              }}><SelectTrigger aria-label={t.activeFlow}><SelectValue /></SelectTrigger><SelectContent>{workspace.flows.filter((value) => !value.archived).map((value) => <SelectItem key={value.id} value={String(value.id)}>{value.id === 0 ? t.defaultFlow : value.name}</SelectItem>)}</SelectContent></Select></FormField>
              <FormField label={t.stage}><Select disabled={disabled} value={draft.stageKey} onValueChange={(value) => field('stageKey', value)}><SelectTrigger aria-label={t.stage}><SelectValue /></SelectTrigger><SelectContent>{flow?.stages.map((stage) => <SelectItem key={stage.key} value={stage.key}>{stageLabel(stage.key, stage.label, flow.id === 0, t)}</SelectItem>)}</SelectContent></Select></FormField>
            </>}
            <FormField label={`${t.owner} *`}><Select disabled={disabled} value={draft.ownerId ? String(draft.ownerId) : 'none'} onValueChange={(value) => field('ownerId', Number(value))}><SelectTrigger aria-label={t.owner}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none" disabled>{t.noOwner}</SelectItem>{workspace.owners.map((owner) => <SelectItem key={owner.id} value={String(owner.id)}>{owner.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label={isLost ? t.recoveryDate : t.actionDate}><Input aria-label={isLost ? t.recoveryDate : t.actionDate} type="date" value={draft.nextActionDate ?? ''} onChange={(event) => field('nextActionDate', event.target.value || null)} /></FormField>
          </div>
          {isLost && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-sm text-slate-500">{t.intervals}</span>{[7, 15, 30, 60, 90].map((days) => <Button key={days} type="button" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, nextActionDate: addCalendarDays(workspace.today, days), nextAction: current.nextAction || t.recoveryDate, paused: false }))}>{days} {t.days}</Button>)}</div>}
          <p className="mt-3 text-xs text-slate-500">{t.dates}: {workspace.timezone}</p>
        </SectionCard>
        <div className="grid gap-4">
          {isLost && <FormField label={`${t.lossReason} *`}><Textarea aria-label={t.lossReason} maxLength={500} value={draft.lossReason} onChange={(event) => field('lossReason', event.target.value)} /></FormField>}
          <FormField label={`${t.nextAction}${draft.nextActionDate ? ' *' : ''}`}><Input aria-label={t.nextAction} maxLength={240} value={draft.nextAction} onChange={(event) => field('nextAction', event.target.value)} /></FormField>
          <FormField label={t.notes}><Textarea aria-label={t.notes} maxLength={8000} rows={4} value={draft.notes} onChange={(event) => field('notes', event.target.value)} /></FormField>
          {isLost && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.paused} onChange={(event) => field('paused', event.target.checked)} />{t.pause}</label>}
        </div>
      </fieldset>}
      {isLost && <SectionCard title={recovered ? t.reactivated : t.reactivate} description={t.reactivateHint}>
        {recovered ? <Button onClick={() => navigate(`/sales/leads?opportunity=${detail.item.recoveredOpportunityId}`)}>{t.openOpportunity}</Button> : <>
          <FormField label={t.opportunityName}><Input aria-label={t.opportunityName} disabled={busy || uncertain} maxLength={220} value={name} onChange={(event) => setName(event.target.value)} /></FormField>
          <Button className="mt-3" variant="outline" disabled={!loaded || busy || loading || !detail.item.workId || dirty || !workspace.canReactivate || !name.trim() || Boolean(pending.current)} onClick={() => { void reactivate(); }}>{t.reactivate}</Button>
          {(!detail.item.workId || dirty) && <p className="mt-2 text-xs text-slate-500">{t.recoveryReady}</p>}
          {!workspace.canReactivate && <p className="mt-2 text-xs text-slate-500">{t.permission}</p>}
        </>}
      </SectionCard>}
      <SectionCard title={t.events} description={t.historyLimit}>
        {!detail.history.length ? <p className="text-sm text-slate-500">{t.noEvents}</p> : <ol className="space-y-3">{detail.history.map((event) => {
          let notes = ''; let summary = ''; try { const value = JSON.parse(event.detail); notes = String(value.notes || value.opportunityName || ''); const eventFlow = workspace.flows.find((candidate) => candidate.id === Number(value.flowId)); const eventStage = eventFlow?.stages.find((stage) => stage.key === value.stageKey); summary = [!isLost && eventStage ? stageLabel(eventStage.key, eventStage.label, eventFlow?.id === 0, t) : '', value.nextAction, value.nextActionDate ? formatContinuityDate(value.nextActionDate, locale) : ''].filter(Boolean).join(' · '); } catch { /* Invalid legacy detail stays hidden. */ }
          return <li key={event.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800"><History className="mt-1 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-sm font-medium">{event.type === 'reactivated' ? t.reactivated : t.updated} · {event.actor}</p><time className="text-xs text-slate-500">{formatContinuityEventTime(event.createdAt, locale, workspace.timezone)}</time>{summary && <p className="mt-1 text-sm text-slate-500">{summary}</p>}{notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{notes}</p>}</div></li>;
        })}</ol>}
      </SectionCard>
    </div>
  </SalesModalFrame>;
}
