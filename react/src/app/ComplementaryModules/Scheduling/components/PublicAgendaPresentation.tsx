import { useState, type ReactNode } from 'react';
import { ArrowDownRight, CalendarDays, Check, Clock3 } from 'lucide-react';
import { IndiceBrandLogo } from '../../../Auth/components/IndiceBrandLogo';
import { getAgendaExperienceCopy } from '../translations/agendaExperienceCopy';
import type { PageAppearance } from '../services/schedulingApi';
import './public-agenda.css';

/** Shared by the saved public page and the design preview. No owner API is called here. */
export function PublicAgendaBrand({ name }: { name: string }) {
  return <div className="agenda-brand"><span className="agenda-brand-mark" aria-hidden>{name.trim() ? name.trim().split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase() : <CalendarDays className="h-5 w-5"/>}</span>
    {name.trim() ? <span className="min-w-0 break-words text-sm font-medium sm:text-base">{name}</span> : <IndiceBrandLogo alt="Índice" className="h-8 w-24" imageClassName="w-[112px]"/>}</div>;
}
export function PublicAgendaHero({ title, description, preview = false, locale = 'en-CA', layout = 'cards' }: {
  title: string; description: string; preview?: boolean; locale?: string; layout?: PageAppearance['layout'];
}) {
  const [expanded,setExpanded] = useState(false), text = getAgendaExperienceCopy(locale), Heading = preview ? 'h3' : 'h1';
  const long = description.length > 280, visible = long && !expanded ? description.slice(0,280).replace(/\s+\S*$/,'') + '…' : description;
  return <section className={`agenda-hero agenda-hero--${layout}`}>
    <div className="agenda-hero-copy"><span className="agenda-eyebrow"><span aria-hidden className="agenda-live-dot"/>{text.eyebrow}</span>
      <Heading className="agenda-headline">{title}</Heading>
      {description.trim() && <div className="agenda-description"><p>{visible}</p>{long && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? text.less : text.details}</button>}</div>}
    </div>
    <div className="agenda-hero-art" aria-hidden><div className="agenda-art-calendar"><span className="agenda-art-calendar-top"/><CalendarDays/><div className="agenda-art-dots">{Array.from({length:9},(_,index)=><i key={index} className={index===4?'selected':''}/>)}</div><span className="agenda-art-check"><Check/></span></div><span className="agenda-art-orbit"><ArrowDownRight/></span></div>
  </section>;
}
export function PublicAgendaSurface({ title, description, appearance, locale, preview = false, children }: {
  title: string; description: string; appearance: PageAppearance; locale: string; preview?: boolean; children: ReactNode;
}) {
  const text = getAgendaExperienceCopy(locale);
  return <div className={`agenda-experience agenda-experience--${appearance.layout}`} data-agenda-presentation={appearance.layout}>
    <PublicAgendaHero title={title} description={description} preview={preview} locale={locale} layout={appearance.layout}/>
    <section className="agenda-booking-card"><div className="agenda-booking-heading"><span className="agenda-step-mark" aria-hidden><CalendarDays/></span><div><h2 className="font-medium">{text.selection}</h2><p>{text.next}</p></div><Clock3 className="agenda-booking-clock" aria-hidden/></div><div className="agenda-booking-content">{children}</div></section>
  </div>;
}
