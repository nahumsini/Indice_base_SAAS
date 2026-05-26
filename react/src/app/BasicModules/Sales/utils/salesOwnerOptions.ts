import type { BackendHrUser } from '../../../api/humanResources';
import type { SalesContextUser } from '../salesApi';
import { compactText, normalizeTextKey } from './salesTextUtils';

export type SalesOwnerOption = {
  userCompanyId: number;
  userId: number | null;
  name: string;
  email: string;
};

export function isBackendHrUser(user: SalesContextUser | BackendHrUser): user is BackendHrUser {
  return 'full_name' in user || 'first_name' in user || 'user_company_id' in user || 'legacy_user_company_id' in user;
}

export function normalizeSalesOwnerOption(user: SalesContextUser | BackendHrUser): SalesOwnerOption | null {
  const isHrUser = isBackendHrUser(user);
  const userCompanyId = isHrUser
    ? user.user_company_id ?? user.legacy_user_company_id ?? null
    : user.userCompanyId ?? null;
  const name = isHrUser
    ? compactText(user.full_name) || compactText(`${user.first_name ?? ''} ${user.last_name ?? ''}`)
    : compactText(user.name);
  const status = normalizeTextKey(user.status ?? 'active');

  if (!userCompanyId || !name || (status && !['active', 'activo'].includes(status))) {
    return null;
  }

  return {
    userCompanyId,
    userId: isHrUser ? user.user_id ?? null : user.userId ?? null,
    name,
    email: user.email,
  };
}

export function ownerOptionValue(owner: SalesOwnerOption) {
  return `user-company:${owner.userCompanyId}`;
}

export function fallbackOwnerValue(ownerName: string, fallbackLabel = 'Sin asignar') {
  return `name:${ownerName || fallbackLabel}`;
}

export function getOwnerUserCompanyIdFromValue(value: string) {
  if (!value.startsWith('user-company:')) {
    return null;
  }

  const userCompanyId = Number(value.replace('user-company:', ''));
  return Number.isFinite(userCompanyId) ? userCompanyId : null;
}
