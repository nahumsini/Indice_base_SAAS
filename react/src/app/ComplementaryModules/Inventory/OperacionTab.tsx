import { useState } from 'react';
import { mockTransfers, mockInsights, mockInventoryLocations, mockMovements } from './mocks/inventory.mock';
import type { Transfer } from './types/inventory.types';

export default function OperacionTab() {
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'preparado':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">🔵 Preparado</span>;
      case 'transito':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">🟡 En Tránsito</span>;
      case 'recibido':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">🟢 Recibido</span>;
      case 'diferencia':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">🔴 Diferencia</span>;
      case 'retraso':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">⚠️ Retraso</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  const criticalStock = mockInventoryLocations.filter(inv => inv.status === 'critico');

  return (
    <div className="space-y-6">
      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockInsights.map(insight => (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border ${
              insight.type === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
              insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
              insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
              'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{insight.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {insight.message}
                </p>
                {insight.actionable && (
                  <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2">
                    {insight.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transferencias Activas */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🚚 Transferencias Activas
            </h2>
            <div className="space-y-4">
              {mockTransfers.filter(t => t.status !== 'recibido' && t.status !== 'cancelado').map(transfer => (
                <div
                  key={transfer.id}
                  onClick={() => setSelectedTransfer(transfer)}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{transfer.folio}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {transfer.originName} → {transfer.destinationName}
                      </p>
                    </div>
                    {getStatusBadge(transfer.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Productos</p>
                      <p className="font-medium text-gray-900 dark:text-white">{transfer.totalItems}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Operador</p>
                      <p className="font-medium text-gray-900 dark:text-white">{transfer.operatorName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">ETA</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {transfer.estimatedArrival?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Crítico */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔴 Stock Crítico
            </h2>
            <div className="space-y-3">
              {criticalStock.map(item => (
                <div key={item.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{item.productName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.locationName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{item.stock}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Mín: {item.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Movimientos Recientes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 Movimientos Recientes
        </h2>
        <div className="space-y-3">
          {mockMovements.slice(0, 5).map(movement => (
            <div key={movement.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-2xl">
                {movement.type === 'entrada' ? '📥' :
                 movement.type === 'salida' ? '📤' :
                 movement.type === 'transferencia' ? '🔄' :
                 movement.type === 'ajuste' ? '⚙️' : '📋'}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">{movement.productName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {movement.locationName} • {movement.timestamp.toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className={`font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {movement.quantity > 0 ? '+' : ''}{movement.quantity}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      {selectedTransfer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedTransfer(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTransfer.folio}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedTransfer.originName} → {selectedTransfer.destinationName}
                  </p>
                </div>
                <button onClick={() => setSelectedTransfer(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              <div className="mt-4">{getStatusBadge(selectedTransfer.status)}</div>
            </div>

            <div className="p-6 space-y-6">
              {/* Timeline */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">📅 Timeline</h3>
                <div className="space-y-3">
                  {selectedTransfer.timeline.map(event => (
                    <div key={event.id} className="flex gap-3">
                      <div className="text-xl">
                        {event.stage === 'borrador' ? '📝' :
                         event.stage === 'preparado' ? '📦' :
                         event.stage === 'enviado' ? '🚚' :
                         event.stage === 'recibido' ? '✅' : '🔄'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm capitalize">
                          {event.stage.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{event.user}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {event.timestamp.toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Productos */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">📦 Productos</h3>
                <div className="space-y-2">
                  {selectedTransfer.items.map(item => (
                    <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{item.productName}</span>
                        {item.hasDifference && <span className="text-red-600 text-xs">⚠️ Diferencia</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Enviados</p>
                          <p className="font-medium text-gray-900 dark:text-white">{item.quantitySent}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Recibidos</p>
                          <p className="font-medium text-gray-900 dark:text-white">{item.quantityReceived || '-'}</p>
                        </div>
                        {item.hasDifference && (
                          <div>
                            <p className="text-red-600">Faltantes</p>
                            <p className="font-medium text-red-600">{item.quantityMissing || 0}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
