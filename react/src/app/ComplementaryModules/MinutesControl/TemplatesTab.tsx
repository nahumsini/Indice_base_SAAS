import { useState } from 'react';
import { mockTemplates } from './mocks/meetings.mock';
import type { MeetingTemplate } from './types/meetings.types';
import { Clock, Users, CheckCircle2, Calendar, FileText } from 'lucide-react';

export default function TemplatesTab() {
  const [templates] = useState<MeetingTemplate[]>(mockTemplates);

  const getTypeLabel = (type: string) => {
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

  const getFrequencyLabel = (frequency?: string) => {
    const labels: Record<string, string> = {
      daily: 'Diaria',
      weekly: 'Semanal',
      biweekly: 'Quincenal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
    };
    return frequency ? labels[frequency] || frequency : 'Sin frecuencia';
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Templates de Reuniones
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Usa estas plantillas para crear reuniones rápidamente con estructura y agenda predefinidas
            </p>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </div>
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {getTypeLabel(template.type)}
              </span>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              {template.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {template.duration} min
                </span>
              )}
              {template.frequency && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {getFrequencyLabel(template.frequency)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {template.usageCount} usos
              </span>
            </div>

            {/* Agenda */}
            {template.agenda.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agenda:
                </p>
                <ul className="space-y-1">
                  {template.agenda.slice(0, 3).map((item, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-gray-400 dark:text-gray-600 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {template.agenda.length > 3 && (
                    <li className="text-xs text-gray-500 dark:text-gray-500 italic">
                      +{template.agenda.length - 3} más...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Suggested Participants */}
            {template.suggestedParticipants.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Participantes sugeridos:
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {template.suggestedParticipants.map((participant, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Typical Agreements */}
            {template.typicalAgreements.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Acuerdos típicos:
                </p>
                <ul className="space-y-1">
                  {template.typicalAgreements.slice(0, 2).map((agreement, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-gray-400 dark:text-gray-600 mt-0.5">→</span>
                      <span>{agreement}</span>
                    </li>
                  ))}
                  {template.typicalAgreements.length > 2 && (
                    <li className="text-xs text-gray-500 dark:text-gray-500 italic">
                      +{template.typicalAgreements.length - 2} más...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Action Button */}
            <button className="w-full mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
              Usar Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
