import { useId } from 'react';
import { CalendarDays, Clock3, Sparkles } from 'lucide-react';
import type { BookingCatalog, PageAppearance } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { serviceChargeLabel } from '../translations/serviceTermsCopy';

/** A visual catalogue; selection values and business actions remain BookingForm-owned. */
export function PublicServiceChoices({ catalog, value, onChange, copy, locale, preview = false, layout = 'cards' }: {
  catalog: Pick<BookingCatalog,'services'|'events'>; value: string; onChange: (value: string) => void;
  copy: SchedulingCopy; locale: string; preview?: boolean; layout?: PageAppearance['layout'];
}) {
  const name = useId();
  const items = [
    ...catalog.services.map(service => ({ value:`service:${service.id}`,name:service.name,description:service.description,duration:service.durationMinutes,
      detail:serviceChargeLabel(service.chargePolicy,locale),disabled:false,label:copy.service,event:false })),
    ...catalog.events.map(event => ({ value:`event:${event.id}`,name:event.title,description:event.description,duration:event.durationMinutes,
      detail:`${event.availablePlaces} ${copy.places}`,disabled:event.availablePlaces <= 0,label:copy.events,event:true })),
  ];
  return <fieldset disabled={preview} className="min-w-0"><legend className="sr-only">{copy.service} / {copy.events}</legend>
    <div className={`agenda-service-list agenda-service-list--${layout}`}>{items.map(item =>
      <label key={item.value} data-selected={value === item.value} className={`agenda-service ${item.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <input type="radio" name={name} value={item.value} checked={value === item.value} disabled={item.disabled} aria-label={`${item.label}: ${item.name}`}
          className="h-4 w-4 shrink-0" onChange={() => onChange(item.value)}/>
        <span className="agenda-service-icon" aria-hidden>{item.event ? <CalendarDays/> : <Sparkles/>}</span>
        <span className="agenda-service-copy"><span className="agenda-service-name">{item.name}</span>
          {item.description?.trim() && item.description.trim().toLocaleLowerCase(locale)!==item.name.trim().toLocaleLowerCase(locale) && <span className="agenda-service-description">{item.description}</span>}
          <span className="agenda-service-meta"><span><Clock3 className="h-3.5 w-3.5" aria-hidden/>{item.duration} {copy.minutes}</span><span className="agenda-service-term">{item.detail}</span></span>
        </span>
      </label>)}</div>
  </fieldset>;
}
