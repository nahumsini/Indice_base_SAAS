import { useState } from 'react';
import { mockMeetings } from './mocks/meetings.mock';
import type { Meeting, MeetingStatus } from './types/meetings.types';
import { Calendar, Users } from 'lucide-react';
import { MeetingDetailPanel } from './components/MeetingDetailPanel';

export default function ReunionesTab() {
  const [meetings] = useState<Meeting[]>(mockMeetings);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const getStatusBadge = (status: MeetingStatus) => {
    const badges = {
      scheduled: { label: 'Programada', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700' },
      in_progress: { label: 'En Progreso', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700' },
      pending_follow_up: { label: 'Pendiente Seguimiento', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700' },
      completed: { label: 'Completada', className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
      overdue: { label: 'Vencida', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700' },
    };
    return badges[status];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weekly: 'Semanal',
      comite_rh: 'Comité RH',
      seguimiento_comercial: 'Seg. Comercial',
      direccion: 'Dirección',
      daily: 'Daily',
      retrospectiva: 'Retrospectiva',
      otro: 'Otro',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Meetings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reunión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Participantes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acuerdos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {meetings.map((meeting) => {
                const statusBadge = getStatusBadge(meeting.status);
                return (
                  <tr
                    key={meeting.id}
                    onClick={() => setSelectedMeeting(meeting)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {meeting.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {meeting.company}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {getMeetingTypeLabel(meeting.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(meeting.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        {meeting.participants.length}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {meeting.agreementsCount}
                        </span>
                        {meeting.pendingAgreements > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1">
                            ({meeting.pendingAgreements} pendientes)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              meeting.completionRate === 100
                                ? 'bg-green-500'
                                : meeting.completionRate >= 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${meeting.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium min-w-[3ch]">
                          {meeting.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meeting Detail Panel */}
      {selectedMeeting && (
        <MeetingDetailPanel
          meeting={selectedMeeting}
          isOpen={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}
