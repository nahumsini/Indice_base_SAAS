import { mockResponses } from './mocks/forms.mock';

export default function RespuestasTab() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completada':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✅ Completada</span>;
      case 'en_proceso':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">🔄 En Proceso</span>;
      case 'abandonada':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">❌ Abandonada</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-3xl font-bold">{mockResponses.length}</p>
          <p className="text-sm opacity-90">Total Respuestas</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-3xl font-bold">{mockResponses.filter(r => r.status === 'completada').length}</p>
          <p className="text-sm opacity-90">Completadas</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">⏱️</div>
          <p className="text-3xl font-bold">
            {(mockResponses.reduce((acc, r) => acc + (r.timeSpent || 0), 0) / mockResponses.length).toFixed(1)}min
          </p>
          <p className="text-sm opacity-90">Tiempo Promedio</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📱</div>
          <p className="text-3xl font-bold">
            {mockResponses.filter(r => r.device?.includes('Mobile')).length}
          </p>
          <p className="text-sm opacity-90">Móvil</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockResponses.map(response => (
          <div
            key={response.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{response.formName}</h3>
                {response.respondent && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {response.respondent.name || response.respondent.email || 'Anónimo'}
                  </p>
                )}
              </div>
              {getStatusBadge(response.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completada</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {response.completedAt?.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tiempo</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {response.timeSpent ? `${response.timeSpent} min` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dispositivo</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {response.device || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Evidencias</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {response.evidence.length}
                </p>
              </div>
            </div>

            {response.evidence.length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Evidencias</p>
                <div className="flex gap-2">
                  {response.evidence.map(ev => (
                    <div
                      key={ev.id}
                      className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl"
                    >
                      {ev.type === 'photo' ? '📸' :
                       ev.type === 'signature' ? '✍️' :
                       ev.type === 'gps' ? '📍' : '📎'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {response.location && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ubicación</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  📍 {response.location.address || `${response.location.lat}, ${response.location.lng}`}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Ver Detalles
              </button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                Exportar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
