import { mockMetrics, mockInsights } from './mocks/cleaning.mock';

export default function KPIsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📋</div>
          <p className="text-3xl font-bold">{mockMetrics.ordersToday}</p>
          <p className="text-sm opacity-90">Órdenes hoy</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">🧹</div>
          <p className="text-3xl font-bold">{mockMetrics.areasCompleted}</p>
          <p className="text-sm opacity-90">Áreas completadas</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">💰</div>
          <p className="text-3xl font-bold">${mockMetrics.revenue.toLocaleString()}</p>
          <p className="text-sm opacity-90">Ingresos</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">⏱️</div>
          <p className="text-3xl font-bold">{mockMetrics.averageTime}h</p>
          <p className="text-sm opacity-90">Tiempo promedio</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          💡 Insights Operacionales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockInsights.map(insight => {
            const getBgColor = () => {
              switch (insight.type) {
                case 'critical':
                  return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                case 'warning':
                  return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
                case 'success':
                  return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                default:
                  return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
              }
            };

            return (
              <div
                key={insight.id}
                className={`rounded-lg p-4 border ${getBgColor()}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{insight.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      {insight.message}
                    </p>
                    {insight.actionable && insight.action && (
                      <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2">
                        {insight.action} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
