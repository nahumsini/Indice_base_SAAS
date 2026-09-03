import { BriefcaseBusiness, Building2, Bot, Check, CreditCard, Globe, GraduationCap, LoaderCircle, User, Sun, Moon, Sunrise, Settings, ShieldCheck, MonitorSmartphone, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { getStoredLanguagePreference, useLanguage, languages } from '../shared/context';
import { NotificationCenter } from './NotificationCenter';
import { useEffect, useRef, useState } from 'react';
import { authApi, type PublicDemoCompany } from '../api/auth';
import type { AuthSessionResponse } from '../api/auth.types';
import { platformAdminApi } from '../api/platformAdmin';
import { configCenterApi, type ConfigCenterCurrentUser } from '../api/configCenter';
import type { AppNotification } from '../api/notifications';
import { NotificationMenu } from './notifications/NotificationMenu';
import { useNotifications } from './notifications/useNotifications';
import { PreferredCurrencyControl } from '../BasicModules/shared/PreferredCurrencyControl';
import { useHeaderTranslations } from './header/hooks/useHeaderTranslations';
import { isAdminAccessRole, normalizeAccessRole } from '../access/accessRules';
import { managedCompanyApi, type ManagedCompanyContext } from '../api/managedCompanies';
import { getCachedAuthSession } from '../api/authSessionStore';
import { useAuthorizationRevision } from '../hooks/useAuthorizationRevision';
import { canAccessKioskCenter, canAccessModuleTab } from '../access/tabScopeCatalog';

interface HeaderProps {
  learningModeActive: boolean;
  onToggleLearningMode: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const USER_PROFILE_UPDATED_EVENT = 'indice:user-profile-updated';
const HEADER_ACTION_BUTTON_CLASSES = 'h-10 w-10 rounded-full border border-transparent text-[#4B5563] transition-all hover:border-[#59C3A5]/35 hover:bg-white/70 hover:text-[#222831] dark:text-gray-300 dark:hover:border-[#59C3A5]/45 dark:hover:bg-white/10 dark:hover:text-white';

const getProfileDisplayName = (user: ConfigCenterCurrentUser) => {
  return [
    user.primer_nombre || user.nombres,
    user.apellido_paterno || user.apellidos,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || user.email || 'User';
};

export function Header({ learningModeActive, onToggleLearningMode, darkMode, onToggleDarkMode }: HeaderProps) {
  const navigate = useNavigate();
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const { copy } = useHeaderTranslations();
  const currentHour = new Date().getHours();
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('User');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState('');
  const [authSession, setAuthSession] = useState<AuthSessionResponse | null>(null);
  const [platformAdminRole, setPlatformAdminRole] = useState('');
  const [switchingCompanyId, setSwitchingCompanyId] = useState<number | null>(null);
  const [companySwitchError, setCompanySwitchError] = useState('');
  const [managedContext, setManagedContext] = useState<ManagedCompanyContext | null>(null);
  const [managedSearch, setManagedSearch] = useState('');
  const [publicDemoCompanies, setPublicDemoCompanies] = useState<PublicDemoCompany[]>([]);
  const notifications = useNotifications();
  useAuthorizationRevision();
  const cachedAuthorizationSession = getCachedAuthSession();
  const effectiveAuthSession = cachedAuthorizationSession === undefined
    ? authSession
    : cachedAuthorizationSession;
  const shouldRestoreLanguageFromProfile = useRef(!getStoredLanguagePreference());

  useEffect(() => {
    let active = true;
    const applyUserProfile = (user: ConfigCenterCurrentUser) => {
      setCurrentUserName(getProfileDisplayName(user));
      setCurrentUserEmail(user.email || '');
      setCurrentUserAvatarUrl(user.avatar_url || '');
      if (shouldRestoreLanguageFromProfile.current && !getStoredLanguagePreference()) {
        const preferredLanguage = languages.find((language) => (
          language.code === user.preferred_language
          || (user.preferred_language === 'es-419' && language.code === 'es-MX')
        ));
        shouldRestoreLanguageFromProfile.current = false;
        if (preferredLanguage) setCurrentLanguage(preferredLanguage);
      }
    };

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: ConfigCenterCurrentUser }>).detail;
      if (detail?.user) {
        applyUserProfile(detail.user);
      }
    };

    window.addEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate);

    authApi.getSessionOrNull()
      .then((session) => {
        if (active) {
          setAuthSession(session);
        }
        if (!session) {
          return;
        }
        if (!session.demoMode && session.company.commercial_account_type === 'DISTRIBUTOR') {
          authApi.getPublicDemos()
            .then((response) => {
              if (active) setPublicDemoCompanies(response.companies);
            })
            .catch(() => {
              if (active) setPublicDemoCompanies([]);
            });
        }
        managedCompanyApi.context()
          .then((context) => {
            if (active) setManagedContext(context);
          })
          .catch(() => {
            if (active) setManagedContext(null);
          });
        platformAdminApi.getContext()
          .then((context) => {
            if (active) {
              setPlatformAdminRole(context.role);
            }
          })
          .catch(() => {
            if (active) {
              setPlatformAdminRole('');
            }
          });
      })
      .catch(() => {
        // Profile loading still provides a safe header fallback.
      });

    configCenterApi.getCurrentUser()
      .then((user) => {
        if (!active) {
          return;
        }
        applyUserProfile(user);
      })
      .catch(() => {
        authApi.getSessionOrNull()
          .then((session) => {
            if (!active || !session?.user?.name) {
              return;
            }
            setCurrentUserName(session.user.name);
            setCurrentUserEmail('');
          })
          .catch(() => {
            // Keep the fallback header content if both profile calls fail.
          });
      });

    return () => {
      active = false;
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate);
    };
  }, [setCurrentLanguage]);
  
  const getGreeting = () => {
    if (currentHour >= 6 && currentHour < 12) {
      return copy.greetings.morning;
    } else if (currentHour >= 12 && currentHour < 19) {
      return copy.greetings.afternoon;
    } else {
      return copy.greetings.evening;
    }
  };
  
  const getGreetingIcon = () => {
    if (currentHour >= 6 && currentHour < 12) {
      return (
        <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-1.5">
          <Sunrise className="h-5 w-5 text-orange-600" />
        </div>
      );
    } else if (currentHour >= 12 && currentHour < 19) {
      return (
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-1.5">
          <Sun className="h-5 w-5 text-yellow-600" />
        </div>
      );
    } else {
      return (
        <div className="bg-gradient-to-br from-indigo-100 to-purple-200 rounded-lg p-1.5">
          <Moon className="h-5 w-5 text-indigo-600" />
        </div>
      );
    }
  };
  
  const unreadCount = notifications.summary?.unread_count ?? 0;
  const currentUserInitials = currentUserName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
  const currentUserPrimaryName = currentUserName.trim().split(/\s+/)[0] || 'User';
  const isPublicDemoSession = effectiveAuthSession?.demoMode === true;
  const isRootAccount = !isPublicDemoSession && (platformAdminRole === 'PLATFORM_ROOT'
    || normalizeAccessRole(effectiveAuthSession?.user.role) === 'root');
  const isDistributorAccount = !isPublicDemoSession
    && effectiveAuthSession?.company.commercial_account_type === 'DISTRIBUTOR';
  const directCompanyIds = new Set((effectiveAuthSession?.companies ?? []).map((company) => company.id));
  const managedCompanies = (managedContext?.companies ?? [])
    .filter((company) => !directCompanyIds.has(company.id))
    .filter((company) => company.name.toLocaleLowerCase().includes(managedSearch.trim().toLocaleLowerCase()));
  const matchingPublicDemoCompanies = publicDemoCompanies
    .filter((company) => company.name.toLocaleLowerCase().includes(managedSearch.trim().toLocaleLowerCase()));
  const visibleManagedCompany = managedContext?.active_company;
  const visibleCompanyName = visibleManagedCompany?.name ?? effectiveAuthSession?.company.name ?? '';
  const canSelectCompany = (effectiveAuthSession?.companies?.length ?? 0) > 1
    || (managedContext?.companies?.length ?? 0) > 0
    || (isDistributorAccount && publicDemoCompanies.length > 0);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await authApi.logout();
    } finally {
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    }
  };

  const handleCompanySwitch = async (companyId: number) => {
    if (switchingCompanyId) {
      return;
    }
    setSwitchingCompanyId(companyId);
    setCompanySwitchError('');
    try {
      if (managedContext?.active) {
        const context = await managedCompanyApi.clear();
        setManagedContext(context);
      }
      if (companyId === effectiveAuthSession?.company.id) {
        window.location.reload();
        return;
      }
      const nextSession = await authApi.switchCompany(companyId);
      setAuthSession(nextSession);
      window.location.reload();
    } catch {
      setCompanySwitchError(copy.actions.companySwitchError);
      setSwitchingCompanyId(null);
    }
  };

  const handleManagedCompanySelect = async (companyId: number) => {
    if (switchingCompanyId) return;
    setSwitchingCompanyId(companyId);
    setCompanySwitchError('');
    try {
      const context = await managedCompanyApi.activate(companyId);
      setManagedContext(context);
      window.location.assign('/dashboard');
    } catch {
      setCompanySwitchError(currentLanguage.code.startsWith('es')
        ? 'No fue posible abrir la cuenta cliente.'
        : 'The client account could not be opened.');
      setSwitchingCompanyId(null);
    }
  };

  const handleManagedCompanyClear = async () => {
    if (switchingCompanyId) return;
    setSwitchingCompanyId(-1);
    setCompanySwitchError('');
    try {
      const context = await managedCompanyApi.clear();
      setManagedContext(context);
      window.location.assign('/dashboard');
    } catch {
      setCompanySwitchError(currentLanguage.code.startsWith('es')
        ? 'No fue posible salir de la consulta.'
        : 'The client consultation could not be closed.');
      setSwitchingCompanyId(null);
    }
  };

  const handlePublicDemoSelect = (companyId: number) => {
    if (switchingCompanyId) return;
    setSwitchingCompanyId(companyId);
    setCompanySwitchError('');
    window.location.assign(`/demo?companyId=${encodeURIComponent(companyId)}`);
  };

  const openNotificationCenter = () => {
    setIsNotificationMenuOpen(false);
    setIsNotificationCenterOpen(true);
    void notifications.refresh();
  };

  const handleNotificationMenuOpenChange = (open: boolean) => {
    setIsNotificationMenuOpen(open);
    if (open) {
      void notifications.refresh();
    }
  };

  const openNotificationItem = (notification: AppNotification) => {
    setIsNotificationMenuOpen(false);
    setIsNotificationCenterOpen(false);
    void (async () => {
      if (notification.is_unread) {
        await notifications.markRead(notification.id);
      }
      if (notification.action_url) {
        navigate(notification.action_url);
      }
    })();
  };

  const markNotificationRead = (notificationId: number) => {
    void notifications.markRead(notificationId);
  };

  const dismissNotification = (notificationId: number) => {
    void notifications.dismiss(notificationId);
  };

  const markAllNotificationsRead = () => {
    void notifications.markAllRead();
  };

  return (
    <header className="border-b border-[#D8DCE3] bg-[#E7F3F2] px-4 py-3 shadow-sm transition-colors dark:border-[#3A424E] dark:bg-[#222831] sm:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Layout móvil y desktop */}
        <div className="flex items-center justify-between gap-3">
          {/* Sección izquierda - Saludo */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="hidden sm:inline">{getGreetingIcon()}</span>
                <span className="truncate">{getGreeting()}, {currentUserPrimaryName}</span>
              </h1>
            </div>
          </div>

          {/* Sección derecha - Acciones */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {isPublicDemoSession ? (
              <div
                className="hidden items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm sm:flex dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200"
                title={currentLanguage.code.startsWith('es')
                  ? 'Sesión temporal con datos ficticios'
                  : 'Temporary session with fictitious data'}
              >
                <MonitorSmartphone className="h-4 w-4" />
                {currentLanguage.code.startsWith('es') ? 'Modo demo' : 'Demo mode'}
              </div>
            ) : null}
            {canSelectCompany ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 max-w-48 gap-2 rounded-full border border-[#59C3A5]/30 bg-white/65 px-3 text-[#334155] hover:bg-white dark:bg-white/10 dark:text-gray-100"
                    aria-label={`${copy.actions.company}: ${visibleCompanyName}`}
                    title={copy.actions.switchCompany}
                    disabled={switchingCompanyId !== null}
                  >
                    {switchingCompanyId !== null ? (
                      <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <Building2 className="h-4 w-4 shrink-0 text-[#3AAE90]" />
                    )}
                    <span className="hidden max-w-32 truncate text-sm font-medium xl:inline">
                      {switchingCompanyId !== null ? copy.actions.switchingCompany : visibleCompanyName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[min(36rem,80vh)] w-80 overflow-y-auto rounded-2xl p-2">
                  <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {currentLanguage.code.startsWith('es') ? 'Tus empresas' : 'Your companies'}
                  </div>
                  {effectiveAuthSession?.companies?.map((company) => (
                    <DropdownMenuItem
                      key={company.user_company_id}
                      className="cursor-pointer gap-3 rounded-xl px-3 py-3"
                      disabled={switchingCompanyId !== null}
                      onClick={() => void handleCompanySwitch(company.id)}
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-[#3AAE90]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{company.name}</div>
                        <div className="truncate text-xs text-gray-500">{company.role}</div>
                      </div>
                      {company.active ? <Check className="h-4 w-4 shrink-0 text-[#3AAE90]" /> : null}
                    </DropdownMenuItem>
                  ))}
                  {(managedContext?.companies?.length ?? 0) > 0 ? (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 pb-2 pt-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                          {managedContext?.authority_mode === 'PLATFORM_ROOT'
                            ? (currentLanguage.code.startsWith('es') ? 'Clientes del sistema' : 'System clients')
                            : (currentLanguage.code.startsWith('es') ? 'Cartera de clientes' : 'Client portfolio')}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {currentLanguage.code.startsWith('es') ? 'Consulta operativa · Solo lectura' : 'Operational review · Read only'}
                        </p>
                      </div>
                      <div className="relative mb-2 px-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={managedSearch}
                          onChange={(event) => setManagedSearch(event.target.value)}
                          onKeyDown={(event) => event.stopPropagation()}
                          placeholder={currentLanguage.code.startsWith('es') ? 'Buscar cliente' : 'Search client'}
                          aria-label={currentLanguage.code.startsWith('es') ? 'Buscar cliente' : 'Search client'}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                      {managedCompanies.map((company) => (
                        <DropdownMenuItem
                          key={`managed-${company.id}`}
                          className="cursor-pointer gap-3 rounded-xl px-3 py-3"
                          disabled={switchingCompanyId !== null}
                          onClick={() => void handleManagedCompanySelect(company.id)}
                        >
                          <BriefcaseBusiness className="h-4 w-4 shrink-0 text-blue-600" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{company.name}</div>
                            <div className="truncate text-xs text-gray-500">
                              {managedContext?.authority_mode === 'PLATFORM_ROOT'
                                ? 'Root'
                                : (currentLanguage.code.startsWith('es') ? 'Cartera' : 'Portfolio')}
                            </div>
                          </div>
                          {company.active ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}
                        </DropdownMenuItem>
                      ))}
                      {!managedCompanies.length ? (
                        <p className="px-3 py-3 text-xs text-slate-500">
                          {currentLanguage.code.startsWith('es') ? 'No hay clientes que coincidan.' : 'No matching clients.'}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {isDistributorAccount && publicDemoCompanies.length > 0 ? (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 pb-2 pt-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                          {currentLanguage.code.startsWith('es') ? 'Demos para presentaciones' : 'Presentation demos'}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          <MonitorSmartphone className="h-3.5 w-3.5" />
                          {currentLanguage.code.startsWith('es') ? 'Escenarios públicos · Datos ficticios' : 'Public scenarios · Fictitious data'}
                        </p>
                      </div>
                      {(managedContext?.companies?.length ?? 0) === 0 ? (
                        <div className="relative mb-2 px-1">
                          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            value={managedSearch}
                            onChange={(event) => setManagedSearch(event.target.value)}
                            onKeyDown={(event) => event.stopPropagation()}
                            placeholder={currentLanguage.code.startsWith('es') ? 'Buscar demostración' : 'Search demo'}
                            aria-label={currentLanguage.code.startsWith('es') ? 'Buscar demostración' : 'Search demo'}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                      ) : null}
                      {matchingPublicDemoCompanies.map((company) => (
                        <DropdownMenuItem
                          key={`public-demo-${company.id}`}
                          className="cursor-pointer gap-3 rounded-xl px-3 py-3"
                          disabled={switchingCompanyId !== null}
                          onClick={() => handlePublicDemoSelect(company.id)}
                        >
                          <MonitorSmartphone className="h-4 w-4 shrink-0 text-emerald-600" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{company.name}</div>
                            <div className="truncate text-xs text-gray-500">
                              {currentLanguage.code.startsWith('es') ? 'Abrir acceso demo' : 'Open demo access'}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {!matchingPublicDemoCompanies.length ? (
                        <p className="px-3 py-3 text-xs text-slate-500">
                          {currentLanguage.code.startsWith('es') ? 'No hay demostraciones que coincidan.' : 'No matching demos.'}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {companySwitchError ? (
                    <p className="px-3 py-2 text-xs font-medium text-red-600">{companySwitchError}</p>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <PreferredCurrencyControl />

            {/* Notificaciones */}
            <NotificationMenu
              open={isNotificationMenuOpen}
              items={notifications.items}
              unreadCount={unreadCount}
              loading={notifications.loading}
              error={notifications.error}
              onOpenChange={handleNotificationMenuOpenChange}
              onOpenAll={openNotificationCenter}
              onOpenItem={openNotificationItem}
            />

            {/* Selector de idioma */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 min-w-14 gap-1.5 rounded-full border border-transparent px-2 text-[#4B5563] transition-all hover:border-[#59C3A5]/35 hover:bg-white/70 hover:text-[#222831] dark:text-gray-300 dark:hover:border-[#59C3A5]/45 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={`${copy.actions.language}: ${currentLanguage.name}`}
                  title={currentLanguage.name}
                >
                  <Globe className="h-[18px] w-[18px]" />
                  <span className="text-lg leading-none" aria-hidden="true">{currentLanguage.flag}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => setCurrentLanguage(language)}
                    className={`flex cursor-pointer items-center gap-2 ${currentLanguage.code === language.code ? 'bg-[#E7F3F2] focus:bg-[#E7F3F2] dark:bg-[#59C3A5]/15 dark:focus:bg-[#59C3A5]/20' : ''}`}
                  >
                    <span className="text-xl" aria-hidden="true">{language.flag}</span>
                    <span className="min-w-0 flex-1">{language.name}</span>
                    {currentLanguage.code === language.code ? (
                      <Check className="h-4 w-4 shrink-0 text-[#3AAE90]" aria-hidden="true" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark mode */}
            <Button 
              variant="ghost" 
              size="icon" 
              className={`${HEADER_ACTION_BUTTON_CLASSES} ${darkMode ? 'border-[#59C3A5]/50 bg-white/75 dark:bg-white/10' : ''}`}
              onClick={onToggleDarkMode}
              aria-pressed={darkMode}
              aria-label={darkMode ? copy.actions.lightMode : copy.actions.darkMode}
              title={darkMode ? copy.actions.lightMode : copy.actions.darkMode}
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Operational journey - desktop only */}
            <Button 
              variant="ghost" 
              size="icon" 
              className={`hidden sm:flex ${HEADER_ACTION_BUTTON_CLASSES} ${learningModeActive ? 'border-[#59C3A5]/50 bg-white/75 dark:bg-white/10' : ''}`}
              onClick={onToggleLearningMode}
              aria-label={copy.actions.learningMode}
              aria-pressed={learningModeActive}
              title={copy.actions.learningMode}
            >
              <GraduationCap className="h-5 w-5" />
            </Button>

            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${HEADER_ACTION_BUTTON_CLASSES} overflow-hidden bg-white/70`}
                  aria-label={copy.actions.profile}
                  title={copy.actions.profile}
                >
                  {currentUserAvatarUrl ? (
                    <img
                      src={currentUserAvatarUrl}
                      alt=""
                      onError={() => setCurrentUserAvatarUrl('')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-[var(--indice-brand-action)] dark:text-emerald-300">
                      {currentUserInitials}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 overflow-hidden rounded-2xl border border-[#59C3A5]/35 bg-white p-0 shadow-[0_24px_60px_rgba(34,40,49,0.18)] dark:border-[#59C3A5]/30 dark:bg-[#222831]"
              >
                {/* Profile header */}
                <div className="border-b border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] p-4">
                  <div className="flex items-center gap-3">
                    {currentUserAvatarUrl ? (
                      <img
                        src={currentUserAvatarUrl}
                        alt={currentUserName}
                        onError={() => setCurrentUserAvatarUrl('')}
                        className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white/70 text-sm font-semibold text-[var(--indice-brand-action)] shadow-sm">
                        {currentUserInitials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-base font-semibold text-[#222831]">
                        {currentUserName}
                      </h3>
                      <p className="truncate text-xs text-slate-600">
                        {currentUserEmail}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Menu options */}
                <div className="bg-white py-1 dark:bg-[#222831]">
                  {isPublicDemoSession ? (
                    <div className="px-4 py-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {currentLanguage.code.startsWith('es')
                        ? 'Estás explorando datos ficticios. La administración de la cuenta está protegida.'
                        : 'You are exploring fictitious data. Account administration is protected.'}
                    </div>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/home-panel/profile')} className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10">
                        <User className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{copy.actions.profile}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-0 bg-[#59C3A5]/15 dark:bg-[#59C3A5]/20" />
                    </>
                  )}
                  {isAdminAccessRole(effectiveAuthSession?.user.role) && !isPublicDemoSession ? (
                    <>
                      {canAccessModuleTab('home-panel', 'integrations', effectiveAuthSession) ? (
                        <DropdownMenuItem onClick={() => navigate('/home-panel/integrations')} className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10">
                          <Bot className="h-4 w-4 mr-3 text-[#177D66]" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {copy.actions.connectAi}
                          </span>
                        </DropdownMenuItem>
                      ) : null}
                      {canAccessKioskCenter(effectiveAuthSession) ? (
                        <DropdownMenuItem onClick={() => navigate('/kiosk-center')} className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10">
                          <MonitorSmartphone className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {currentLanguage.code.startsWith('es') ? 'Centro de kioscos' : 'Kiosk Center'}
                          </span>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => navigate('/billing')} className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10">
                        <CreditCard className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {copy.actions.subscription}
                        </span>
                      </DropdownMenuItem>
                      {isDistributorAccount ? (
                        <DropdownMenuItem onClick={() => navigate('/distributor-portal')} className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10">
                          <BriefcaseBusiness className="h-4 w-4 mr-3 text-[#177D66]" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {copy.actions.distributorPortal}
                          </span>
                        </DropdownMenuItem>
                      ) : null}
                      {isRootAccount ? (
                        <DropdownMenuItem onClick={() => navigate('/platform-admin')} className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10">
                          <ShieldCheck className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {copy.actions.platformAdmin}
                          </span>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator className="my-0 bg-[#59C3A5]/15 dark:bg-[#59C3A5]/20" />
                    </>
                  ) : null}
                  {!isPublicDemoSession ? (
                    <DropdownMenuItem onClick={() => navigate('/home-panel/business-structure')} className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10">
                      <Settings className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{copy.actions.settings}</span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator className="my-0 bg-[#59C3A5]/15 dark:bg-[#59C3A5]/20 sm:hidden" />
                  {/* Operational journey on mobile - menu only */}
                  <DropdownMenuItem 
                    className="cursor-pointer px-4 py-3 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10 sm:hidden"
                    onClick={onToggleLearningMode}
                  >
                    <GraduationCap className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{copy.actions.learningMode}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0 bg-[#59C3A5]/15 dark:bg-[#59C3A5]/20 sm:hidden" />
                </div>
                <div className="border-t border-[#59C3A5]/25 bg-[#E7F3F2] p-3 dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10">
                  <DropdownMenuItem
                    className="cursor-pointer justify-center rounded-xl px-3 py-2 text-center hover:bg-white/70 focus:bg-white/70 dark:hover:bg-white/10 dark:focus:bg-white/10"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">{isLoggingOut ? copy.actions.loggingOut : copy.actions.logout}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {managedContext?.active && managedContext.active_company ? (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <div className="rounded-full bg-blue-100 p-2 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {currentLanguage.code.startsWith('es')
                    ? `Consultando ${managedContext.active_company.name}`
                    : `Consulting ${managedContext.active_company.name}`}
                </p>
                <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-200/80">
                  {currentLanguage.code.startsWith('es')
                    ? 'Ves su interfaz y sus datos como superadministrador. Los cambios están bloqueados.'
                    : 'You can see its interface and data as a super administrator. Changes are blocked.'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 rounded-full border-blue-300 bg-white px-4 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-400/40 dark:bg-transparent dark:text-blue-100 dark:hover:bg-blue-400/10"
              onClick={() => void handleManagedCompanyClear()}
              disabled={switchingCompanyId !== null}
            >
              {switchingCompanyId === -1 ? (
                <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {currentLanguage.code.startsWith('es') ? 'Salir de la consulta' : 'Exit consultation'}
            </Button>
          </div>
        ) : null}

      </div>

      {/* Centro de Notificaciones Modal */}
      <NotificationCenter 
        isOpen={isNotificationCenterOpen}
        items={notifications.items}
        summary={notifications.summary}
        loading={notifications.loading}
        error={notifications.error}
        onClose={() => setIsNotificationCenterOpen(false)}
        onRefresh={() => void notifications.refresh()}
        onOpenItem={openNotificationItem}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
        onDismiss={dismissNotification}
      />
    </header>
  );
}
