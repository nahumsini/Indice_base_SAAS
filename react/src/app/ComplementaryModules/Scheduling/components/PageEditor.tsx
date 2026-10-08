import { useState } from 'react';
import { schedulingApi, type BookingPage, type Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { controlClass, EditorFrame, Feedback, Field } from './SchedulingPrimitives';
import { defaultAppearance } from '../utils/publicAppearance';
import { PublicAgendaPreview } from './PublicAgendaPreview';
import { PublicAgendaLinks } from './PublicAgendaLinks';
import { schedulingEmoji } from '../utils/schedulingIdentity';

export function PageEditor({ page, staff = [], copy, onClose, onSaved, publicAccessEnabled = true }: { page: BookingPage | null; staff?: Staff[]; copy: SchedulingCopy; onClose: () => void; onSaved: () => void; publicAccessEnabled?: boolean }) {
  const [draft, setDraft] = useState({ title: page?.title ?? '', description: page?.description ?? '', alias: page?.alias ?? '', published: page?.published ?? false });
  const [appearance,setAppearance]=useState({...defaultAppearance,...page?.appearance});
  return <EditorFrame icon={schedulingEmoji.publicAgenda} title={copy.publicAgenda} description={copy.publicAgendaHint} modalType="operational-workspace" copy={copy} onClose={onClose} onSaved={onSaved}
    onSave={() => schedulingApi.savePage({ ...draft, appearance, version: page?.version })}>
    {!publicAccessEnabled&&<Feedback>{copy.publicDisabled}</Feedback>}
    <div className="grid min-w-0 gap-6 lg:grid-cols-2"><div className="min-w-0 space-y-5">
    <Field label={copy.pageTitle}><input className={controlClass} required maxLength={180} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field>
    <Field label={copy.description}><textarea className={`${controlClass} h-24 py-3`} maxLength={1500} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
    <Field label={copy.alias}>{id=><div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700"><span className="pl-3 text-sm text-slate-500">/book/</span>
      <input id={id} className={`${controlClass} border-0 shadow-none`} required pattern="[a-z0-9][a-z0-9-]{2,79}" minLength={3} maxLength={80} value={draft.alias} onChange={e => setDraft({ ...draft, alias: e.target.value })} /></div>}</Field>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />{copy.published}</label>
    <Field label={copy.brandName}><input className={controlClass} maxLength={120} value={appearance.brandName} onChange={e=>setAppearance({...appearance,brandName:e.target.value})}/></Field>
    <div className="grid gap-4 sm:grid-cols-2">{(['accentColor','surfaceColor'] as const).map(key=><Field key={key} label={copy[key]}><input type="color" className={controlClass} value={appearance[key]} onChange={e=>setAppearance({...appearance,[key]:e.target.value})}/></Field>)}</div>
    <Field label={copy.buttonLabel}><input className={controlClass} maxLength={80} placeholder={copy.send} value={appearance.buttonLabel} onChange={e=>setAppearance({...appearance,buttonLabel:e.target.value})}/></Field>
    <Field label={copy.publicLayout}><select className={controlClass} value={appearance.layout} onChange={e=>setAppearance({...appearance,layout:e.target.value as typeof appearance.layout})}><option value="cards">{copy.cards}</option><option value="compact">{copy.compact}</option></select></Field>
    </div><div className="min-w-0 space-y-3"><h2 className="text-sm font-medium">{copy.preview}</h2><PublicAgendaPreview {...draft} appearance={appearance} copy={copy}/>
      <PublicAgendaLinks page={page} staff={staff} copy={copy} publicAccessEnabled={publicAccessEnabled}/>
    </div></div>
  </EditorFrame>;
}
