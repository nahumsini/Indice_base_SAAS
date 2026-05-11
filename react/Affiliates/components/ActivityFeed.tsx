import { useMemo } from 'react';
import { MessageCircle, Mail, FileText, UserPlus, BarChart3, MapPin, Zap } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'campaign' | 'survey' | 'ticket' | 'kiosk' | 'affiliation' | 'response';
  title: string;
  description: string;
  timestamp: Date;
  actor: string;
  metadata?: {
    count?: number;
    location?: string;
    engagement?: number;
  };
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'campaign',
    title: 'Campaña iniciada',
    description: 'Juan abrió campaña "Evento Norte"',
    timestamp: new Date('2026-05-09T14:30:00'),
    actor: 'Juan Pérez',
  },
  {
    id: '2',
    type: 'survey',
    title: 'Encuesta respondida',
    description: '45 afiliados respondieron encuesta de satisfacción',
    timestamp: new Date('2026-05-09T13:45:00'),
    actor: 'Sistema',
    metadata: { count: 45, engagement: 68 },
  },
  {
    id: '3',
    type: 'ticket',
    title: 'Ticket creado',
    description: 'Nuevo ticket de soporte técnico',
    timestamp: new Date('2026-05-09T12:20:00'),
    actor: 'Ana García',
  },
  {
    id: '4',
    type: 'kiosk',
    title: 'Registros capturados',
    description: 'Kiosco Monterrey capturó 18 registros',
    timestamp: new Date('2026-05-09T11:15:00'),
    actor: 'Sistema',
    metadata: { count: 18, location: 'Monterrey' },
  },
  {
    id: '5',
    type: 'affiliation',
    title: 'Nueva afiliación',
    description: 'Pedro Ramírez se afilió en Guadalajara',
    timestamp: new Date('2026-05-09T10:30:00'),
    actor: 'Pedro Ramírez',
    metadata: { location: 'Guadalajara' },
  },
  {
    id: '6',
    type: 'campaign',
    title: 'Campaña enviada',
    description: 'Campaña masiva enviada a CDMX (120 afiliados)',
    timestamp: new Date('2026-05-09T09:00:00'),
    actor: 'Laura Martínez',
    metadata: { count: 120, location: 'CDMX' },
  },
];

export function ActivityFeed() {
  const activities = useMemo(() => {
    return mockActivities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;

    return new Date(date).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    const icons = {
      campaign: MessageCircle,
      survey: BarChart3,
      ticket: FileText,
      kiosk: MapPin,
      affiliation: UserPlus,
      response: Mail,
    };
    return icons[type];
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    const colors = {
      campaign: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
      survey: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
      ticket: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
      kiosk: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
      affiliation: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      response: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    };
    return colors[type];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Última Actividad</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
          En vivo
        </span>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);

          return (
            <div
              key={activity.id}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {formatTime(activity.timestamp)}
                    </span>
                    {activity.metadata?.location && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {activity.metadata.location}
                        </span>
                      </>
                    )}
                    {activity.metadata?.engagement && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                          {activity.metadata.engagement}% engagement
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
