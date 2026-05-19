import { mockAutomations } from './mocks/forms.mock';

export default function AutomatizacionesTab() {
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      crear_ticket: '🎫',
      asignar_tarea: '✅',
      enviar_email: '📧',
      whatsapp: '💬',
      alerta: '🔔',
      aprobar: '✓',
      escalar: '⚡',
    };
    return icons[type] || '⚙️';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">⚡</div>
          <p className="text-3xl font-bold">{mockAutomations.length}</p>
          <p className="text-sm opacity-90">Automatizaciones</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-3xl font-bold">{mockAutomations.filter(a => a.isActive).length}</p>
          <p className="text-sm opacity-90">Activas</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">🔄</div>
          <p className="text-3xl font-bold">
            {mockAutomations.reduce((acc, a) => acc + a.executionCount, 0)}
          </p>
          <p className="text-sm opacity-90">Ejecutadas</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockAutomations.map(automation => (
          <div
            key={automation.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getTypeIcon(automation.type)}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{automation.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{automation.formName}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={automation.isActive} readOnly className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Disparador</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {automation.trigger.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ejecuciones</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {automation.executionCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Última ejecución</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {automation.lastExecuted?.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) || '-'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Acción</p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                  {automation.action.type.replace(/_/g, ' ')}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  → {automation.action.message || automation.action.target}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Editar
              </button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                Historial
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-6">
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          + Nueva Automatización
        </button>
      </div>
    </div>
  );
}
