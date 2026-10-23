import type { BookingCatalog, PageAppearance } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { publicAppearanceStyle } from '../utils/publicAppearance';
import { getPublicAgendaEditorCopy } from '../translations/publicAgendaEditorCopy';
import { getAgendaExperienceCopy } from '../translations/agendaExperienceCopy';
import { PublicAgendaBrand, PublicAgendaSurface } from './PublicAgendaPresentation';
import { BookingForm } from './BookingForm';
import { PublicServiceChoices } from './PublicServiceChoices';
import { getPublicAgendaCompactCopy } from '../translations/publicAgendaCompactCopy';

const previewSlots = async () => ({timezone:'UTC',starts:[] as string[]});
const previewSubmit = async () => { throw new Error('Preview cannot send requests'); };
/** Same public surface and booking form, inert: preview cannot submit or query business slots. */
export function PublicAgendaPreview({ title, description, appearance, copy, locale = 'en-CA', mobile = false, catalog, condensed = false }: {
  title: string; description: string; appearance: PageAppearance; copy: SchedulingCopy; locale?: string; mobile?: boolean; catalog?: BookingCatalog; condensed?: boolean;
}) {
  const text = getPublicAgendaEditorCopy(locale), experience = getAgendaExperienceCopy(locale), compact = getPublicAgendaCompactCopy(locale);
  const sample: BookingCatalog = {title,description,appearance,services:[{id:1,name:text.sampleService,description:text.sampleDescription,durationMinutes:60,noticeHours:0,chargePolicy:'TO_BE_AGREED'}],staff:[{id:1,publicName:appearance.brandName || text.publicName,timezone:'UTC'}],events:[]};
  const shown = {...(catalog ?? sample),title,description,appearance,clientSelectionEnabled:false};
  const limited = {...shown,services:shown.services.slice(0,2),events:shown.events.slice(0,Math.max(0,2-shown.services.length))};
  const remaining = shown.services.length+shown.events.length-limited.services.length-limited.events.length;
  return <section aria-label={copy.preview} className={`agenda-preview ${condensed ? 'agenda-preview--condensed' : ''} mx-auto min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950 ${mobile ? 'max-w-[360px]' : 'w-full'}`} style={publicAppearanceStyle(appearance)}>
    <header className="agenda-public-header"><PublicAgendaBrand name={appearance.brandName}/></header>
    <div className="p-3 sm:p-4"><PublicAgendaSurface title={title || copy.pageTitle} description={description} appearance={appearance} locale={locale} preview>
      {!shown.services.length && !shown.events.length ? <p className="py-5 text-center text-sm text-slate-500 dark:text-slate-300">{experience.empty}</p> : <div inert aria-hidden="true">{condensed ? <PublicServiceChoices catalog={limited} copy={copy} locale={locale} value="" onChange={() => {}} layout={appearance.layout}/> : <BookingForm presentationOnly catalog={shown} copy={copy} locale={locale} selectionLayout={appearance.layout} loadSlots={previewSlots} onSubmit={previewSubmit}/>}</div>}
      {condensed && remaining > 0 && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">+{remaining} {compact.moreOptions}</p>}
    </PublicAgendaSurface></div>
    <p className="border-t border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">{experience.previewOnly} {!catalog && text.previewHint}</p>
  </section>;
}
