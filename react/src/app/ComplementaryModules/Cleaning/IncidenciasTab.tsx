import { mockIncidents } from './mocks/cleaning.mock';

export default function IncidenciasTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {mockIncidents.filter(i => i.status === 'open').length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Abiertas</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {mockIncidents.filter(i => i.status === 'review').length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">En revisión</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {mockIncidents.filter(i => i.status === 'resolved').length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Resueltas</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{mockIncidents.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total histórico</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Registro de Incidencias
          </h2>
          <button className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            + Reportar Incidencia
          </button>
        </div>

        <div className="space-y-4">
          {mockIncidents.map(incident => (
            <div
              key={incident.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {incident.folio}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {incident.status === 'review' ? '🔍 En Revisión' : incident.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                    {incident.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {incident.description}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Orden</p>
                    <p className="text-gray-900 dark:text-white font-medium">{incident.orderFolio}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Cliente</p>
                    <p className="text-gray-900 dark:text-white font-medium">{incident.clientName}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
