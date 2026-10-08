import { useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import { KioskPublicShell } from '../../components/kiosk-engine/KioskPublicShell';
import { IndiceBrandLogo } from '../../Auth/components/IndiceBrandLogo';
import { useLanguage } from '../../shared/context';
import { useSchedulingQuery } from './hooks/useSchedulingQuery';
import { getSchedulingCopy } from './translations/schedulingCopy';
import { publicSchedulingApi, type BookingRequest, type SlotRequest } from './services/schedulingApi';
import { ActionButton, Feedback, panelClass } from './components/SchedulingPrimitives';
import { BookingForm } from './components/BookingForm';
import { defaultAppearance, publicAppearanceStyle } from './utils/publicAppearance';

/** Public route mounts no tenant-data providers and never requests ERP credentials. */
export default function PublicBookingPage() {
  const { alias = '' } = useParams(), [params] = useSearchParams();
  const { currentLanguage } = useLanguage(), copy = getSchedulingCopy(currentLanguage.code);
  const query = useSchedulingQuery(useCallback(async (signal: AbortSignal) => {
    const address = await publicSchedulingApi.resolve(alias, signal);
    const catalog = await publicSchedulingApi.bootstrap(address.token, signal);
    return { ...address, catalog };
  }, [alias]));
  const slots = useCallback((request: SlotRequest, signal: AbortSignal) => {
    if (!query.data) return Promise.reject(new Error('unavailable'));
    return publicSchedulingApi.slots(query.data.token, query.data.catalog.csrfToken, request, signal);
  }, [query.data]);
  const submit = useCallback((request: BookingRequest, key: string) => {
    if (!query.data) return Promise.reject(new Error('unavailable'));
    return publicSchedulingApi.request(query.data.token, query.data.catalog.csrfToken, request, key);
  }, [query.data]);
  const appearance={...defaultAppearance,...query.data?.catalog.appearance};
  return <KioskPublicShell moduleScope="scheduling" maxWidthClassName="max-w-4xl" header={utilities =>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
      {appearance.brandName?<span className="max-w-full break-words text-lg font-medium">{appearance.brandName}</span>:<IndiceBrandLogo alt="Índice" className="h-9 w-28" imageClassName="w-[132px]" />}{utilities}
    </header>}>
    <div className="space-y-6" data-public-scheduling style={publicAppearanceStyle(appearance)}>
      <section className="flex items-start gap-4 rounded-2xl bg-[var(--scheduling-surface)] p-5 text-[var(--scheduling-surface-foreground)] dark:bg-slate-950 dark:text-white"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/60 dark:bg-slate-800"><CalendarDays aria-hidden="true" /></span>
        <div className="min-w-0"><h1 className="text-2xl font-medium leading-tight">{query.data?.catalog.title ?? copy.title}</h1>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 opacity-90">{query.data?.catalog.description ?? copy.subtitle}</p></div>
      </section>
      {query.loading ? <Feedback tone="blue">{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<ActionButton className="ml-3" onClick={query.reload}>{copy.retry}</ActionButton></Feedback> : query.data &&
        <section className={appearance.layout==='compact'?'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900':panelClass}><BookingForm key={alias} catalog={query.data.catalog} copy={{...copy,send:appearance.buttonLabel||copy.send}} locale={currentLanguage.code} loadSlots={slots} onSubmit={submit}
          presetStaff={Number(params.get('consultant')) || undefined} presetEvent={Number(params.get('event')) || undefined} /></section>}
    </div>
  </KioskPublicShell>;
}
