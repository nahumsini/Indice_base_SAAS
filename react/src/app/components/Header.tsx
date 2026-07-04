import { Globe, GraduationCap, User, Sun, Moon, Sunrise, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useLanguage, languages } from '../shared/context';
import { NotificationCenter } from './NotificationCenter';
import { useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import { configCenterApi, type ConfigCenterCurrentUser } from '../api/configCenter';
import type { AppNotification } from '../api/notifications';
import { NotificationMenu } from './notifications/NotificationMenu';
import { useNotifications } from './notifications/useNotifications';
import { PreferredCurrencyControl } from '../BasicModules/shared/PreferredCurrencyControl';

interface HeaderProps {
  learningModeActive: boolean;
  onToggleLearningMode: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const USER_PROFILE_UPDATED_EVENT = 'indice:user-profile-updated';

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
  const { pathname } = useLocation();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const currentHour = new Date().getHours();
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('User');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState('');
  const notifications = useNotifications();

  useEffect(() => {
    let active = true;
    const applyUserProfile = (user: ConfigCenterCurrentUser) => {
      setCurrentUserName(getProfileDisplayName(user));
      setCurrentUserEmail(user.email || '');
      setCurrentUserAvatarUrl(user.avatar_url || '');
    };

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: ConfigCenterCurrentUser }>).detail;
      if (detail?.user) {
        applyUserProfile(detail.user);
      }
    };

    window.addEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate);

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
  }, []);
  
  const getGreeting = () => {
    if (currentHour >= 6 && currentHour < 12) {
      return currentLanguage.greetings.morning;
    } else if (currentHour >= 12 && currentHour < 19) {
      return currentLanguage.greetings.afternoon;
    } else {
      return currentLanguage.greetings.evening;
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
  
  const currentDate = new Date().toLocaleDateString(currentLanguage.code, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const currentTime = new Date().toLocaleTimeString(currentLanguage.code, { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const unreadCount = notifications.summary?.unread_count ?? 0;
  const showPreferredCurrencyControl = [
    '/expenses',
    '/human-resources/collaborators',
    '/human-resources/payroll',
    '/human-resources/assets',
    '/human-resources/incentives',
    '/human-resources/kpis',
    '/point-of-sale',
    '/sales',
  ].some((pathPrefix) => pathname.startsWith(pathPrefix));
  const currentUserInitials = currentUserName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

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
    <header className="bg-gradient-to-r from-[#e8ebff] via-[#f6f0e5] to-[#ddf7ed] dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5 shadow-sm transition-colors">
      <div className="max-w-[1600px] mx-auto">
        {/* Layout móvil y desktop */}
        <div className="flex items-center justify-between gap-3">
          {/* Sección izquierda - Avatar y Saludo */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {currentUserAvatarUrl ? (
              <img
                src={currentUserAvatarUrl}
                alt={currentUserName}
                onError={() => setCurrentUserAvatarUrl('')}
                className="h-12 w-12 flex-shrink-0 rounded-full border-2 border-blue-500 object-cover shadow-sm sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 text-sm font-semibold text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-200 sm:h-14 sm:w-14 sm:text-base">
                {currentUserInitials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="hidden sm:inline">{getGreetingIcon()}</span>
                <span className="truncate">{getGreeting()}, <span className="hidden sm:inline">{currentUserName}</span><span className="sm:hidden">{currentUserName.split(' ')[0] || currentUserName}</span></span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 capitalize truncate">
                {currentDate} • {currentTime}
              </p>
            </div>
          </div>

          {/* Sección derecha - Acciones */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {showPreferredCurrencyControl ? (
              <div className="hidden lg:flex">
                <PreferredCurrencyControl />
              </div>
            ) : null}

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
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative h-9 w-9 sm:h-10 sm:w-10">
                  <span className="absolute -top-1 -right-1 text-xs sm:text-sm">{currentLanguage.flag}</span>
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => setCurrentLanguage(language)}
                    className={currentLanguage.code === language.code ? 'bg-gray-100' : ''}
                  >
                    <span className="text-xl mr-2">{language.flag}</span>
                    {language.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark mode */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 h-9 w-9 sm:h-10 sm:w-10"
              onClick={onToggleDarkMode}
            >
              {darkMode ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
              )}
            </Button>

            {/* Operational journey - desktop only */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden sm:flex rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={onToggleLearningMode}
            >
              <GraduationCap className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>

            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors h-9 w-9 sm:h-10 sm:w-10">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-0">
                {/* Profile header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-[#2563EB]">
                  <div className="flex items-center gap-3">
                    {currentUserAvatarUrl ? (
                      <img
                        src={currentUserAvatarUrl}
                        alt={currentUserName}
                        onError={() => setCurrentUserAvatarUrl('')}
                        className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white/20 text-sm font-semibold text-white shadow-sm">
                        {currentUserInitials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-white truncate">
                        {currentUserName}
                      </h3>
                      <p className="text-xs text-white/80 truncate">
                        {currentUserEmail}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Menu options */}
                <div className="py-1">
                  <DropdownMenuItem className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <User className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.header.profile}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0" />
                  <DropdownMenuItem className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Settings className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.header.settings}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0" />
                  {/* Operational journey on mobile - menu only */}
                  <DropdownMenuItem 
                    className="sm:hidden px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={onToggleLearningMode}
                  >
                    <GraduationCap className="h-4 w-4 mr-3 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.header.learningMode}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="sm:hidden my-0" />
                  <DropdownMenuItem
                    className="px-4 py-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">{t.header.logout}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {showPreferredCurrencyControl ? (
          <div className="mt-3 flex lg:hidden">
            <PreferredCurrencyControl />
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
