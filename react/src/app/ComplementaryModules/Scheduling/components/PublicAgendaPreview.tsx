import { CalendarDays } from 'lucide-react';
import type { PageAppearance } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { publicAppearanceStyle } from '../utils/publicAppearance';
export function PublicAgendaPreview({title,description,appearance,copy}:{title:string;description:string;appearance:PageAppearance;copy:SchedulingCopy}) {
  return <section aria-label={copy.preview} style={publicAppearanceStyle(appearance)} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div className="border-b border-slate-200 p-4 text-sm font-medium dark:border-slate-700">{appearance.brandName||copy.title}</div>
    <div className="bg-[var(--scheduling-surface)] p-5 text-[var(--scheduling-surface-foreground)] dark:bg-slate-950 dark:text-white"><CalendarDays aria-hidden className="mb-3 h-7 w-7"/>
      <h3 className="break-words text-xl font-medium">{title||copy.pageTitle}</h3><p className="mt-3 whitespace-pre-line break-words text-sm leading-6">{description||copy.description}</p></div>
    <div className={appearance.layout==='cards'?'space-y-4 p-5':'space-y-3 p-4'}><div className={appearance.layout==='cards'?'rounded-xl border border-slate-200 p-4 dark:border-slate-700':'border-b border-slate-200 pb-3 dark:border-slate-700'}>
      <p className="text-sm font-medium">{copy.service}</p><p className="mt-2 text-xs text-slate-500">{copy.collaborator} · {copy.duration}</p></div>
      <p className="text-xs leading-5 text-slate-500">{copy.reviewRequired}</p>
      <span className="inline-flex min-h-11 items-center rounded-xl bg-[var(--scheduling-accent)] px-4 text-sm font-medium text-[var(--scheduling-accent-foreground)]">{appearance.buttonLabel||copy.send}</span>
    </div>
  </section>;
}
