import { useState, useMemo } from 'react';
import type { Meeting } from '../types/meetings.types';
import { mockActivities, mockAgreements } from '../mocks/meetings.mock';
import {
  X,
  Calendar,
  MapPin,
  Users,
  FileText,
  MessageSquare,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flame,
} from 'lucide-react';

interface MeetingDetailPanelProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingDetailPanel({ meeting, isOpen, onClose }: MeetingDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'agreements' | 'participants'>('timeline');

  const activities = useMemo(() => {
    return mockActivities
      .filter((a) => a.meetingId === meeting.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [meeting.id]);

  const agreements = useMemo(() => {
    return mockAgreements.filter((a) => a.meetingId === meeting.id);
  }, [meeting.id]);

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, typeof FileText> = {
      note: MessageSquare,
      comment: MessageSquare,
      status_change: AlertCircle,
      file_upload: Upload,
      agreement_created: FileText,
      agreement_completed: CheckCircle2,
      agreement_updated: Clock,
      meeting_created: Calendar,
      meeting_updated: Calendar,
      follow_up: Flame,
    };
    return icons[type] || FileText;
  };

  const getAgreementStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendiente', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
      in_progress: { label: 'En Progreso', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      completed: { label: 'Completado', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      overdue: { label: 'Vencido', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
      blocked: { label: 'Bloqueado', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    };
    return badges[status] || badges.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      low: { label: 'Baja', className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
      medium: { label: 'Media', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      high: { label: 'Alta', className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
      critical: { label: 'Crítica', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };
    return badges[priority] || badges.medium;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {meeting.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {meeting.company}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Meeting Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(meeting.date)}</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>{meeting.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{meeting.participants.length} participantes</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <FileText className="w-4 h-4" />
              <span>{meeting.agreementsCount} acuerdos</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'timeline'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('agreements')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'agreements'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Acuerdos ({agreements.length})
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'participants'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Participantes ({meeting.participants.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No hay actividad registrada
                </div>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {activity.performedBy} • {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Agreements Tab */}
          {activeTab === 'agreements' && (
            <div className="space-y-3">
              {agreements.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No hay acuerdos registrados
                </div>
              ) : (
                agreements.map((agreement) => {
                  const statusBadge = getAgreementStatusBadge(agreement.status);
                  const priorityBadge = getPriorityBadge(agreement.priority);
                  return (
                    <div
                      key={agreement.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                          {agreement.description}
                        </p>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.className}`}>
                          {priorityBadge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {agreement.responsibleName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatTimestamp(agreement.dueDate)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      {agreement.progress > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                agreement.progress === 100
                                  ? 'bg-green-500'
                                  : agreement.progress >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${agreement.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium min-w-[3ch]">
                            {agreement.progress}%
                          </span>
                        </div>
                      )}

                      {agreement.comments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                          {agreement.comments.map((comment) => (
                            <div key={comment.id} className="text-xs">
                              <p className="text-gray-900 dark:text-white">{comment.text}</p>
                              <p className="text-gray-500 dark:text-gray-500 mt-1">
                                {comment.author} • {formatTimestamp(comment.timestamp)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="space-y-3">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsable
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {meeting.responsible}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Participantes
                </p>
                <div className="space-y-2">
                  {meeting.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {participant.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {participant.name}
                        </p>
                        {participant.role && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {participant.role}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
