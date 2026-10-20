import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Filter, Lightbulb, Settings2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { ApiClientError } from '../../../lib/apiClient';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../salesModalStyles';
import { funnelApi } from './funnelApi';
import { moveStage, validateFunnel, firstInvalidFunnelTarget, type FunnelInput, type FunnelStage } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import { campaignCopy } from './campaignCopy';
import { campaignRecommendations, type CampaignBrief } from './campaignModel';
import { journeyCopy } from './journeyCopy';
import { changeCampaignGoal, editJourneyStage, normalizeJourneyDraft, suggestJourney, type CampaignPanel } from './journeyModel';
import { CampaignFunnelDiagram } from './CampaignFunnelDiagram';
import { CampaignStageEditor } from './CampaignStageEditor';
import { CampaignContextEditor } from './CampaignContextEditor';
import { CampaignPromptTools } from './CampaignPromptTools';

import { CampaignContentGuide } from './CampaignContentGuide';

const actions = getSalesModalActionClassNames();
// Standard Form capture, then one Operational Workspace with a shared draft and visual journey.
export function CampaignWorkshopModal({ id, initial, copy, locale, initialPanel = 'stage', initialStage = 0, onClose, onSaved }: {
  id: string; initial: FunnelInput; copy: FunnelCopy; locale: string; initialPanel?: CampaignPanel; initialStage?: number; onClose: () => void; onSaved: () => void;
}) {
  const c = campaignCopy(locale), j = journeyCopy(locale);
  const [draft, setDraft] = useState(() => normalizeJourneyDraft(initial));
  const baseline = useRef(JSON.stringify(normalizeJourneyDraft(initial)));
  const [guided, setGuided] = useState(initial.version > 0 || !initial.workshop);
  const [panel, setPanel] = useState<CampaignPanel>(initialPanel);
  const [selected, setSelected] = useState(Math.max(0, initialStage));
  const [stageRevision, setStageRevision] = useState(0);
  const [proposal, setProposal] = useState<FunnelStage[] | null>(null);
  const [busy, setBusy] = useState(false); const saving = useRef(false);
  const [discard, setDiscard] = useState(false); const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(''); const [conflict, setConflict] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const connectPanel = useCallback((node: HTMLDivElement | null) => { panelRef.current = node; setPanelMounted(Boolean(node)); }, []);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [errorRevision, setErrorRevision] = useState(0);
  const [panelRevision, setPanelRevision] = useState(0);
  const [revealStage, setRevealStage] = useState<number | null>(null);
  const dirty = baseline.current !== JSON.stringify(draft);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const suggested = suggestJourney(draft, j);
  const stages = draft.stages.length ? draft.stages : suggested;
  const index = Math.min(selected, stages.length - 1);
  const stage = stages[index];
  useEffect(() => {
    if (!guided || !panelMounted || !window.matchMedia('(max-width: 1023px)').matches) return;
    // Wait for the portal's focus setup; opening a panel must not summon the phone keyboard.
    const frame = window.requestAnimationFrame(() => {
      const target = errorRef.current ?? panelRef.current;
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: errorRef.current ? 'nearest' : 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guided, panelMounted, panel, index, panelRevision, discard, removing]);
  useEffect(() => {
    if (!errorRevision || !errorRef.current) return;
    errorRef.current.focus({ preventScroll: true });
    errorRef.current.scrollIntoView({ block: 'nearest' });
  }, [errorRevision]);
  const showError = (message: string) => { setError(message); setErrorRevision(value => value + 1); };
  const update = (value: Partial<FunnelInput>) => { setDraft(d => ({ ...d, ...value })); setError(''); };
  const patch = (value: Partial<CampaignBrief>) => {
    if (!draft.workshop) return;
    const next = { ...draft, workshop: { ...draft.workshop, ...value } };
    update({ workshop: next.workshop });
    if (draft.stages.length && (value.channels || value.destination)) setProposal(suggestJourney(next, j));
  };
  const selectGoal = (goal: CampaignBrief['goal']) => {
    const next = changeCampaignGoal(draft, goal, c); setDraft(next); setError('');
    if (draft.stages.length && goal !== draft.workshop?.goal) setProposal(suggestJourney(next, j));
  };
  const close = () => { if (saving.current) return; if (dirty) setDiscard(true); else onClose(); };
  const suggestions = campaignRecommendations(draft).filter(s => panel === 'campaign' || (s.id === 'searchPage' && index === 0) || (s.id === 'messageOwner' && index > 0)).slice(0, 3);
  function replaceStages(next: FunnelStage[]) { update({ stages: next.map(s => ({ ...s, content: s.content ?? '' })) }); setSelected(0); setStageRevision(value => value + 1); setProposal(null); }
  async function save() {
    if (saving.current || conflict) return;
    const invalid = validateFunnel(draft);
    if (invalid) {
      showError(!draft.name.trim() && draft.workshop ? c.ideaRequired : invalid === 'ideaRequired' || invalid === 'briefIncomplete' ? c[invalid] : copy[invalid]);
      const stageIndex = invalid === 'targets' ? firstInvalidFunnelTarget(draft.stages)
        : invalid === 'required' && draft.name.trim() ? draft.stages.findIndex(s => !s.name.trim())
        : invalid === 'incomplete' && draft.objective.trim() && draft.audience.trim() ? draft.stages.findIndex(s => !s.action.trim() || !s.measure.trim()) : -1;
      if (stageIndex >= 0) { setSelected(stageIndex); setRevealStage(stageIndex); setPanel('stage'); }
      else setPanel('campaign');
      return;
    }
    saving.current = true; setBusy(true); setError('');
    try { await funnelApi.save(id, draft); onSaved(); }
    catch (failure) {
      if (failure instanceof ApiClientError && failure.status === 409) { setConflict(true); showError(copy.conflict); }
      else showError(copy.saveError);
    } finally { saving.current = false; setBusy(false); }
  }
  const alert = error && <p ref={errorRef} tabIndex={-1} role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>;
  if (discard || removing) return <SalesModalFrame open modalType="confirmation" title={discard ? copy.discardTitle : j.remove} description={discard ? copy.discardHint : j.removeHint} icon={<Lightbulb />} closeLabel={copy.close} onOpenChange={() => { setDiscard(false); setRemoving(false); }}
    footer={<><Button className={actions.secondary} onClick={() => { setDiscard(false); setRemoving(false); }}>{copy.keepEditing}</Button><Button className={actions.primary} onClick={() => {
      if (discard) onClose(); else { update({ stages: stages.filter((_, i) => i !== index) }); setSelected(Math.max(0, index - 1)); setRemoving(false); }
    }}>{discard ? copy.discard : copy.removeStage}</Button></>}><p className="break-words text-sm">{discard ? draft.name : stage.name}</p></SalesModalFrame>;
  return <SalesModalFrame open contentClassName="group/funneling-workspace data-[dialog-compact-viewport=true]:!overflow-hidden" bodyClassName="group-data-[dialog-compact-viewport=true]/funneling-workspace:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/funneling-workspace:!overflow-y-auto" modalType={guided ? 'operational-workspace' : 'standard-form'} busy={busy} title={guided ? j.configure : j.create} description={guided ? draft.name : c.ideaHint} icon={<Filter />} closeLabel={copy.close} onOpenChange={close}
    footerSummary={<span className="text-sm">{c.planningOnly}</span>}
    footer={<><Button className={actions.secondary} disabled={busy} onClick={close}>{copy.cancel}</Button><Button className={actions.primary} type="submit" form="campaign-workshop" disabled={busy || conflict}>{busy ? copy.saving : copy.save}</Button></>}>
    <form className="text-slate-900 dark:text-slate-100" id="campaign-workshop" onSubmit={event => { event.preventDefault(); void save(); }}>
      {!guided && alert}
      <fieldset disabled={busy || conflict} className="min-w-0 space-y-5">
        {!guided ? <div className="space-y-5">
          <label className="block space-y-2 text-sm"><span>{j.name} *</span><Input required maxLength={180} value={draft.name} onChange={e => update({ name: e.target.value })} /></label>
          <label className="block space-y-2 text-sm"><span>{c.idea} *</span><Textarea required rows={5} maxLength={4000} value={draft.workshop!.idea} onChange={e => patch({ idea: e.target.value })} /></label>
          <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => { if (!draft.name.trim() || !draft.workshop?.idea.trim()) { showError(c.ideaRequired); return; } setGuided(true); setPanel('campaign'); }}><Filter className="h-4 w-4" />{j.configure}</Button>
        </div> : <>
          {proposal && <section aria-label={j.proposal} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <h3 className="text-sm font-medium">{j.proposal}</h3><p className="text-sm">{j.proposalHint}</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="font-medium">{j.current}</p><ol className="list-inside list-decimal">{stages.map((s, i) => <li className="break-words" key={i}>{s.name}{s.content ? ` · ${s.content}` : ''}{s.target !== null ? ` · ${copy.target}: ${s.target}` : ''}</li>)}</ol></div><div><p className="font-medium">{j.proposed}</p><ol className="list-inside list-decimal">{proposal.map((s, i) => <li className="break-words" key={i}>{s.name} · {s.content}</li>)}</ol></div></div>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => setProposal(null)}>{j.keep}</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => replaceStages(proposal)}>{j.apply}</Button></div>
          </section>}
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)]">
            <div className="min-w-0 space-y-4 self-start lg:sticky lg:top-0">
              <CampaignFunnelDiagram stages={stages} selected={index} onSelect={value => { setSelected(value); setPanel('stage'); setPanelRevision(v => v + 1); }} copy={copy} j={j} locale={locale} suggested={!draft.stages.length} suggestedLabel={c.suggested} />
              {!draft.stages.length && <><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{j.suggestedHint}</p><Button type="button" variant="outline" className="min-h-11" onClick={() => replaceStages(suggested)}>{j.usePath}</Button></>}
              {draft.workshop && !!draft.stages.length && <Button type="button" variant="ghost" className="min-h-11" onClick={() => setProposal(suggested)}>{j.suggest}</Button>}
            </div>
            <div className="min-w-0 space-y-5">
              <IndiceWorkspaceNavigation variant="views" tone="coral" ariaLabel={j.configure} value={panel} onValueChange={value => { setPanel(value as CampaignPanel); setPanelRevision(v => v + 1); }} items={[{ id: 'stage', label: j.stage, icon: <Filter /> }, { id: 'campaign', label: j.campaign, icon: <Settings2 /> }, { id: 'prompt', label: c.prepareAi, icon: <FileText /> }]} />
              <div ref={connectPanel} tabIndex={-1} className="min-w-0 scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                {alert}
                {panel === 'stage' ? <CampaignStageEditor key={`${stageRevision}:${index}`} stage={stage} index={index} count={stages.length} copy={copy} j={j} revealDetails={revealStage === index}
                  onChange={value => { setDraft(d => editJourneyStage(d, index, value, suggestJourney(d, j))); setError(''); }}
                  onMove={direction => { update({ stages: moveStage(stages, index, direction) }); setSelected(index + direction); }}
                  onAdd={() => { update({ stages: [...stages, { name: `${j.stage} ${stages.length + 1}`, action: '', measure: '', content: '', target: null }] }); setSelected(stages.length); }} onRemove={() => setRemoving(true)} />
                  : panel === 'campaign' ? <CampaignContextEditor draft={draft} copy={copy} c={c} j={j} update={update} patch={patch} onGoal={selectGoal} />
                    : <div className="space-y-5"><p className="text-xs text-slate-500 dark:text-slate-400">{j.promptLive}</p><CampaignContentGuide value={draft.contentGuide} locale={locale} onChange={contentGuide => update({ contentGuide })} /><CampaignPromptTools plan={draft} copy={copy} c={c} locale={locale} />{draft.workshop && <label className="block space-y-2 text-sm"><span>{c.response}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{c.responseHint}</span><Textarea rows={6} maxLength={20000} value={draft.workshop.aiResponse} onChange={e => patch({ aiResponse: e.target.value })} /></label>}</div>}
              </div>
              {panel !== 'prompt' && (suggestions.length > 0 || !stage.content) && <aside aria-label={c.recommendations} className="space-y-3 rounded-xl bg-slate-100 p-4 dark:bg-slate-800"><h3 className="text-sm font-medium">{c.recommendations}</h3>
                {panel === 'stage' && !stage.content && <p className="text-sm">{j.contentMissing}</p>}
                {suggestions.map(s => <div key={s.id} className="space-y-2"><p className="text-sm">{c[`rec_${s.id}`]}</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => { if (s.id === 'path') replaceStages(suggested); else setPanel('campaign'); }}>{s.id === 'path' ? j.usePath : copy.edit}</Button><Button type="button" variant="ghost" className="min-h-11" onClick={() => patch({ deferredRecommendations: [...draft.workshop!.deferredRecommendations, s.id] })}>{c.later}</Button></div></div>)}
              </aside>}
              {panel === 'campaign' && !!draft.workshop?.deferredRecommendations.length && <Button type="button" variant="ghost" className="min-h-11 h-auto whitespace-normal" onClick={() => patch({ deferredRecommendations: [] })}>{c.restore}</Button>}
            </div>
          </div>
        </>}
      </fieldset>
    </form>
  </SalesModalFrame>;
}
