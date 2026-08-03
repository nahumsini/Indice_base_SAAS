import { type ReactElement, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  Layers3,
  Mail,
  Settings,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import {
  IndiceModalFrame,
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from '../../../components/indice-modal';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { useLanguage } from '../../../shared/context';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { authApi } from '../../../api/auth';
import { billingApi, type BillingSubscriptionResponse } from '../../../api/billing';
import {
  configCenterApi,
  type ConfigCenterCatalogBusiness,
  type ConfigCenterCatalogModule,
  type ConfigCenterCatalogTab,
  type ConfigCenterCatalogUnit,
  type ConfigCenterEmployeeKiosk,
  type ConfigCenterUser,
} from '../../../api/configCenter';
import { ApiClientError } from '../../../lib/apiClient';
import { isTabScopeAssignableToRole } from '../../../access/tabScopeCatalog';
import {
  backendSlugForRoute,
  mapBackendModuleToCard,
  routeForBackendSlug,
  type DashboardModuleCategory,
  type DashboardModuleColor,
} from '../../../config/moduleCatalog';
import { validateEmail } from '../../../shared/validation/email';
import { UsersTabPermissionPicker } from './UsersTabPermissionPicker';
import { UsersKioskPermissionPicker } from './UsersKioskPermissionPicker';
import {
  buildTabPermissionModuleOptions,
  mergeDefaultTabPermissions,
  pruneTabPermissionKeysForModules,
} from './usersTabPermissionAssignments';
import { UsersFeedback } from './components/UsersFeedback';
import { UsersFilters } from './components/UsersFilters';
import { UsersKpiStrip } from './components/UsersKpiStrip';
import { getUsersTranslations } from './usersTranslations';
import { DashboardTitleBar } from '../components/DashboardTitleBar';

interface User {
  id: string;
  backendId: number;
  source: 'user' | 'invitation';
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: 'Super Admin' | 'Admin' | 'User';
  status: 'active' | 'pending' | 'inactive';
  unitId: number | null;
  unitName: string;
  businessId: number | null;
  businessName: string;
  scopeType: 'corporate_office' | 'unit_headquarters' | 'business_office';
  modules: string[];
  tabPermissionKeys: string[];
  kioskDefinitionIds: number[];
  isProtected: boolean;
  capabilities: {
    canEditAccess: boolean;
    canActivate: boolean;
    canDeactivate: boolean;
    canResendInvitation: boolean;
    canCancelInvitation: boolean;
  };
}

interface AvailableModule {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  color: DashboardModuleColor;
  category: DashboardModuleCategory;
  lifecycleStatus: 'planned' | 'development' | 'pilot' | 'released' | 'retired';
  accessModel: 'module' | 'tabs';
  assignable: boolean;
  entitled: boolean;
  description: string;
}

interface InviteFormState {
  name: string;
  email: string;
  role: User['role'];
  scopeType: User['scopeType'];
  businessUnitId: string;
  businessId: string;
}

interface BusinessUnitOption {
  id: string;
  name: string;
}

interface BusinessOption {
  id: string;
  unitId: string;
  name: string;
}

interface InviteEmailStatus {
  sent: boolean;
  status: string;
  message?: string;
}

type SortColumn = 'name' | 'role' | 'scope' | 'modules' | 'status';
type SortDirection = 'asc' | 'desc';
type SortState = {
  column: SortColumn;
  direction: SortDirection;
} | null;
type InviteWizardStep = 'identity' | 'organization' | 'access';

const inputClassName =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const emptyInviteForm: InviteFormState = {
  name: '',
  email: '',
  role: 'User',
  scopeType: 'business_office',
  businessUnitId: '',
  businessId: '',
};

export default function Users() {
  const { currentLanguage, t } = useLanguage();
  const usersCopy = useMemo(
    () => getUsersTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
  const [users, setUsers] = useState<User[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([]);
  const [availableUnits, setAvailableUnits] = useState<BusinessUnitOption[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessOption[]>([]);
  const [catalogTabs, setCatalogTabs] = useState<ConfigCenterCatalogTab[]>([]);
  const [availableEmployeeKiosks, setAvailableEmployeeKiosks] = useState<ConfigCenterEmployeeKiosk[]>([]);
  const [sortState, setSortState] = useState<SortState>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserForModules, setSelectedUserForModules] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteWizardStep, setInviteWizardStep] = useState<InviteWizardStep>('identity');
  const [inviteValidationMessage, setInviteValidationMessage] = useState('');
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedUserForResend, setSelectedUserForResend] = useState<string | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<string | null>(null);
  const [selectedUserForDeactivate, setSelectedUserForDeactivate] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteEmailStatus, setInviteEmailStatus] = useState<InviteEmailStatus | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(emptyInviteForm);
  const [inviteModuleIds, setInviteModuleIds] = useState<string[]>([]);
  const [inviteTabPermissionKeys, setInviteTabPermissionKeys] = useState<string[]>([]);
  const [inviteKioskDefinitionIds, setInviteKioskDefinitionIds] = useState<number[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState('');
  const [subscription, setSubscription] = useState<BillingSubscriptionResponse | null>(null);
  const [pageCapabilities, setPageCapabilities] = useState({
    canManageUsers: false,
    canInvite: false,
    canAssignSuperAdmin: false,
  });
  const [loadingOverlay, setLoadingOverlay] = useState<{
    isVisible: boolean;
    title: string;
    description?: string;
  }>({
    isVisible: false,
    title: '',
  });
  const [selectedModulesDraft, setSelectedModulesDraft] = useState<string[]>([]);
  const [selectedTabPermissionDraft, setSelectedTabPermissionDraft] = useState<string[]>([]);
  const [selectedKioskDefinitionDraft, setSelectedKioskDefinitionDraft] = useState<number[]>([]);
  const [selectedRoleDraft, setSelectedRoleDraft] = useState<User['role']>('User');
  const [selectedScopeTypeDraft, setSelectedScopeTypeDraft] = useState<User['scopeType']>('business_office');
  const [selectedUnitDraft, setSelectedUnitDraft] = useState('');
  const [selectedBusinessDraft, setSelectedBusinessDraft] = useState('');
  const usersBusinessCopy = t.panelInicial.users.businessStructure;
  const businessUnitOptions = availableUnits.map((unit) => ({
    value: unit.id,
    label: unit.name,
  }));
  const businessFilterOptions = useMemo(() => (
    availableBusinesses
      .filter((business) => !unitFilter || business.unitId === unitFilter)
      .map((business) => ({ value: business.id, label: business.name }))
  ), [availableBusinesses, unitFilter]);
  const tabPermissionModules = useMemo(
    () => buildTabPermissionModuleOptions(availableModules),
    [availableModules],
  );
  const canAssignSuperAdmin = pageCapabilities.canAssignSuperAdmin || isSuperAdminRole(currentUserRole);
  const currentAccessUser = users.find((user) =>
    user.source === 'user' && user.backendId === currentUserId
  ) ?? null;
  const assignableModules = useMemo(() => {
    if (canAssignSuperAdmin) {
      return availableModules;
    }
    if (!isAdminRole(currentUserRole) || !currentAccessUser) {
      return [];
    }

    const allowedModuleIds = new Set(currentAccessUser.modules);
    return availableModules.filter((module) => allowedModuleIds.has(module.id));
  }, [availableModules, canAssignSuperAdmin, currentAccessUser, currentUserRole]);
  const assignableTabPermissionKeys = useMemo(() => {
    if (canAssignSuperAdmin) {
      return new Set(catalogTabs.map((tab) => tab.permission_key));
    }
    return new Set(currentAccessUser?.tabPermissionKeys ?? []);
  }, [canAssignSuperAdmin, catalogTabs, currentAccessUser]);
  const assignableCatalogTabs = useMemo(() => (
    canAssignSuperAdmin
      ? catalogTabs
      : catalogTabs.filter((tab) => assignableTabPermissionKeys.has(tab.permission_key))
  ), [assignableTabPermissionKeys, canAssignSuperAdmin, catalogTabs]);
  const assignableTabPermissionModules = useMemo(
    () => buildTabPermissionModuleOptions(assignableModules),
    [assignableModules],
  );
  const assignableBusinessUnitOptions = useMemo(() => {
    if (canAssignSuperAdmin || !currentAccessUser) {
      return businessUnitOptions;
    }
    if (!isAdminRole(currentUserRole)) {
      return [];
    }
    if (currentAccessUser.unitId == null) {
      return businessUnitOptions;
    }

    return businessUnitOptions.filter((option) => option.value === String(currentAccessUser.unitId));
  }, [businessUnitOptions, canAssignSuperAdmin, currentAccessUser, currentUserRole]);
  const assignableBusinesses = useMemo(() => {
    if (canAssignSuperAdmin || !currentAccessUser) {
      return availableBusinesses;
    }
    if (!isAdminRole(currentUserRole)) {
      return [];
    }
    if (currentAccessUser.businessId != null) {
      return availableBusinesses.filter((business) => business.id === String(currentAccessUser.businessId));
    }
    if (currentAccessUser.unitId != null) {
      return availableBusinesses.filter((business) => business.unitId === String(currentAccessUser.unitId));
    }

    return availableBusinesses;
  }, [availableBusinesses, canAssignSuperAdmin, currentAccessUser, currentUserRole]);
  const inviteBusinessOptions = assignableBusinesses.filter((business) =>
    !inviteForm.businessUnitId || business.unitId === inviteForm.businessUnitId
  );
  const selectedBusinessOptions = assignableBusinesses.filter((business) =>
    !selectedUnitDraft || business.unitId === selectedUnitDraft
  );
  const assignableScopeTypes = useMemo<User['scopeType'][]>(() => {
    if (canAssignSuperAdmin || !currentAccessUser || currentAccessUser.scopeType === 'corporate_office') {
      return ['corporate_office', 'unit_headquarters', 'business_office'];
    }
    if (currentAccessUser.scopeType === 'unit_headquarters') {
      return ['unit_headquarters', 'business_office'];
    }
    return ['business_office'];
  }, [canAssignSuperAdmin, currentAccessUser]);
  const selectedEditScopeIsValid = selectedScopeTypeDraft === 'corporate_office'
    || (selectedScopeTypeDraft === 'unit_headquarters' && Boolean(selectedUnitDraft))
    || (selectedScopeTypeDraft === 'business_office' && Boolean(selectedUnitDraft && selectedBusinessDraft));

  const statusLabelMap: Record<User['status'], string> = {
    active: t.panelInicial.users.status.active,
    pending: t.panelInicial.users.status.pending,
    inactive: t.panelInicial.users.status.inactive,
  };

  const summaryLabels = {
    total: usersCopy.total,
    noResults: usersCopy.noResults,
    inviteSuccess: usersCopy.inviteSuccess,
    inviteCreated: usersCopy.inviteCreated,
    resendSuccess: usersCopy.resendSuccess,
    resendCreated: usersCopy.resendCreated,
  };
  const closeLabel = usersCopy.close;
  const resendEmailLabel = usersCopy.resendEmailLabel;
  const resendEmailHint = usersCopy.resendEmailHint;
  const deleteLabel = usersCopy.delete;
  const deletingLabel = usersCopy.deleting;
  const currentUserBadgeLabel = usersCopy.currentUser;

  const filteredUsers = useMemo(() => users.filter((user) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch === '' ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    const matchesStatus = statusFilter === '' || user.status === statusFilter;
    const matchesUnit = unitFilter === '' || String(user.unitId ?? '') === unitFilter;
    const matchesBusiness = businessFilter === '' || String(user.businessId ?? '') === businessFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesUnit && matchesBusiness;
  }), [businessFilter, roleFilter, searchTerm, statusFilter, unitFilter, users]);
  const sortedUsers = useMemo(() => {
    if (!sortState) {
      return filteredUsers;
    }

    const valueFor = (user: User): string | number => {
      switch (sortState.column) {
        case 'name': return user.name.toLocaleLowerCase();
        case 'role': return user.role;
        case 'scope': return `${user.unitName} ${user.businessName}`.toLocaleLowerCase();
        case 'modules': return user.modules.length;
        case 'status': return user.status;
      }
    };

    return [...filteredUsers].sort((left, right) => {
      const leftValue = valueFor(left);
      const rightValue = valueFor(right);
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), currentLanguage.code, { sensitivity: 'base' });
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [currentLanguage.code, filteredUsers, sortState]);
  const usersPaginationResetKey = useMemo(
    () => `${searchTerm}:${unitFilter}:${businessFilter}:${roleFilter}:${statusFilter}:${filteredUsers.map(user => user.id).join('|')}`,
    [businessFilter, filteredUsers, roleFilter, searchTerm, statusFilter, unitFilter],
  );
  const usersPagination = useTablePagination({
    resetKey: usersPaginationResetKey,
    rows: sortedUsers,
  });
  const usersPaginationCopy = usersCopy.pagination;

  const selectedUser = users.find((user) => user.id === selectedUserForModules) ?? null;
  const resendUser = users.find((user) => user.id === selectedUserForResend) ?? null;
  const selectedUserCatalogTabs = selectedUser
    ? catalogTabsForRole(selectedRoleDraft, assignableCatalogTabs)
    : assignableCatalogTabs;
  const inviteCatalogTabs = catalogTabsForRole(inviteForm.role, assignableCatalogTabs);
  const invitationPendingDelete =
    users.find((user) => user.id === selectedUserForDelete && user.source === 'invitation') ?? null;
  const userPendingDeactivation =
    users.find((user) => user.id === selectedUserForDeactivate && user.source === 'user') ?? null;
  const inviteWizardCopy = usersCopy.inviteWizard;
  const inviteWizardSteps = [
    { id: 'identity', label: inviteWizardCopy.identity },
    { id: 'organization', label: inviteWizardCopy.organization },
    { id: 'access', label: inviteWizardCopy.access },
  ] as const;
  const activeInviteStepIndex = inviteWizardSteps.findIndex((step) => step.id === inviteWizardStep);
  const inviteIdentityIsValid = Boolean(
    inviteForm.name.trim()
    && inviteForm.email.trim()
    && validateEmail(inviteForm.email.trim()).ok,
  );
  const inviteOrganizationIsValid = inviteForm.scopeType === 'corporate_office'
    || (inviteForm.scopeType === 'unit_headquarters' && Boolean(inviteForm.businessUnitId))
    || (inviteForm.scopeType === 'business_office' && Boolean(inviteForm.businessUnitId && inviteForm.businessId));
  const inviteAccessIsValid = inviteModuleIds.length > 0;

  const continueInviteWizard = () => {
    setInviteValidationMessage('');
    if (inviteWizardStep === 'identity') {
      if (!inviteIdentityIsValid) {
        setInviteValidationMessage(inviteWizardCopy.identityError);
        return;
      }
      setInviteWizardStep('organization');
      return;
    }
    if (inviteWizardStep === 'organization') {
      if (!inviteOrganizationIsValid) {
        setInviteValidationMessage(inviteWizardCopy.organizationError);
        return;
      }
      setInviteWizardStep('access');
    }
  };

  const goBackInviteWizard = () => {
    setInviteValidationMessage('');
    setInviteWizardStep(inviteWizardStep === 'access' ? 'organization' : 'identity');
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === 'active').length;
  const pendingUsers = users.filter((user) => user.status === 'pending').length;
  const inactiveUsers = users.filter((user) => user.status === 'inactive').length;
  const seatLimitReached = Boolean(subscription?.seat_limit_enforced && subscription.remaining_seats <= 0);
  const activeSeatCount = subscription?.active_seats ?? activeUsers;
  const pendingSeatCount = subscription?.pending_invitations ?? pendingUsers;
  const availableSeatCount = subscription?.seat_limit_enforced
    ? subscription.remaining_seats
    : Math.max(0, totalUsers - activeUsers);

  const hideLoadingOverlay = () => {
    setLoadingOverlay({
      isVisible: false,
      title: '',
      description: '',
    });
  };

  const runUserFeedbackTask = async ({
    title,
    description,
    task,
    minimumDurationMs = 900,
  }: {
    title: string;
    description?: string;
    task: () => Promise<void>;
    minimumDurationMs?: number;
  }) => {
    setLoadingOverlay({
      isVisible: true,
      title,
      description,
    });

    try {
      await runWithMinimumDuration(task(), minimumDurationMs);
    } finally {
      hideLoadingOverlay();
    }
  };

  const getRoleColorClasses = (role: User['role']) => {
    const styles: Record<User['role'], string> = {
      'Super Admin': 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      Admin: 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
      User: 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };

    return styles[role];
  };

  const getStatusConfig = (status: User['status']) => {
    const styles = {
      active: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800/60',
        dot: 'bg-green-500',
      },
      pending: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800/60',
        dot: 'bg-yellow-500',
      },
      inactive: {
        bg: 'bg-gray-50 dark:bg-gray-700/40',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-600',
        dot: 'bg-gray-500',
      },
    };

    return styles[status];
  };

  const refreshUsers = async () => {
    const [response, nextSubscription] = await Promise.all([
      configCenterApi.getUsers(),
      billingApi.subscription().catch(() => null),
    ]);
    const mappedUnits = response.catalog.units.map(mapCatalogUnit);
    const mappedBusinesses = response.catalog.businesses.map(mapCatalogBusiness);
    const mappedModules = response.catalog.modules
      .map((module) => mapCatalogModule(module, t))
      .filter((module): module is AvailableModule => module !== null);
    const mappedUsers = response.users.map((user) => mapBackendUser(user, mappedModules));

    setUsers(mappedUsers);
    setSubscription(nextSubscription);
    setPageCapabilities({
      canManageUsers: response.capabilities?.can_manage_users ?? false,
      canInvite: response.capabilities?.can_invite ?? false,
      canAssignSuperAdmin: response.capabilities?.can_assign_super_admin ?? false,
    });
    setAvailableUnits(mappedUnits);
    setAvailableBusinesses(mappedBusinesses);
    setCatalogTabs(response.catalog.tabs ?? []);
    setAvailableEmployeeKiosks(response.catalog.employee_kiosks ?? []);
    setAvailableModules(mappedModules);
  };

  useEffect(() => {
    let active = true;

    setAvailableModules([]);
    setIsLoading(true);
    setLoadError('');

    runWithMinimumDuration(Promise.all([
      configCenterApi.getCurrentUser(),
      configCenterApi.getUsers(),
      authApi.getSessionOrNull().catch(() => null),
      billingApi.subscription().catch(() => null),
    ]))
      .then(([currentUser, response, session, nextSubscription]) => {
        if (!active) {
          return;
        }

        setCurrentUserId(currentUser.id);
        setCurrentUserRole(currentUser.role ?? null);
        setActiveCompanyName(session?.company.name ?? '');
        setSubscription(nextSubscription);
        setPageCapabilities({
          canManageUsers: response.capabilities?.can_manage_users
            ?? (isSuperAdminRole(currentUser.role) || isAdminRole(currentUser.role)),
          canInvite: response.capabilities?.can_invite
            ?? (isSuperAdminRole(currentUser.role) || isAdminRole(currentUser.role)),
          canAssignSuperAdmin: response.capabilities?.can_assign_super_admin
            ?? isSuperAdminRole(currentUser.role),
        });
        const mappedUnits = response.catalog.units.map(mapCatalogUnit);
        const mappedBusinesses = response.catalog.businesses.map(mapCatalogBusiness);
        const mappedModules = response.catalog.modules
          .map((module) => mapCatalogModule(module, t))
          .filter((module): module is AvailableModule => module !== null);
        const mappedUsers = response.users.map((user) => mapBackendUser(user, mappedModules));

        setUsers(mappedUsers);
        setAvailableUnits(mappedUnits);
        setAvailableBusinesses(mappedBusinesses);
        setCatalogTabs(response.catalog.tabs ?? []);
        setAvailableEmployeeKiosks(response.catalog.employee_kiosks ?? []);
        setAvailableModules(mappedModules);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setAvailableModules([]);
        setLoadError(error instanceof Error ? error.message : usersCopy.errors.load);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [t, usersCopy.errors.load]);

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteForm(emptyInviteForm);
    setInviteModuleIds([]);
    setInviteTabPermissionKeys([]);
    setInviteLink('');
    setInviteEmailStatus(null);
    setCopiedLink(false);
    setInviteWizardStep('identity');
    setInviteValidationMessage('');
  };

  const closeResendModal = () => {
    setShowResendModal(false);
    setSelectedUserForResend(null);
    setInviteLink('');
    setInviteEmailStatus(null);
    setCopiedLink(false);
    setNewEmail('');
  };

  const toggleUserModule = (moduleId: string) => {
    const role = selectedRoleDraft;
    const roleCatalogTabs = catalogTabsForRole(role, assignableCatalogTabs);
    setSelectedModulesDraft((prevModules) => {
      const nextModules = prevModules.includes(moduleId)
        ? prevModules.filter((module) => module !== moduleId)
        : [...prevModules, moduleId];

      setSelectedTabPermissionDraft((currentKeys) =>
        prevModules.includes(moduleId)
          ? pruneTabPermissionKeysForModules(roleCatalogTabs, assignableTabPermissionModules, currentKeys, nextModules)
          : mergeDefaultTabPermissions(roleCatalogTabs, assignableTabPermissionModules, currentKeys, nextModules),
      );
      return nextModules;
    });
  };

  const moduleSlugsForIds = (moduleIds: string[]) => (
    moduleIds
      .map((route) => backendSlugForRoute(route as any))
      .filter((slug): slug is string => Boolean(slug))
  );

  const numberOrNull = (value?: string | number | null) => {
    if (value == null || value === '') {
      return null;
    }
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const eligibleKioskIds = (
    kioskIds: number[],
    moduleIds: string[],
    scopeType: User['scopeType'],
    unitValue: string | number | null,
    businessValue: string | number | null,
  ) => {
    const selectedModules = new Set(moduleIds);
    const unitId = scopeType === 'corporate_office' ? null : numberOrNull(unitValue);
    const businessId = scopeType === 'business_office' ? numberOrNull(businessValue) : null;
    return kioskIds.filter((id) => {
      const kiosk = availableEmployeeKiosks.find(candidate => candidate.id === id);
      if (!kiosk) return false;
      const route = routeForBackendSlug(kiosk.module_slug);
      if (!route || !selectedModules.has(route)) return false;
      if (scopeType === 'corporate_office') return true;
      if (kiosk.unit_id != null && kiosk.unit_id !== unitId) return false;
      if (businessId != null && kiosk.business_id != null && kiosk.business_id !== businessId) return false;
      return businessId == null || kiosk.business_id == null || kiosk.business_id === businessId;
    });
  };

  const buildUserAccessPayload = (
    user: User,
    overrides: Partial<{
      role: User['role'];
      status: User['status'];
      moduleIds: string[];
      tabPermissionKeys: string[];
      kioskDefinitionIds: number[];
      scopeType: User['scopeType'];
      unitId: string | number | null;
      businessId: string | number | null;
    }> = {},
  ) => {
    const moduleIds = overrides.moduleIds ?? user.modules;
    const role = overrides.role ?? user.role;
    const tabPermissionKeys = pruneTabPermissionKeysForRole(
      role,
      overrides.tabPermissionKeys ?? user.tabPermissionKeys,
    );
    const scopeType = overrides.scopeType ?? user.scopeType;
    const unitId = overrides.unitId ?? user.unitId;
    const businessId = overrides.businessId ?? user.businessId;
    return {
      role: toBackendRole(role),
      status: overrides.status ?? user.status,
      module_slugs: moduleSlugsForIds(moduleIds),
      tab_permission_keys: tabPermissionKeys,
      kiosk_definition_ids: eligibleKioskIds(
        overrides.kioskDefinitionIds ?? user.kioskDefinitionIds,
        moduleIds,
        scopeType,
        unitId,
        businessId,
      ),
      unit_id: numberOrNull(unitId),
      business_id: numberOrNull(businessId),
    };
  };

  const canEditAccessFor = (user: User) => user.source === 'user' && user.capabilities.canEditAccess;

  const handleActivateUser = async (user: User) => {
    if (!user.capabilities.canActivate) return;
    try {
      setLoadError('');
      await runUserFeedbackTask({
        title: usersCopy.overlays.activatingTitle,
        description: usersCopy.overlays.activatingDescription,
        task: async () => {
          await configCenterApi.activateUser(user.backendId);
          await refreshUsers();
        },
      });
    } catch (error) {
      setLoadError(formatApiError(error, usersCopy.errors.status));
    }
  };

  const handleSendInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pageCapabilities.canInvite || seatLimitReached) {
      return;
    }
    const trimmedName = inviteForm.name.trim();
    const trimmedEmail = inviteForm.email.trim();

    if (!trimmedName || !trimmedEmail || !inviteOrganizationIsValid || inviteModuleIds.length === 0) {
      setInviteValidationMessage(usersCopy.inviteWizard.accessError);
      return;
    }

    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.ok) {
      setInviteValidationMessage(t.loginPage.emailError);
      return;
    }

    try {
      setLoadError('');
      setInviteValidationMessage('');
      await runUserFeedbackTask({
        title: usersCopy.overlays.sendingTitle,
        description: usersCopy.overlays.sendingDescription,
        task: async () => {
          const response = await configCenterApi.inviteUser({
            name: trimmedName,
            email: emailValidation.normalized,
            role: toBackendRole(inviteForm.role),
            unit_id: inviteForm.scopeType === 'corporate_office'
              ? null
              : numberOrNull(inviteForm.businessUnitId),
            business_id: inviteForm.scopeType === 'business_office'
              ? numberOrNull(inviteForm.businessId)
              : null,
            module_slugs: moduleSlugsForIds(inviteModuleIds),
            tab_permission_keys: pruneTabPermissionKeysForRole(
              inviteForm.role,
              pruneTabPermissionKeysForModules(
                inviteCatalogTabs,
                assignableTabPermissionModules,
                inviteTabPermissionKeys,
                inviteModuleIds,
              ),
            ),
            kiosk_definition_ids: eligibleKioskIds(
              inviteKioskDefinitionIds,
              inviteModuleIds,
              inviteForm.scopeType,
              inviteForm.businessUnitId,
              inviteForm.businessId,
            ),
          });
          await refreshUsers();
          setInviteLink(response.invite_link);
          setInviteEmailStatus({
            sent: response.email_sent,
            status: response.email_status,
            message: response.email_message,
          });
        },
      });
    } catch (error) {
      setLoadError(formatApiError(error, usersCopy.errors.sendInvitation));
    }
  };

  const handleResendInvite = async () => {
    if (!selectedUserForResend || !resendUser || resendUser.source !== 'invitation') {
      return;
    }

    const trimmedEmail = newEmail.trim();
    const validatedEmail = trimmedEmail ? validateEmail(trimmedEmail) : null;
    if (trimmedEmail) {
      if (!validatedEmail?.ok) {
        setLoadError(t.loginPage.emailError);
        return;
      }
    }

    try {
      setLoadError('');
      await runUserFeedbackTask({
        title: usersCopy.overlays.resendingTitle,
        description: usersCopy.overlays.resendingDescription,
        task: async () => {
          const response = await configCenterApi.resendInvitation(
            resendUser.backendId,
            validatedEmail?.ok ? validatedEmail.normalized : undefined,
          );
          await refreshUsers();
          setInviteLink(response.invite_link);
          setInviteEmailStatus({
            sent: response.email_sent,
            status: response.email_status,
            message: response.email_message,
          });
        },
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.resendInvitation);
    }
  };

  const closeDeleteDialog = () => {
    if (isDeletingUser) {
      return;
    }
    setSelectedUserForDelete(null);
  };

  const handleDeleteUser = async () => {
    if (!invitationPendingDelete || isDeletingUser) {
      return;
    }

    try {
      const pendingDelete = invitationPendingDelete;
      setIsDeletingUser(true);
      setLoadError('');
      setSelectedUserForDelete(null);
      await runUserFeedbackTask({
        title: usersCopy.overlays.deletingTitle,
        description: usersCopy.overlays.deletingDescription,
        task: async () => {
          await configCenterApi.deleteInvitation(pendingDelete.backendId);
          await refreshUsers();
        },
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.deleteInvitation);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const closeDeactivateDialog = () => {
    if (!isDeletingUser) {
      setSelectedUserForDeactivate(null);
    }
  };

  const handleDeactivateUser = async () => {
    if (!userPendingDeactivation?.capabilities.canDeactivate || isDeletingUser) {
      return;
    }

    try {
      const pendingDeactivation = userPendingDeactivation;
      setIsDeletingUser(true);
      setLoadError('');
      setSelectedUserForDeactivate(null);
      await runUserFeedbackTask({
        title: usersCopy.overlays.deactivatingTitle,
        description: usersCopy.overlays.deactivatingDescription,
        task: async () => {
          await configCenterApi.deleteUser(pendingDeactivation.backendId);
          await refreshUsers();
        },
      });
    } catch (error) {
      setLoadError(formatApiError(error, usersCopy.errors.status));
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleOpenModuleSettings = (user: User) => {
    if (!canEditAccessFor(user)) {
      return;
    }

    setSelectedUserForModules(user.id);
    setSelectedRoleDraft(user.role);
    setSelectedScopeTypeDraft(user.scopeType);
    setSelectedUnitDraft(user.unitId == null ? '' : String(user.unitId));
    setSelectedBusinessDraft(user.businessId == null ? '' : String(user.businessId));
    const allowedModuleIds = new Set(assignableModules.map((module) => module.id));
    setSelectedModulesDraft(user.modules.filter((moduleId) => allowedModuleIds.has(moduleId)));
    setSelectedTabPermissionDraft(
      pruneTabPermissionKeysForRole(
        user.role,
        user.tabPermissionKeys.filter((key) => assignableTabPermissionKeys.has(key)),
      ),
    );
    setSelectedKioskDefinitionDraft(user.kioskDefinitionIds);
  };

  const handleSaveSelectedModules = async () => {
    if (!selectedUser || !canEditAccessFor(selectedUser)) {
      setSelectedUserForModules(null);
      return;
    }

    try {
      setLoadError('');
      const tabPermissionKeys = pruneTabPermissionKeysForModules(
        selectedUserCatalogTabs,
        assignableTabPermissionModules,
        selectedTabPermissionDraft,
        selectedModulesDraft,
      );
      await configCenterApi.updateUser(
        selectedUser.backendId,
        buildUserAccessPayload(selectedUser, {
          role: selectedRoleDraft,
          moduleIds: selectedModulesDraft,
          tabPermissionKeys,
          kioskDefinitionIds: selectedKioskDefinitionDraft,
          scopeType: selectedScopeTypeDraft,
          unitId: selectedScopeTypeDraft === 'corporate_office' ? null : selectedUnitDraft,
          businessId: selectedScopeTypeDraft === 'business_office' ? selectedBusinessDraft : null,
        }),
      );
      await refreshUsers();
      setSelectedUserForModules(null);
    } catch (error) {
      setLoadError(formatApiError(error, usersCopy.errors.moduleAccess));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';

        try {
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
        } finally {
          textarea.remove();
        }
      }

      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error(usersCopy.errors.copyLink, error);
    }
  };

  const updateInviteForm = (field: keyof InviteFormState, value: string) => {
    if (field === 'role') {
      setInviteTabPermissionKeys((currentKeys) => pruneTabPermissionKeysForRole(value, currentKeys));
    }
    setInviteForm((prevForm) => ({
      ...prevForm,
      [field]: value,
      ...(field === 'businessUnitId' ? { businessId: '' } : {}),
      ...(field === 'scopeType' && value === 'corporate_office'
        ? { businessUnitId: '', businessId: '' }
        : {}),
      ...(field === 'scopeType' && value === 'unit_headquarters'
        ? { businessId: '' }
        : {}),
    }));
  };

  const toggleInviteModule = (moduleId: string) => {
    const roleCatalogTabs = catalogTabsForRole(inviteForm.role, assignableCatalogTabs);
    setInviteModuleIds((currentModuleIds) => {
      const nextModuleIds = currentModuleIds.includes(moduleId)
        ? currentModuleIds.filter((currentModuleId) => currentModuleId !== moduleId)
        : [...currentModuleIds, moduleId];

      setInviteTabPermissionKeys((currentKeys) =>
        currentModuleIds.includes(moduleId)
          ? pruneTabPermissionKeysForModules(roleCatalogTabs, assignableTabPermissionModules, currentKeys, nextModuleIds)
          : mergeDefaultTabPermissions(roleCatalogTabs, assignableTabPermissionModules, currentKeys, nextModuleIds),
      );
      return nextModuleIds;
    });
  };

  const formatSelectedModulesCount = usersCopy.selectedModules;

  const formatModulesCount = (count: number) => (
    `${count} ${count === 1 ? usersBusinessCopy.module : usersBusinessCopy.modules}`
  );

  const handleSortHeaderClick = (column: SortColumn) => {
    setSortState((currentSort) => {
      if (currentSort?.column === column) {
        return {
          column,
          direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return { column, direction: 'asc' };
    });
  };

  const renderSortIndicator = (column: SortColumn) => {
    const isActiveColumn = sortState?.column === column;

    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] leading-none">
        <span className={isActiveColumn && sortState.direction === 'asc' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-300 dark:text-gray-500'}>
          ↑
        </span>
        <span className={isActiveColumn && sortState.direction === 'desc' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-300 dark:text-gray-500'}>
          ↓
        </span>
      </span>
    );
  };

  const renderSortableHeader = (label: string, column: SortColumn) => (
    <button
      type="button"
      onClick={() => handleSortHeaderClick(column)}
      className="inline-flex items-center gap-1.5 transition-colors hover:text-blue-600 dark:hover:text-blue-300"
    >
      <span>{label}</span>
      {renderSortIndicator(column)}
    </button>
  );

  const scopeLabel = (user: User) => {
    if (user.scopeType === 'corporate_office') return usersCopy.scope.corporate;
    if (user.scopeType === 'unit_headquarters') return user.unitName || usersCopy.scope.unit;
    const uniqueNames = [user.unitName, user.businessName]
      .filter(Boolean)
      .filter((name, index, names) => (
        names.findIndex((candidate) => candidate.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()) === index
      ));
    return uniqueNames.join(' / ') || usersCopy.scope.business;
  };

  const withActionTooltip = (label: string, action: ReactElement) => (
    <Tooltip>
      <TooltipTrigger asChild>{action}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );

  const renderUserActions = (user: User) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {canEditAccessFor(user) ? (
        withActionTooltip(usersCopy.accessEditor.title, <button
          type="button"
          onClick={() => handleOpenModuleSettings(user)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 md:h-9 md:w-9 md:rounded-lg dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
          title={usersCopy.accessEditor.title}
          aria-label={usersCopy.accessEditor.title}
        >
          <Settings aria-hidden="true" className="h-4 w-4" />
        </button>)
      ) : null}
      {user.capabilities.canActivate ? (
        withActionTooltip(seatLimitReached ? usersCopy.seats.limitReached : usersCopy.actions.activate, <button
          type="button"
          onClick={() => void handleActivateUser(user)}
          disabled={seatLimitReached}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-9 md:rounded-lg dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
          title={seatLimitReached ? usersCopy.seats.limitReached : usersCopy.actions.activate}
          aria-label={usersCopy.actions.activate}
        >
          <UserCheck aria-hidden="true" className="h-4 w-4" />
        </button>)
      ) : null}
      {user.capabilities.canDeactivate ? (
        withActionTooltip(usersCopy.actions.deactivate, <button
          type="button"
          onClick={() => setSelectedUserForDeactivate(user.id)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 md:h-9 md:w-9 md:rounded-lg dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          title={usersCopy.actions.deactivate}
          aria-label={usersCopy.actions.deactivate}
        >
          <UserX aria-hidden="true" className="h-4 w-4" />
        </button>)
      ) : null}
      {user.capabilities.canResendInvitation ? (
        withActionTooltip(t.panelInicial.users.actions.resend, <button
          type="button"
          onClick={() => {
            setSelectedUserForResend(user.id);
            setShowResendModal(true);
            setInviteLink('');
            setInviteEmailStatus(null);
            setCopiedLink(false);
            setNewEmail('');
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 md:h-9 md:w-9 md:rounded-lg dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
          title={t.panelInicial.users.actions.resend}
          aria-label={t.panelInicial.users.actions.resend}
        >
          <Mail aria-hidden="true" className="h-4 w-4" />
        </button>)
      ) : null}
      {user.capabilities.canCancelInvitation ? (
        withActionTooltip(deleteLabel, <button
          type="button"
          onClick={() => setSelectedUserForDelete(user.id)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 md:h-9 md:w-9 md:rounded-lg dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>)
      ) : null}
    </div>
  );

  const renderInviteEmailStatus = () => {
    if (!inviteEmailStatus) {
      return null;
    }

    const isDisabled = inviteEmailStatus.status === 'disabled';
    const tone = inviteEmailStatus.sent
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
      : isDisabled
        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
        : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300';
    const title = inviteEmailStatus.sent
      ? usersCopy.emailSent
      : isDisabled
        ? usersCopy.emailDeliveryDisabled
        : usersCopy.emailNotSent;

    return (
      <div className={`flex gap-3 rounded-lg border p-3 text-sm ${tone}`}>
        <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 opacity-90">
            {inviteEmailStatus.message || usersCopy.statusFallback}
          </div>
        </div>
      </div>
    );
  };

  const titleBarActions = pageCapabilities.canInvite ? (
    <Button
      className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
      disabled={seatLimitReached}
      title={seatLimitReached ? usersCopy.seats.limitReached : undefined}
      onClick={() => {
        setInviteForm(emptyInviteForm);
        setInviteModuleIds([]);
        setInviteTabPermissionKeys([]);
        setInviteKioskDefinitionIds([]);
        setInviteLink('');
        setInviteEmailStatus(null);
        setCopiedLink(false);
        setInviteWizardStep('identity');
        setInviteValidationMessage('');
        setShowInviteModal(true);
      }}
    >
      <UserPlus className="w-4 h-4" />
      {t.panelInicial.users.invite}
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <UsersFeedback error={loadError} isLoading={isLoading} loadingLabel={usersCopy.loading} />

      <DashboardTitleBar
        actions={titleBarActions ?? undefined}
        emoji="👥"
        subtitle={t.panelInicial.users.subtitle}
        title={t.panelInicial.users.title}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid lg:grid-cols-[minmax(230px,0.75fr)_minmax(0,2.25fr)]">
          <div className="flex min-w-0 items-center gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/20 lg:border-b-0 lg:border-r">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
              <Building2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">{usersCopy.seats.activeCompany}</p>
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{activeCompanyName || usersCopy.seats.currentCompany}</p>
            </div>
          </div>

          <UsersKpiStrip items={[
            { label: usersCopy.seats.active, tone: 'green', value: activeSeatCount },
            { label: usersCopy.seats.pending, tone: 'yellow', value: pendingSeatCount },
            { label: usersCopy.seats.available, tone: 'blue', value: availableSeatCount },
            { label: t.panelInicial.users.filters.inactive, tone: 'slate', value: inactiveUsers },
          ]} />
        </div>
        {seatLimitReached ? (
          <p className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-5 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {usersCopy.seats.limitReached}
          </p>
        ) : null}
      </section>

      <UsersFilters
        allLabel={t.panelInicial.users.filters.all}
        businessFilter={businessFilter}
        businessLabel={usersBusinessCopy.business}
        businessOptions={businessFilterOptions}
        clearLabel={usersCopy.clearFilters}
        filterTitle={usersCopy.filters.title}
        hasActiveFilters={Boolean(searchTerm || unitFilter || businessFilter || roleFilter || statusFilter)}
        insightLabel={usersCopy.insight(filteredUsers.length, totalUsers)}
        onBusinessChange={setBusinessFilter}
        onClear={() => {
          setSearchTerm('');
          setUnitFilter('');
          setBusinessFilter('');
          setRoleFilter('');
          setStatusFilter('');
        }}
        onRoleChange={setRoleFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onUnitChange={(nextUnitId) => {
          setUnitFilter(nextUnitId);
          setBusinessFilter((currentBusinessId) => {
            if (!currentBusinessId) return '';
            const currentBusiness = availableBusinesses.find((business) => business.id === currentBusinessId);
            return !nextUnitId || currentBusiness?.unitId === nextUnitId ? currentBusinessId : '';
          });
        }}
        roleFilter={roleFilter}
        roleLabel={usersCopy.filters.role}
        roleOptions={[
          { value: 'Super Admin', label: t.panelInicial.users.roles.superAdmin },
          { value: 'Admin', label: t.panelInicial.users.roles.admin },
          { value: 'User', label: t.panelInicial.users.roles.user },
        ]}
        searchLabel={t.panelInicial.users.search}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        statusLabel={usersCopy.filters.status}
        statusOptions={[
          { value: 'active', label: t.panelInicial.users.status.active },
          { value: 'pending', label: t.panelInicial.users.status.pending },
          { value: 'inactive', label: t.panelInicial.users.status.inactive },
        ]}
        unitFilter={unitFilter}
        unitLabel={usersBusinessCopy.businessUnit}
        unitOptions={businessUnitOptions}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-3 p-4 md:hidden">
          {usersPagination.paginatedRows.length > 0 ? usersPagination.paginatedRows.map((user) => {
            const statusConfig = getStatusConfig(user.status);
            const isCurrentUser = user.source === 'user' && user.backendId === currentUserId;
            const initials = user.name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
            return (
              <article key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="flex items-start gap-3">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-11 w-11 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
                  ) : (
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm ${getRoleColorClasses(user.role)}`}>{initials}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                      {isCurrentUser ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{currentUserBadgeLabel}</span> : null}
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                    {statusLabelMap[user.status]}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{t.panelInicial.users.table.role}</p>
                    <p className="mt-0.5 truncate text-slate-700 dark:text-slate-200">{user.role === 'Super Admin' ? t.panelInicial.users.roles.superAdmin : user.role === 'Admin' ? t.panelInicial.users.roles.admin : t.panelInicial.users.roles.user}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{usersCopy.scope.label}</p>
                    <p className="mt-0.5 truncate text-slate-700 dark:text-slate-200">{scopeLabel(user)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatModulesCount(user.modules.length)}</span>
                  {renderUserActions(user)}
                </div>
              </article>
            );
          }) : (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{summaryLabels.noResults}</p>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[900px] w-full">
            <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {renderSortableHeader(t.panelInicial.users.table.name, 'name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {renderSortableHeader(t.panelInicial.users.table.role, 'role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {renderSortableHeader(usersCopy.scope.label, 'scope')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {renderSortableHeader(t.panelInicial.users.table.modules, 'modules')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {renderSortableHeader(t.panelInicial.users.table.status, 'status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t.panelInicial.users.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                usersPagination.paginatedRows.map((user) => {
                  const isCurrentUser = user.source === 'user' && user.backendId === currentUserId;
                  const initials = user.name
                    .split(' ')
                    .filter(Boolean)
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const statusConfig = getStatusConfig(user.status);

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                    >
                      <td className="px-6 py-3.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="h-9 w-9 rounded-full border border-gray-200 object-cover dark:border-gray-700"
                            />
                          ) : (
                            <div
                              className={`h-9 w-9 rounded-full ${getRoleColorClasses(
                                user.role,
                              )} flex items-center justify-center font-medium`}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.name}
                              {isCurrentUser ? (
                                <span className="ml-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                                  {currentUserBadgeLabel}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 align-middle whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getRoleColorClasses(user.role)}`}>
                          {user.role === 'Super Admin'
                            ? t.panelInicial.users.roles.superAdmin
                            : user.role === 'Admin'
                              ? t.panelInicial.users.roles.admin
                              : t.panelInicial.users.roles.user}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 align-middle">
                        <div className="max-w-[240px]">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{scopeLabel(user)}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{usersCopy.scope[user.scopeType]}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          {formatModulesCount(user.modules.length)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}></span>
                          {statusLabelMap[user.status]}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 align-middle whitespace-nowrap">
                        {renderUserActions(user)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {summaryLabels.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination
          currentPage={usersPagination.currentPage}
          itemLabel={usersPaginationCopy.itemLabel}
          labels={{
            next: usersPaginationCopy.next,
            page: (current, total) => `${current} / ${total}`,
            previous: usersPaginationCopy.previous,
            rowsPerPage: usersPaginationCopy.rowsPerPage,
            showing: usersPaginationCopy.showing,
          }}
          onPageChange={usersPagination.onPageChange}
          onPageSizeChange={usersPagination.onPageSizeChange}
          pageEnd={usersPagination.pageEnd}
          pageSize={usersPagination.pageSize}
          pageSizeOptions={usersPagination.pageSizeOptions}
          pageStart={usersPagination.pageStart}
          totalCount={usersPagination.totalCount}
          totalPages={usersPagination.totalPages}
        />
      </section>

      {selectedUser && (
        <IndiceModalFrame
          bodyClassName="px-5 py-5 sm:px-7"
          contentClassName="max-h-[88dvh] sm:max-w-5xl"
          description={selectedUser.name}
          footer={(
            <Button
              onClick={handleSaveSelectedModules}
              disabled={selectedModulesDraft.length === 0 || !selectedEditScopeIsValid}
            >
              {t.panelInicial.users.modal.save}
            </Button>
          )}
          footerLeading={(
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedUserForModules(null)}
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-medium text-slate-600 hover:bg-white/90"
            >
              {t.panelInicial.users.modal.cancel}
            </Button>
          )}
          footerSummary={`${usersCopy.accessEditor.review}: ${formatSelectedModulesCount(selectedModulesDraft.length)} · ${selectedKioskDefinitionDraft.length} ${currentLanguage.code.startsWith('es') ? 'kioscos' : 'kiosks'}`}
          icon={<Layers3 className="h-5 w-5" />}
          modalType="operational-workspace"
          onOpenChange={(open) => {
            if (!open) setSelectedUserForModules(null);
          }}
          open
          title={usersCopy.accessEditor.title}
          tone="blue"
        >
              <div className="space-y-8">
                <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{usersCopy.accessEditor.role}</span>
                    <select
                      value={selectedRoleDraft}
                      onChange={(event) => {
                        const role = event.target.value as User['role'];
                        setSelectedRoleDraft(role);
                        setSelectedTabPermissionDraft((keys) => pruneTabPermissionKeysForRole(role, keys));
                      }}
                      className={`${inputClassName} h-11 px-3 text-sm`}
                    >
                      {canAssignSuperAdmin || selectedUser.role === 'Super Admin' ? (
                        <option value="Super Admin">{t.panelInicial.users.roles.superAdmin}</option>
                      ) : null}
                      <option value="Admin">{t.panelInicial.users.roles.admin}</option>
                      <option value="User">{t.panelInicial.users.roles.user}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{usersCopy.scope.label}</span>
                    <select
                      value={selectedScopeTypeDraft}
                      onChange={(event) => {
                        const scope = event.target.value as User['scopeType'];
                        setSelectedScopeTypeDraft(scope);
                        if (scope === 'corporate_office') {
                          setSelectedUnitDraft('');
                          setSelectedBusinessDraft('');
                        } else if (scope === 'unit_headquarters') {
                          setSelectedBusinessDraft('');
                        }
                      }}
                      className={`${inputClassName} h-11 px-3 text-sm`}
                    >
                      {assignableScopeTypes.map((scope) => (
                        <option key={scope} value={scope}>{usersCopy.scope[scope]}</option>
                      ))}
                    </select>
                  </label>
                  {selectedScopeTypeDraft !== 'corporate_office' ? (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{usersBusinessCopy.businessUnit}</span>
                      <select
                        value={selectedUnitDraft}
                        onChange={(event) => {
                          setSelectedUnitDraft(event.target.value);
                          setSelectedBusinessDraft('');
                        }}
                        className={`${inputClassName} h-11 px-3 text-sm`}
                      >
                        <option value="">{usersBusinessCopy.selectBusinessUnit}</option>
                        {assignableBusinessUnitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {selectedScopeTypeDraft === 'business_office' ? (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{usersBusinessCopy.business}</span>
                      <select
                        value={selectedBusinessDraft}
                        onChange={(event) => setSelectedBusinessDraft(event.target.value)}
                        className={`${inputClassName} h-11 px-3 text-sm`}
                      >
                        <option value="">{usersBusinessCopy.selectBusiness}</option>
                        {selectedBusinessOptions.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                </section>
	                <UsersTabPermissionPicker
		                  catalogTabs={selectedUserCatalogTabs}
		                  languageCode={currentLanguage.code}
		                  modules={assignableTabPermissionModules}
	                  copy={usersCopy.tabPermissions}
	                  moduleSelectionLabel={usersCopy.selectedModules}
	                  selectedModuleIds={selectedModulesDraft}
	                  selectedPermissionKeys={selectedTabPermissionDraft}
	                  onModuleChange={toggleUserModule}
	                  onChange={(permissionKeys) =>
                        setSelectedTabPermissionDraft(pruneTabPermissionKeysForRole(selectedRoleDraft, permissionKeys))
                      }
	                />
	                <UsersKioskPermissionPicker
	                  kiosks={availableEmployeeKiosks}
	                  selectedIds={eligibleKioskIds(
	                    selectedKioskDefinitionDraft,
	                    selectedModulesDraft,
	                    selectedScopeTypeDraft,
	                    selectedUnitDraft,
	                    selectedBusinessDraft,
	                  )}
	                  selectedModuleIds={selectedModulesDraft}
	                  unitId={selectedScopeTypeDraft === 'corporate_office' ? null : numberOrNull(selectedUnitDraft)}
	                  businessId={selectedScopeTypeDraft === 'business_office' ? numberOrNull(selectedBusinessDraft) : null}
	                  onChange={setSelectedKioskDefinitionDraft}
	                  languageCode={currentLanguage.code}
	                />
	              </div>
        </IndiceModalFrame>
      )}

      {showInviteModal && (
        <IndiceModalFrame
          busy={loadingOverlay.isVisible}
          closeLabel={t.panelInicial.users.modal.cancel}
          contentClassName="max-h-[min(92dvh,820px)]"
          description={t.panelInicial.users.subtitle}
          eyebrow={!inviteLink ? inviteWizardCopy.progress(activeInviteStepIndex + 1, inviteWizardSteps.length) : inviteWizardCopy.completed}
          footer={inviteLink ? (
            <Button type="button" onClick={closeInviteModal}>{closeLabel}</Button>
          ) : (
            <>
              {inviteWizardStep !== 'identity' ? (
                <Button type="button" variant="outline" onClick={goBackInviteWizard}>
                  {inviteWizardCopy.back}
                </Button>
              ) : null}
              {inviteWizardStep === 'access' ? (
                <Button
                  type="submit"
                  form="dashboard-user-invite-form"
                  disabled={loadingOverlay.isVisible || !inviteAccessIsValid}
                >
                  <UserPlus className="h-4 w-4" />
                  {t.panelInicial.users.modal.send}
                </Button>
              ) : (
                <Button type="button" onClick={continueInviteWizard}>
                  {inviteWizardCopy.next}
                </Button>
              )}
            </>
          )}
          footerLeading={(
            <Button
              type="button"
              variant="outline"
              onClick={closeInviteModal}
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-medium text-slate-600 hover:bg-white/90"
            >
              {t.panelInicial.users.modal.cancel}
            </Button>
          )}
          footerSummary={inviteLink
            ? (inviteEmailStatus?.sent ? summaryLabels.inviteSuccess : summaryLabels.inviteCreated)
            : inviteWizardSteps[activeInviteStepIndex]?.label}
          icon={<UserPlus className="h-5 w-5" />}
          modalType="wizard"
          onOpenChange={(open) => {
            if (!open) closeInviteModal();
          }}
          open
          title={t.panelInicial.users.modal.newUser}
          tone="blue"
        >
          <form id="dashboard-user-invite-form" onSubmit={handleSendInvite} className="space-y-5">
            {!inviteLink ? (
              <>
                <IndiceModalWizardStepper
                  accent="blue"
                  activeStepId={inviteWizardStep}
                  progressLabel={inviteWizardCopy.progress(activeInviteStepIndex + 1, inviteWizardSteps.length)}
                  steps={inviteWizardSteps}
                  onStepSelect={(stepId) => {
                    const requestedIndex = inviteWizardSteps.findIndex((step) => step.id === stepId);
                    if (requestedIndex <= activeInviteStepIndex) {
                      setInviteValidationMessage('');
                      setInviteWizardStep(stepId);
                    }
                  }}
                />

                <IndiceModalValidation
                  messages={inviteValidationMessage ? [inviteValidationMessage] : []}
                  title={inviteWizardCopy.reviewFields}
                />

                {inviteWizardStep === 'identity' ? (
                  <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.panelInicial.users.modal.name}</span>
                      <input
                        type="text"
                        value={inviteForm.name}
                        onChange={(event) => updateInviteForm('name', event.target.value)}
                        className={`h-11 px-4 ${inputClassName}`}
                        placeholder={t.panelInicial.users.modal.name}
                        required
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.panelInicial.users.modal.email}</span>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(event) => updateInviteForm('email', event.target.value)}
                        className={`h-11 px-4 ${inputClassName}`}
                        placeholder="email@company.com"
                        required
                      />
                    </label>
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.panelInicial.users.modal.role}</span>
                      <span className="relative block">
                        <select
                          value={inviteForm.role}
                          onChange={(event) => updateInviteForm('role', event.target.value as User['role'])}
                          className={`h-11 appearance-none cursor-pointer px-4 pr-10 ${inputClassName}`}
                        >
                          {canAssignSuperAdmin ? <option value="Super Admin">{t.panelInicial.users.roles.superAdmin}</option> : null}
                          <option value="Admin">{t.panelInicial.users.roles.admin}</option>
                          <option value="User">{t.panelInicial.users.roles.user}</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </span>
                    </label>
                  </section>
                ) : null}

                {inviteWizardStep === 'organization' ? (
                  <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{usersCopy.scope.label}</span>
                      <select
                        value={inviteForm.scopeType}
                        onChange={(event) => updateInviteForm('scopeType', event.target.value)}
                        className={`h-11 appearance-none cursor-pointer px-4 ${inputClassName}`}
                      >
                        {assignableScopeTypes.map((scope) => (
                          <option key={scope} value={scope}>{usersCopy.scope[scope]}</option>
                        ))}
                      </select>
                    </label>
                    {inviteForm.scopeType !== 'corporate_office' ? (
                      <label className={inviteForm.scopeType === 'unit_headquarters' ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{usersBusinessCopy.businessUnit}</span>
                        <select
                          value={inviteForm.businessUnitId}
                          onChange={(event) => updateInviteForm('businessUnitId', event.target.value)}
                          className={`h-11 appearance-none cursor-pointer px-4 ${inputClassName}`}
                          required
                        >
                          <option value="">{usersBusinessCopy.selectBusinessUnit}</option>
                          {assignableBusinessUnitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    ) : null}
                    {inviteForm.scopeType === 'business_office' ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{usersBusinessCopy.business}</span>
                        <select
                          value={inviteForm.businessId}
                          onChange={(event) => updateInviteForm('businessId', event.target.value)}
                          className={`h-11 appearance-none cursor-pointer px-4 ${inputClassName}`}
                          required
                        >
                          <option value="">{usersBusinessCopy.selectBusiness}</option>
                          {inviteBusinessOptions.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                        </select>
                      </label>
                    ) : null}
                    <div className="sm:col-span-2">
                      <IndiceModalSummary
                        columns={3}
                        items={[
                          { label: t.panelInicial.users.modal.name, value: inviteForm.name || '—' },
                          { label: t.panelInicial.users.modal.role, value: inviteForm.role },
                          { label: usersCopy.scope.label, value: usersCopy.scope[inviteForm.scopeType] },
                        ]}
                        title={inviteWizardCopy.inheritedProfile}
                        variant="muted"
                      />
                    </div>
                  </section>
                ) : null}

                {inviteWizardStep === 'access' ? (
                  <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <UsersTabPermissionPicker
                      catalogTabs={inviteCatalogTabs}
                      languageCode={currentLanguage.code}
                      modules={assignableTabPermissionModules}
                      copy={usersCopy.tabPermissions}
                      moduleSelectionLabel={usersCopy.selectedModules}
                      selectedModuleIds={inviteModuleIds}
                      selectedPermissionKeys={inviteTabPermissionKeys}
                      onModuleChange={toggleInviteModule}
                      onChange={(permissionKeys) => setInviteTabPermissionKeys(pruneTabPermissionKeysForRole(inviteForm.role, permissionKeys))}
                    />
                    <UsersKioskPermissionPicker
                      kiosks={availableEmployeeKiosks}
                      selectedIds={eligibleKioskIds(
                        inviteKioskDefinitionIds,
                        inviteModuleIds,
                        inviteForm.scopeType,
                        inviteForm.businessUnitId,
                        inviteForm.businessId,
                      )}
                      selectedModuleIds={inviteModuleIds}
                      unitId={inviteForm.scopeType === 'corporate_office' ? null : numberOrNull(inviteForm.businessUnitId)}
                      businessId={inviteForm.scopeType === 'business_office' ? numberOrNull(inviteForm.businessId) : null}
                      onChange={setInviteKioskDefinitionIds}
                      languageCode={currentLanguage.code}
                    />
                    <IndiceModalSummary
                      columns={3}
                      items={[
                        { label: t.panelInicial.users.modal.name, value: inviteForm.name || '—' },
                        { label: usersCopy.scope.label, value: usersCopy.scope[inviteForm.scopeType] },
                        { label: t.panelInicial.users.modal.modules, value: formatSelectedModulesCount(inviteModuleIds.length), emphasized: true },
                      ]}
                      title={inviteWizardCopy.finalReview}
                      variant="plain"
                    />
                  </section>
                ) : null}
              </>
            ) : (
              <div className="space-y-4">
                <IndiceModalSummary
                  columns={2}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  items={[
                    { label: t.panelInicial.users.modal.email, value: inviteForm.email, emphasized: true },
                    { label: t.panelInicial.users.modal.role, value: inviteForm.role },
                  ]}
                  title={inviteEmailStatus?.sent ? summaryLabels.inviteSuccess : summaryLabels.inviteCreated}
                  variant="success"
                />
                {renderInviteEmailStatus()}
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.panelInicial.users.modal.inviteLink}</span>
                  <span className="flex flex-col gap-2 sm:flex-row">
                    <input type="text" value={inviteLink} readOnly className={`h-11 flex-1 px-4 ${inputClassName}`} />
                    <Button type="button" onClick={() => copyToClipboard(inviteLink)} className="h-11 gap-2 bg-blue-600 text-white hover:bg-blue-700">
                      {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedLink ? t.panelInicial.users.modal.copied : t.panelInicial.users.modal.copyLink}
                    </Button>
                  </span>
                </label>
              </div>
            )}
          </form>
        </IndiceModalFrame>
      )}

      {showResendModal && resendUser && (
        <IndiceModalFrame
          busy={loadingOverlay.isVisible}
          contentClassName="sm:max-w-xl"
          description={resendUser.name}
          footer={inviteLink ? (
            <Button type="button" onClick={closeResendModal}>{closeLabel}</Button>
          ) : (
            <Button type="button" onClick={handleResendInvite} disabled={loadingOverlay.isVisible}>
              <Mail className="h-4 w-4" />
              {t.panelInicial.users.actions.resend}
            </Button>
          )}
          footerLeading={(
            <Button
              type="button"
              variant="outline"
              onClick={closeResendModal}
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-medium text-slate-600 hover:bg-white/90"
            >
              {t.panelInicial.users.modal.cancel}
            </Button>
          )}
          footerSummary={newEmail.trim() || resendUser.email}
          icon={<Mail className="h-5 w-5" />}
          modalType="standard-form"
          onOpenChange={(open) => {
            if (!open) closeResendModal();
          }}
          open
          title={t.panelInicial.users.actions.resend}
          tone="blue"
        >
            <div className="space-y-4">
              {!inviteLink ? (
                <>
                  <label className="block space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t.panelInicial.users.modal.email}
                    </span>
                    <input
                      type="text"
                      value={resendUser.email}
                      disabled
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {resendEmailLabel}
                    </span>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      className={`h-11 px-4 ${inputClassName}`}
                      placeholder={t.panelInicial.users.modal.email}
                    />
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {resendEmailHint}
                    </p>
                  </label>
                </>
              ) : (
                <div className="space-y-4">
                  <IndiceModalSummary
                    columns={2}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    items={[{ label: t.panelInicial.users.modal.email, value: newEmail.trim() || resendUser.email, emphasized: true }]}
                    title={inviteEmailStatus?.sent ? summaryLabels.resendSuccess : summaryLabels.resendCreated}
                    variant="success"
                  />

                  {renderInviteEmailStatus()}

                  <label className="block space-y-2">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t.panelInicial.users.modal.inviteLink}
                    </span>
                    <span className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className={`h-11 flex-1 px-4 ${inputClassName}`}
                      />
                      <Button
                        type="button"
                        onClick={() => copyToClipboard(inviteLink)}
                        className="h-11 gap-2 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedLink ? t.panelInicial.users.modal.copied : t.panelInicial.users.modal.copyLink}
                      </Button>
                    </span>
                  </label>
                </div>
              )}
            </div>
        </IndiceModalFrame>
      )}

      <LoadingBarOverlay
        isVisible={loadingOverlay.isVisible}
        title={loadingOverlay.title}
        description={loadingOverlay.description}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(invitationPendingDelete)}
        title={usersCopy.deleteConfirmationTitle}
        itemName={invitationPendingDelete ? `${invitationPendingDelete.name} <${invitationPendingDelete.email}>` : undefined}
        description={usersCopy.deleteConfirmationDescription}
        confirmLabel={isDeletingUser ? deletingLabel : deleteLabel}
        cancelLabel={t.panelInicial.users.modal.cancel}
        confirmDisabled={isDeletingUser || loadingOverlay.isVisible}
        onConfirm={handleDeleteUser}
        onCancel={closeDeleteDialog}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(userPendingDeactivation)}
        title={usersCopy.deactivateConfirmationTitle}
        itemName={userPendingDeactivation ? `${userPendingDeactivation.name} <${userPendingDeactivation.email}>` : undefined}
        description={usersCopy.deactivateConfirmationDescription}
        confirmLabel={isDeletingUser ? usersCopy.overlays.deactivatingTitle : usersCopy.actions.deactivate}
        cancelLabel={t.panelInicial.users.modal.cancel}
        confirmDisabled={isDeletingUser || loadingOverlay.isVisible}
        onConfirm={handleDeactivateUser}
        onCancel={closeDeactivateDialog}
      >
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {usersCopy.deactivateConfirmationWarning}
        </p>
      </ConfirmDeleteDialog>
    </div>
  );
}

function mapCatalogModule(module: ConfigCenterCatalogModule, t: any): AvailableModule | null {
  const mapped = mapBackendModuleToCard({
    slug: module.slug,
    name: module.name,
    category: module.category,
    url: module.route_key,
  }, t);

  if (!mapped) {
    return null;
  }

  return {
    id: mapped.route,
    slug: module.slug,
    name: mapped.title,
    emoji: mapped.emoji,
    color: mapped.color,
    category: module.category ?? mapped.category,
    lifecycleStatus: module.lifecycle_status ?? 'released',
    accessModel: module.access_model ?? 'module',
    assignable: module.assignable ?? true,
    entitled: module.entitled ?? true,
    description: module.description ?? '',
  };
}

function mapCatalogUnit(unit: ConfigCenterCatalogUnit): BusinessUnitOption {
  return {
    id: String(unit.id),
    name: unit.name,
  };
}

function mapCatalogBusiness(business: ConfigCenterCatalogBusiness): BusinessOption {
  return {
    id: String(business.id),
    unitId: business.unit_id == null ? '' : String(business.unit_id),
    name: business.name,
  };
}

function mapBackendUser(user: ConfigCenterUser, availableModules: AvailableModule[]): User {
  const role = normalizeUserRole(user.role);
  const status = normalizeUserStatus(user.status);
  const fullName = `${user.nombres ?? ''} ${user.apellidos ?? ''}`.trim() || user.email;
  const validModuleIds = new Set(availableModules.map((module) => module.id));
  const backendId = user.source === 'invitation'
    ? (user.invitation_id ?? user.id)
    : user.id;

  return {
    id: `${user.source}:${backendId}`,
    backendId,
    source: user.source === 'invitation' ? 'invitation' : 'user',
    name: fullName,
    email: user.email,
    avatarUrl: user.avatar_url ?? null,
    role,
    status,
    unitId: user.unit_id ?? null,
    unitName: user.unit_name ?? '',
    businessId: user.business_id ?? null,
    businessName: user.business_name ?? '',
    scopeType: user.scope_type
      ?? (user.business_id != null
        ? 'business_office'
        : user.unit_id != null
          ? 'unit_headquarters'
          : 'corporate_office'),
    isProtected: user.is_protected,
    capabilities: {
      canEditAccess: user.capabilities?.can_edit_access ?? false,
      canActivate: user.capabilities?.can_activate ?? false,
      canDeactivate: user.capabilities?.can_deactivate ?? false,
      canResendInvitation: user.capabilities?.can_resend_invitation ?? false,
      canCancelInvitation: user.capabilities?.can_cancel_invitation ?? false,
    },
    tabPermissionKeys: user.tab_permission_keys ?? [],
    kioskDefinitionIds: user.kiosk_definition_ids ?? [],
    modules: user.module_slugs
      .flatMap((slug) => {
        const route = routeForBackendSlug(slug);
        return route && validModuleIds.has(route) ? [route] : [];
      }),
  };
}

function formatApiError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.code === 'SEAT_CAPACITY_EXCEEDED') {
    const seats = (error.payload as { seats?: { active?: number; reserved?: number; limit?: number } } | null)?.seats;
    if (seats && typeof seats.limit === 'number') {
      return `${error.message} (${seats.active ?? 0} active + ${seats.reserved ?? 0} pending / ${seats.limit})`;
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeUserRole(role: string): User['role'] {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'root' || normalized === 'superadmin') {
    return 'Super Admin';
  }
  if (normalized === 'admin' || normalized === 'owner' || normalized === 'manager') {
    return 'Admin';
  }
  return 'User';
}

function isSuperAdminRole(role: string | null | undefined) {
  const normalized = (role ?? '').trim().toLowerCase();
  return normalized === 'root' || normalized === 'superadmin' || normalized === 'super admin';
}

function isAdminRole(role: string | null | undefined) {
  const normalized = (role ?? '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'owner' || normalized === 'manager';
}

function isProtectedAccessRole(role: User['role'] | string | null | undefined) {
  const normalized = (role ?? '').trim().toLowerCase();
  return normalized === 'root' || normalized === 'superadmin' || normalized === 'super admin';
}

function pruneTabPermissionKeysForRole(
  role: User['role'] | string | null | undefined,
  permissionKeys: string[],
) {
  return permissionKeys.filter((permissionKey) => isTabScopeAssignableToRole(permissionKey, role));
}

function catalogTabsForRole(
  role: User['role'] | string | null | undefined,
  catalogTabs: ConfigCenterCatalogTab[],
) {
  return catalogTabs.filter((tab) => isTabScopeAssignableToRole(tab.permission_key, role));
}

function toBackendRole(role: User['role']): string {
  if (role === 'Super Admin') {
    return 'superadmin';
  }
  if (role === 'Admin') {
    return 'admin';
  }
  return 'user';
}

function normalizeUserStatus(status: string): User['status'] {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'pending') {
    return 'pending';
  }
  if (normalized === 'inactive' || normalized === 'inactivo') {
    return 'inactive';
  }
  return 'active';
}
