import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Maximize2, Minimize2, Monitor, RefreshCw, Smartphone } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import { IndiceModalSummary, IndiceModalWizardStepper } from '../../../components/indice-modal';
import { schedulingApi, type BookingPage, type BookingPageInput, type PageAppearance, type Staff, type SchedulingReadiness, type Service, type BookingCatalog } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { useLanguage } from '../../../shared/context';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { getAgendaExperienceCopy } from '../translations/agendaExperienceCopy';
import { getPublicAgendaManagerCopy } from '../translations/publicAgendaManagerCopy';
import { getPublicAgendaCompactCopy } from '../translations/publicAgendaCompactCopy';
import type { AgendaConfigurationSection } from './AgendaConfigurationModal';
import { getPublicAgendaEditorCopy } from '../translations/publicAgendaEditorCopy';
import { controlClass, EditorFrame, Field } from './SchedulingPrimitives';
import { defaultAppearance, validPublicAppearance, validPublicContent } from '../utils/publicAppearance';
import { SchedulingValidationError } from '../utils/setupValidation';
import { PublicAgendaDesign } from './PublicAgendaDesign';
import { PublicAgendaPreview } from './PublicAgendaPreview';
import { PublicAgendaLinks } from './PublicAgendaLinks';
import { schedulingEmoji } from '../utils/schedulingIdentity';

export type PageEditorSnapshot = { draft: { title: string; description: string; alias: string; published: boolean }; appearance: PageAppearance; step: number; savedPage: BookingPage | null; baseline: string };

export function PageEditor({ page, staff = [], copy, onClose, onSaved, publicAccessEnabled = true, readiness, services, initialSnapshot, onConfigure, onRefresh, checking = false, checkError = false, managed = false, onPersist }: {
  page: BookingPage | null; staff?: Staff[]; copy: SchedulingCopy; onClose: () => void; onSaved: () => void;
  publicAccessEnabled?: boolean; readiness?: SchedulingReadiness; services?: Service[];
  managed?: boolean; onPersist?: (body: BookingPageInput) => Promise<BookingPage>;
  initialSnapshot?: PageEditorSnapshot; checking?: boolean; checkError?: boolean;
  onConfigure?: (section: AgendaConfigurationSection, snapshot: PageEditorSnapshot) => void; onRefresh?: () => void;
}) {
  const { currentLanguage } = useLanguage(), locale = currentLanguage.code;
  const setup = getSchedulingSetupCopy(locale), text = getPublicAgendaEditorCopy(locale), experience = getAgendaExperienceCopy(locale), compact = getPublicAgendaCompactCopy(locale);
  const manager = getPublicAgendaManagerCopy(locale);
  const companyName = readiness?.companyName || page?.appearance?.brandName || copy.title;
  const [step,setStep] = useState(initialSnapshot?.step ?? 0), [mobile,setMobile] = useState(false);
  const [expandedPreview,setExpandedPreview] = useState(false), [linksOpen,setLinksOpen] = useState(false);
  const [savedPage,setSavedPage] = useState(initialSnapshot ? initialSnapshot.savedPage : page), [saved,setSaved] = useState(false);
  const [draft,setDraft] = useState(initialSnapshot?.draft ?? { title:page?.title || (managed ? '' : `${setup.companyAgenda} · ${companyName}`.slice(0,180)),description:page?.description || '',alias:page?.alias || readiness?.suggestedAlias || '',published:page?.published ?? false });
  const [appearance,setAppearance] = useState<PageAppearance>(initialSnapshot?.appearance ?? { ...defaultAppearance,...page?.appearance,brandName:page?.appearance?.brandName ?? companyName.slice(0,120) });
  const baseline = useRef(initialSnapshot?.baseline ?? JSON.stringify({ draft,appearance })), heading = useRef<HTMLHeadingElement>(null);
  const changed = JSON.stringify({ draft,appearance }) !== baseline.current, ready = readiness?.bookingReady ?? true;
  const steps = [text.content,text.design,text.publish].map((label,index) => ({id:String(index),label}));
  const hints = [text.contentHint,text.designHint,text.publishHint];
  const updateDraft = (patch: Partial<typeof draft>) => { setSaved(false); setDraft(value => ({ ...value,...patch })); };
  const updateAppearance = (value: PageAppearance) => { setSaved(false); setAppearance(value); };
  const validation = () => {
    if (checking) return copy.loading;
    if (step === 2 && draft.published && checkError) return experience.recheckError;
    if (step !== 1 && !validPublicContent(draft,appearance)) return text.contentInvalid;
    if (step !== 0 && !validPublicAppearance(appearance)) return text.designInvalid;
    if (step === 2 && draft.published && !ready) return setup.setupRequired;
    if (step === 2 && draft.published && !publicAccessEnabled && !savedPage?.published) return copy.publicDisabled;
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(draft.alias)) return copy.error;
  };
  useEffect(() => { heading.current?.focus(); },[step]);
  const configure = (section: AgendaConfigurationSection) => onConfigure?.(section,{ draft,appearance,step,savedPage,baseline:baseline.current });
  const previewCatalog: BookingCatalog | undefined = services ? {title:draft.title,description:draft.description,appearance,services:services.filter(item => item.active).map(({id,name,description,durationMinutes,noticeHours,chargePolicy}) => ({id,name,description,durationMinutes,noticeHours,chargePolicy})),staff:staff.filter(item => item.active).map(({id,publicName,timezone,serviceIds}) => ({id,publicName,timezone,serviceIds})),events:[]} : undefined;
  const preview = <PublicAgendaPreview catalog={previewCatalog} {...draft} appearance={appearance} copy={copy} locale={locale} mobile={mobile} condensed={step === 1 || !expandedPreview}/>;
  return <EditorFrame icon={schedulingEmoji.publicAgenda} title={managed ? page ? manager.editTitle : manager.createTitle : copy.publicAgenda} description={managed && step === 0 && !page ? manager.createHint : hints[step]} modalType="wizard" copy={saved && !changed ? {...copy,cancel:copy.close} : copy}
    hasChanges={changed} trackChanges={false} onClose={onClose} footerLayout="split" footerSummary={saved && !changed ? compact.saved : !savedPage || changed ? compact.unsaved : savedPage.published ? copy.published : text.draft}
    discardDescription={text.discardDescription} discardLabel={text.discard} saveLabel={saved && !changed ? compact.saved : draft.published ? text.savePublished : text.saveDraft}
    validate={validation} navigation={{disabled:checking || (step === 2 && saved && !changed),stepLabel:`${step+1} / 3 · ${steps[step].label}`,backLabel:copy.back,continueLabel:copy.next,
      onBack:step > 0 ? () => setStep(value => value-1) : undefined,onContinue:step < 2 ? () => setStep(value => value+1) : undefined,
      progress:<IndiceModalWizardStepper accent="coral" density="compact" activeStepId={String(step)} progressLabel={copy.publicAgenda} steps={steps}/>}}
    onSaved={() => { setSaved(true); setLinksOpen(true); onSaved(); }} onSave={async () => {
      if (step !== 2 || validation()) throw new SchedulingValidationError('scheduling_setup_required');
      const result = await (onPersist ?? schedulingApi.savePage)({ ...draft,appearance,version:savedPage?.version });
      const nextDraft = { title:result.title,description:result.description,alias:result.alias,published:result.published };
      const nextAppearance = { ...defaultAppearance,...(result.appearance ?? appearance) };
      baseline.current = JSON.stringify({ draft:nextDraft,appearance:nextAppearance });
      setSavedPage(result); setDraft(nextDraft); setAppearance(nextAppearance);
    }}>
    <h2 ref={heading} tabIndex={-1} className="sr-only">{steps[step].label}</h2>
    {step === 0 && <div className="space-y-5">
      {!managed && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.brandName}: <span className="font-medium text-slate-700 dark:text-slate-200">{companyName}</span></p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text.publicName}><input className={controlClass} maxLength={120} value={appearance.brandName} onChange={event => updateAppearance({ ...appearance,brandName:event.target.value })}/></Field>
        <Field label={`${managed ? manager.agendaName : copy.pageTitle} *`}><input className={controlClass} placeholder={managed ? manager.agendaNameHint : undefined} required maxLength={180} value={draft.title} onChange={event => updateDraft({ title:event.target.value })}/></Field>
      </div>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.identityHint}</p>
      {managed && <Field label={manager.bookingLink}><input readOnly className={`${controlClass} text-xs`} value={new URL(`/book/${draft.alias}`,window.location.origin).href}/></Field>}
      <Field label={copy.description}><textarea className={`${controlClass} min-h-28 py-3`} maxLength={1500} value={draft.description} onChange={event => updateDraft({ description:event.target.value })}/></Field>
      <Field label={copy.buttonLabel}><input className={controlClass} maxLength={80} placeholder={copy.send} value={appearance.buttonLabel} onChange={event => updateAppearance({ ...appearance,buttonLabel:event.target.value })}/></Field><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.buttonHint}</p>
    </div>}
    {step === 1 && <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <PublicAgendaDesign appearance={appearance} onChange={updateAppearance} copy={copy} locale={locale}/>
      <aside className="min-w-0 space-y-3 lg:sticky lg:top-0 lg:self-start"><h3 className="text-sm font-medium">{copy.preview}</h3>{preview}</aside>
    </div>}
    {step === 2 && <div className="space-y-4" data-agenda-review>
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
          <span className="min-w-0"><span className="block text-sm font-medium">{compact.publishPage}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{draft.published ? setup.publicationHint : setup.draftHint}</span></span>
          <Switch aria-label={compact.publishPage} className="h-6 w-11 data-[state=checked]:bg-[#FF6B5E] [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-5" checked={draft.published} disabled={!draft.published && (!ready || !publicAccessEnabled)} onCheckedChange={published => updateDraft({published})}/>
        </label>
      </section>
      {(!publicAccessEnabled || !ready || checkError) && <div role="alert" className="space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        {!publicAccessEnabled && <p>{experience.serverDisabled}</p>}{!ready && <p>{setup.setupRequired}</p>}{checkError && <p>{experience.recheckError}</p>}
      </div>}
      <details className="group/setup rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" open={!ready || !publicAccessEnabled || checkError || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2"><CheckCircle2 aria-hidden className={`h-4 w-4 shrink-0 ${ready && publicAccessEnabled && !checkError ? 'text-emerald-600' : 'text-amber-600'}`}/>{compact.settings}</span><ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open/setup:rotate-180"/>
        </summary>
        <div className="space-y-3 border-t border-slate-100 py-3 dark:border-slate-800">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{ready && publicAccessEnabled ? experience.configured : experience.needsSetup}</p>
          <div className="flex flex-wrap items-center gap-2">
            {onConfigure && <><button type="button" disabled={checking} onClick={() => configure('services')} className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-medium dark:border-slate-600">🗂️ {experience.configureServices}</button><button type="button" disabled={checking} onClick={() => configure('team')} className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-medium dark:border-slate-600">👥 {experience.configureTeam}</button></>}
            {onRefresh && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium dark:border-slate-600" disabled={checking} onClick={onRefresh}><RefreshCw aria-hidden className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`}/>{checking ? copy.loading : experience.refresh}</button>}
          </div>
        </div>
      </details>
      {!managed && <details className="group/links border-t border-slate-200 dark:border-slate-700" open={linksOpen} onToggle={event => setLinksOpen(event.currentTarget.open)}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium [&::-webkit-details-marker]:hidden">{compact.sharing}<ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open/links:rotate-180"/></summary>
        <PublicAgendaLinks compact title={text.savedLinks} page={savedPage} staff={staff} copy={copy} publicAccessEnabled={publicAccessEnabled}/>{!savedPage && <p className="pb-3 text-xs text-slate-500 dark:text-slate-400">{setup.saveFirst}</p>}
      </details>}
      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{copy.preview}</h3>
          <div className="flex items-center gap-1">
            {[false,true].map(value => <button key={String(value)} type="button" aria-label={value ? text.mobile : text.desktop} title={value ? text.mobile : text.desktop} aria-pressed={mobile === value} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-transparent px-3 text-xs text-slate-500 aria-pressed:border-slate-200 aria-pressed:bg-white aria-pressed:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#FF6B5E] dark:aria-pressed:border-slate-600 dark:aria-pressed:bg-slate-800 dark:aria-pressed:text-white" onClick={() => setMobile(value)}>{value ? <Smartphone aria-hidden className="h-4 w-4"/> : <Monitor aria-hidden className="h-4 w-4"/>}<span className="sr-only">{value ? text.mobile : text.desktop}</span></button>)}
            <button type="button" aria-label={expandedPreview ? compact.collapsePreview : compact.expandPreview} title={expandedPreview ? compact.collapsePreview : compact.expandPreview} aria-expanded={expandedPreview} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-slate-500 focus-visible:outline-2 focus-visible:outline-[#FF6B5E]" onClick={() => setExpandedPreview(value => !value)}>{expandedPreview ? <Minimize2 aria-hidden className="h-4 w-4"/> : <Maximize2 aria-hidden className="h-4 w-4"/>}</button>
          </div>
        </div>
        {preview}
      </section>
      <details className="group/details border-t border-slate-200 dark:border-slate-700">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium [&::-webkit-details-marker]:hidden">{compact.pageDetails}<ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open/details:rotate-180"/></summary>
        <IndiceModalSummary columns={2} className="mb-3 [&_dd]:whitespace-normal [&_dd]:break-words" items={[{label:copy.pageTitle,value:draft.title},{label:copy.publicLayout,value:experience[appearance.layout]},{label:copy.buttonLabel,value:appearance.buttonLabel.trim() || copy.send},{label:setup.publication,value:draft.published ? copy.published : text.draft}]}/>
      </details>

    </div>}
  </EditorFrame>;
}
