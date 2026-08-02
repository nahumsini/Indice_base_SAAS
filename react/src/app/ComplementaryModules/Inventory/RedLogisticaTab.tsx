import { useState } from 'react';
import { mockNodes, mockMovements } from './mocks/inventory.mock';
import type { LogisticsNode, NodeStatus } from './types/inventory.types';
import {
  Warehouse,
  Store,
  Truck,
  User,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Package,
  DollarSign,
  Activity,
  MapPin,
  Settings,
  X,
} from 'lucide-react';

export default function RedLogisticaTab() {
  const [nodes] = useState<LogisticsNode[]>(mockNodes);
  const [selectedNode, setSelectedNode] = useState<LogisticsNode | null>(null);

  const getNodeIcon = (type: LogisticsNode['type']) => {
    const icons = {
      warehouse: Warehouse,
      branch: Store,
      vehicle: Truck,
      technician: User,
      transit: ArrowRight,
      production: Settings,
      consignment: Package,
    };
    return icons[type];
  };

  const getStatusColor = (status: NodeStatus) => {
    const colors = {
      healthy: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400',
      attention: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400',
      critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400',
      in_transit: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400',
      production: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400',
    };
    return colors[status];
  };

  const getStatusBadge = (status: NodeStatus) => {
    const badges = {
      healthy: { label: 'Saludable', icon: '✓' },
      attention: { label: 'Atención', icon: '⚠️' },
      critical: { label: 'Crítico', icon: '🔥' },
      in_transit: { label: 'En Tránsito', icon: '🚚' },
      production: { label: 'Producción', icon: '⚙️' },
    };
    return badges[status];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getCapacityPercentage = (node: LogisticsNode) => {
    return Math.round((node.capacityUsed / node.capacity) * 100);
  };

  const getRecentMovements = (nodeId: string) => {
    return mockMovements
      .filter(m => m.originNode === nodeId || m.destinationNode === nodeId)
      .slice(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* Grid of Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {nodes.map((node) => {
          const Icon = getNodeIcon(node.type);
          const statusColor = getStatusColor(node.status);
          const statusBadge = getStatusBadge(node.status);
          const capacityPercent = getCapacityPercentage(node);

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className={`${statusColor} rounded-xl border p-5 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium mb-1">
                      {node.name}
                    </h3>
                    <p className="text-xs opacity-75 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {node.location}
                    </p>
                  </div>
                </div>
                {node.alerts > 0 && (
                  <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {node.alerts}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-xs font-medium">
                  <span>{statusBadge.icon}</span>
                  {statusBadge.label}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-xs opacity-75 mb-1">Stock</p>
                  <p className="text-lg font-medium">{node.stockTotal.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-xs opacity-75 mb-1">Valor</p>
                  <p className="text-lg font-medium">{formatCurrency(node.stockValue)}</p>
                </div>
              </div>

              {/* Movements Today */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-75">Movimientos hoy</span>
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span className="text-sm font-medium">{node.movementsToday}</span>
                  </div>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs opacity-75">Capacidad</span>
                  <span className="text-xs font-medium">{capacityPercent}%</span>
                </div>
                <div className="h-2 bg-white dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      capacityPercent >= 100 ? 'bg-red-500' :
                      capacityPercent >= 80 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Responsible */}
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3 opacity-75" />
                <span className="opacity-75">{node.responsible}</span>
              </div>

              {/* Quick Actions */}
              <div className="mt-3 pt-3 border-t border-white/20 dark:border-gray-700/50">
                <div className="grid grid-cols-2 gap-2">
                  <button className="px-2 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-xs font-medium transition-colors">
                    Transferir
                  </button>
                  <button className="px-2 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-xs font-medium transition-colors">
                    Ajustar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Side Panel */}
      {selectedNode && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
            onClick={() => setSelectedNode(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto animate-slideInRight">
            {/* Header */}
            <div className={`${getStatusColor(selectedNode.status)} p-6 border-b`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                    {(() => {
                      const Icon = getNodeIcon(selectedNode.type);
                      return <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-medium mb-1">{selectedNode.name}</h2>
                    <p className="text-sm opacity-75 flex items-center gap-1 mb-2">
                      <MapPin className="w-4 h-4" />
                      {selectedNode.location}
                    </p>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium">
                      {getStatusBadge(selectedNode.status).icon} {getStatusBadge(selectedNode.status).label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-8 h-8 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs opacity-75 mb-1">Responsable</p>
                  <p className="text-sm font-medium">{selectedNode.responsible}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs opacity-75 mb-1">Tipo</p>
                  <p className="text-sm font-medium capitalize">{selectedNode.type}</p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Métricas Operativas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs text-blue-700 dark:text-blue-400">Stock Total</p>
                  </div>
                  <p className="text-2xl font-medium text-blue-900 dark:text-blue-300">
                    {selectedNode.stockTotal.toLocaleString()}
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-xs text-green-700 dark:text-green-400">Valor</p>
                  </div>
                  <p className="text-2xl font-medium text-green-900 dark:text-green-300">
                    {formatCurrency(selectedNode.stockValue)}
                  </p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <p className="text-xs text-purple-700 dark:text-purple-400">Movimientos Hoy</p>
                  </div>
                  <p className="text-2xl font-medium text-purple-900 dark:text-purple-300">
                    {selectedNode.movementsToday}
                  </p>
                </div>

                <div className={`rounded-xl p-4 border ${
                  selectedNode.alerts > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className={`w-5 h-5 ${
                      selectedNode.alerts > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                    <p className={`text-xs ${
                      selectedNode.alerts > 0
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-400'
                    }`}>Alertas</p>
                  </div>
                  <p className={`text-2xl font-medium ${
                    selectedNode.alerts > 0
                      ? 'text-red-900 dark:text-red-300'
                      : 'text-gray-900 dark:text-gray-300'
                  }`}>
                    {selectedNode.alerts}
                  </p>
                </div>
              </div>

              {/* Capacity */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Capacidad Utilizada
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getCapacityPercentage(selectedNode)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      getCapacityPercentage(selectedNode) >= 100 ? 'bg-red-500' :
                      getCapacityPercentage(selectedNode) >= 80 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(getCapacityPercentage(selectedNode), 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {selectedNode.capacityUsed.toLocaleString()} / {selectedNode.capacity.toLocaleString()} unidades
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Actividad Reciente
              </h3>
              <div className="space-y-3">
                {getRecentMovements(selectedNode.id).map((movement) => (
                  <div
                    key={movement.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {movement.type === 'entry' ? '📥 Entrada' :
                           movement.type === 'exit' ? '📤 Salida' :
                           movement.type === 'transfer' ? '🔄 Transferencia' :
                           movement.type === 'return' ? '↩️ Devolución' :
                           movement.type === 'adjustment' ? '⚙️ Ajuste' :
                           '📦 Movimiento'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(movement.timestamp).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {movement.reason}
                    </p>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {movement.user}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
                  Transferir
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors">
                  Ajustar Stock
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors">
                  Ver Movimientos
                </button>
                <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors">
                  Auditar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
