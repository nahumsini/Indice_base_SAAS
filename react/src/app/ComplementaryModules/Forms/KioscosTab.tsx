import { mockKiosks } from './mocks/forms.mock';

export default function KioscosTab() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🟢 Activo</span>;
      case 'inactivo':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">⚫ Inactivo</span>;
      case 'mantenimiento':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">🔧 Mantenimiento</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">🖥️</div>
          <p className="text-3xl font-bold">{mockKiosks.length}</p>
          <p className="text-sm opacity-90">Kioscos Totales</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">🟢</div>
          <p className="text-3xl font-bold">{mockKiosks.filter(k => k.status === 'activo').length}</p>
          <p className="text-sm opacity-90">Activos</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📝</div>
          <p className="text-3xl font-bold">
            {mockKiosks.reduce((acc, k) => acc + k.responsesToday, 0)}
          </p>
          <p className="text-sm opacity-90">Respuestas Hoy</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-3xl font-bold">
            {mockKiosks.reduce((acc, k) => acc + k.totalResponses, 0)}
          </p>
          <p className="text-sm opacity-90">Total Respuestas</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockKiosks.map(kiosk => (
          <div
            key={kiosk.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🖥️</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{kiosk.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {kiosk.location} • {kiosk.deviceId}
                  </p>
                </div>
              </div>
              {getStatusBadge(kiosk.status)}
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Formulario Asignado</p>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{kiosk.formName}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kiosk.responsesToday}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Hoy</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{kiosk.totalResponses}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  {kiosk.lastResponse?.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || '-'}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Última</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Configurar
              </button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                QR Code
              </button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                Estadísticas
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-6">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          + Nuevo Kiosco
        </button>
      </div>
    </div>
  );
}
