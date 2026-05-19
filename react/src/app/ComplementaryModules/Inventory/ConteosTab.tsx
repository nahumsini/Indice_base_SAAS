import { mockCounts } from './mocks/inventory.mock';

export default function ConteosTab() {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pendiente: { label: '⏳ Pendiente', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
      proceso: { label: '🔄 En Proceso', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
      validado: { label: '✅ Validado', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
      diferencia: { label: '⚠️ Diferencia', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    };
    const badge = badges[status] || badges.pendiente;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">🔢</div>
          <p className="text-3xl font-bold">{mockCounts.length}</p>
          <p className="text-sm opacity-90">Conteos Totales</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-3xl font-bold">{mockCounts.filter(c => c.status === 'pendiente').length}</p>
          <p className="text-sm opacity-90">Pendientes</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-3xl font-bold">{mockCounts.filter(c => c.status === 'validado').length}</p>
          <p className="text-sm opacity-90">Validados</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-3xl font-bold">{mockCounts.filter(c => c.status === 'diferencia').length}</p>
          <p className="text-sm opacity-90">Con Diferencias</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockCounts.map(count => (
          <div key={count.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{count.folio}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{count.locationName}</p>
              </div>
              {getStatusBadge(count.status)}
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Productos</p>
                <p className="font-medium text-gray-900 dark:text-white">{count.totalItems}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Diferencias</p>
                <p className={`font-medium ${count.differences > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {count.differences}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Contado por</p>
                <p className="font-medium text-gray-900 dark:text-white">{count.countedBy || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {count.startedAt.toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>

            {count.items.filter(i => i.hasDifference).length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Productos con Diferencias</p>
                <div className="space-y-2">
                  {count.items.filter(i => i.hasDifference).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <span className="text-sm text-gray-900 dark:text-white">{item.productName}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-gray-600">Sistema: {item.systemStock}</span>
                        <span className="text-gray-600">Contado: {item.countedStock}</span>
                        <span className="font-medium text-red-600">Dif: {item.difference}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
