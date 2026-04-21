import { useState } from 'react';
import { useLanguage } from '../shared/context';
import { X, Search, Filter, Check, Trash2, Bell, BellOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  module: string;
  moduleEmoji: string;
  moduleColor: string;
  isUnread: boolean;
  priority: 'high' | 'medium' | 'low';
  type: 'task' | 'approval' | 'info' | 'alert';
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Notificaciones de ejemplo (estas vendrían de un estado global o API)
  const allNotifications: Notification[] = [
    {
      id: '1',
      title: t.notifications.newTask,
      description: 'Revisar el reporte financiero del Q1 2024',
      time: t.notifications.timeAgo.minutes,
      module: t.modules.procesosTareas,
      moduleEmoji: '✅',
      moduleColor: 'yellow',
      isUnread: true,
      priority: 'high',
      type: 'task',
    },
    {
      id: '2',
      title: t.notifications.expensePending,
      description: 'Gasto de $1,500 MXN pendiente de aprobación',
      time: t.notifications.timeAgo.hour,
      module: t.modules.gastos,
      moduleEmoji: '💰',
      moduleColor: 'green',
      isUnread: true,
      priority: 'high',
      type: 'approval',
    },
    {
      id: '3',
      title: t.notifications.newClient,
      description: 'María González se registró como nuevo cliente',
      time: t.notifications.timeAgo.hours,
      module: t.modules.ventas,
      moduleEmoji: '💵',
      moduleColor: 'orange',
      isUnread: false,
      priority: 'medium',
      type: 'info',
    },
    {
      id: '4',
      title: 'Empleado cumpleaños',
      description: 'Carlos Ramírez cumple años hoy',
      time: 'Hace 3 horas',
      module: t.modules.recursosHumanos,
      moduleEmoji: '👥',
      moduleColor: 'blue',
      isUnread: false,
      priority: 'low',
      type: 'info',
    },
    {
      id: '5',
      title: 'Inventario bajo',
      description: 'El producto "Laptop HP" tiene solo 3 unidades',
      time: 'Hace 5 horas',
      module: t.modules.inventarios,
      moduleEmoji: '📦',
      moduleColor: 'gray',
      isUnread: true,
      priority: 'high',
      type: 'alert',
    },
    {
      id: '6',
      title: 'Mantenimiento completado',
      description: 'Servicio de aire acondicionado finalizado',
      time: 'Hace 1 día',
      module: t.modules.mantenimiento,
      moduleEmoji: '🔧',
      moduleColor: 'gray',
      isUnread: false,
      priority: 'low',
      type: 'info',
    },
    {
      id: '7',
      title: 'Factura generada',
      description: 'Factura #1234 lista para enviar',
      time: 'Hace 1 día',
      module: t.modules.facturacion,
      moduleEmoji: '🧾',
      moduleColor: 'gray',
      isUnread: false,
      priority: 'medium',
      type: 'info',
    },
    {
      id: '8',
      title: 'Nuevo correo importante',
      description: 'Propuesta de negocio de cliente premium',
      time: 'Hace 2 días',
      module: t.modules.correoElectronico,
      moduleEmoji: '📧',
      moduleColor: 'gray',
      isUnread: false,
      priority: 'high',
      type: 'info',
    },
  ];

  const [notifications, setNotifications] = useState(allNotifications);

  const getModuleColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
      gold: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
      gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
    };
    return colorMap[color] || colorMap.blue;
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isUnread: false } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isUnread: false })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          notification.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = filterModule === 'all' || notification.module === filterModule;
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'unread' && notification.isUnread) ||
                       (activeTab === 'read' && !notification.isUnread);
    return matchesSearch && matchesModule && matchesTab;
  });

  const unreadCount = notifications.filter(n => n.isUnread).length;
  const uniqueModules = Array.from(new Set(notifications.map(n => n.module)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#558DBD] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Ver todas las notificaciones
              </h2>
              <p className="text-sm text-white/80 mt-0.5">
                {unreadCount} notificaciones sin leer
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar notificaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los módulos</SelectItem>
                {uniqueModules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="whitespace-nowrap"
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todo como leído
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Todas ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Sin leer ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read">
                Leídas ({notifications.length - unreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Lista de notificaciones */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                No hay notificaciones
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                {searchQuery || filterModule !== 'all' 
                  ? 'Intenta cambiar los filtros de búsqueda' 
                  : 'Todas tus notificaciones aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const colorClasses = getModuleColorClasses(notification.moduleColor);
                return (
                  <div
                    key={notification.id}
                    className={`
                      group relative rounded-lg border-2 p-4 transition-all duration-200
                      ${notification.isUnread 
                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' 
                        : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}
                      hover:shadow-md hover:border-[#558DBD]
                    `}
                  >
                    <div className="flex gap-4">
                      {/* Emoji del módulo */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center text-xl`}>
                        {notification.moduleEmoji}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold ${notification.isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {notification.title}
                              </h3>
                              {notification.isUnread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {notification.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}>
                              {notification.module}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {notification.time}
                            </span>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {notification.isUnread && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-8 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Marcar leída
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Mostrando {filteredNotifications.length} de {notifications.length} notificaciones</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
