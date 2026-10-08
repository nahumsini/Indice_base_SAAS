import { redirect } from 'react-router';
import { isAdminAccessRole, normalizeAccessRole } from '../access/accessRules';
import { authApi, type AuthSessionResponse } from '../api/auth';
import { apiClient, ApiClientError } from '../lib/apiClient';

export type TrainingRouteData = { portal: 'root' | 'distributor' };

/** Navigation visibility only. The training backend remains the authorization authority. */
export function canDiscoverTraining(session: AuthSessionResponse | null | undefined, platformRole = '') {
  if (!session || session.demoMode) return false;
  return Boolean(platformRole)
    || normalizeAccessRole(session.user.role) === 'root'
    || (session.company.commercial_account_type === 'DISTRIBUTOR' && isAdminAccessRole(session.user.role));
}

/** Legacy links must enter the new guarded route, not load the platform administrator. */
export function getLegacyTrainingDestination(url: string): '/training' | null {
  const { pathname, searchParams } = new URL(url);
  return (pathname === '/platform-admin' && searchParams.get('section') === 'training')
    || (pathname === '/distributor-portal' && searchParams.get('tab') === 'training')
    ? '/training' : null;
}

export async function requireTrainingSession(): Promise<TrainingRouteData | Response> {
  try {
    const session = await authApi.getSessionOrNull();
    if (!session) return redirect('/login');
    if (session.demoMode) return redirect('/dashboard');

    // The active authenticated company selects the boundary, never URL or browser preferences.
    // A rejected distributor must not fall back to platform-wide training authority.
    const portal = session.company.commercial_account_type === 'DISTRIBUTOR' ? 'distributor' : 'root';
    const basePath = portal === 'distributor'
      ? '/api/v1/distributor-portal/training'
      : '/api/v1/platform-admin/training';
    await apiClient(basePath);
    return { portal };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return redirect('/login');
    if (error instanceof ApiClientError && error.status === 403) return redirect('/dashboard');
    throw error;
  }
}
