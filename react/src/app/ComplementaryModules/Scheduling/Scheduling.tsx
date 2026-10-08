import { lazy, Suspense, useCallback, useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { authApi } from '../../api/auth';
import { normalizeTabScopeRole } from '../../access/tabScopeCatalog';
import { IndiceModuleShell } from '../../components/frontend-os/IndiceModuleShell';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useLanguage } from '../../shared/context';
import { useSchedulingQuery } from './hooks/useSchedulingQuery';
import { getSchedulingCopy } from './translations/schedulingCopy';
import { Feedback } from './components/SchedulingPrimitives';
import { SchedulingGuide } from './components/SchedulingGuide';
import { schedulingAccess, schedulingLegacySearch, schedulingLegacyTabs, schedulingTabIds } from './utils/schedulingNavigation';
import { schedulingEmoji, schedulingTone } from './utils/schedulingIdentity';

const ReservationsTab = lazy(() => import('./tabs/ReservationsTab'));
const EventsTab = lazy(() => import('./tabs/EventsTab'));
const IndicatorsTab = lazy(() => import('./tabs/IndicatorsTab'));
const ClientsTab = lazy(() => import('./tabs/ClientsTab'));
type SchedulingProps = { onNavigate: (page?: string) => void; learningModeActive?: boolean };
export default function Scheduling(props: SchedulingProps) {
  const params = useParams(), location = useLocation();
  const requested = params['*']?.split('/')[0];
  if (requested === 'reservations' || requested === 'configuration') {
    return <Navigate replace to={`/scheduling/calendar${schedulingLegacySearch(requested, location.search)}`} />;
  }
  return <SchedulingContent {...props} />;
}
function SchedulingContent({ onNavigate, learningModeActive = false }: SchedulingProps) {
  const { currentLanguage } = useLanguage(), copy = getSchedulingCopy(currentLanguage.code);
  const access = useSchedulingQuery(useCallback(() => authApi.getSessionOrNull(), []));
  const { activeTab, setActiveTab } = useRoutedModuleTab('calendar', schedulingTabIds, schedulingLegacyTabs);
  const capabilities = schedulingAccess(access.data);
  const allowed = capabilities.tabs;
  const administrator = ['root', 'superadmin', 'admin', 'owner', 'dueno'].includes(normalizeTabScopeRole(access.data?.user.role));
  useEffect(() => { if (allowed.length && !allowed.includes(activeTab)) setActiveTab(allowed[0]); }, [allowed.join(','), activeTab]);
  return <IndiceModuleShell currentModule="scheduling" title={copy.title} subtitle={copy.subtitle} tone={schedulingTone}
    activeTab={activeTab} onTabChange={setActiveTab} onNavigate={onNavigate}
    tabs={allowed.map(id => ({ id, label: id === 'calendar' ? copy.agendaReservations : copy[id], icon: schedulingEmoji[id],
      access: { page: 'scheduling' as const, tabId: id === 'calendar' ? capabilities.agendaScope : id } }))}>
    <div className="space-y-6" data-scheduling-workspace>
      {learningModeActive && allowed.length > 0 && <SchedulingGuide copy={copy} />}
      {access.loading ? <Feedback>{copy.loading}</Feedback> : !allowed.length || access.error ? <Feedback error>{copy.error}</Feedback> :
        allowed.includes(activeTab) && <Suspense fallback={<Feedback>{copy.loading}</Feedback>}>
          {activeTab === 'calendar' ? <ReservationsTab mode={capabilities.readScope} copy={copy} locale={currentLanguage.code}
            canRead={capabilities.canRead} canCapture={capabilities.canCapture} administrator={administrator} canConfigure={capabilities.canConfigure} /> :
            activeTab === 'clients' ? <ClientsTab copy={copy} learningModeActive={learningModeActive}/> :
            activeTab === 'events' ? <EventsTab copy={copy} locale={currentLanguage.code} administrator={administrator} /> :
            <IndicatorsTab copy={copy} locale={currentLanguage.code} canInspect={capabilities.canCapture} />}
        </Suspense>}
    </div>
  </IndiceModuleShell>;
}
