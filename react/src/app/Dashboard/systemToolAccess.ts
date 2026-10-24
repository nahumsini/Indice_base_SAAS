import type { AuthSessionResponse } from '../api/auth.types';
import { isAdminAccessRole, normalizeAccessRole } from '../access/accessRules';
import { canAccessKioskCenter, canAccessModuleTab } from '../access/tabScopeCatalog';
import { canDiscoverTraining } from '../Training/trainingAccess';

/** Mirrors the existing entry-point rules without granting any new authority. */
export function getSystemToolVisibility(session: AuthSessionResponse | null | undefined, platformRole = '') {
  const active = Boolean(session && !session.demoMode);
  const admin = active && isAdminAccessRole(session?.user.role);
  return {
    files: active && session?.company.subscription?.access_allowed !== false,
    connectAi: admin && canAccessModuleTab('home-panel', 'integrations', session),
    kioskCenter: admin && canAccessKioskCenter(session),
    subscription: admin,
    platformAdmin: admin && (platformRole === 'PLATFORM_ROOT' || normalizeAccessRole(session?.user.role) === 'root'),
    training: active && canDiscoverTraining(session, platformRole),
  };
}
