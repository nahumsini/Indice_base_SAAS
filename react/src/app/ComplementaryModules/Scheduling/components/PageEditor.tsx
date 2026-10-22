import { useEffect, useRef, useState } from 'react';
import { FileText, Palette, Send } from 'lucide-react';
import { IndiceModalSummary, IndiceModalWizardStepper } from '../../../components/indice-modal';
import { schedulingApi, type BookingPage, type PageAppearance, type Staff, type SchedulingReadiness } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { useLanguage } from '../../../shared/context';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { getPublicAgendaEditorCopy } from '../translations/publicAgendaEditorCopy';
import { controlClass, EditorFrame, Feedback, Field } from './SchedulingPrimitives';
import { defaultAppearance, validPublicAppearance, validPublicContent } from '../utils/publicAppearance';
import { SchedulingValidationError } from '../utils/setupValidation';
import { PublicAgendaDesign } from './PublicAgendaDesign';
import { PublicAgendaPreview } from './PublicAgendaPreview';
import { PublicAgendaLinks } from './PublicAgendaLinks';
import { schedulingEmoji } from '../utils/schedulingIdentity';

export function PageEditor({ page, staff = [], copy, onClose, onSaved, publicAccessEnabled = true, readiness }: {
  page: BookingPage | null; staff?: Staff[]; copy: SchedulingCopy; onClose: () => void; onSaved: () => void;
  publicAccessEnabled?: boolean; readiness?: SchedulingReadiness;
}) {
  const { currentLanguage } = useLanguage(), locale = currentLanguage.code;
  const setup = getSchedulingSetupCopy(locale), text = getPublicAgendaEditorCopy(locale);
  const companyName = readiness?.companyName || page?.appearance?.brandName || copy.title;
  const [step,setStep] = useState(0), [mobile,setMobile] = useState(false);
  const [savedPage,setSavedPage] = useState(page), [saved,setSaved] = useState(false);
  const [draft,setDraft] = useState({ title:page?.title || `${setup.companyAgenda} · ${companyName}`.slice(0,180),description:page?.description || '',alias:page?.alias || readiness?.suggestedAlias || '',published:page?.published ?? false });
  const [appearance,setAppearance] = useState<PageAppearance>({ ...defaultAppearance,...page?.appearance,brandName:page?.appearance?.brandName ?? companyName.slice(0,120) });
  const baseline = useRef(JSON.stringify({ draft,appearance })), heading = useRef<HTMLHeadingElement>(null);
  const changed = JSON.stringify({ draft,appearance }) !== baseline.current, ready = readiness?.bookingReady ?? true;
  const steps = [text.content,text.design,text.publish].map((label,index) => ({id:String(index),label}));
  const hints = [text.contentHint,text.designHint,text.publishHint];
  const updateDraft = (patch: Partial<typeof draft>) => { setSaved(false); setDraft(value => ({ ...value,...patch })); };
  const updateAppearance = (value: PageAppearance) => { setSaved(false); setAppearance(value); };
  const validation = () => {
    if (step !== 1 && !validPublicContent(draft,appearance)) return text.contentInvalid;
    if (step !== 0 && !validPublicAppearance(appearance)) return text.designInvalid;
    if (step === 2 && draft.published && !ready) return setup.setupRequired;
    if (step === 2 && draft.published && !publicAccessEnabled && !savedPage?.published) return copy.publicDisabled;
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(draft.alias)) return copy.error;
  };
  useEffect(() => { heading.current?.focus(); },[step]);
  const preview = <PublicAgendaPreview {...draft} appearance={appearance} copy={copy} locale={locale} mobile={mobile}/>;
  return <EditorFrame icon={schedulingEmoji.publicAgenda} title={copy.publicAgenda} description={hints[step]} modalType="wizard" copy={copy}
    hasChanges={changed} trackChanges={false} onClose={onClose} footerLayout="split" footerSummary={!savedPage || changed ? text.unsaved : savedPage.published ? copy.published : text.draft}
    discardDescription={text.discardDescription} discardLabel={text.discard} saveLabel={draft.published ? text.savePublished : text.saveDraft}
    validate={validation} navigation={{stepLabel:`${step+1} / 3 · ${steps[step].label}`,backLabel:copy.back,continueLabel:copy.next,
      onBack:step > 0 ? () => setStep(value => value-1) : undefined,onContinue:step < 2 ? () => setStep(value => value+1) : undefined,
      progress:<IndiceModalWizardStepper accent="coral" density="compact" activeStepId={String(step)} progressLabel={copy.publicAgenda} steps={steps}/>}}
    onSaved={() => { setSaved(true); onSaved(); }} onSave={async () => {
      if (step !== 2 || validation()) throw new SchedulingValidationError('scheduling_setup_required');
      const result = await schedulingApi.savePage({ ...draft,appearance,version:savedPage?.version });
      const nextDraft = { title:result.title,description:result.description,alias:result.alias,published:result.published };
      const nextAppearance = { ...defaultAppearance,...(result.appearance ?? appearance) };
      baseline.current = JSON.stringify({ draft:nextDraft,appearance:nextAppearance });
      setSavedPage(result); setDraft(nextDraft); setAppearance(nextAppearance);
    }}>
    {saved && <Feedback>{setup.saved}</Feedback>}
    <div className="flex items-start gap-3"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FF9C92]">{step === 0 ? <FileText className="h-5 w-5"/> : step === 1 ? <Palette className="h-5 w-5"/> : <Send className="h-5 w-5"/>}</span><div className="min-w-0"><h2 ref={heading} tabIndex={-1} className="text-base font-medium outline-none">{steps[step].label}</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{hints[step]}</p></div></div>
    {step === 0 && <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">{copy.brandName}</p><p className="mt-1 break-words text-sm font-medium">{companyName}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.identityHint}</p></section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={text.publicName}><input className={controlClass} maxLength={120} value={appearance.brandName} onChange={event => updateAppearance({ ...appearance,brandName:event.target.value })}/></Field>
        <Field label={`${copy.pageTitle} *`}><input className={controlClass} required maxLength={180} value={draft.title} onChange={event => updateDraft({ title:event.target.value })}/></Field>
      </div>
      <Field label={copy.description}><textarea className={`${controlClass} min-h-28 py-3`} maxLength={1500} value={draft.description} onChange={event => updateDraft({ description:event.target.value })}/></Field>
      <Field label={copy.buttonLabel}><input className={controlClass} maxLength={80} placeholder={copy.send} value={appearance.buttonLabel} onChange={event => updateAppearance({ ...appearance,buttonLabel:event.target.value })}/></Field><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.buttonHint}</p>
    </div>}
    {step === 1 && <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <PublicAgendaDesign appearance={appearance} onChange={updateAppearance} copy={copy} locale={locale}/>
      <aside className="min-w-0 space-y-3 lg:sticky lg:top-0 lg:self-start"><h3 className="text-sm font-medium">{copy.preview}</h3>{preview}</aside>
    </div>}
    {step === 2 && <div className="space-y-5">
      {!publicAccessEnabled && <Feedback>{copy.publicDisabled}</Feedback>}{!ready && <Feedback>{setup.setupRequired}</Feedback>}
      <section className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><label className="flex min-h-11 items-center justify-between gap-4 text-sm font-medium"><span>{setup.publication}</span><input type="checkbox" role="switch" className="h-5 w-5 shrink-0 accent-[#FF6B5E]" checked={draft.published} disabled={!draft.published && (!ready || !publicAccessEnabled)} onChange={event => updateDraft({ published:event.target.checked })}/></label><p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{draft.published ? setup.publicationHint : setup.draftHint}</p></section>
      <IndiceModalSummary columns={2} className="[&_dd]:whitespace-normal [&_dd]:break-words" items={[{label:copy.pageTitle,value:draft.title},{label:copy.publicLayout,value:copy[appearance.layout]},{label:copy.buttonLabel,value:appearance.buttonLabel.trim() || copy.send},{label:setup.publication,value:draft.published ? copy.published : text.draft}]}/>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{copy.preview}</h3><div className="flex gap-2">{[false,true].map(value => <button key={String(value)} type="button" aria-pressed={mobile === value} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm aria-pressed:border-[#FF6B5E] aria-pressed:bg-[#FF6B5E]/5 focus-visible:outline-2 focus-visible:outline-[#FF6B5E] dark:border-slate-700" onClick={() => setMobile(value)}>{value ? text.mobile : text.desktop}</button>)}</div></div>
      {(!savedPage || changed) && <p className="text-xs text-slate-500 dark:text-slate-400">{text.unsaved}</p>}{preview}
      <Field label={setup.readOnlyLink}><input className={controlClass} readOnly value={draft.alias ? new URL(`/book/${draft.alias}`,window.location.origin).href : ''}/></Field>
      <PublicAgendaLinks title={text.savedLinks} page={savedPage} staff={staff} copy={copy} publicAccessEnabled={publicAccessEnabled}/>{!savedPage && <p className="text-sm text-slate-500 dark:text-slate-400">{setup.saveFirst}</p>}
    </div>}
  </EditorFrame>;
}
