import { mockClients } from './mocks/cleaning.mock';

export default function ClientesTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="text-3xl mb-2">🏢</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{mockClients.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Clientes activos</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {mockClients.filter(c => c.contractType === 'recurring').length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Contratos recurrentes</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${mockClients.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Facturación total</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
          <div className="text-3xl mb-2">⭐</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">4.7</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Satisfacción promedio</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cartera de Clientes
          </h2>
          <button className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Nuevo Cliente
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mockClients.map(client => (
            <div
              key={client.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {client.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    📍 {client.address}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    📞 {client.phone}
                  </p>
                  {client.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ✉️ {client.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Servicios</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{client.totalOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Facturado</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${(client.totalSpent / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Satisfacción</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ⭐ {client.satisfactionScore}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
