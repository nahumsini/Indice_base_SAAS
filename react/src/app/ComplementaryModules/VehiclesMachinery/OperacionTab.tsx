import { useState, useMemo } from 'react';
import { mockVehicles, mockActivities } from './mocks/vehicles.mock';
import type { Vehicle, VehicleStatus } from './types/vehicles.types';
import {
  Truck,
  Car,
  Wrench,
  Fuel,
  MapPin,
  User,
  AlertCircle,
  Calendar,
  Activity,
  Settings,
  FileText,
  Lock,
  X,
  Gauge,
} from 'lucide-react';

export default function OperacionTab() {
  const [vehicles] = useState<Vehicle[]>(mockVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => statusFilter === 'all' || v.status === statusFilter);
  }, [vehicles, statusFilter]);

  const stats = useMemo(() => {
    return {
      available: vehicles.filter(v => v.status === 'available').length,
      inOperation: vehicles.filter(v => v.status === 'in_operation').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      outOfService: vehicles.filter(v => v.status === 'out_of_service').length,
      reserved: vehicles.filter(v => v.status === 'reserved').length,
      noOperator: vehicles.filter(v => v.status === 'no_operator').length,
    };
  }, [vehicles]);

  const getStatusBadge = (status: VehicleStatus) => {
    const badges = {
      available: { label: 'Disponible', emoji: '🟢', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      in_operation: { label: 'En Operación', emoji: '🔵', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      maintenance: { label: 'Mantenimiento', emoji: '🟡', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
      out_of_service: { label: 'Fuera de Servicio', emoji: '🔴', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
      reserved: { label: 'Reservado', emoji: '🟣', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
      no_operator: { label: 'Sin Operador', emoji: '⚫', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    };
    return badges[status];
  };

  const getVehicleIcon = (type: Vehicle['type']) => {
    const icons = {
      truck: Truck,
      car: Car,
      van: Truck,
      excavator: Settings,
      forklift: Settings,
      crane: Settings,
      loader: Settings,
      tractor: Settings,
      trailer: Truck,
    };
    return icons[type] || Truck;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No programado';
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getRecentActivities = (vehicleId: string) => {
    return mockActivities.filter(a => a.vehicleId === vehicleId).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* Status Filter Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            statusFilter === 'all'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Todas ({vehicles.length})
        </button>
        <button
          onClick={() => setStatusFilter('available')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            statusFilter === 'available'
              ? 'bg-green-500 text-white'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          }`}
        >
          🟢 Disponible ({stats.available})
        </button>
        <button
          onClick={() => setStatusFilter('in_operation')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            statusFilter === 'in_operation'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          }`}
        >
          🔵 En Operación ({stats.inOperation})
        </button>
        <button
          onClick={() => setStatusFilter('maintenance')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            statusFilter === 'maintenance'
              ? 'bg-yellow-500 text-white'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
          }`}
        >
          🟡 Mantenimiento ({stats.maintenance})
        </button>
        <button
          onClick={() => setStatusFilter('out_of_service')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            statusFilter === 'out_of_service'
              ? 'bg-red-500 text-white'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          🔴 Fuera de Servicio ({stats.outOfService})
        </button>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredVehicles.map((vehicle) => {
          const Icon = getVehicleIcon(vehicle.type);
          const statusBadge = getStatusBadge(vehicle.status);

          return (
            <div
              key={vehicle.id}
              onClick={() => setSelectedVehicle(vehicle)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                      {vehicle.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                </div>
                {(vehicle.alerts > 0 || vehicle.incidents > 0) && (
                  <div className="flex flex-col gap-1">
                    {vehicle.alerts > 0 && (
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {vehicle.alerts}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                  <span>{statusBadge.emoji}</span>
                  {statusBadge.label}
                </span>
              </div>

              {/* Operator */}
              {vehicle.operator && (
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 dark:text-white font-medium">
                    {vehicle.operator}
                  </span>
                </div>
              )}

              {/* Location */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {vehicle.location}
                </span>
              </div>

              {/* Fuel */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Combustible</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {vehicle.fuel}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      vehicle.fuel >= 50 ? 'bg-green-500' :
                      vehicle.fuel >= 25 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${vehicle.fuel}%` }}
                  />
                </div>
              </div>

              {/* Hours/Kilometers */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {vehicle.kilometers !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Kilómetros</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {vehicle.kilometers.toLocaleString()}
                    </p>
                  </div>
                )}
                {vehicle.hours !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Horas</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {vehicle.hours.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Next Service */}
              {vehicle.nextService && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <Calendar className="w-3 h-3" />
                  <span>Próximo servicio: {formatDate(vehicle.nextService)}</span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  <button className="px-2 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-xs font-medium transition-colors">
                    Reportar
                  </button>
                  <button className="px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-medium transition-colors">
                    Servicio
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Gauge className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            No hay vehículos con el estado seleccionado
          </p>
        </div>
      )}

      {/* Side Panel */}
      {selectedVehicle && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
            onClick={() => setSelectedVehicle(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto animate-slideInRight">
            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    {(() => {
                      const Icon = getVehicleIcon(selectedVehicle.type);
                      return <Icon className="w-8 h-8 text-white" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedVehicle.name}</h2>
                    <p className="text-white/80 mb-2">
                      {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold`}>
                      {getStatusBadge(selectedVehicle.status).emoji} {getStatusBadge(selectedVehicle.status).label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {selectedVehicle.operator && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-xs text-white/70 mb-1">Operador</p>
                    <p className="text-sm font-semibold">{selectedVehicle.operator}</p>
                  </div>
                )}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs text-white/70 mb-1">Ubicación</p>
                  <p className="text-sm font-semibold">{selectedVehicle.location}</p>
                </div>
                {selectedVehicle.plates && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-xs text-white/70 mb-1">Placas</p>
                    <p className="text-sm font-semibold">{selectedVehicle.plates}</p>
                  </div>
                )}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs text-white/70 mb-1">Sucursal</p>
                  <p className="text-sm font-semibold">{selectedVehicle.branch}</p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Métricas Operativas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {selectedVehicle.kilometers !== undefined && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs text-blue-700 dark:text-blue-400">Kilómetros</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                      {selectedVehicle.kilometers.toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedVehicle.hours !== undefined && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <p className="text-xs text-purple-700 dark:text-purple-400">Horas Trabajadas</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                      {selectedVehicle.hours.toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-xs text-green-700 dark:text-green-400">Combustible</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                    {selectedVehicle.fuel}%
                  </p>
                </div>
                <div className={`rounded-xl p-4 border ${
                  selectedVehicle.alerts > 0 || selectedVehicle.incidents > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className={`w-5 h-5 ${
                      selectedVehicle.alerts > 0 || selectedVehicle.incidents > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                    <p className={`text-xs ${
                      selectedVehicle.alerts > 0 || selectedVehicle.incidents > 0
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-400'
                    }`}>Alertas/Incidencias</p>
                  </div>
                  <p className={`text-2xl font-bold ${
                    selectedVehicle.alerts > 0 || selectedVehicle.incidents > 0
                      ? 'text-red-900 dark:text-red-300'
                      : 'text-gray-900 dark:text-gray-300'
                  }`}>
                    {selectedVehicle.alerts + selectedVehicle.incidents}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Actividad Reciente
              </h3>
              <div className="space-y-3">
                {getRecentActivities(selectedVehicle.id).map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {activity.type === 'fuel' ? '⛽ ' :
                           activity.type === 'service' ? '🔧 ' :
                           activity.type === 'checklist' ? '✓ ' :
                           activity.type === 'report' ? '📋 ' :
                           activity.type === 'expense' ? '💰 ' :
                           '📦 '}
                          {activity.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {activity.user}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Reportar Falla
                </button>
                <button className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Agendar Servicio
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" />
                  Historial
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  <User className="w-5 h-5" />
                  Asignar Operador
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
