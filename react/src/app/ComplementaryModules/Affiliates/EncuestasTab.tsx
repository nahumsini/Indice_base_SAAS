import { useState } from 'react';
import { mockSurveys } from './mocks/affiliates.mock';
import type { Survey } from './types/affiliates.types';
import { Plus, BarChart3, Users, CheckCircle2, FileText, TrendingUp } from 'lucide-react';

export default function EncuestasTab() {
  const [surveys] = useState<Survey[]>(mockSurveys);

  const stats = {
    total: surveys.length,
    active: surveys.filter(s => s.status === 'active').length,
    totalResponses: surveys.reduce((sum, s) => sum + s.responses, 0),
    avgResponseRate: surveys.length > 0
      ? Math.round(surveys.reduce((sum, s) => sum + (s.responses / 100), 0) / surveys.length * 100)
      : 0,
  };

  const templates = [
    {
      id: 't1',
      name: 'Satisfacción General',
      description: 'Mide la satisfacción de tus afiliados con los servicios',
      icon: '😊',
      questions: 5,
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    },
    {
      id: 't2',
      name: 'NPS (Net Promoter Score)',
      description: 'Conoce qué tan probable es que te recomienden',
      icon: '📊',
      questions: 2,
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    },
    {
      id: 't3',
      name: 'Feedback de Evento',
      description: 'Recolecta opiniones después de eventos',
      icon: '🎉',
      questions: 6,
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
    },
    {
      id: 't4',
      name: 'Clima Organizacional',
      description: 'Evalúa el ambiente y cultura de la organización',
      icon: '🌡️',
      questions: 8,
      color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700',
    },
    {
      id: 't5',
      name: 'Intereses y Preferencias',
      description: 'Descubre los intereses de tu comunidad',
      icon: '💡',
      questions: 4,
      color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700',
    },
    {
      id: 't6',
      name: 'Encuesta Personalizada',
      description: 'Crea tu propia encuesta desde cero',
      icon: '✨',
      questions: 0,
      color: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Borrador', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
      active: { label: 'Activa', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      closed: { label: 'Cerrada', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };
    return badges[status] || badges.draft;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Encuestas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">Activas</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Respuestas</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.totalResponses}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Tasa Respuesta</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.avgResponseRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Templates de Encuestas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`${template.color} rounded-xl p-5 border cursor-pointer hover:shadow-lg transition-all`}
            >
              <div className="text-4xl mb-3">{template.icon}</div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {template.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {template.questions > 0 ? `${template.questions} preguntas` : 'Personalizable'}
                </span>
                <button className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Usar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Surveys */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Encuestas Activas
        </h3>

        <div className="space-y-3">
          {surveys.map((survey) => {
            const statusBadge = getStatusBadge(survey.status);
            const responseRate = survey.responses > 0 ? Math.round((survey.responses / 100) * 100) : 0;

            return (
              <div
                key={survey.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">
                        {survey.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    {survey.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {survey.description}
                      </p>
                    )}
                    {survey.targetAudience && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Audiencia: {survey.targetAudience}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preguntas</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {survey.questions.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Respuestas</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {survey.responses}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tasa</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {responseRate}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Participación</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        responseRate >= 70 ? 'bg-green-500' :
                        responseRate >= 40 ? 'bg-blue-500' :
                        responseRate >= 20 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(responseRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Ver Resultados
                  </button>
                  <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    Editar
                  </button>
                  <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    Enviar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
