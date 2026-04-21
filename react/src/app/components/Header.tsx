import { Bell, Globe, GraduationCap, User, Sun, Moon, Sunrise, Settings } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useLanguage, languages } from '../shared/context';
import { NotificationCenter } from './NotificationCenter';
import { useEffect, useState } from 'react';
import { authApi } from '../api/auth';

interface HeaderProps {
  learningModeActive: boolean;
  onToggleLearningMode: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ learningModeActive, onToggleLearningMode, darkMode, onToggleDarkMode }: HeaderProps) {
  const navigate = useNavigate();
  const { currentLanguage, setCurrentLanguage, t } = useLanguage();
  const currentHour = new Date().getHours();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('Nahum Peña');

  useEffect(() => {
    let active = true;

    authApi.getSessionOrNull()
      .then((session) => {
        if (!active || !session?.user?.name) {
          return;
        }
        setCurrentUserName(session.user.name);
      })
      .catch(() => {
        // Keep the fallback header content if the session call fails.
      });

    return () => {
      active = false;
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

  // Notificaciones con módulo asociado
  const notifications = [
    {
      title: t.notifications.newTask,
      time: t.notifications.timeAgo.minutes,
      module: t.modules.procesosTareas,
      moduleEmoji: '✅',
      moduleColor: 'yellow',
      isUnread: true,
    },
    {
      title: t.notifications.expensePending,
      time: t.notifications.timeAgo.hour,
      module: t.modules.gastos,
      moduleEmoji: '💰',
      moduleColor: 'green',
      isUnread: true,
    },
    {
      title: t.notifications.newClient,
      time: t.notifications.timeAgo.hours,
      module: t.modules.ventas,
      moduleEmoji: '💵',
      moduleColor: 'orange',
      isUnread: false,
    },
  ];

  const unreadCount = notifications.filter(n => n.isUnread).length;

  const getModuleColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
      gold: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
    };
    return colorMap[color] || colorMap.blue;
  };

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

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5 shadow-sm transition-colors">
      <div className="max-w-[1600px] mx-auto">
        {/* Layout móvil y desktop */}
        <div className="flex items-center justify-between gap-3">
          {/* Sección izquierda - Avatar y Saludo */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1629507208649-70919ca33793?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMG1hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MzQxMDM4M3ww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Nahum Peña"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover border-2 border-blue-500 shadow-sm flex-shrink-0"
            />
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
            {/* Notificaciones */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 h-9 w-9 sm:h-10 sm:w-10">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs bg-red-500 hover:bg-red-500">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96 p-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-[#558DBD]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base text-white">
                      {t.header.notifications}
                    </h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white hover:bg-white/30 border-white/30">
                        {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.map((notification, index) => {
                    const colorClasses = getModuleColorClasses(notification.moduleColor);
                    return (
                      <div key={index}>
                        <DropdownMenuItem className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:bg-gray-50 dark:focus:bg-gray-700/50">
                          <div className="flex gap-3 w-full">
                            {/* Emoji del módulo */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center text-lg`}>
                              {notification.moduleEmoji}
                            </div>
                            
                            {/* Contenido de la notificación */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className={`text-sm font-medium ${notification.isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {notification.title}
                                </p>
                                {notification.isUnread && (
                                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                                )}
                              </div>
                              
                              {/* Badge del módulo */}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}>
                                  {notification.module}
                                </span>
                              </div>
                              
                              {/* Tiempo transcurrido */}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                        {index < notifications.length - 1 && (
                          <DropdownMenuSeparator className="my-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Footer - Ver todas */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <button 
                    onClick={() => setIsNotificationCenterOpen(true)}
                    className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Ver todas las notificaciones
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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

            {/* Modo nocturno */}
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

            {/* Modo aprendiz - Solo desktop */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden sm:flex rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={onToggleLearningMode}
            >
              <GraduationCap className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>

            {/* Perfil de usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors h-9 w-9 sm:h-10 sm:w-10">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-0">
                {/* Header del perfil */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-[#558DBD]">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback 
                      src="https://images.unsplash.com/photo-1629507208649-70919ca33793?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMG1hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MzQxMDM4M3ww&ixlib=rb-4.1.0&q=80&w=1080"
                      alt="Nahum Peña"
                      className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-white truncate">
                        Nahum Peña
                      </h3>
                      <p className="text-xs text-white/80 truncate">
                        nahum@indice.com
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Opciones del menú */}
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
                  {/* Modo aprendiz en móvil - Solo dentro del menú */}
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
      </div>

      {/* Centro de Notificaciones Modal */}
      <NotificationCenter 
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </header>
  );
}
