import { useState, type ReactNode } from 'react';
import { getCachedAuthSession } from '../api/authSessionStore';
import { useAuthorizationRevision } from '../hooks/useAuthorizationRevision';
import { messagingCopy } from './copy';
import { MessagingWorkspace } from './MessagingWorkspace';

export function CustomerCareWorkspace({ portal, locale, legacy, initialQuery = '' }: { portal: 'platform' | 'distributor'; locale: string; legacy: ReactNode; initialQuery?: string }) {
  const [view, setView] = useState<'queue' | 'legacy'>(() => !initialQuery && new URLSearchParams(window.location.search).has('ticket') ? 'legacy' : 'queue');
  useAuthorizationRevision();
  const session = getCachedAuthSession();
  const copy = messagingCopy(locale);
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold">{copy.care}</h2>
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label={copy.care}>
      {(['queue','legacy'] as const).map(value => <button type="button" key={value} role="tab" aria-selected={view === value} onClick={() => setView(value)}
        className={`rounded-lg px-4 py-2 text-sm ${view === value ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}>{value === 'queue' ? copy.queue : copy.legacy}</button>)}
    </div>
    {view === 'legacy' ? legacy : session ? <MessagingWorkspace key={`${session.user.id}:${session.company.id}:${initialQuery}`} portal={portal} locale={locale} userId={session.user.id} initialQuery={initialQuery} /> : <p role="status">{copy.loading}</p>}
  </section>;
}
