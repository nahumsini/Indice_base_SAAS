import { useState, useMemo } from 'react';
import { mockForms, mockInsights, mockResponses } from './mocks/forms.mock';
import type { Form } from './types/forms.types';

export default function FormulariosTab() {
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredForms = useMemo(() => {
    if (filterStatus === 'all') return mockForms;
    return mockForms.filter(f => f.status === filterStatus);
  }, [filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✅ Activo</span>;
      case 'borrador':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">📝 Borrador</span>;
      case 'pausado':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">⏸️ Pausado</span>;
      case 'archivado':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">📦 Archivado</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      encuesta: '📊',
      checklist: '✅',
      inspeccion: '🔍',
      auditoria: '📋',
      onboarding: '👋',
      evaluacion: '⭐',
      incidencia: '⚠️',
      publico: '🌐',
      kiosco: '🖥️',
    };
    return icons[type] || '📝';
  };

  const getFormTimeline = (formId: string) => {
    const responses = mockResponses.filter(r => r.formId === formId).slice(0, 5);
    return responses.map(r => ({
      id: r.id,
      type: 'response',
      icon: '📝',
      title: 'Nueva respuesta',
      description: r.respondent?.name || 'Anónimo',
      timestamp: r.completedAt || r.startedAt,
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  return (
    <div className="space-y-6">
      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockInsights.map(insight => (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border ${
              insight.type === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
              insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
              insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
              'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{insight.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {insight.message}
                  </p>
                  {insight.aiGenerated && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full mt-2 inline-block">
                      🤖 IA
                    </span>
                  )}
                  {insight.actionable && (
                    <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 block">
                      {insight.action} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'Todos', count: mockForms.length },
          { id: 'activo', label: '✅ Activos', count: mockForms.filter(f => f.status === 'activo').length },
          { id: 'borrador', label: '📝 Borradores', count: mockForms.filter(f => f.status === 'borrador').length },
          { id: 'pausado', label: '⏸️ Pausados', count: mockForms.filter(f => f.status === 'pausado').length },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setFilterStatus(filter.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterStatus === filter.id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredForms.map(form => (
          <div
            key={form.id}
            onClick={() => setSelectedForm(form)}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{getTypeIcon(form.type)}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {form.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{form.folio}</p>
                </div>
              </div>
            </div>

            {form.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {form.description}
              </p>
            )}

            <div className="flex items-center justify-between mb-4">
              {getStatusBadge(form.status)}
              {form.isPublic && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  🌐 Público
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{form.totalResponses}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Respuestas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{form.participationRate}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Completado</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{form.automations}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Automatiz.</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Abrir
              </button>
              <button className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                📊
              </button>
              <button className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                🔗
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Side Panel */}
      {selectedForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedForm(null)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedForm.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedForm.folio}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedForm(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                {getStatusBadge(selectedForm.status)}
                {selectedForm.isPublic && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    🌐 Público
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedForm.description && (
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedForm.description}</p>
                </div>
              )}

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Respuestas</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedForm.totalResponses}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-xs text-green-600 dark:text-green-400 mb-1">Tasa Completado</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedForm.participationRate}%
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Tiempo Promedio</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {selectedForm.averageTime}min
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Automatizaciones</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedForm.automations}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  📅 Actividad Reciente
                </h3>
                <div className="space-y-4">
                  {getFormTimeline(selectedForm.id).map(event => (
                    <div key={event.id} className="flex gap-3">
                      <div className="text-2xl">{event.icon}</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {event.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {event.timestamp.toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Public Access */}
              {selectedForm.isPublic && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    🌐 Acceso Público
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">URL Pública</p>
                      <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{selectedForm.publicUrl}</p>
                    </div>
                    {selectedForm.qrCode && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Código QR</p>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-16 bg-white rounded flex items-center justify-center text-2xl">
                            📱
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Escanea para acceder al formulario
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                  ✏️ Editar
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm">
                  📊 Respuestas
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm">
                  🔗 Compartir
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm">
                  ⚡ Automatizar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
