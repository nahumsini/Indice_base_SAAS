import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Filter,
  Mail,
  Search,
  Settings,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { useLanguage } from '../../../shared/context';
import {
  configCenterApi,
  type ConfigCenterCatalogBusiness,
  type ConfigCenterCatalogModule,
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

interface User {
  id: string;
  backendId: number;
  source: 'user' | 'invitation';
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: 'Super Admin' | 'Admin' | 'User';
  status: 'active' | 'pending' | 'inactive';
  businessId: number | null;
  modules: string[];
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
}

interface BusinessOption {
  id: string;
  name: string;
}

interface UserBusinessAssignment {
  businessUnitId?: string;
  businessId?: string;
}

type BusinessInlineField = 'businessUnit' | 'business';
type EditableBusinessCell = {
  userId: string;
  field: BusinessInlineField;
} | null;
type SortColumn = 'name' | 'role' | 'businessUnit' | 'business' | 'modules' | 'status' | 'actions';
type SortDirection = 'asc' | 'desc';
type SortState = {
  column: SortColumn;
  direction: SortDirection;
} | null;

const inputClassName =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent';

const categoryMeta: Array<{ category: AvailableModule['category']; emoji: string }> = [
  { category: 'basic', emoji: '📱' },
  { category: 'complementary', emoji: '🔧' },
  { category: 'ai', emoji: '🤖' },
];

const emptyInviteForm: InviteFormState = {
  name: '',
  email: '',
  role: 'User',
};

export default function Users() {
  const { currentLanguage, t } = useLanguage();
  const businessCellRef = useRef<HTMLDivElement | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>(() =>
    buildAvailableModules(t),
  );
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessOption[]>([]);
  const [businessAssignments, setBusinessAssignments] = useState<Record<string, UserBusinessAssignment>>({});
  const [editingBusinessCell, setEditingBusinessCell] = useState<EditableBusinessCell>(null);
  const [sortState, setSortState] = useState<SortState>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUserForModules, setSelectedUserForModules] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedUserForResend, setSelectedUserForResend] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(emptyInviteForm);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedModulesDraft, setSelectedModulesDraft] = useState<string[]>([]);
  const usersBusinessCopy = t.panelInicial.users.businessStructure;
  const businessUnitOptions = usersBusinessCopy.unitOptions;

  const statusLabelMap: Record<User['status'], string> = {
    active: t.panelInicial.users.status.active,
    pending: t.panelInicial.users.status.pending,
    inactive: t.panelInicial.users.status.inactive,
  };

  const summaryLabels = {
    total:
      currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA'
        ? 'Total users'
        : currentLanguage.code === 'fr-CA'
          ? 'Utilisateurs total'
          : currentLanguage.code === 'pt-BR'
            ? 'Total users'
            : currentLanguage.code === 'ko-CA'
              ? '총 사용자'
              : currentLanguage.code === 'zh-CA'
                ? '总用户'
                : 'Total users',
    noResults:
      currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA'
        ? 'No users match the current filters.'
        : currentLanguage.code === 'fr-CA'
          ? 'Aucun utilisateur ne correspond aux filtres actuels.'
          : currentLanguage.code === 'pt-BR'
            ? 'Nenhum usuário corresponde aos filtros atuais.'
            : currentLanguage.code === 'ko-CA'
              ? '현재 필터와 일치하는 사용자가 없습니다.'
              : currentLanguage.code === 'zh-CA'
                ? '没有符合当前筛选条件的用户。'
                : 'No users match the current filters.',
    inviteSuccess:
      currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA'
        ? 'Invitation sent successfully.'
        : currentLanguage.code === 'fr-CA'
          ? 'Invitation envoyee avec succes.'
          : currentLanguage.code === 'pt-BR'
            ? 'Convite enviado com sucesso.'
            : currentLanguage.code === 'ko-CA'
              ? '초대가 성공적으로 전송되었습니다.'
              : currentLanguage.code === 'zh-CA'
                ? '邀请已成功发送。'
                : 'Invitation sent successfully.',
    resendSuccess:
      currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA'
        ? 'Invitation resent successfully.'
        : currentLanguage.code === 'fr-CA'
          ? 'Invitation renvoyee avec succes.'
          : currentLanguage.code === 'pt-BR'
            ? 'Convite reenviado com sucesso.'
            : currentLanguage.code === 'ko-CA'
              ? '초대가 다시 전송되었습니다.'
              : currentLanguage.code === 'zh-CA'
                ? '邀请已重新发送。'
                : 'Invitation resent successfully.',
  };

  const closeLabel =
    currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA'
      ? 'Close'
      : currentLanguage.code === 'fr-CA'
        ? 'Fermer'
        : currentLanguage.code === 'pt-BR'
          ? 'Fechar'
          : currentLanguage.code === 'ko-CA'
            ? '닫기'
            : currentLanguage.code === 'zh-CA'
              ? '关闭'
              : 'Close';

  const resendEmailLabel =
    currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA'
      ? 'New email (optional)'
      : currentLanguage.code === 'fr-CA'
        ? 'Nouvel e-mail (optionnel)'
        : currentLanguage.code === 'pt-BR'
          ? 'Novo e-mail (opcional)'
          : currentLanguage.code === 'ko-CA'
            ? '새 이메일(선택 사항)'
            : currentLanguage.code === 'zh-CA'
              ? '新电子邮件（可选）'
              : 'New email (optional)';

  const resendEmailHint =
    currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA'
      ? 'Leave it empty to use the current email.'
      : currentLanguage.code === 'fr-CA'
        ? 'Laissez vide pour utiliser l e-mail actuel.'
        : currentLanguage.code === 'pt-BR'
          ? 'Deixe em branco para usar o e-mail atual.'
          : currentLanguage.code === 'ko-CA'
            ? '현재 이메일을 사용하려면 비워 두세요.'
            : currentLanguage.code === 'zh-CA'
              ? '留空将使用当前电子邮件。'
              : 'Leave it empty to use the current email.';

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch === '' ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    const matchesStatus = statusFilter === '' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const selectedUser = users.find((user) => user.id === selectedUserForModules) ?? null;
  const resendUser = users.find((user) => user.id === selectedUserForResend) ?? null;
  const categoryTitleMap: Record<AvailableModule['category'], string> = {
    basic: t.sections.basicModules,
    complementary: t.sections.complementaryModules,
    ai: t.sections.aiModules,
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === 'active').length;
  const pendingUsers = users.filter((user) => user.status === 'pending').length;
  const inactiveUsers = users.filter((user) => user.status === 'inactive').length;

  const syncBusinessAssignments = (mappedUsers: User[]) => {
    setBusinessAssignments((currentAssignments) => {
      const nextAssignments: Record<string, UserBusinessAssignment> = {};

      for (const user of mappedUsers) {
        const currentAssignment = currentAssignments[user.id] ?? {};
        nextAssignments[user.id] = {
          ...currentAssignment,
          businessId: currentAssignment.businessId ?? (user.businessId ? String(user.businessId) : undefined),
        };
      }

      return nextAssignments;
    });
  };

  const getRoleColorClasses = (role: User['role']) => {
    const styles: Record<User['role'], string> = {
      'Super Admin': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
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
      blue: 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
      yellow: 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
      orange: 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20',
      green: 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20',
      purple: 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20',
      gray: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20',
      gold: 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
      red: 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
    };

    return styles[color];
  };

  const refreshUsers = async (fallbackModules: AvailableModule[] = buildAvailableModules(t)) => {
    const response = await configCenterApi.getUsers();
    const mappedUsers = response.users.map((user) => mapBackendUser(user, fallbackModules));
    const mappedBusinesses = response.catalog.businesses.map(mapCatalogBusiness);
    const mappedModules = response.catalog.modules
      .map((module) => mapCatalogModule(module, t))
      .filter((module): module is AvailableModule => module !== null);

    setUsers(mappedUsers);
    syncBusinessAssignments(mappedUsers);
    setAvailableBusinesses(mappedBusinesses);
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

    runWithMinimumDuration(configCenterApi.getUsers())
      .then((response) => {
        if (!active) {
          return;
        }

        const mappedUsers = response.users.map((user) => mapBackendUser(user, fallbackModules));
        const mappedBusinesses = response.catalog.businesses.map(mapCatalogBusiness);
        const mappedModules = response.catalog.modules
          .map((module) => mapCatalogModule(module, t))
          .filter((module): module is AvailableModule => module !== null);

        setUsers(mappedUsers);
        syncBusinessAssignments(mappedUsers);
        setAvailableBusinesses(mappedBusinesses);
        if (mappedModules.length > 0) {
          setAvailableModules(mergeAvailableModules(mappedModules, fallbackModules));
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Unable to load users.');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteForm(emptyInviteForm);
    setInviteLink('');
    setCopiedLink(false);
  };

  const closeResendModal = () => {
    setShowResendModal(false);
    setSelectedUserForResend(null);
    setInviteLink('');
    setCopiedLink(false);
    setNewEmail('');
  };

  const toggleUserModule = (moduleId: string) => {
    setSelectedModulesDraft((prevModules) =>
      prevModules.includes(moduleId)
        ? prevModules.filter((module) => module !== moduleId)
        : [...prevModules, moduleId],
    );
  };

  const toggleUserStatus = async (user: User) => {
    if (user.source !== 'user') {
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';

    try {
      setLoadError('');
      await configCenterApi.updateUser(user.backendId, {
        role: toBackendRole(user.role),
        status: nextStatus,
        module_slugs: user.modules
          .map((route) => backendSlugForRoute(route as any))
          .filter((slug): slug is string => Boolean(slug)),
      });
      await refreshUsers();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to update user status.');
    }
  };

  const changeUserRole = async (user: User, newRole: User['role']) => {
    if (user.source !== 'user') {
      return;
    }

    try {
      setLoadError('');
      await configCenterApi.updateUser(user.backendId, {
        role: toBackendRole(newRole),
        status: user.status,
        module_slugs: user.modules
          .map((route) => backendSlugForRoute(route as any))
          .filter((slug): slug is string => Boolean(slug)),
      });
      await refreshUsers();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to update user role.');
    }
  };

  const handleSendInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = inviteForm.name.trim();
    const trimmedEmail = inviteForm.email.trim();

    if (!trimmedName || !trimmedEmail) {
      return;
    }

    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.ok) {
      setLoadError(t.loginPage.emailError);
      return;
    }

    try {
      setLoadError('');
      const response = await configCenterApi.inviteUser({
        name: trimmedName,
        email: emailValidation.normalized,
        role: toBackendRole(inviteForm.role),
      });
      await refreshUsers();
      setInviteLink(response.invite_link);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to send invitation.');
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
      const response = await configCenterApi.resendInvitation(
        resendUser.backendId,
        validatedEmail?.ok ? validatedEmail.normalized : undefined,
      );
      await refreshUsers();
      setInviteLink(response.invite_link);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to resend invitation.');
    }
  };

  const handleOpenModuleSettings = (user: User) => {
    if (user.source !== 'user') {
      return;
    }

    setSelectedUserForModules(user.id);
    setSelectedModulesDraft(user.modules);
  };

  const handleSaveSelectedModules = async () => {
    if (!selectedUser || selectedUser.source !== 'user') {
      setSelectedUserForModules(null);
      return;
    }

    try {
      setLoadError('');
      await configCenterApi.updateUser(selectedUser.backendId, {
        role: toBackendRole(selectedUser.role),
        status: selectedUser.status,
        module_slugs: selectedModulesDraft
          .map((route) => backendSlugForRoute(route as any))
          .filter((slug): slug is string => Boolean(slug)),
      });
      await refreshUsers();
      setSelectedUserForModules(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to save module access.');
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
      console.error('Unable to copy invitation link', error);
    }
  };

  const updateInviteForm = (field: keyof InviteFormState, value: string) => {
    setInviteForm((prevForm) => ({
      ...prevForm,
      [field]: value,
    }));
  };

  const formatSelectedModulesCount = (count: number) => {
    if (currentLanguage.code === 'en-US' || currentLanguage.code === 'en-CA') {
      return `${count} module${count === 1 ? '' : 's'} selected`;
    }

    if (currentLanguage.code === 'fr-CA') {
      return `${count} module${count === 1 ? '' : 's'} selectionnes`;
    }

    if (currentLanguage.code === 'pt-BR') {
      return `${count} modulo${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}`;
    }

    if (currentLanguage.code === 'ko-CA') {
      return `${count}개 모듈 선택됨`;
    }

    if (currentLanguage.code === 'zh-CA') {
      return `已选择 ${count} 个模块`;
    }

    return `${count} módulos seleccionados`;
  };

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
        <span className={isActiveColumn && sortState.direction === 'asc' ? 'text-purple-600 dark:text-purple-300' : 'text-gray-300 dark:text-gray-500'}>
          ↑
        </span>
        <span className={isActiveColumn && sortState.direction === 'desc' ? 'text-purple-600 dark:text-purple-300' : 'text-gray-300 dark:text-gray-500'}>
          ↓
        </span>
      </span>
    );
  };

  const renderSortableHeader = (label: string, column: SortColumn) => (
    <button
      type="button"
      onClick={() => handleSortHeaderClick(column)}
      className="inline-flex items-center gap-1.5 transition-colors hover:text-purple-600 dark:hover:text-purple-300"
    >
      <span>{label}</span>
      {renderSortIndicator(column)}
    </button>
  );

  const updateBusinessAssignment = (
    userId: string,
    field: BusinessInlineField,
    value: string,
  ) => {
    setBusinessAssignments((currentAssignments) => ({
      ...currentAssignments,
      [userId]: {
        ...currentAssignments[userId],
        [field === 'businessUnit' ? 'businessUnitId' : 'businessId']: value || undefined,
      },
    }));
    setEditingBusinessCell(null);
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
    const options = field === 'businessUnit' ? businessUnitOptions : availableBusinesses;
    const placeholder = field === 'businessUnit'
      ? usersBusinessCopy.selectBusinessUnit
      : usersBusinessCopy.selectBusiness;

    if (isEditing) {
      return (
        <div ref={businessCellRef} className="relative w-[220px] max-w-full transition-all duration-150 ease-in-out">
          <select
            autoFocus
            value={selectedValue ?? ''}
            onChange={(event) => updateBusinessAssignment(user.id, field, event.target.value)}
            className="h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-white px-5 pr-11 text-base font-semibold text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:border-slate-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600"
          >
            <option value="">{placeholder}</option>
            {options.length > 0 ? (
              options.map((option) => (
                <option
                  key={field === 'businessUnit' ? option.value : option.id}
                  value={field === 'businessUnit' ? option.value : option.id}
                >
                  {field === 'businessUnit' ? option.label : option.name}
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
        onClick={() => setEditingBusinessCell({ userId: user.id, field })}
        className="group inline-flex h-12 w-[220px] max-w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-5 text-left text-base font-semibold text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600 dark:hover:bg-slate-800"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-500" />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
        The users list, role updates, status changes, module assignments, and invitation links in this screen are now backed by Spring.
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 dark:border-purple-700/30 dark:bg-purple-900/20 dark:text-purple-300">
          Loading users...
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          {loadError}
        </div>
      ) : null}

      <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 p-4 dark:border-purple-700/30 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-2xl">👥</span>
              {t.panelInicial.users.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.panelInicial.users.subtitle}
            </p>
          </div>
          <Button
            className="w-full gap-2 bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
            onClick={() => {
              setInviteForm(emptyInviteForm);
              setInviteLink('');
              setCopiedLink(false);
              setShowInviteModal(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            {t.panelInicial.users.invite}
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.panelInicial.users.search}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`pl-10 pr-4 py-2 ${inputClassName}`}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className={`appearance-none cursor-pointer pl-10 pr-10 py-2 ${inputClassName}`}
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="">{t.panelInicial.users.filters.all}</option>
              <option value="Super Admin">{t.panelInicial.users.roles.superAdmin}</option>
              <option value="Admin">{t.panelInicial.users.roles.admin}</option>
              <option value="User">{t.panelInicial.users.roles.user}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className={`appearance-none cursor-pointer pl-10 pr-10 py-2 ${inputClassName}`}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">{t.panelInicial.users.filters.all}</option>
              <option value="active">{t.panelInicial.users.status.active}</option>
              <option value="pending">{t.panelInicial.users.status.pending}</option>
              <option value="inactive">{t.panelInicial.users.status.inactive}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          <div className="text-center">
            <div className="mb-1 text-2xl font-bold text-purple-600 dark:text-purple-400 sm:text-3xl">
              {totalUsers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{summaryLabels.total}</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-2xl font-bold text-green-600 dark:text-green-400 sm:text-3xl">
              {activeUsers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t.panelInicial.users.filters.active}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400 sm:text-3xl">
              {pendingUsers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t.panelInicial.users.filters.pending}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-2xl font-bold text-gray-600 dark:text-gray-400 sm:text-3xl">
              {inactiveUsers}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t.panelInicial.users.filters.inactive}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {renderSortableHeader(t.panelInicial.users.table.actions, 'actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
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
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
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
                            disabled={user.source !== 'user'}
                            className={`h-12 w-full appearance-none rounded-[18px] border border-slate-200 bg-white px-5 pr-11 text-base font-semibold text-slate-900 shadow-sm transition-all duration-150 ease-in-out hover:border-slate-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600 ${
                              user.source !== 'user' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            }`}
                          >
                            <option value="Super Admin">{t.panelInicial.users.roles.superAdmin}</option>
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
                        <button
                          type="button"
                          onClick={() => handleOpenModuleSettings(user)}
                          disabled={user.source !== 'user'}
                          className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-800/70 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
                        >
                          <Settings className="h-4 w-4" />
                          <span>{formatModulesCount(user.modules.length)}</span>
                        </button>
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
                        <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user)}
                            disabled={user.source !== 'user'}
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-150 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 ${
                              user.status === 'active'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                            title={
                              user.status === 'active'
                                ? t.panelInicial.users.status.inactive
                                : t.panelInicial.users.status.active
                            }
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenModuleSettings(user)}
                            disabled={user.source !== 'user'}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-violet-200 bg-violet-50 text-violet-600 transition-all duration-150 ease-in-out hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
                            title={t.panelInicial.users.modal.modules}
                          >
                            <Settings className="h-5 w-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForResend(user.id);
                              setShowResendModal(true);
                              setInviteLink('');
                              setCopiedLink(false);
                              setNewEmail('');
                            }}
                            disabled={user.source !== 'invitation'}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50 text-blue-600 transition-all duration-150 ease-in-out hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                            title={t.panelInicial.users.actions.resend}
                          >
                            <Mail className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {summaryLabels.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-purple-700 to-fuchsia-600 px-6 py-6 text-white sm:px-8">
              <div>
                <h3 className="text-2xl font-semibold">
                  {t.panelInicial.users.modal.modules}
                </h3>
                <p className="mt-2 text-sm font-medium text-purple-100">{selectedUser.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForModules(null)}
                className="rounded-xl p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 dark:bg-slate-950 sm:p-8">
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
                      {availableModules
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
                                  ? `${colorClasses} ring-2 ring-purple-500/10`
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
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {formatSelectedModulesCount(selectedModulesDraft.length)}
              </div>
              <Button
                onClick={handleSaveSelectedModules}
                className="w-full rounded-xl bg-purple-600 px-6 text-white shadow-sm hover:bg-purple-700 sm:w-auto"
              >
                {t.panelInicial.users.modal.save}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t.panelInicial.users.modal.newUser}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t.panelInicial.users.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeInviteModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSendInvite}>
              <div className="space-y-4 p-4 sm:p-6">
                {!inviteLink ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t.panelInicial.users.modal.name}
                      </label>
                      <input
                        type="text"
                        value={inviteForm.name}
                        onChange={(event) => updateInviteForm('name', event.target.value)}
                        className={`px-4 py-2 ${inputClassName}`}
                        placeholder={t.panelInicial.users.modal.name}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t.panelInicial.users.modal.email}
                      </label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(event) => updateInviteForm('email', event.target.value)}
                        className={`px-4 py-2 ${inputClassName}`}
                        placeholder="email@company.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t.panelInicial.users.modal.role}
                      </label>
                      <div className="relative">
                        <select
                          value={inviteForm.role}
                          onChange={(event) =>
                            updateInviteForm('role', event.target.value as User['role'])
                          }
                          className={`appearance-none cursor-pointer px-4 py-2 pr-10 ${inputClassName}`}
                        >
                          <option value="Super Admin">{t.panelInicial.users.roles.superAdmin}</option>
                          <option value="Admin">{t.panelInicial.users.roles.admin}</option>
                          <option value="User">{t.panelInicial.users.roles.user}</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-400 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">{summaryLabels.inviteSuccess}</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400">{inviteForm.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t.panelInicial.users.modal.inviteLink}
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={inviteLink}
                          readOnly
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(inviteLink)}
                          className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 sm:w-auto"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-4 h-4" />
                              {t.panelInicial.users.modal.copied}
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              {t.panelInicial.users.modal.copyLink}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50 sm:flex-row sm:items-center sm:justify-end sm:p-6">
                {!inviteLink ? (
                  <>
                    <Button
                      type="button"
                      onClick={closeInviteModal}
                      className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
                    >
                      {t.panelInicial.users.modal.cancel}
                    </Button>
                    <Button type="submit" className="w-full gap-2 bg-purple-600 text-white hover:bg-purple-700 sm:w-auto">
                      <UserPlus className="w-4 h-4" />
                      {t.panelInicial.users.modal.send}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={closeInviteModal}
                    className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
                  >
                    {closeLabel}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showResendModal && resendUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t.panelInicial.users.actions.resend}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{resendUser.name}</p>
              </div>
              <button
                type="button"
                onClick={closeResendModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {!inviteLink ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.panelInicial.users.modal.email}
                    </label>
                    <input
                      type="text"
                      value={resendUser.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {resendEmailLabel}
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      className={`px-4 py-2 ${inputClassName}`}
                      placeholder={t.panelInicial.users.modal.email}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {resendEmailHint}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-400 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">{summaryLabels.resendSuccess}</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {newEmail.trim() || resendUser.email}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.panelInicial.users.modal.inviteLink}
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inviteLink)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 sm:w-auto"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4" />
                            {t.panelInicial.users.modal.copied}
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            {t.panelInicial.users.modal.copyLink}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50 sm:flex-row sm:items-center sm:justify-end sm:p-6">
              {!inviteLink ? (
                <>
                  <Button
                    type="button"
                    onClick={closeResendModal}
                    className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
                  >
                    {t.panelInicial.users.modal.cancel}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleResendInvite}
                    className="w-full gap-2 bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
                  >
                    <Mail className="w-4 h-4" />
                    {t.panelInicial.users.actions.resend}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={closeResendModal}
                  className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
                >
                  {closeLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
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

function mapCatalogBusiness(business: ConfigCenterCatalogBusiness): BusinessOption {
  return {
    id: String(business.id),
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
    businessId: user.business_id ?? null,
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
