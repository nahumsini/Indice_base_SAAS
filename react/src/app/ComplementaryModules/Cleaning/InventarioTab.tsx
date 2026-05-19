import { mockInventory } from './mocks/cleaning.mock';

export default function InventarioTab() {
  const itemsWithAlert = mockInventory.filter(item => item.alert);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{mockInventory.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Items totales</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{itemsWithAlert.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Stock crítico</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${mockInventory.reduce((sum, item) => sum + (item.stock * item.costPerUnit), 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Valor total</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {Math.round((mockInventory.filter(i => !i.alert).length / mockInventory.length) * 100)}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Stock saludable</p>
        </div>
      </div>

      {itemsWithAlert.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-semibold text-red-900 dark:text-red-200">
              Alertas de Stock Crítico
            </h3>
          </div>
          <p className="text-sm text-red-800 dark:text-red-300">
            {itemsWithAlert.length} item{itemsWithAlert.length > 1 ? 's' : ''} por debajo del stock mínimo
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Inventario Operacional
          </h2>
          <button className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Registrar Entrada
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockInventory.map(item => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border transition-all ${
                item.alert
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.category}
                  </p>
                </div>
                {item.alert && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">
                    ⚠️ Crítico
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Stock actual</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Mínimo: {item.minStock} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${
                      item.stock < item.minStock
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {item.stock}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.unit}</span>
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
