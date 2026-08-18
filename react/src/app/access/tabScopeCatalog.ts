import type { AuthSessionResponse } from '../api/auth.types';
import type { PageId } from '../config/navigation';

type TabScopeDefinition = {
  moduleSlug: string;
  tabs: Readonly<Record<string, string>>;
};

export const MODULE_TAB_SCOPE_CATALOG: Partial<Record<PageId, TabScopeDefinition>> = {
  'home-panel': {
    moduleSlug: 'config_center',
    tabs: {
      profile: 'profile',
      'business-structure': 'business-structure',
      'business-profile': 'business-profile',
      consulting: 'consulting',
      users: 'users',
    },
  },
  'human-resources': {
    moduleSlug: 'human_resources',
    tabs: {
      collaborators: 'collaborators',
      attendance: 'attendance',
      control: 'control',
      payroll: 'payroll',
      announcements: 'announcements',
      assets: 'assets',
      records: 'records',
      permissions: 'permissions',
      incentives: 'incentives',
      kpis: 'kpis',
    },
  },
  'processes-tasks': {
    moduleSlug: 'processes',
    tabs: { calendar: 'calendar', projects: 'projects', processes: 'processes', kpis: 'kpis' },
  },
  expenses: {
    moduleSlug: 'expenses',
    tabs: {
      expenses: 'expenses',
      budgets: 'budgets',
      providers: 'providers',
      accounting: 'accounting',
      payment_accounts: 'payment-accounts',
      kpis: 'kpis',
    },
  },
  'petty-cash': {
    moduleSlug: 'petty_cash',
    tabs: { cash: 'cash', control: 'control', statements: 'statements', kpis: 'kpis' },
  },
  sales: {
    moduleSlug: 'crm',
    tabs: {
      leads: 'leads',
      contacts: 'contacts',
      quotes: 'quotes',
      sales: 'sales',
      commissions: 'sales',
      'payment-accounts': 'sales',
      contracts: 'contracts',
      kpis: 'kpis',
    },
  },
  'point-of-sale': {
    moduleSlug: 'pos',
    tabs: {
      sale: 'sale',
      cortes: 'cortes',
      clientes: 'clientes',
      kpis: 'kpis',
      kiosks: 'kiosks',
      cajas: 'cajas',
    },
  },
  inventory: {
    moduleSlug: 'inventory',
    tabs: {
      products: 'products',
      inventory: 'inventory',
      warehouses: 'inventory',
      providers: 'providers',
      'purchase-orders': 'purchase-orders',
      discounts: 'products',
    },
  },
  receivables: {
    moduleSlug: 'receivables',
    tabs: {
      'credit-sales': 'credit-sales',
      'accounts-receivable': 'accounts-receivable',
      payments: 'payments',
      'credit-customers': 'credit-customers',
    },
  },
  kpis: {
    moduleSlug: 'kpis',
    tabs: {
      kpis: 'kpis',
      'accounting-reports': 'accounting-reports',
      'automated-reports': 'automated-reports',
    },
  },
};

const UNRESTRICTED_ROLES = new Set(['root', 'superadmin']);
const ADMIN_ROLES = new Set(['root', 'superadmin', 'admin', 'owner', 'dueno']);
const HR_MANAGEMENT_ROLES = new Set(['root', 'superadmin', 'admin', 'owner', 'dueno', 'manager', 'approver']);
const PERSONAL_HOME_TABS = new Set(['profile']);
const PERSONAL_HR_TABS = new Set(['attendance', 'control', 'announcements', 'assets', 'permissions']);
const USER_SELF_SERVICE_SCOPES = new Set([
  'config_center.profile',
  'human_resources.attendance',
  'human_resources.control',
  'human_resources.announcements',
  'human_resources.assets',
  'human_resources.permissions',
]);

export function normalizeTabScopeRole(role: string | null | undefined) {
  const normalized = (role ?? '').trim().toLowerCase();
  return normalized === 'super admin' ? 'superadmin' : normalized;
}

export function tabPermissionKey(page: PageId, tabId: string) {
  const definition = MODULE_TAB_SCOPE_CATALOG[page];
  const tabKey = definition?.tabs[tabId];
  return definition && tabKey ? `${definition.moduleSlug}.${tabKey}` : null;
}

export function canAccessModuleTab(
  page: PageId,
  tabId: string,
  session: AuthSessionResponse | null | undefined,
) {
  const permissionKey = tabPermissionKey(page, tabId);
  if (!permissionKey) {
    return true;
  }
  if (UNRESTRICTED_ROLES.has(normalizeTabScopeRole(session?.user.role))) {
    return true;
  }
  const role = normalizeTabScopeRole(session?.user.role);
  if (page === 'home-panel' && !ADMIN_ROLES.has(role) && !PERSONAL_HOME_TABS.has(tabId)) {
    return false;
  }
  if (page === 'human-resources' && !HR_MANAGEMENT_ROLES.has(role) && !PERSONAL_HR_TABS.has(tabId)) {
    return false;
  }
  if (!session?.user.tab_permissions_configured) {
    return false;
  }
  return (session.user.tab_permission_keys ?? []).includes(permissionKey);
}

export function allowedModuleTabIds(
  page: PageId,
  tabIds: readonly string[],
  session: AuthSessionResponse | null | undefined,
) {
  return tabIds.filter((tabId) => canAccessModuleTab(page, tabId, session));
}

export function isTabScopeAssignableToRole(permissionKey: string, role: string | null | undefined) {
  const normalizedRole = normalizeTabScopeRole(role);
  if (UNRESTRICTED_ROLES.has(normalizedRole)) {
    return true;
  }
  if (permissionKey === 'config_center.plan') {
    return false;
  }
  if (normalizedRole !== 'user') {
    return true;
  }
  if (!permissionKey.startsWith('config_center.') && !permissionKey.startsWith('human_resources.')) {
    return true;
  }
  return USER_SELF_SERVICE_SCOPES.has(permissionKey);
}
