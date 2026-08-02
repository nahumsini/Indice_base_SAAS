import type { PageId } from '../config/navigation';

export type HomePanelTabId =
  | 'profile'
  | 'business-structure'
  | 'business-profile'
  | 'personal-performance'
  | 'users'
  | 'plan';

export type HumanResourcesTabId =
  | 'collaborators'
  | 'attendance'
  | 'control'
  | 'payroll'
  | 'announcements'
  | 'assets'
  | 'records'
  | 'permissions'
  | 'incentives'
  | 'kpis';

export type TabPermissionKey =
  | `config_center.${HomePanelTabId}`
  | `human_resources.${HumanResourcesTabId}`;

const ADMIN_ROLES = new Set(['root', 'superadmin', 'admin', 'owner', 'dueno']);
const HR_MANAGEMENT_ROLES = new Set(['root', 'superadmin', 'admin', 'owner', 'dueno', 'manager', 'approver']);
const UNRESTRICTED_TAB_ROLES = new Set(['root', 'superadmin']);
const PERSONAL_HOME_PANEL_TABS = new Set<HomePanelTabId>(['profile', 'personal-performance']);
const PERSONAL_HR_TABS = new Set<HumanResourcesTabId>([
  'attendance',
  'control',
  'announcements',
  'assets',
  'permissions',
]);

export const normalizeAccessRole = (role: string | null | undefined) => {
  const normalized = (role ?? '').trim().toLowerCase();
  if (normalized === 'super admin') {
    return 'superadmin';
  }
  if (normalized === 'dueño') {
    return 'dueno';
  }
  return normalized;
};

export const isAdminAccessRole = (role: string | null | undefined) => (
  ADMIN_ROLES.has(normalizeAccessRole(role))
);

export const isHrManagementRole = (role: string | null | undefined) => (
  HR_MANAGEMENT_ROLES.has(normalizeAccessRole(role))
);

export const hasUnrestrictedTabAccess = (role: string | null | undefined) => (
  UNRESTRICTED_TAB_ROLES.has(normalizeAccessRole(role))
);

export const homePanelTabPermissionKey = (tabId: HomePanelTabId): TabPermissionKey => (
  `config_center.${tabId}`
);

export const humanResourcesTabPermissionKey = (tabId: HumanResourcesTabId): TabPermissionKey => (
  `human_resources.${tabId}`
);

export const canAccessHomePanelTab = (
  role: string | null | undefined,
  tabId: HomePanelTabId,
  tabPermissionKeys?: readonly string[] | null,
  tabPermissionsConfigured = false,
) => {
  if (hasUnrestrictedTabAccess(role)) {
    return true;
  }
  const roleAllowsTab = tabId !== 'plan' && (isAdminAccessRole(role) || PERSONAL_HOME_PANEL_TABS.has(tabId));
  if (tabPermissionsConfigured) {
    return roleAllowsTab && (tabPermissionKeys ?? []).includes(homePanelTabPermissionKey(tabId));
  }

  return false;
};

export const canAccessHumanResourcesTab = (
  role: string | null | undefined,
  tabId: HumanResourcesTabId,
  tabPermissionKeys?: readonly string[] | null,
  tabPermissionsConfigured = false,
) => {
  const roleAllowsTab = isHrManagementRole(role) || PERSONAL_HR_TABS.has(tabId);
  if (hasUnrestrictedTabAccess(role)) {
    return true;
  }
  if (tabPermissionsConfigured) {
    return roleAllowsTab && (tabPermissionKeys ?? []).includes(humanResourcesTabPermissionKey(tabId));
  }

  return false;
};

export const canAccessModulePage = (
  page: PageId,
  allowedRoutes: ReadonlySet<PageId> | null,
) => (
  page === 'dashboard' || allowedRoutes === null || allowedRoutes.has(page)
);
