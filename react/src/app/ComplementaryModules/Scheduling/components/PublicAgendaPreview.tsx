import type { PageAppearance } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { publicAppearanceStyle } from '../utils/publicAppearance';
import { getPublicAgendaEditorCopy } from '../translations/publicAgendaEditorCopy';
import { PublicAgendaBrand, PublicAgendaHero } from './PublicAgendaPresentation';
import { PublicServiceChoices } from './PublicServiceChoices';

export function PublicAgendaPreview({ title, description, appearance, copy, locale = 'en-CA', mobile = false }: {
  title: string; description: string; appearance: PageAppearance; copy: SchedulingCopy; locale?: string; mobile?: boolean;
}) {
  const text = getPublicAgendaEditorCopy(locale);
  const sample = { services:[{id:0,name:text.sampleService,description:text.sampleDescription,durationMinutes:30,noticeHours:0}],events:[] };
  return <section aria-label={copy.preview} className={`mx-auto min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${mobile ? 'max-w-[340px]' : 'w-full'}`} style={publicAppearanceStyle(appearance)}>
    <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700"><PublicAgendaBrand name={appearance.brandName}/></div>
    <div className="space-y-5 p-4"><PublicAgendaHero title={title || copy.pageTitle} description={description} preview/>
      <div className="space-y-4" aria-hidden="true" inert>
        {appearance.layout === 'cards' ? <PublicServiceChoices catalog={sample} value="service:0" onChange={() => {}} copy={copy} locale={locale} preview/>
          : <div><p className="mb-2 text-sm font-medium">{copy.service} / {copy.events}</p><div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700"><span className="min-w-0 break-words">{text.sampleService} · 30 {copy.minutes}</span><span>⌄</span></div></div>}
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.reviewRequired}</p>
        <span className="inline-flex min-h-12 max-w-full items-center justify-center whitespace-normal break-words [overflow-wrap:anywhere] rounded-xl bg-[var(--scheduling-accent)] px-4 py-3 text-sm font-medium text-[var(--scheduling-accent-foreground)]">{appearance.buttonLabel.trim() || copy.send}</span>
      </div>
    </div>
    <p className="border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">{text.previewHint}</p>
  </section>;
}
