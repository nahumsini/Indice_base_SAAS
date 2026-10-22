import { CalendarDays } from 'lucide-react';
import { IndiceBrandLogo } from '../../../Auth/components/IndiceBrandLogo';

/** The editor and public route render the same identity and themed heading. */
export function PublicAgendaBrand({ name }: { name: string }) {
  return name.trim() ? <span className="min-w-0 break-words text-lg font-medium">{name}</span>
    : <IndiceBrandLogo alt="Índice" className="h-9 w-28" imageClassName="w-[132px]" />;
}

export function PublicAgendaHero({ title, description, preview = false }: { title: string; description: string; preview?: boolean }) {
  const Heading = preview ? 'h3' : 'h1';
  return <section className="flex min-w-0 items-start gap-3 rounded-2xl border-t-4 border-[var(--scheduling-accent)] bg-[var(--scheduling-surface)] p-5 text-[var(--scheduling-surface-foreground)]">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/40"><CalendarDays aria-hidden="true" className="h-6 w-6"/></span>
    <div className="min-w-0"><Heading className="break-words text-2xl font-medium leading-tight">{title}</Heading>
      {description.trim() && <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 opacity-90">{description}</p>}
    </div>
  </section>;
}
