import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
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
import { Checkbox } from '../../../components/ui/checkbox';
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
import {
  configCenterApi,
  type ConfigCenterCatalogBusiness,
  type ConfigCenterCatalogModule,
  type ConfigCenterCatalogTab,
  type ConfigCenterCatalogUnit,
  type ConfigCenterUser,
} from '../../../api/configCenter';
import {
  backendSlugForRoute,
  buildDefaultModuleCatalog,
  mapBackendModuleToCard,
  routeForBackendSlug,
  type DashboardModuleCategory,
  type DashboardModuleColor,
} from '../../../config/moduleCatalog';
import { validateEmail } from '../../../shared/validation/email';
import { UsersTabPermissionPicker } from './UsersTabPermissionPicker';
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
import { OperationalBulkActionsBar, useRowSelection } from '../../shared/operational';

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
  businessId: number | null;
  modules: string[];
  tabPermissionKeys: string[];
  isProtected: boolean;
}

interface AvailableModule {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  color: DashboardModuleColor;
  category: DashboardModuleCategory;
}

interface InviteFormState {
  name: string;
  email: string;
  role: User['role'];
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

interface UserBusinessAssignment {
  businessUnitId?: string;
  businessId?: string;
}

interface InviteEmailStatus {
  sent: boolean;
  status: string;
  message?: string;
}

type BusinessInlineField = 'businessUnit' | 'business';
type EditableBusinessCell = {
  userId: string;
  field: BusinessInlineField;
} | null;
type SortColumn = 'name' | 'role' | 'businessUnit' | 'business' | 'modules' | 'status';
type SortDirection = 'asc' | 'desc';
type SortState = {
  column: SortColumn;
  direction: SortDirection;
} | null;
type InviteWizardStep = 'identity' | 'organization' | 'access';

const inputClassName =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const categoryMeta: Array<{ category: AvailableModule['category']; emoji: string }> = [
  { category: 'basic', emoji: '📱' },
  { category: 'complementary', emoji: '🔧' },
  { category: 'ai', emoji: '🤖' },
];

const emptyInviteForm: InviteFormState = {
  name: '',
  email: '',
  role: 'User',
  businessUnitId: '',
  businessId: '',
};

const USER_SELF_SERVICE_TAB_PERMISSION_KEYS = new Set([
  'config_center.profile',
  'config_center.personal-performance',
  'human_resources.announcements',
  'human_resources.assets',
  'human_resources.attendance',
  'human_resources.control',
  'human_resources.permissions',
]);

export default function Users() {
  const { currentLanguage, t } = useLanguage();
  const usersCopy = useMemo(
    () => getUsersTranslations(currentLanguage.code),
    [currentLanguage.code],
  );
  const rowSelection = useRowSelection<string>();
  const businessCellRef = useRef<HTMLDivElement | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>(() =>
    buildAvailableModules(t),
  );
  const [availableUnits, setAvailableUnits] = useState<BusinessUnitOption[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessOption[]>([]);
  const [catalogTabs, setCatalogTabs] = useState<ConfigCenterCatalogTab[]>([]);
  const [businessAssignments, setBusinessAssignments] = useState<Record<string, UserBusinessAssignment>>({});
  const [editingBusinessCell, setEditingBusinessCell] = useState<EditableBusinessCell>(null);
  const [sortState, setSortState] = useState<SortState>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserForModules, setSelectedUserForModules] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteWizardStep, setInviteWizardStep] = useState<InviteWizardStep>('identity');
  const [inviteValidationMessage, setInviteValidationMessage] = useState('');
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedUserForResend, setSelectedUserForResend] = useState<string | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteEmailStatus, setInviteEmailStatus] = useState<InviteEmailStatus | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(emptyInviteForm);
  const [inviteModuleIds, setInviteModuleIds] = useState<string[]>([]);
  const [inviteTabPermissionKeys, setInviteTabPermissionKeys] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
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
  const usersBusinessCopy = t.panelInicial.users.businessStructure;
  const businessUnitOptions = availableUnits.map((unit) => ({
    value: unit.id,
    label: unit.name,
  }));
  const tabPermissionModules = useMemo(
    () => buildTabPermissionModuleOptions(availableModules),
    [availableModules],
  );
  const canAssignSuperAdmin = isSuperAdminRole(currentUserRole);
  const canManageUsers = canAssignSuperAdmin || isAdminRole(currentUserRole);
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

    return matchesSearch && matchesRole && matchesStatus;
  }), [roleFilter, searchTerm, statusFilter, users]);
  const sortedUsers = useMemo(() => {
    if (!sortState) {
      return filteredUsers;
    }

    const valueFor = (user: User): string | number => {
      const assignment = businessAssignments[user.id];
      switch (sortState.column) {
        case 'name': return user.name.toLocaleLowerCase();
        case 'role': return user.role;
        case 'businessUnit': {
          const unitId = assignment?.businessUnitId ?? (user.unitId == null ? '' : String(user.unitId));
          return availableUnits.find((unit) => unit.id === unitId)?.name.toLocaleLowerCase() ?? '';
        }
        case 'business': {
          const businessId = assignment?.businessId ?? (user.businessId == null ? '' : String(user.businessId));
          return availableBusinesses.find((business) => business.id === businessId)?.name.toLocaleLowerCase() ?? '';
        }
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
  }, [availableBusinesses, availableUnits, businessAssignments, currentLanguage.code, filteredUsers, sortState]);
  const usersPaginationResetKey = useMemo(
    () => `${searchTerm}:${roleFilter}:${statusFilter}:${filteredUsers.map(user => user.id).join('|')}`,
    [filteredUsers, roleFilter, searchTerm, statusFilter],
  );
  const usersPagination = useTablePagination({
    resetKey: usersPaginationResetKey,
    rows: sortedUsers,
  });
  const usersPaginationCopy = usersCopy.pagination;

  const selectedUser = users.find((user) => user.id === selectedUserForModules) ?? null;
  const resendUser = users.find((user) => user.id === selectedUserForResend) ?? null;
  const selectedUserCatalogTabs = selectedUser
    ? catalogTabsForRole(selectedUser.role, assignableCatalogTabs)
    : assignableCatalogTabs;
  const inviteCatalogTabs = catalogTabsForRole(inviteForm.role, assignableCatalogTabs);
  const invitationPendingDelete =
    users.find((user) => user.id === selectedUserForDelete && user.source === 'invitation') ?? null;
  const categoryTitleMap: Record<AvailableModule['category'], string> = {
    basic: t.sections.basicModules,
    complementary: t.sections.complementaryModules,
    ai: t.sections.aiModules,
  };
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
  const inviteOrganizationIsValid = Boolean(inviteForm.businessUnitId && inviteForm.businessId);
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

  const syncBusinessAssignments = (mappedUsers: User[]) => {
    setBusinessAssignments((currentAssignments) => {
      const nextAssignments: Record<string, UserBusinessAssignment> = {};

      for (const user of mappedUsers) {
        const currentAssignment = currentAssignments[user.id] ?? {};
        nextAssignments[user.id] = {
          ...currentAssignment,
          businessUnitId: currentAssignment.businessUnitId ?? (user.unitId ? String(user.unitId) : undefined),
          businessId: currentAssignment.businessId ?? (user.businessId ? String(user.businessId) : undefined),
        };
      }

      return nextAssignments;
    });
  };

  const getRoleColorClasses = (role: User['role']) => {
    const styles: Record<User['role'], string> = {
      'Super Admin': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      Admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      User: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
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

  const getModuleColorClasses = (color: AvailableModule['color']) => {
    const styles: Record<AvailableModule['color'], string> = {
      aqua: 'border-[#59C3A5]/35 bg-[#59C3A5]/10 dark:border-[#59C3A5]/35 dark:bg-[#59C3A5]/20',
      blue: 'border-[#2563EB]/25 bg-[#2563EB]/10 dark:border-[#2563EB]/35 dark:bg-[#2563EB]/20',
      coral: 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/20',
      yellow: 'border-[#F4C84A]/35 bg-[#F4C84A]/15 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/20',
      orange: 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/20',
      green: 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20',
      purple: 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20',
      gray: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20',
      gold: 'border-[#F4C84A]/35 bg-[#F4C84A]/15 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/20',
      red: 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
    };

    return styles[color];
  };

  const refreshUsers = async (fallbackModules: AvailableModule[] = buildAvailableModules(t)) => {
    const response = await configCenterApi.getUsers();
    const mappedUsers = response.users.map((user) => mapBackendUser(user, fallbackModules));
    const mappedUnits = response.catalog.units.map(mapCatalogUnit);
    const mappedBusinesses = response.catalog.businesses.map(mapCatalogBusiness);
    const mappedModules = response.catalog.modules
      .map((module) => mapCatalogModule(module, t))
      .filter((module): module is AvailableModule => module !== null);

    setUsers(mappedUsers);
    syncBusinessAssignments(mappedUsers);
    setAvailableUnits(mappedUnits);
    setAvailableBusinesses(mappedBusinesses);
    setCatalogTabs(response.catalog.tabs ?? []);
    if (mappedModules.length > 0) {
      setAvailableModules(mergeAvailableModules(mappedModules, fallbackModules));
    } else {
      setAvailableModules(fallbackModules);
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!businessCellRef.current?.contains(event.target as Node)) {
        setEditingBusinessCell(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fallbackModules = buildAvailableModules(t);

    setAvailableModules(fallbackModules);
    setIsLoading(true);
    setLoadError('');

    runWithMinimumDuration(Promise.all([
      configCenterApi.getCurrentUser(),
      configCenterApi.getUsers(),
    ]))
      .then(([currentUser, response]) => {
        if (!active) {
          return;
        }

        setCurrentUserId(currentUser.id);
        setCurrentUserRole(currentUser.role ?? null);
        const mappedUsers = response.users.map((user) => mapBackendUser(user, fallbackModules));
        const mappedUnits = response.catalog.units.map(mapCatalogUnit);
        const mappedBusinesses = response.catalog.businesses.map(mapCatalogBusiness);
        const mappedModules = response.catalog.modules
          .map((module) => mapCatalogModule(module, t))
          .filter((module): module is AvailableModule => module !== null);

        setUsers(mappedUsers);
        syncBusinessAssignments(mappedUsers);
        setAvailableUnits(mappedUnits);
        setAvailableBusinesses(mappedBusinesses);
        setCatalogTabs(response.catalog.tabs ?? []);
        if (mappedModules.length > 0) {
          setAvailableModules(mergeAvailableModules(mappedModules, fallbackModules));
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
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
    const role = selectedUser?.role ?? 'User';
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

  const buildUserAccessPayload = (
    user: User,
    overrides: Partial<{
      role: User['role'];
      status: User['status'];
      moduleIds: string[];
      tabPermissionKeys: string[];
      unitId: string | number | null;
      businessId: string | number | null;
    }> = {},
  ) => {
    const assignment = businessAssignments[user.id];
    const moduleIds = overrides.moduleIds ?? user.modules;
    const role = overrides.role ?? user.role;
    const tabPermissionKeys = pruneTabPermissionKeysForRole(
      role,
      overrides.tabPermissionKeys ?? user.tabPermissionKeys,
    );
    return {
      role: toBackendRole(role),
      status: overrides.status ?? user.status,
      module_slugs: moduleSlugsForIds(moduleIds),
      tab_permission_keys: tabPermissionKeys,
      unit_id: numberOrNull(overrides.unitId ?? assignment?.businessUnitId ?? user.unitId),
      business_id: numberOrNull(overrides.businessId ?? assignment?.businessId ?? user.businessId),
    };
  };

  const canEditAccessFor = (user: User) => {
    if (user.source !== 'user') {
      return false;
    }
    if (canAssignSuperAdmin) {
      return true;
    }
    if (!isAdminRole(currentUserRole) || user.backendId === currentUserId) {
      return false;
    }

    return user.role !== 'Super Admin';
  };

  const selectedEditableUsers = users.filter(
    (user) => rowSelection.selectedIds.has(user.id) && canEditAccessFor(user),
  );
  const visibleSelectableUserIds = usersPagination.paginatedRows
    .filter(canEditAccessFor)
    .map((user) => user.id);
  const visibleSelectionState = rowSelection.visibleSelectionState(visibleSelectableUserIds);

  const handleBulkStatusChange = async (status: User['status']) => {
    if (selectedEditableUsers.length === 0) {
      rowSelection.clearSelection();
      return;
    }

    try {
      setLoadError('');
      await runUserFeedbackTask({
        title: usersCopy.bulk.updatingTitle,
        description: usersCopy.bulk.updatingDescription,
        task: async () => {
          await Promise.all(selectedEditableUsers.map((user) =>
            configCenterApi.updateUser(user.backendId, buildUserAccessPayload(user, { status })),
          ));
          await refreshUsers();
          rowSelection.clearSelection();
        },
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.status);
    }
  };

  const toggleUserStatus = async (user: User) => {
    if (!canEditAccessFor(user)) {
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';

    try {
      setLoadError('');
      await configCenterApi.updateUser(user.backendId, buildUserAccessPayload(user, { status: nextStatus }));
      await refreshUsers();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.status);
    }
  };

  const changeUserRole = async (user: User, newRole: User['role']) => {
    if (!canEditAccessFor(user)) {
      return;
    }
    if (newRole === 'Super Admin' && !canAssignSuperAdmin) {
      return;
    }

    try {
      setLoadError('');
      await configCenterApi.updateUser(user.backendId, buildUserAccessPayload(user, { role: newRole }));
      await refreshUsers();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.role);
    }
  };

  const handleSendInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageUsers) {
      return;
    }
    const trimmedName = inviteForm.name.trim();
    const trimmedEmail = inviteForm.email.trim();

    if (!trimmedName || !trimmedEmail || !inviteForm.businessUnitId || !inviteForm.businessId || inviteModuleIds.length === 0) {
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
            unit_id: numberOrNull(inviteForm.businessUnitId),
            business_id: numberOrNull(inviteForm.businessId),
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
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.sendInvitation);
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

  const handleOpenModuleSettings = (user: User) => {
    if (!canEditAccessFor(user)) {
      return;
    }

    setSelectedUserForModules(user.id);
    const allowedModuleIds = new Set(assignableModules.map((module) => module.id));
    setSelectedModulesDraft(user.modules.filter((moduleId) => allowedModuleIds.has(moduleId)));
    setSelectedTabPermissionDraft(
      pruneTabPermissionKeysForRole(
        user.role,
        user.tabPermissionKeys.filter((key) => assignableTabPermissionKeys.has(key)),
      ),
    );
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
          moduleIds: selectedModulesDraft,
          tabPermissionKeys,
        }),
      );
      await refreshUsers();
      setSelectedUserForModules(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.moduleAccess);
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

  const updateBusinessAssignment = async (
    user: User,
    field: BusinessInlineField,
    value: string,
  ) => {
    setEditingBusinessCell(null);
    if (!canEditAccessFor(user) || !value) {
      return;
    }

    const currentAssignment = businessAssignments[user.id] ?? {};
    const nextAssignment = { ...currentAssignment };
    if (field === 'businessUnit') {
      nextAssignment.businessUnitId = value;
      const existingBusiness = assignableBusinesses.find((business) =>
        business.id === nextAssignment.businessId && business.unitId === value
      );
      nextAssignment.businessId = existingBusiness?.id
        ?? assignableBusinesses.find((business) => business.unitId === value)?.id;
    } else {
      const business = assignableBusinesses.find((option) => option.id === value);
      nextAssignment.businessId = value;
      nextAssignment.businessUnitId = business?.unitId ?? nextAssignment.businessUnitId;
    }

    if (!nextAssignment.businessUnitId || !nextAssignment.businessId) {
      setLoadError(usersCopy.errors.selectBusiness);
      return;
    }

    try {
      setLoadError('');
      await configCenterApi.updateUser(
        user.backendId,
        buildUserAccessPayload(user, {
          unitId: nextAssignment.businessUnitId,
          businessId: nextAssignment.businessId,
        }),
      );
      setBusinessAssignments((currentAssignments) => ({
        ...currentAssignments,
        [user.id]: nextAssignment,
      }));
      await refreshUsers();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : usersCopy.errors.businessAssignment);
    }
  };

  const getBusinessUnitLabel = (assignment: UserBusinessAssignment | undefined) => (
    businessUnitOptions.find((option) => option.value === assignment?.businessUnitId)?.label
      ?? usersBusinessCopy.empty
  );

  const getBusinessLabel = (assignment: UserBusinessAssignment | undefined) => (
    availableBusinesses.find((business) => business.id === assignment?.businessId)?.name
      ?? usersBusinessCopy.empty
  );

  const renderBusinessInlineCell = (user: User, field: BusinessInlineField) => {
    const assignment = businessAssignments[user.id];
    const isEditing = editingBusinessCell?.userId === user.id && editingBusinessCell.field === field;
    const selectedValue = field === 'businessUnit' ? assignment?.businessUnitId : assignment?.businessId;
    const label = field === 'businessUnit' ? getBusinessUnitLabel(assignment) : getBusinessLabel(assignment);
    const options = field === 'businessUnit'
      ? assignableBusinessUnitOptions
      : assignableBusinesses
          .filter((business) => !assignment?.businessUnitId || business.unitId === assignment.businessUnitId)
          .map((business) => ({ value: business.id, label: business.name }));
    const placeholder = field === 'businessUnit'
      ? usersBusinessCopy.selectBusinessUnit
      : usersBusinessCopy.selectBusiness;

    if (isEditing) {
      return (
        <div ref={businessCellRef} className="relative w-[220px] max-w-full transition-all duration-150 ease-in-out">
          <select
            autoFocus
            value={selectedValue ?? ''}
            onChange={(event) => void updateBusinessAssignment(user, field, event.target.value)}
            className="h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-white px-5 pr-11 text-base font-semibold text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600"
          >
            <option value="">{placeholder}</option>
            {options.length > 0 ? (
              options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))
            ) : (
              <option value="" disabled>{usersBusinessCopy.noBusinessOptions}</option>
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          if (canEditAccessFor(user)) {
            setEditingBusinessCell({ userId: user.id, field });
          }
        }}
        disabled={!canEditAccessFor(user)}
        className="group inline-flex h-12 w-[220px] max-w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-5 text-left text-base font-semibold text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-500" />
      </button>
    );
  };

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

  const titleBarActions = canManageUsers ? (
    <Button
      className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
      onClick={() => {
        setInviteForm(emptyInviteForm);
        setInviteModuleIds([]);
        setInviteTabPermissionKeys([]);
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
    <div className="space-y-6">
      <UsersFeedback error={loadError} isLoading={isLoading} loadingLabel={usersCopy.loading} />

      <DashboardTitleBar
        actions={titleBarActions ?? undefined}
        emoji="👥"
        subtitle={t.panelInicial.users.subtitle}
        title={t.panelInicial.users.title}
      />

      <UsersFilters
        allLabel={t.panelInicial.users.filters.all}
        clearLabel={usersCopy.clearFilters}
        filterTitle={usersCopy.filters.title}
        hasActiveFilters={Boolean(searchTerm || roleFilter || statusFilter)}
        insightLabel={usersCopy.insight(filteredUsers.length, totalUsers)}
        onClear={() => {
          setSearchTerm('');
          setRoleFilter('');
          setStatusFilter('');
        }}
        onRoleChange={setRoleFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
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
      />

      <UsersKpiStrip items={[
        { label: summaryLabels.total, tone: 'blue', value: totalUsers },
        { label: t.panelInicial.users.filters.active, tone: 'green', value: activeUsers },
        { label: t.panelInicial.users.filters.pending, tone: 'yellow', value: pendingUsers },
        { label: t.panelInicial.users.filters.inactive, tone: 'slate', value: inactiveUsers },
      ]} />

      {rowSelection.selectedCount > 0 ? (
        <OperationalBulkActionsBar
          accent="blue"
          actions={[
            {
              id: 'activate',
              icon: <UserCheck aria-hidden="true" className="h-4 w-4" />,
              label: usersCopy.bulk.activate,
              onClick: () => void handleBulkStatusChange('active'),
              tone: 'success',
            },
            {
              id: 'deactivate',
              icon: <UserX aria-hidden="true" className="h-4 w-4" />,
              label: usersCopy.bulk.deactivate,
              onClick: () => void handleBulkStatusChange('inactive'),
              tone: 'danger',
            },
            {
              id: 'clear',
              icon: <X aria-hidden="true" className="h-4 w-4" />,
              label: usersCopy.bulk.clear,
              onClick: rowSelection.clearSelection,
            },
          ]}
          selectedLabel={usersCopy.bulk.selected(rowSelection.selectedCount)}
          title={usersCopy.bulk.title}
        />
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full">
            <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
              <tr>
                <th className="w-12 px-4 py-3 text-center">
                  <Checkbox
                    aria-label={usersCopy.bulk.selectAll}
                    checked={visibleSelectionState.allVisibleSelected
                      ? true
                      : visibleSelectionState.someVisibleSelected
                        ? 'indeterminate'
                        : false}
                    disabled={visibleSelectableUserIds.length === 0}
                    onCheckedChange={(checked) => rowSelection.toggleAllVisible(visibleSelectableUserIds, checked === true)}
                    className="border-slate-300 data-[state=checked]:border-[var(--indice-blue)] data-[state=checked]:bg-[var(--indice-blue)]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {renderSortableHeader(t.panelInicial.users.table.name, 'name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {renderSortableHeader(t.panelInicial.users.table.role, 'role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {renderSortableHeader(usersBusinessCopy.businessUnit, 'businessUnit')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {renderSortableHeader(usersBusinessCopy.business, 'business')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {renderSortableHeader(t.panelInicial.users.table.modules, 'modules')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {renderSortableHeader(t.panelInicial.users.table.status, 'status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.panelInicial.users.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                usersPagination.paginatedRows.map((user) => {
                  const isCurrentUser = user.source === 'user' && user.backendId === currentUserId;
                  const canEditUserAccess = canEditAccessFor(user);
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
                      data-selected={rowSelection.isSelected(user.id) || undefined}
                      className="transition-colors hover:bg-blue-50/40 data-[selected=true]:bg-blue-50/70 dark:hover:bg-blue-950/20 dark:data-[selected=true]:bg-blue-950/30"
                    >
                      <td className="px-4 py-4 text-center align-middle">
                        <Checkbox
                          aria-label={usersCopy.bulk.selectUser(user.name)}
                          checked={rowSelection.isSelected(user.id)}
                          disabled={!canEditUserAccess}
                          onCheckedChange={(checked) => rowSelection.toggleSelection(user.id, checked === true)}
                          className="border-slate-300 data-[state=checked]:border-[var(--indice-blue)] data-[state=checked]:bg-[var(--indice-blue)]"
                        />
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="h-10 w-10 rounded-full border border-gray-200 object-cover shadow-sm dark:border-gray-700"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-full ${getRoleColorClasses(
                                user.role,
                              )} flex items-center justify-center font-semibold`}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.name}
                              {isCurrentUser ? (
                                <span className="ml-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
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
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="relative w-[180px] max-w-full">
                          <select
                            value={user.role}
                            onChange={(event) => changeUserRole(user, event.target.value as User['role'])}
                            disabled={!canEditUserAccess}
                            className={`h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-white px-5 pr-11 text-base font-semibold text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600 ${
                              !canEditUserAccess ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            }`}
                          >
                            {(canAssignSuperAdmin || user.role === 'Super Admin') ? (
                              <option value="Super Admin">{t.panelInicial.users.roles.superAdmin}</option>
                            ) : null}
                            <option value="Admin">{t.panelInicial.users.roles.admin}</option>
                            <option value="User">{t.panelInicial.users.roles.user}</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        {renderBusinessInlineCell(user, 'businessUnit')}
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        {renderBusinessInlineCell(user, 'business')}
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-800/70 dark:bg-blue-900/20 dark:text-blue-300">
                          {formatModulesCount(user.modules.length)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}></span>
                          {statusLabelMap[user.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user)}
                            disabled={!canEditUserAccess}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              user.status === 'active'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                            title={
                              user.status === 'active'
                                ? t.panelInicial.users.status.inactive
                                : t.panelInicial.users.status.active
                            }
                            aria-label={
                              user.status === 'active'
                                ? t.panelInicial.users.status.inactive
                                : t.panelInicial.users.status.active
                            }
                          >
                            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenModuleSettings(user)}
                            disabled={!canEditUserAccess}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                            title={t.panelInicial.users.modal.modules}
                            aria-label={t.panelInicial.users.modal.modules}
                          >
                            <Settings aria-hidden="true" className="h-5 w-5" />
                          </button>

                          {user.source === 'invitation' ? <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForResend(user.id);
                              setShowResendModal(true);
                              setInviteLink('');
                              setInviteEmailStatus(null);
                              setCopiedLink(false);
                              setNewEmail('');
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
                            title={t.panelInicial.users.actions.resend}
                            aria-label={t.panelInicial.users.actions.resend}
                          >
                            <Mail aria-hidden="true" className="h-5 w-5" />
                          </button>
                          : null}

                          {user.source === 'invitation' ? (
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDelete(user.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                              title={deleteLabel}
                              aria-label={deleteLabel}
                            >
                              <Trash2 aria-hidden="true" className="h-5 w-5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
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
              disabled={selectedModulesDraft.length === 0}
            >
              {t.panelInicial.users.modal.save}
            </Button>
          )}
          footerLeading={(
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedUserForModules(null)}
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-white/90"
            >
              {t.panelInicial.users.modal.cancel}
            </Button>
          )}
          footerSummary={formatSelectedModulesCount(selectedModulesDraft.length)}
          icon={<Layers3 className="h-5 w-5" />}
          modalType="operational-workspace"
          onOpenChange={(open) => {
            if (!open) setSelectedUserForModules(null);
          }}
          open
          title={t.panelInicial.users.modal.modules}
          tone="blue"
        >
              <div className="space-y-8">
                {categoryMeta.map((section) => (
                  <div key={section.category}>
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                        {section.emoji}
                      </span>
                      {categoryTitleMap[section.category]}
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
	                      {assignableModules
                        .filter((module) => module.category === section.category)
                        .map((module) => {
                          const isSelected = selectedModulesDraft.includes(module.id);
                          const colorClasses = getModuleColorClasses(module.color);

                          return (
                            <button
                              key={module.id}
                              type="button"
                              onClick={() => toggleUserModule(module.id)}
                              className={`rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                                isSelected
                                  ? `${colorClasses} ring-2 ring-blue-500/10`
                                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                                    isSelected ? colorClasses : 'bg-slate-100 dark:bg-slate-800'
                                  }`}
                                >
                                  {module.emoji}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`truncate text-base font-semibold ${
                                      isSelected
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {module.name}
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  {isSelected ? (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800">
                                      <CheckCircle2 className="h-5 w-5" />
                                    </span>
                                  ) : (
                                    <div className="h-7 w-7 rounded-full border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
	                ))}
	                <UsersTabPermissionPicker
		                  catalogTabs={selectedUserCatalogTabs}
		                  modules={assignableTabPermissionModules}
	                  selectedModuleIds={selectedModulesDraft}
	                  selectedPermissionKeys={selectedTabPermissionDraft}
	                  onChange={(permissionKeys) =>
                        setSelectedTabPermissionDraft(pruneTabPermissionKeysForRole(selectedUser.role, permissionKeys))
                      }
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
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-white/90"
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
                    <label className="space-y-2">
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
                    <div className="sm:col-span-2">
                      <IndiceModalSummary
                        columns={2}
                        items={[
                          { label: t.panelInicial.users.modal.name, value: inviteForm.name || '—' },
                          { label: t.panelInicial.users.modal.role, value: inviteForm.role },
                        ]}
                        title={inviteWizardCopy.inheritedProfile}
                        variant="muted"
                      />
                    </div>
                  </section>
                ) : null}

                {inviteWizardStep === 'access' ? (
                  <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950 dark:text-white">{t.panelInicial.users.modal.modules}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatSelectedModulesCount(inviteModuleIds.length)}</p>
                      </div>
                      <Layers3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/50 sm:grid-cols-2">
                      {assignableModules.map((module) => {
                        const isSelected = inviteModuleIds.includes(module.id);
                        return (
                          <button
                            key={module.id}
                            type="button"
                            onClick={() => toggleInviteModule(module.id)}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${isSelected
                              ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
                          >
                            <span className="min-w-0 truncate"><span className="mr-2">{module.emoji}</span>{module.name}</span>
                            {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <UsersTabPermissionPicker
                      catalogTabs={inviteCatalogTabs}
                      modules={assignableTabPermissionModules}
                      selectedModuleIds={inviteModuleIds}
                      selectedPermissionKeys={inviteTabPermissionKeys}
                      onChange={(permissionKeys) => setInviteTabPermissionKeys(pruneTabPermissionKeysForRole(inviteForm.role, permissionKeys))}
                    />
                    <IndiceModalSummary
                      columns={3}
                      items={[
                        { label: t.panelInicial.users.modal.name, value: inviteForm.name || '—' },
                        { label: usersBusinessCopy.businessUnit, value: assignableBusinessUnitOptions.find((option) => option.value === inviteForm.businessUnitId)?.label || '—' },
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
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-white/90"
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
    </div>
  );
}

function buildAvailableModules(t: any): AvailableModule[] {
  return buildDefaultModuleCatalog(t).map((module) => ({
    id: module.route,
    slug: module.slug,
    name: module.title,
    emoji: module.emoji,
    color: module.color,
    category: module.category,
  }));
}

function mapCatalogModule(module: ConfigCenterCatalogModule, t: any): AvailableModule | null {
  const mapped = mapBackendModuleToCard({
    slug: module.slug,
    name: module.name,
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
    category: mapped.category,
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

function mergeAvailableModules(apiModules: AvailableModule[], fallbackModules: AvailableModule[]) {
  const merged = new Map<string, AvailableModule>();

  for (const module of apiModules) {
    merged.set(module.id, module);
  }

  for (const module of fallbackModules) {
    if (!merged.has(module.id)) {
      merged.set(module.id, module);
    }
  }

  return Array.from(merged.values());
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
    businessId: user.business_id ?? null,
    isProtected: user.is_protected,
    tabPermissionKeys: user.tab_permission_keys ?? [],
    modules: user.module_slugs
      .flatMap((slug) => {
        const route = routeForBackendSlug(slug);
        return route && validModuleIds.has(route) ? [route] : [];
      }),
  };
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

function isSelfServiceUserRole(role: User['role'] | string | null | undefined) {
  return (role ?? '').trim().toLowerCase() === 'user';
}

function pruneTabPermissionKeysForRole(
  role: User['role'] | string | null | undefined,
  permissionKeys: string[],
) {
  if (!isSelfServiceUserRole(role)) {
    return permissionKeys;
  }
  return permissionKeys.filter((permissionKey) => USER_SELF_SERVICE_TAB_PERMISSION_KEYS.has(permissionKey));
}

function catalogTabsForRole(
  role: User['role'] | string | null | undefined,
  catalogTabs: ConfigCenterCatalogTab[],
) {
  if (!isSelfServiceUserRole(role)) {
    return catalogTabs;
  }
  return catalogTabs.filter((tab) => USER_SELF_SERVICE_TAB_PERMISSION_KEYS.has(tab.permission_key));
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
