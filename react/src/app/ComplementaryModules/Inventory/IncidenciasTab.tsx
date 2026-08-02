import { mockIncidents } from './mocks/inventory.mock';

export default function IncidenciasTab() {
  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { icon: string; color: string }> = {
      critica: { icon: '🔥', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
      alta: { icon: '⚠️', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
      media: { icon: '🟡', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
      baja: { icon: '🟢', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    };
    const badge = badges[priority] || badges.media;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.icon} {priority.charAt(0).toUpperCase() + priority.slice(1)}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">🔥</div>
          <p className="text-3xl font-medium">{mockIncidents.filter(i => i.priority === 'critica').length}</p>
          <p className="text-sm opacity-90">Críticas</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-3xl font-medium">{mockIncidents.filter(i => i.status !== 'resuelta').length}</p>
          <p className="text-sm opacity-90">Abiertas</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-3xl font-medium">{mockIncidents.filter(i => i.status === 'resuelta').length}</p>
          <p className="text-sm opacity-90">Resueltas</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">💰</div>
          <p className="text-3xl font-medium">
            ${mockIncidents.reduce((acc, i) => acc + (i.estimatedCost || 0), 0).toLocaleString()}
          </p>
          <p className="text-sm opacity-90">Costo Estimado</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockIncidents.map(incident => (
          <div key={incident.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{incident.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{incident.folio}</p>
              </div>
              {getPriorityBadge(incident.priority)}
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{incident.description}</p>

            <div className="grid grid-cols-4 gap-4 mb-4">
              {incident.locationName && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{incident.locationName}</p>
                </div>
              )}
              {incident.productName && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Producto</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{incident.productName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reportado por</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{incident.reportedBy}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {incident.reportedAt.toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>

            {incident.estimatedCost && (
              <div className="mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Costo Estimado: </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  ${incident.estimatedCost.toLocaleString()}
                </span>
              </div>
            )}

            {incident.status === 'resuelta' && incident.solution && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">Solución</p>
                <p className="text-sm text-green-700 dark:text-green-300">{incident.solution}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
