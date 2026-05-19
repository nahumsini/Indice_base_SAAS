import { useState } from 'react';
import { mockMovements } from './mocks/inventory.mock';
import type { Movement, MovementType } from './types/inventory.types';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  RotateCcw,
  Settings,
  TrendingDown,
  User,
  Calendar,
  FileText,
  Package,
  Filter,
} from 'lucide-react';

export default function MovimientosTab() {
  const [movements] = useState<Movement[]>(mockMovements);
  const [typeFilter, setTypeFilter] = useState<MovementType | 'all'>('all');

  const filteredMovements = movements.filter(
    m => typeFilter === 'all' || m.type === typeFilter
  );

  const getMovementIcon = (type: MovementType) => {
    const icons = {
      entry: ArrowDownToLine,
      exit: ArrowUpFromLine,
      transfer: ArrowRightLeft,
      return: RotateCcw,
      adjustment: Settings,
      loss: TrendingDown,
      production: Settings,
      assignment: User,
    };
    return icons[type];
  };

  const getMovementColor = (type: MovementType) => {
    const colors = {
      entry: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700',
      exit: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700',
      transfer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700',
      return: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700',
      adjustment: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700',
      loss: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700',
      production: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700',
      assignment: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700',
    };
    return colors[type];
  };

  const getMovementLabel = (type: MovementType) => {
    const labels = {
      entry: 'Entrada',
      exit: 'Salida',
      transfer: 'Transferencia',
      return: 'Devolución',
      adjustment: 'Ajuste',
      loss: 'Merma',
      production: 'Producción',
      assignment: 'Asignación',
    };
    return labels[type];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diffMinutes = Math.floor((now - then) / (1000 * 60));

    if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Timeline de Movimientos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Registro en tiempo real de toda la actividad logística
          </p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold">En vivo</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MovementType | 'all')}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          >
            <option value="all">Todos los movimientos</option>
            <option value="entry">📥 Entradas</option>
            <option value="exit">📤 Salidas</option>
            <option value="transfer">🔄 Transferencias</option>
            <option value="return">↩️ Devoluciones</option>
            <option value="adjustment">⚙️ Ajustes</option>
            <option value="loss">📉 Mermas</option>
            <option value="production">🏭 Producción</option>
            <option value="assignment">👤 Asignaciones</option>
          </select>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredMovements.length} movimientos
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredMovements.map((movement, index) => {
          const Icon = getMovementIcon(movement.type);
          const color = getMovementColor(movement.type);
          const label = getMovementLabel(movement.type);

          return (
            <div
              key={movement.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow relative"
            >
              {/* Timeline connector */}
              {index < filteredMovements.length - 1 && (
                <div className="absolute left-[46px] top-[60px] w-0.5 h-[calc(100%+12px)] bg-gray-200 dark:bg-gray-700 -z-10" />
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color} border`}>
                          {label}
                        </span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-500">
                          {movement.folio}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {movement.reason}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                        {getRelativeTime(movement.timestamp)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(movement.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Origin/Destination */}
                  {(movement.originNodeName || movement.destinationNodeName) && (
                    <div className="flex items-center gap-2 mb-3">
                      {movement.originNodeName && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                          De: {movement.originNodeName}
                        </span>
                      )}
                      {movement.originNodeName && movement.destinationNodeName && (
                        <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                      )}
                      {movement.destinationNodeName && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                          A: {movement.destinationNodeName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Products */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Productos ({movement.products.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {movement.products.map((product, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">•</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {product.productName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              ({product.sku})
                            </span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {product.quantity > 0 ? '+' : ''}{product.quantity} {product.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {movement.user}
                        </span>
                      </div>
                      {movement.evidence && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Con evidencia
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      movement.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : movement.status === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {movement.status === 'completed' ? '✓ Completado' :
                       movement.status === 'pending' ? '⏳ Pendiente' :
                       '✗ Cancelado'}
                    </span>
                  </div>

                  {movement.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Nota: {movement.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMovements.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            No se encontraron movimientos con el filtro seleccionado
          </p>
        </div>
      )}
    </div>
  );
}
