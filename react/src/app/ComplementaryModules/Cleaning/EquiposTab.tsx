import { mockTeams } from './mocks/cleaning.mock';

export default function EquiposTab() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'available':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'off_duty':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
        return '🔵 Asignado';
      case 'available':
        return '🟢 Disponible';
      case 'off_duty':
        return '⚪ Fuera de turno';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-3xl font-bold">{mockTeams.length}</p>
          <p className="text-sm opacity-90">Equipos totales</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-3xl font-bold">{mockTeams.filter(t => t.status === 'assigned').length}</p>
          <p className="text-sm opacity-90">En servicio</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">⭐</div>
          <p className="text-3xl font-bold">4.8</p>
          <p className="text-sm opacity-90">Calificación prom.</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-3xl font-bold">93%</p>
          <p className="text-sm opacity-90">Eficiencia prom.</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Equipos de Trabajo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTeams.map(team => (
            <div
              key={team.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supervisor: {team.supervisor}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(team.status)}`}>
                  {getStatusLabel(team.status)}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Miembros</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{team.members.length}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Órdenes hoy</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{team.todayOrders}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Eficiencia</span>
                  <span className={`font-semibold ${
                    team.efficiency >= 90 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {team.efficiency}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Satisfacción</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ⭐ {team.satisfactionScore}
                  </span>
                </div>

                {team.currentOrder && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orden actual</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{team.currentOrder}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
