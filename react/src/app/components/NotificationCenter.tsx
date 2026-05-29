import { useDeferredValue, useState } from 'react';
import { Bell, BellOff, Check, Filter, Search, X } from 'lucide-react';
import type { AppNotification, NotificationsSummary } from '../api/notifications';
import { useLanguage } from '../shared/context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { NotificationItemCard } from './notifications/NotificationItemCard';

interface NotificationCenterProps {
  isOpen: boolean;
  items: AppNotification[];
  summary: NotificationsSummary;
  loading: boolean;
  error: string;
  moduleLabel: string;
  onClose: () => void;
  onRefresh: () => void;
  onOpenItem: (notification: AppNotification) => void;
  onMarkRead: (notificationId: number) => void;
  onMarkAllRead: () => void;
  onDismiss: (notificationId: number) => void;
}

export function NotificationCenter(props: NotificationCenterProps) {
  const {
    isOpen, items, summary, loading, error, moduleLabel, onClose, onRefresh,
    onOpenItem, onMarkRead, onMarkAllRead, onDismiss,
  } = props;
  const { currentLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());
  const unreadCount = summary?.unread_count ?? 0;
  const moduleOptions = Array.from(new Set(items.map((item) => item.module_slug)));
  const visibleItems = items.filter((notification) => {
    const matchesSearch = !deferredSearch
      || notification.title.toLowerCase().includes(deferredSearch)
      || notification.description.toLowerCase().includes(deferredSearch);
    const matchesModule = filterModule === 'all' || notification.module_slug === filterModule;
    const matchesTab = activeTab === 'all'
      || (activeTab === 'unread' && notification.is_unread)
      || (activeTab === 'read' && !notification.is_unread);
    return matchesSearch && matchesModule && matchesTab;
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-[#2563EB] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2"><Bell className="h-6 w-6 text-white" /></div>
            <div>
              <h2 className="text-2xl font-bold text-white">Ver todas las notificaciones</h2>
              <p className="text-sm text-white/80 mt-0.5">{unreadCount} notificaciones sin leer</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar notificaciones..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full md:w-[220px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los módulos</SelectItem>
                {moduleOptions.map((module) => (
                  <SelectItem key={module} value={module}>{moduleLabel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onMarkAllRead} disabled={unreadCount === 0} className="whitespace-nowrap">
              <Check className="h-4 w-4 mr-2" />
              Marcar todo como leído
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todas ({items.length})</TabsTrigger>
              <TabsTrigger value="unread">Sin leer ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Leídas ({items.length - unreadCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && <p className="text-sm text-gray-500">Cargando notificaciones...</p>}
          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <Button variant="ghost" size="sm" onClick={onRefresh} className="ml-2">Reintentar</Button>
            </div>
          )}
          {!loading && !error && visibleItems.length === 0 && (
            <div className="text-center py-12">
              <BellOff className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No hay notificaciones</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Todas tus notificaciones aparecerán aquí</p>
            </div>
          )}
          {!loading && !error && visibleItems.length > 0 && (
            <div className="space-y-3">
              {visibleItems.map((notification) => (
                <NotificationItemCard
                  key={notification.id}
                  notification={notification}
                  moduleLabel={moduleLabel}
                  locale={currentLanguage.code}
                  onOpen={onOpenItem}
                  onMarkRead={onMarkRead}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Mostrando {visibleItems.length} de {items.length} notificaciones</span>
            <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
