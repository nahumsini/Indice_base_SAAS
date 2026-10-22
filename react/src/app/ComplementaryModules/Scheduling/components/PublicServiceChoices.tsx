import { useId } from 'react';
import { Clock3 } from 'lucide-react';
import type { BookingCatalog } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { serviceChargeLabel } from '../translations/serviceTermsCopy';

/** Presentation only: both layouts use BookingForm's existing selection and owner workflow. */
export function PublicServiceChoices({ catalog, value, onChange, copy, locale, preview = false }: {
  catalog: Pick<BookingCatalog,'services'|'events'>; value: string; onChange: (value: string) => void;
  copy: SchedulingCopy; locale: string; preview?: boolean;
}) {
  const name = useId();
  const items = [
    ...catalog.services.map(service => ({ value:`service:${service.id}`,name:service.name,description:service.description,duration:service.durationMinutes,
      detail:serviceChargeLabel(service.chargePolicy,locale),disabled:false,label:copy.service })),
    ...catalog.events.map(event => ({ value:`event:${event.id}`,name:event.title,description:event.description,duration:event.durationMinutes,
      detail:`${event.availablePlaces} ${copy.places}`,disabled:event.availablePlaces <= 0,label:copy.events })),
  ];
  return <fieldset disabled={preview} className="min-w-0"><legend className="mb-3 text-sm font-medium">{copy.service} / {copy.events}</legend>
    <div className="grid gap-3" style={{gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))'}}>{items.map(item =>
      <label key={item.value} className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 transition ${item.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-sm'} ${value === item.value ? 'border-[var(--scheduling-accent)] ring-1 ring-[var(--scheduling-accent)]' : 'border-slate-200 dark:border-slate-700'}`}>
        <input type="radio" name={name} value={item.value} checked={value === item.value} disabled={item.disabled} aria-label={`${item.label}: ${item.name}`}
          className="mt-1 h-4 w-4 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--scheduling-accent)]" style={{accentColor:'var(--scheduling-accent)'}} onChange={() => onChange(item.value)}/>
        <span className="min-w-0 flex-1"><span className="block break-words font-medium">{item.name}</span>
          {item.description && <span className="mt-2 line-clamp-3 block break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</span>}
          <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true"/>{item.duration} {copy.minutes}</span><span className="break-words font-medium">{item.detail}</span></span>
        </span>
      </label>)}</div>
  </fieldset>;
}
