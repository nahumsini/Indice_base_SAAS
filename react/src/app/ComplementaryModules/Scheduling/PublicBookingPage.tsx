import { useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { KioskPublicShell } from '../../components/kiosk-engine/KioskPublicShell';
import { useLanguage } from '../../shared/context';
import { useSchedulingQuery } from './hooks/useSchedulingQuery';
import { getSchedulingCopy } from './translations/schedulingCopy';
import { publicSchedulingApi, type BookingRequest, type SlotRequest } from './services/schedulingApi';
import { ActionButton, Feedback } from './components/SchedulingPrimitives';
import { PublicAgendaBrand, PublicAgendaSurface } from './components/PublicAgendaPresentation';
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
  return <div className="agenda-public-site" style={publicAppearanceStyle(appearance)}><KioskPublicShell minimalContent moduleScope="scheduling" maxWidthClassName="agenda-public-shell max-w-6xl" header={utilities =>
    <header className="agenda-public-header">
      <PublicAgendaBrand name={appearance.brandName || query.data?.catalog.companyName || ''} logoDataUrl={appearance.logoDataUrl}/>{utilities}
    </header>}>
    <div className="space-y-6" data-public-scheduling style={publicAppearanceStyle(appearance)}>

      {query.loading ? <Feedback tone="blue">{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<ActionButton className="ml-3" onClick={query.reload}>{copy.retry}</ActionButton></Feedback> : query.data &&
        <PublicAgendaSurface title={query.data.catalog.title} description={query.data.catalog.description} appearance={appearance} locale={currentLanguage.code}><BookingForm selectionLayout={appearance.layout} key={alias} catalog={query.data.catalog} copy={{...copy,send:appearance.buttonLabel||copy.send}} locale={currentLanguage.code} loadSlots={slots} onSubmit={submit}
          presetStaff={Number(params.get('consultant')) || undefined} presetEvent={Number(params.get('event')) || undefined} /></PublicAgendaSurface>}
    </div>
  </KioskPublicShell></div>;
}
