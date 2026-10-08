import { useCallback } from 'react';
import { authApi } from '../../../api/auth';
import { dashboardApi } from '../../../api/dashboard';
import Contactos from '../../../BasicModules/Sales/Contactos';
import { SalesCrmProvider } from '../../../BasicModules/Sales/salesCrmContext';
import { SalesDataStateBoundary } from '../../../BasicModules/Sales/components/SalesDataStateBoundary';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, Feedback } from '../components/SchedulingPrimitives';
import { canUseSalesClients } from '../utils/schedulingNavigation';

/** The real Sales workspace: same owner, data, forms and persistence, not a second CRM. */
export default function ClientsTab({ copy, learningModeActive = false }: { copy: SchedulingCopy; learningModeActive?: boolean }) {
  const access = useSchedulingQuery(useCallback(async () => {
    const [session, modules] = await Promise.all([authApi.getSessionOrNull(), dashboardApi.listModules()]);
    return canUseSalesClients(session, modules);
  }, []));
  if (access.loading) return <Feedback>{copy.loading}</Feedback>;
  if (access.error) return <Feedback error>{copy.error}<ActionButton onClick={access.reload}>{copy.retry}</ActionButton></Feedback>;
  if (!access.data) return <Feedback>{copy.salesClientsAccessHint}</Feedback>;
  return <SalesCrmProvider><SalesDataStateBoundary>
    <Contactos titleBarTitle={copy.clients} learningModeActive={learningModeActive} />
  </SalesDataStateBoundary></SalesCrmProvider>;
}
