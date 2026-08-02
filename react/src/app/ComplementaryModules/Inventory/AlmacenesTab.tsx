import { mockLocations } from './mocks/inventory.mock';

export default function AlmacenesTab() {
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      almacen_central: '🏭',
      sucursal: '🏪',
      bodega: '📦',
      unidad_movil: '🚚',
      transito: '🔄',
    };
    return icons[type] || '📍';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">🏭</div>
          <p className="text-3xl font-medium">{mockLocations.length}</p>
          <p className="text-sm opacity-90">Total Ubicaciones</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-3xl font-medium">{mockLocations.filter(l => l.isActive).length}</p>
          <p className="text-sm opacity-90">Activas</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-3xl font-medium">
            {Math.round(mockLocations.reduce((acc, l) => acc + (l.occupation / l.capacity * 100), 0) / mockLocations.length)}%
          </p>
          <p className="text-sm opacity-90">Ocupación Promedio</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📦</div>
          <p className="text-3xl font-medium">
            {mockLocations.reduce((acc, l) => acc + l.totalStock, 0).toLocaleString()}
          </p>
          <p className="text-sm opacity-90">Stock Total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockLocations.map(location => (
          <div key={location.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-4xl">{getTypeIcon(location.type)}</div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">{location.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{location.code}</p>
              </div>
              {location.isActive && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                  Activo
                </span>
              )}
            </div>

            {location.address && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                📍 {location.address}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Capacidad</p>
                <p className="font-medium text-gray-900 dark:text-white">{location.capacity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ocupación</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {Math.round(location.occupation / location.capacity * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stock</p>
                <p className="font-medium text-gray-900 dark:text-white">{location.totalStock.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Movimientos</p>
                <p className="font-medium text-gray-900 dark:text-white">{location.movements}</p>
              </div>
            </div>

            {location.manager && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Responsable</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{location.manager}</p>
                {location.phone && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{location.phone}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
