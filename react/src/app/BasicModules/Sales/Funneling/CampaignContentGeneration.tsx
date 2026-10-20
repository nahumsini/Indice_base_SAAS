import { useEffect, useId, useRef } from 'react';
import { ArrowRight, CheckCircle2, FileText, Lightbulb, Loader2, MessageSquare, Package, Pencil, Save, Sparkles, Target, TriangleAlert, Users } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../salesModalStyles';
import { CampaignContentGuide } from './CampaignContentGuide';
import { CampaignPromptTools } from './CampaignPromptTools';
import { funnelChannels } from './FunnelEditor';
import { campaignCopy } from './campaignCopy';
import { journeyCopy } from './journeyCopy';
import { contentGenerationCopy } from './contentGenerationCopy';
import { useCampaignContent, type ContentNavigationGuard } from './useCampaignContent';
import type { FunnelCopy } from './funnelCopy';
import type { FunnelPlan } from './funnelModel';
import './contentGeneration.css';

const actions = getSalesModalActionClassNames();
export function CampaignContentGeneration({ plan, plans, total, locale, copy, guard, onSelect, onEdit, onSaved, onReload }: {
  plan: FunnelPlan; plans: FunnelPlan[]; total: number; locale: string; copy: FunnelCopy;
  guard: ContentNavigationGuard; onSelect: (id: string) => void; onEdit: () => void;
  onSaved: (plan: FunnelPlan) => void; onReload: () => void;
}) {
  const c = campaignCopy(locale), j = journeyCopy(locale), g = contentGenerationCopy(locale);
  const editor = useCampaignContent({ plan, guard, onSaved }), errorRef = useRef<HTMLParagraphElement>(null);
  const { draft } = editor;
  const responseHintId = useId(), campaignHintId = `${responseHintId}-campaign-hint`;
  const steps = [{ id: `${responseHintId}-campaign`, label: g.campaignShort }, { id: `${responseHintId}-combination`, label: g.combinationShort }, { id: `${responseHintId}-prompt`, label: g.promptShort }];
  const channels = Object.fromEntries(funnelChannels(copy));
  const context = [
    { label: copy.objective, value: draft.objective, Icon: Target },
    { label: copy.audience, value: draft.audience, Icon: Users },
    { label: draft.workshop ? g.offerLabel : copy.channel, value: draft.workshop ? draft.workshop.offer : channels[draft.channel], Icon: Package },
  ];
  const incomplete = context.some(item => !item.value?.trim());
  useEffect(() => { if (editor.error) { errorRef.current?.focus({ preventScroll: true }); errorRef.current?.scrollIntoView({ block: 'nearest' }); } }, [editor.error]);
  function jump(id: string) { const heading = document.getElementById(id); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start' }); }
  return <section aria-label={g.title} data-content-generation className="content-generation">
    <header className="content-generation-heading">
      <div className="content-generation-identity"><span className="content-generation-emblem" aria-hidden="true"><Sparkles size={25} /></span><div><h2>{g.title}</h2><p>{g.intro}</p></div></div>
      <nav className="content-generation-steps" aria-label={g.stepsLabel}>{steps.map((step, index) => <button key={step.id} type="button" onClick={() => jump(step.id)}><span aria-hidden="true">{index + 1}</span>{step.label}{index < 2 && <ArrowRight size={14} aria-hidden="true" />}</button>)}</nav>
    </header>

    <section className="content-generation-panel content-generation-campaign" aria-label={g.campaign}>
      <div className="content-generation-panel-heading"><h3 id={steps[0].id} tabIndex={-1}><span className="content-generation-step-number" aria-hidden="true">1</span>{g.campaign}</h3><span className="content-generation-context-state" data-incomplete={incomplete}>{incomplete ? <Pencil size={13} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}{incomplete ? g.contextIncomplete : g.contextReady}</span></div>
      <div className="content-generation-campaign-picker"><select aria-label={`1 · ${g.campaign}`} aria-describedby={campaignHintId} disabled={editor.busy} value={plan.id} onChange={event => { const id = event.target.value; editor.navigate(() => onSelect(id)); }}>{plans.map(value => <option value={value.id} key={value.id}>{value.name}</option>)}</select><Button variant="outline" className="content-generation-configure" disabled={editor.busy} onClick={() => editor.navigate(onEdit)}><Pencil className="h-4 w-4 shrink-0" />{j.configure}</Button></div>
      <p id={campaignHintId} className="content-generation-caption">{g.contextHint}<span>{g.availableCampaigns}: {plans.length} / {total}</span></p>
      <dl className="content-generation-context">{context.map(({ label, value, Icon }) => <div key={label} data-pending={!value?.trim()}><dt><Icon size={15} aria-hidden="true" />{label}</dt><dd>{value?.trim() || g.pending}</dd></div>)}</dl>
      {incomplete && <p className="content-generation-context-tip"><Lightbulb size={15} aria-hidden="true" />{g.contextReview}</p>}
    </section>

    {editor.error && <p ref={errorRef} role="alert" tabIndex={-1} className="content-generation-error">{editor.error === 'conflict' ? g.conflict : editor.error === 'invalid' ? g.invalidContext : copy.saveError}</p>}
    {editor.error === 'conflict' && <Button variant="outline" className="min-h-11" onClick={() => editor.navigate(onReload)}>{g.reload}</Button>}
    <fieldset disabled={editor.busy || editor.error === 'conflict'} className="content-generation-fields">
      <div className="content-generation-columns">
        <section className="content-generation-panel content-generation-combination" aria-labelledby={steps[1].id}>
          <div className="content-generation-panel-heading"><h3 id={steps[1].id} tabIndex={-1}><span className="content-generation-step-number" aria-hidden="true">2</span>{g.combination}</h3><Sparkles size={18} className="content-generation-section-icon" aria-hidden="true" /></div>
          <CampaignContentGuide compact value={draft.contentGuide} locale={locale} onChange={contentGuide => editor.update({ contentGuide })} />
        </section>
        <div className="content-generation-output">
          <section aria-label={g.prompt} className="content-generation-panel content-generation-prompt">
            <div className="content-generation-panel-heading"><h3 id={steps[2].id} tabIndex={-1}><span className="content-generation-step-number" aria-hidden="true">3</span>{g.prompt}</h3><FileText size={18} className="content-generation-section-icon" aria-hidden="true" /></div>
            <p className="content-generation-includes"><CheckCircle2 size={15} aria-hidden="true" />{g.promptIncludes}</p>
            <CampaignPromptTools presentation="workspace" plan={draft} copy={copy} c={c} locale={locale} />
          </section>
          {draft.workshop ? <label className="content-generation-panel content-generation-response"><span className="content-generation-response-title"><span><MessageSquare size={17} aria-hidden="true" />{c.response}</span><span className="content-generation-optional">{g.optional}</span></span><span id={responseHintId} className="content-generation-caption">{c.responseHint}</span><Textarea aria-label={c.response} aria-describedby={responseHintId} placeholder={g.responsePlaceholder} maxLength={20000} rows={4} value={draft.workshop.aiResponse} onChange={event => editor.update({ workshop: { ...draft.workshop!, aiResponse: event.target.value } })} /></label> : <p className="content-generation-caption">{g.responseLegacy}</p>}
        </div>
      </div>
    </fieldset>
    <footer className="content-generation-footer" data-state={editor.busy ? 'saving' : editor.error ? 'error' : editor.dirty ? 'dirty' : 'saved'}>
      <div><p role="status">{editor.busy ? <Loader2 size={16} className="content-generation-spinner" aria-hidden="true" /> : editor.error ? <TriangleAlert size={16} aria-hidden="true" /> : editor.dirty ? <span className="content-generation-dirty-dot" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}{editor.busy ? copy.saving : editor.dirty ? g.unsaved : editor.saved ? g.saved : g.noChanges}</p><span className="content-generation-footer-hint">{g.footerHint}</span></div>
      <Button className="content-generation-save" disabled={!editor.dirty || editor.busy || editor.error === 'conflict'} onClick={() => { void editor.save(); }}><Save className="h-4 w-4 shrink-0" />{editor.busy ? copy.saving : copy.save}</Button>
    </footer>
    {editor.pending && <SalesModalFrame open modalType="confirmation" title={copy.discardTitle} description={copy.discardHint} icon={<Lightbulb />} onOpenChange={open => { if (!open) editor.keepEditing(); }} footer={<><Button className={actions.secondary} onClick={editor.keepEditing}>{copy.keepEditing}</Button><Button className={actions.primary} onClick={editor.discard}>{copy.discard}</Button></>}><p className="break-words text-sm">{draft.name}</p></SalesModalFrame>}
  </section>;
}
