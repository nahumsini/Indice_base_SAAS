import { useRef, useState } from 'react';
import { schedulingApi, type BookingPage, type Staff, type SchedulingReadiness } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { useLanguage } from '../../../shared/context';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { controlClass, EditorFrame, Feedback, Field } from './SchedulingPrimitives';
import { defaultAppearance } from '../utils/publicAppearance';
import { PublicAgendaPreview } from './PublicAgendaPreview';
import { PublicAgendaLinks } from './PublicAgendaLinks';
import { schedulingEmoji } from '../utils/schedulingIdentity';
export function PageEditor({page,staff=[],copy,onClose,onSaved,publicAccessEnabled=true,readiness}:{page:BookingPage|null;staff?:Staff[];copy:SchedulingCopy;onClose:()=>void;onSaved:()=>void;publicAccessEnabled?:boolean;readiness?:SchedulingReadiness}){
 const {currentLanguage}=useLanguage(),setup=getSchedulingSetupCopy(currentLanguage.code),name=readiness?.companyName||page?.appearance?.brandName||copy.title;
 const titles=[`${setup.companyAgenda} · ${name}`.slice(0,180),`${setup.requestAppointment} · ${name}`.slice(0,180)];
 const [savedPage,setSavedPage]=useState(page),[saved,setSaved]=useState(false);
 const [draft,setDraft]=useState({title:page?.title||titles[0],description:page?.description||'',alias:page?.alias||readiness?.suggestedAlias||'',published:page?.published??false});
 const [appearance,setAppearance]=useState({...defaultAppearance,...page?.appearance,brandName:page?.appearance?.brandName||name});
 const baseline=useRef(JSON.stringify({draft,appearance}));
 const ready=readiness?.bookingReady??true;
 return <EditorFrame icon={schedulingEmoji.publicAgenda} title={copy.publicAgenda} description={setup.pageHint} modalType="operational-workspace" copy={copy} hasChanges={JSON.stringify({draft,appearance})!==baseline.current} onClose={onClose} onSaved={()=>{setSaved(true);onSaved();}} onSave={async()=>{const result=await schedulingApi.savePage({...draft,appearance,version:savedPage?.version});baseline.current=JSON.stringify({draft:{title:result.title,description:result.description,alias:result.alias,published:result.published},appearance});setSavedPage(result);setDraft({title:result.title,description:result.description,alias:result.alias,published:result.published});}}>
 {saved&&<Feedback>{setup.saved}</Feedback>}{!publicAccessEnabled&&<Feedback>{copy.publicDisabled}</Feedback>}{!ready&&<Feedback>{setup.setupRequired}</Feedback>}
 <div className="grid min-w-0 gap-6 lg:grid-cols-2"><div className="min-w-0 space-y-5">
 <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">{copy.brandName}</p><p className="mt-1 break-words font-medium">{name}</p></section>
 <Field label={setup.presentation}><select className={controlClass} value={draft.title} onChange={e=>{setSaved(false);setDraft({...draft,title:e.target.value});}}>{[...new Set([draft.title,...titles])].map(title=><option key={title} value={title}>{title}</option>)}</select></Field>
 <section className="space-y-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><label className="flex min-h-11 items-center justify-between gap-4 font-medium"><span>{setup.publication}</span><input type="checkbox" role="switch" className="h-5 w-5 shrink-0 accent-[#FF6B5E]" checked={draft.published} disabled={!draft.published&&(!ready||!publicAccessEnabled)} onChange={e=>{setSaved(false);setDraft({...draft,published:e.target.checked});}}/></label><p className="text-sm leading-6 text-slate-500">{draft.published?setup.publicationHint:setup.draftHint}</p></section>
 <Field label={copy.publicLayout}><select className={controlClass} value={appearance.layout} onChange={e=>{setSaved(false);setAppearance({...appearance,layout:e.target.value as typeof appearance.layout});}}><option value="cards">{copy.cards}</option><option value="compact">{copy.compact}</option></select></Field>
 <fieldset><legend className="mb-3 text-sm font-medium">{setup.theme}</legend><div className="flex flex-wrap gap-3">{['#2563EB','#FF6B5E','#047857','#7C3AED'].map(color=><button key={color} type="button" aria-label={`${setup.theme}: ${color}`} aria-pressed={appearance.accentColor.toLowerCase()===color.toLowerCase()} className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 text-lg aria-pressed:border-slate-900 dark:aria-pressed:border-white" style={{backgroundColor:color,color:color==='#FF6B5E'?'#222831':'white'}} onClick={()=>{setSaved(false);setAppearance({...appearance,accentColor:color});}}>{appearance.accentColor.toLowerCase()===color.toLowerCase()?'✓':''}</button>)}</div></fieldset>
 <Field label={setup.readOnlyLink}><input className={controlClass} readOnly value={draft.alias?new URL(`/book/${draft.alias}`,window.location.origin).href:''}/></Field>
 </div><div className="min-w-0 space-y-3"><h2 className="text-sm font-medium">{copy.preview}</h2><PublicAgendaPreview {...draft} appearance={appearance} copy={copy}/><PublicAgendaLinks page={savedPage} staff={staff} copy={copy} publicAccessEnabled={publicAccessEnabled}/>{!savedPage&&<p className="text-sm text-slate-500">{setup.saveFirst}</p>}</div></div>
 </EditorFrame>;
}
