import { useState, useMemo } from 'react';
import { mockFollowUps } from './mocks/meetings.mock';
import type { FollowUp } from './types/meetings.types';
import { AlertCircle, Flame, Clock, Calendar, Users, CheckCircle2 } from 'lucide-react';

export default function SeguimientosTab() {
  const [followUps] = useState<FollowUp[]>(mockFollowUps);

  const sortedFollowUps = useMemo(() => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...followUps].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [followUps]);

  const stats = useMemo(() => {
    return {
      critical: followUps.filter((f) => f.urgency === 'critical').length,
      high: followUps.filter((f) => f.urgency === 'high').length,
      medium: followUps.filter((f) => f.urgency === 'medium').length,
      total: followUps.length,
    };
  }, [followUps]);

  const getUrgencyIcon = (urgency: string) => {
    const icons: Record<string, typeof AlertCircle> = {
      critical: Flame,
      high: AlertCircle,
      medium: Clock,
      low: Calendar,
    };
    return icons[urgency] || Clock;
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      critical: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700',
      high: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
      medium: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
      low: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    };
    return colors[urgency] || colors.medium;
  };

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, string> = {
      critical: 'Crítico',
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    };
    return labels[urgency] || urgency;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      overdue_agreement: 'Acuerdo Vencido',
      no_progress: 'Sin Progreso',
      no_comments: 'Sin Actualizaciones',
      no_responsible: 'Sin Responsable',
      critical_pending: 'Pendiente Crítico',
      meeting_no_follow_up: 'Reunión Sin Seguimiento',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {stats.critical > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Flame className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                {stats.critical} seguimiento{stats.critical > 1 ? 's' : ''} crítico{stats.critical > 1 ? 's' : ''} requieren atención inmediata
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                Estos items están bloqueando el progreso operativo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">Críticos</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.critical}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Alta Prioridad</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.high}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Media Prioridad</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">{stats.medium}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Follow-ups List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Items Atorados
        </h2>
        <div className="space-y-3">
          {sortedFollowUps.length === 0 ? (
            <div className="text-center py-12 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600 dark:text-green-400" />
              <p className="font-medium text-green-900 dark:text-green-300">¡Todo al día!</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                No hay items atorados que requieran seguimiento
              </p>
            </div>
          ) : (
            sortedFollowUps.map((followUp) => {
              const UrgencyIcon = getUrgencyIcon(followUp.urgency);
              return (
                <div
                  key={followUp.id}
                  className={`rounded-xl p-4 border ${getUrgencyColor(followUp.urgency)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <UrgencyIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/50 dark:bg-black/20">
                              {getTypeLabel(followUp.type)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/50 dark:bg-black/20 flex items-center gap-1">
                              <UrgencyIcon className="w-3 h-3" />
                              {getUrgencyLabel(followUp.urgency)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold mb-1">
                            {followUp.meetingTitle}
                          </p>
                          {followUp.agreementDescription && (
                            <p className="text-sm mb-2">
                              {followUp.agreementDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs mb-2">{followUp.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        {followUp.responsible && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {followUp.responsible}
                          </span>
                        )}
                        {followUp.daysOverdue !== undefined && followUp.daysOverdue > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {followUp.daysOverdue} día{followUp.daysOverdue > 1 ? 's' : ''} de retraso
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs font-medium transition-colors">
                      Atender
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
