import type { AuthSessionResponse } from '../../../api/auth.types';
import { canAccessModuleTab } from '../../../access/tabScopeCatalog';
import type { BackendDashboardModule } from '../../../api/dashboard';

export const schedulingTabIds = ['calendar', 'clients', 'events', 'indicators'] as const;
export const schedulingLegacyTabs = { reservations: 'calendar', configuration: 'calendar' } as const;

/** Presentation is unified; the existing backend permission scopes stay independent. */
export function schedulingAccess(session: AuthSessionResponse | null | undefined) {
  const has = (tab: string) => Boolean(session && canAccessModuleTab('scheduling', tab, session));
  const calendar = has('calendar'), reservations = has('reservations'), configuration = has('configuration');
  return {
    canRead: calendar || reservations,
    canCapture: reservations,
    canConfigure: configuration,
    readScope: reservations ? 'reservations' as const : 'calendar' as const,
    agendaScope: calendar ? 'calendar' : reservations ? 'reservations' : 'configuration',
    tabs: schedulingTabIds.filter(tab => tab === 'calendar' ? calendar || reservations || configuration : has(tab)),
  };
}

/** Old table/drilldown links keep their period/status and explicit view. */
export function schedulingLegacySearch(tab: string, search: string) {
  const params = new URLSearchParams(search);
  if (tab === 'reservations' && !params.has('view')) params.set('view', 'table');
  return params.size ? `?${params}` : '';
}

/** Sharing the Sales workspace never implies a Sales entitlement or tab grant. */
export function canUseSalesClients(session: AuthSessionResponse | null | undefined, modules: BackendDashboardModule[]) {
  return Boolean(session && canAccessModuleTab('sales', 'contacts', session)
    && modules.some(module => module.slug === 'crm' && !module.locked));
}
