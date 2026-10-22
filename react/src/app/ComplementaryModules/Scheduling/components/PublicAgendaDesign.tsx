import type { PageAppearance } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getPublicAgendaEditorCopy } from '../translations/publicAgendaEditorCopy';
import { publicAgendaPalettes } from '../utils/publicAppearance';
import { controlClass, Field } from './SchedulingPrimitives';

const selectedClass = 'border-[#FF6B5E] bg-[#FF6B5E]/5 ring-1 ring-[#FF6B5E]';
const optionClass = 'min-h-12 min-w-0 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B5E]';

function ColourField({ label, value, onChange, copy }: { label: string; value: string; onChange: (value: string) => void; copy: SchedulingCopy }) {
  return <Field label={label}>{id => <div className="flex min-w-0 gap-2">
    <input type="color" aria-label={`${copy.edit}: ${label}`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#FFFFFF'} className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-transparent p-1 dark:border-slate-700" onChange={event => onChange(event.target.value.toUpperCase())}/>
    <input id={id} className={`${controlClass} min-w-0 font-mono uppercase`} value={value} maxLength={7} spellCheck={false} autoComplete="off" required pattern="#[a-fA-F0-9]{6}" onChange={event => onChange(event.target.value)}/>
  </div>}</Field>;
}

export function PublicAgendaDesign({ appearance, onChange, copy, locale }: {
  appearance: PageAppearance; onChange: (value: PageAppearance) => void; copy: SchedulingCopy; locale: string;
}) {
  const text = getPublicAgendaEditorCopy(locale);
  return <div className="min-w-0 space-y-5">
    <fieldset><legend className="mb-3 text-sm font-medium">{text.palette}</legend><div className="grid grid-cols-2 gap-2">{publicAgendaPalettes.map(palette => {
      const active = appearance.accentColor.toUpperCase() === palette.accentColor && appearance.surfaceColor.toUpperCase() === palette.surfaceColor && appearance.layout === palette.layout;
      return <button type="button" key={palette.id} aria-pressed={active} className={`${optionClass} ${active ? selectedClass : 'border-slate-200 dark:border-slate-700'}`} onClick={() => onChange({ ...appearance,accentColor:palette.accentColor,surfaceColor:palette.surfaceColor,layout:palette.layout })}>
        <span className="mb-2 flex gap-1.5" aria-hidden="true">{[palette.accentColor,palette.surfaceColor].map(color => <span key={color} className="h-5 w-5 rounded-full border border-slate-200" style={{backgroundColor:color}}/>)}</span><span className="text-sm font-medium">{text[palette.id]}</span>
      </button>;
    })}</div></fieldset>
    <div className="grid gap-4"><ColourField label={text.accent} value={appearance.accentColor} onChange={accentColor => onChange({ ...appearance,accentColor })} copy={copy}/><ColourField label={text.background} value={appearance.surfaceColor} onChange={surfaceColor => onChange({ ...appearance,surfaceColor })} copy={copy}/></div>
    <fieldset><legend className="mb-3 text-sm font-medium">{copy.publicLayout}</legend><div className="grid gap-2">{(['cards','compact'] as const).map(layout => <button type="button" key={layout} aria-pressed={appearance.layout === layout} className={`${optionClass} ${appearance.layout === layout ? selectedClass : 'border-slate-200 dark:border-slate-700'}`} onClick={() => onChange({ ...appearance,layout })}>
      <span className="block text-sm font-medium">{copy[layout]}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{layout === 'cards' ? text.cardsHint : text.compactHint}</span>
    </button>)}</div></fieldset>
  </div>;
}
