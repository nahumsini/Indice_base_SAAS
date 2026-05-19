import { useState, useMemo } from 'react';
import { mockOrders } from './mocks/cleaning.mock';
import type { CleaningOrder, OrderStatus } from './types/cleaning.types';

export default function OperacionTab() {
  const [selectedOrder, setSelectedOrder] = useState<CleaningOrder | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const columns: { status: OrderStatus; label: string; emoji: string; color: string }[] = [
    { status: 'scheduled', label: 'Programada', emoji: '📅', color: 'bg-gray-100 dark:bg-gray-800' },
    { status: 'on_route', label: 'En Ruta', emoji: '🚗', color: 'bg-blue-50 dark:bg-blue-900/20' },
    { status: 'in_progress', label: 'En Proceso', emoji: '🧹', color: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { status: 'inspection', label: 'Inspección', emoji: '✓', color: 'bg-purple-50 dark:bg-purple-900/20' },
    { status: 'completed', label: 'Completada', emoji: '✅', color: 'bg-green-50 dark:bg-green-900/20' },
    { status: 'delayed', label: 'Retrasada', emoji: '⚠️', color: 'bg-red-50 dark:bg-red-900/20' },
  ];

  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, CleaningOrder[]> = {
      scheduled: [],
      on_route: [],
      in_progress: [],
      inspection: [],
      completed: [],
      delayed: [],
      cancelled: [],
    };

    mockOrders.forEach(order => {
      grouped[order.status].push(order);
    });

    return grouped;
  }, []);

  const getPriorityColor = (priority: CleaningOrder['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'maintenance':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: CleaningOrder['priority']) => {
    switch (priority) {
      case 'urgent':
        return '🔥 Urgente';
      case 'maintenance':
        return '🔧 Mantenimiento';
      default:
        return 'Normal';
    }
  };

  const handleOrderClick = (order: CleaningOrder) => {
    setSelectedOrder(order);
    setShowPanel(true);
  };

  const getTimeInfo = (order: CleaningOrder) => {
    const now = new Date();
    const scheduled = new Date(order.scheduledAt);
    const diff = scheduled.getTime() - now.getTime();
    const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));

    if (order.status === 'completed') {
      return { text: `Completada`, color: 'text-green-600 dark:text-green-400' };
    }
    if (order.status === 'delayed') {
      return { text: 'Retrasada', color: 'text-red-600 dark:text-red-400' };
    }
    if (diff < 0) {
      return { text: `Hace ${hours}h`, color: 'text-gray-600 dark:text-gray-400' };
    }
    if (hours < 2) {
      return { text: `En ${hours}h`, color: 'text-orange-600 dark:text-orange-400' };
    }
    return { text: `En ${hours}h`, color: 'text-gray-600 dark:text-gray-400' };
  };

  const getCompletionPercentage = (order: CleaningOrder) => {
    const total = order.checklist.length;
    const completed = order.checklist.filter(item => item.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {columns.map(column => (
          <div key={column.status} className={`rounded-lg ${column.color} p-3 min-h-[500px]`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{column.emoji}</span>
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {column.label}
                </span>
              </div>
              <span className="text-xs font-semibold bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {ordersByStatus[column.status].length}
              </span>
            </div>

            <div className="space-y-2">
              {ordersByStatus[column.status].map(order => {
                const timeInfo = getTimeInfo(order);
                const completion = getCompletionPercentage(order);
                return (
                  <button
                    key={order.id}
                    onClick={() => handleOrderClick(order)}
                    className="w-full bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {order.folio}
                      </span>
                      {order.hasIncident && (
                        <span className="text-red-500 text-xs">⚠️</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        🏢 {order.clientName}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(order.priority)}`}>
                          {getPriorityLabel(order.priority)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {order.areas.length} áreas
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${order.total.toLocaleString()}
                        </span>
                      </div>

                      {order.status === 'in_progress' && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500 dark:text-gray-400">Progreso</span>
                            <span className="font-medium text-gray-900 dark:text-white">{completion}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className={`text-xs font-medium ${timeInfo.color}`}>
                        ⏱️ {timeInfo.text}
                      </div>

                      {order.teamName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          👥 {order.teamName}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showPanel && selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedOrder.folio}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedOrder.clientName}
                </p>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Prioridad</p>
                  <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${getPriorityColor(selectedOrder.priority)}`}>
                    {getPriorityLabel(selectedOrder.priority)}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado de Pago</p>
                  <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${
                    selectedOrder.paymentStatus === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : selectedOrder.paymentStatus === 'partial'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {selectedOrder.paymentStatus === 'paid' ? '✅ Pagado' : selectedOrder.paymentStatus === 'partial' ? '⚠️ Parcial' : '❌ Pendiente'}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Información General</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Ubicación</p>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedOrder.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Equipo</p>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedOrder.teamName || 'Por asignar'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Programada</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {new Date(selectedOrder.scheduledAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Duración Est.</p>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedOrder.estimatedDuration}h</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Áreas a Limpiar</h3>
                <div className="space-y-2">
                  {selectedOrder.areas.map(area => (
                    <div key={area.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {area.name}
                            {area.completed && <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓ Completada</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {area.size} {area.unit}
                          </p>
                        </div>
                        {area.inspectionScore && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                            {area.inspectionScore}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {area.tasks.map((task, i) => (
                          <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {task}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.specialNotes && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">📝 Notas Especiales</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedOrder.specialNotes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🕐 Timeline</h3>
                <div className="space-y-3">
                  {selectedOrder.timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(event => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                      <div className="flex-1 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {event.stage === 'scheduled' && '📅 Programada'}
                              {event.stage === 'on_route' && '🚗 En Ruta'}
                              {event.stage === 'in_progress' && '🧹 En Proceso'}
                              {event.stage === 'inspection' && '✓ Inspección'}
                              {event.stage === 'completed' && '✅ Completada'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Por {event.user}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(event.timestamp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
                  Actualizar Estado
                </button>
                <button className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
