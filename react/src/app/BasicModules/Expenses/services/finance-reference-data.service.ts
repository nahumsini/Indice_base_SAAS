import { authApi } from '../../../api/auth';
import { configCenterApi } from '../../../api/configCenter';
import { dashboardApi } from '../../../api/dashboard';
import { humanResourcesApi } from '../../../api/humanResources';
import type { BackendHrUser } from '../../../api/humanResources';
import type { ConfigCenterUser } from '../../../api/configCenter';
import type {
  FinanceReferenceBusiness,
  FinanceReferenceData,
  FinanceReferenceUnit,
  FinanceReferenceUser,
} from '../types/finance-reference.types';

const compact = <T>(items: Array<T | null | undefined>) => items.filter((item): item is T => Boolean(item));
const stringId = (value: number | string | null | undefined) => (value === null || value === undefined ? undefined : String(value));
const uniqueById = <T extends { id: string }>(items: T[]) => Array.from(new Map(items.map(item => [item.id, item])).values());

const toUnit = (unit: { id: number; name: string; status?: string | null }): FinanceReferenceUnit => ({
  id: String(unit.id),
  name: unit.name,
  status: unit.status,
});

const toBusiness = (business: { id: number; name: string; status?: string | null; unitId?: number | null; unit_id?: number | null }): FinanceReferenceBusiness => ({
  id: String(business.id),
  name: business.name,
  unitId: stringId(business.unitId ?? business.unit_id),
  status: business.status,
});

const hrUserToReferenceUser = (user: BackendHrUser): FinanceReferenceUser | null => {
  const id = stringId(user.user_id);
  if (!id) return null;
  return {
    id,
    name: user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email,
    email: user.email,
    unitId: stringId(user.unit_id),
    businessId: stringId(user.business_id),
    status: user.status,
  };
};

const configUserToReferenceUser = (user: ConfigCenterUser): FinanceReferenceUser => ({
  id: String(user.id),
  name: `${user.nombres} ${user.apellidos}`.trim() || user.email,
  email: user.email,
  unitId: stringId(user.unit_id),
  businessId: stringId(user.business_id),
  status: user.status,
});

const sessionUserToReferenceUser = (session: Awaited<ReturnType<typeof authApi.getSessionOrNull>>): FinanceReferenceUser | null => {
  if (!session?.user?.id) return null;
  return {
    id: String(session.user.id),
    name: session.user.name,
  };
};

export const financeReferenceDataService = {
  async getReferenceData(): Promise<FinanceReferenceData> {
    const [sessionResult, unitsResult, businessesResult, hrUsersResult, configUsersResult] = await Promise.allSettled([
      authApi.getSessionOrNull(),
      dashboardApi.listUnits(),
      dashboardApi.listBusinesses(),
      humanResourcesApi.listHrUsers(),
      configCenterApi.getUsers(),
    ]);

    const currentUser = sessionResult.status === 'fulfilled'
      ? sessionUserToReferenceUser(sessionResult.value)
      : null;
    const units = unitsResult.status === 'fulfilled'
      ? unitsResult.value.map(toUnit)
      : [];
    const businesses = businessesResult.status === 'fulfilled'
      ? businessesResult.value.map(toBusiness)
      : [];
    const hrUsers = hrUsersResult.status === 'fulfilled'
      ? compact(hrUsersResult.value.items.map(hrUserToReferenceUser))
      : [];
    const configUsers = configUsersResult.status === 'fulfilled'
      ? configUsersResult.value.users.map(configUserToReferenceUser)
      : [];

    return {
      businesses,
      currentUser: currentUser ?? undefined,
      units,
      users: uniqueById(compact([currentUser, ...hrUsers, ...configUsers])),
    };
  },
};
