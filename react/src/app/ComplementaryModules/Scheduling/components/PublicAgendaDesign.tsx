import type { PageAppearance } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getPublicAgendaEditorCopy } from '../translations/publicAgendaEditorCopy';
import { getAgendaExperienceCopy } from '../translations/agendaExperienceCopy';
import { publicAgendaPalettes } from '../utils/publicAppearance';
import { controlClass, Field } from './SchedulingPrimitives';

const selectedClass = 'border-[#FF6B5E] bg-[#FF6B5E]/5 ring-1 ring-[#FF6B5E]';
const optionClass = 'min-h-12 min-w-0 rounded-2xl border bg-white p-3 text-left transition hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B5E] dark:bg-slate-900';
function ColourField({ label, value, onChange, copy }: { label: string; value: string; onChange: (value: string) => void; copy: SchedulingCopy }) {
  return <Field label={label}>{id => <div className="flex min-w-0 gap-2">
    <input type="color" aria-label={`${copy.edit}: ${label}`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#FFFFFF'} className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-transparent p-1 dark:border-slate-700" onChange={event => onChange(event.target.value.toUpperCase())}/>
    <input id={id} className={`${controlClass} min-w-0 font-mono uppercase`} value={value} maxLength={7} spellCheck={false} autoComplete="off" required pattern="#[a-fA-F0-9]{6}" onChange={event => onChange(event.target.value)}/>
  </div>}</Field>;
}
export function PublicAgendaDesign({ appearance, onChange, copy, locale }: {
  appearance: PageAppearance; onChange: (value: PageAppearance) => void; copy: SchedulingCopy; locale: string;
}) {
  const text = getPublicAgendaEditorCopy(locale), experience = getAgendaExperienceCopy(locale);
  return <div className="min-w-0 space-y-6">

    <fieldset><legend className="mb-3 text-sm font-medium">{copy.publicLayout}</legend><div className="grid grid-cols-3 gap-2">{(['cards','compact','showcase'] as const).map(layout => <button type="button" key={layout} aria-pressed={appearance.layout === layout} title={experience[`${layout}Hint`]} className={`${optionClass} flex flex-col items-center gap-2 text-center ${appearance.layout === layout ? selectedClass : 'border-slate-200 dark:border-slate-700'}`} onClick={() => onChange({ ...appearance,layout })}>
      <span aria-hidden className="grid h-12 w-full max-w-20 shrink-0 gap-1.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-800" style={{gridTemplateColumns:layout==='showcase'?'1fr 1.5fr':'1fr'}}><span className="rounded-md" style={{backgroundColor:appearance.accentColor,opacity:.75}}/><span className={`grid gap-1 ${layout==='cards'?'grid-cols-2':'grid-cols-1'}`}>{[0,1].map(i=><span key={i} className="min-h-3 rounded border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700"/>)}</span></span>
      <span className="min-w-0"><span className="block text-sm font-medium">{experience[layout]}</span><span className="sr-only">{experience[`${layout}Hint`]}</span></span>
    </button>)}</div></fieldset>
    <fieldset><legend className="mb-3 text-sm font-medium">{text.palette}</legend><div className="grid grid-cols-2 gap-2">{publicAgendaPalettes.map(palette => {
      const active = appearance.accentColor.toUpperCase() === palette.accentColor && appearance.surfaceColor.toUpperCase() === palette.surfaceColor;
      return <button type="button" key={palette.id} aria-pressed={active} className={`${optionClass} flex items-center gap-2 ${active ? selectedClass : 'border-slate-200 dark:border-slate-700'}`} onClick={() => onChange({ ...appearance,accentColor:palette.accentColor,surfaceColor:palette.surfaceColor })}>
        <span className="flex shrink-0 -space-x-1" aria-hidden>{[palette.accentColor,palette.surfaceColor].map(color => <span key={color} className="h-4 w-4 rounded-full border border-slate-200" style={{backgroundColor:color}}/>)}</span><span className="min-w-0 break-words text-xs font-medium">{palette.id in text ? text[palette.id as keyof typeof text] : experience[palette.id as keyof typeof experience]}</span>
      </button>;
    })}</div></fieldset>
    <div className="grid gap-4"><ColourField label={text.accent} value={appearance.accentColor} onChange={accentColor => onChange({ ...appearance,accentColor })} copy={copy}/><ColourField label={text.background} value={appearance.surfaceColor} onChange={surfaceColor => onChange({ ...appearance,surfaceColor })} copy={copy}/></div>
  </div>;
}
