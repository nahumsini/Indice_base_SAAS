import { useState } from 'react';
import { mockTransfers, mockInsights, mockInventoryLocations, mockMovements } from './mocks/inventory.mock';
import type { Movement, Transfer } from './types/inventory.types';

type TransferTimelineEvent = {
  id: string;
  icon: string;
  label: string;
  timestamp: Date;
  user: string;
};

function getStatusBadge(status: Transfer['status']) {
  switch (status) {
    case 'pending':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Pendiente</span>;
    case 'approved':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Aprobada</span>;
    case 'in_transit':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">En transito</span>;
    case 'received':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Recibida</span>;
    case 'cancelled':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Cancelada</span>;
    default:
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{status}</span>;
  }
}

function getMovementIcon(type: Movement['type']) {
  switch (type) {
    case 'entry':
      return 'Entrada';
    case 'exit':
      return 'Salida';
    case 'transfer':
      return 'Transferencia';
    case 'adjustment':
      return 'Ajuste';
    case 'return':
      return 'Devolucion';
    case 'assignment':
      return 'Asignacion';
    case 'loss':
      return 'Merma';
    case 'production':
      return 'Produccion';
    default:
      return 'Movimiento';
  }
}

function getTransferTotalItems(transfer: Transfer) {
  return transfer.products.reduce((sum, product) => sum + Math.abs(product.quantity), 0);
}

function getMovementQuantity(movement: Movement) {
  if (movement.type === 'exit' || movement.type === 'loss') {
    return -movement.products.reduce((sum, product) => sum + Math.abs(product.quantity), 0);
  }

  return movement.products.reduce((sum, product) => sum + product.quantity, 0);
}

function getMovementTitle(movement: Movement) {
  const firstProduct = movement.products[0];
  if (!firstProduct) {
    return movement.folio;
  }

  if (movement.products.length === 1) {
    return firstProduct.productName;
  }

  return `${firstProduct.productName} +${movement.products.length - 1}`;
}

function getMovementLocation(movement: Movement) {
  return movement.originNodeName ?? movement.destinationNodeName ?? 'Sin ubicacion';
}

function getTransferTimeline(transfer: Transfer): TransferTimelineEvent[] {
  const timeline: TransferTimelineEvent[] = [
    {
      id: `${transfer.id}-created`,
      icon: '📝',
      label: 'Creada',
      timestamp: transfer.createdAt,
      user: transfer.responsible,
    },
  ];

  if (transfer.status === 'approved' || transfer.status === 'in_transit' || transfer.status === 'received') {
    timeline.push({
      id: `${transfer.id}-approved`,
      icon: '✅',
      label: 'Aprobada',
      timestamp: transfer.createdAt,
      user: transfer.responsible,
    });
  }

  if (transfer.sentAt) {
    timeline.push({
      id: `${transfer.id}-sent`,
      icon: '🚚',
      label: 'Enviada',
      timestamp: transfer.sentAt,
      user: transfer.transport ?? transfer.responsible,
    });
  }

  if (transfer.receivedAt) {
    timeline.push({
      id: `${transfer.id}-received`,
      icon: '📥',
      label: 'Recibida',
      timestamp: transfer.receivedAt,
      user: transfer.responsible,
    });
  }

  return timeline;
}

export default function OperacionTab() {
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const criticalStock = mockInventoryLocations.filter((inventoryLocation) => inventoryLocation.status === 'critico');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockInsights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-lg border p-4 ${
              insight.type === 'critical'
                ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                : insight.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                  : insight.type === 'success'
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{insight.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{insight.message}</p>
                {insight.actionable ? (
                  <button className="mt-2 text-xs text-blue-600 hover:underline dark:text-blue-400">
                    {insight.action} →
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Transferencias activas</h2>
            <div className="space-y-4">
              {mockTransfers
                .filter((transfer) => transfer.status !== 'received' && transfer.status !== 'cancelled')
                .map((transfer) => (
                  <div
                    key={transfer.id}
                    onClick={() => setSelectedTransfer(transfer)}
                    className="cursor-pointer rounded-lg bg-gray-50 p-4 transition-shadow hover:shadow-md dark:bg-gray-900"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{transfer.folio}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {transfer.originNodeName} → {transfer.destinationNodeName}
                        </p>
                      </div>
                      {getStatusBadge(transfer.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Productos</p>
                        <p className="font-medium text-gray-900 dark:text-white">{getTransferTotalItems(transfer)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Responsable</p>
                        <p className="font-medium text-gray-900 dark:text-white">{transfer.responsible}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">ETA</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transfer.eta?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) ?? '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Stock critico</h2>
            <div className="space-y-3">
              {criticalStock.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                >
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{item.productName}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.locationName}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{item.stock}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Min: {item.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Movimientos recientes</h2>
        <div className="space-y-3">
          {mockMovements.slice(0, 5).map((movement) => {
            const quantity = getMovementQuantity(movement);
            return (
              <div key={movement.id} className="flex items-center gap-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">{getMovementIcon(movement.type)}</div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{getMovementTitle(movement)}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {getMovementLocation(movement)} •{' '}
                    {movement.timestamp.toLocaleString('es-MX', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className={`font-bold ${quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {quantity > 0 ? '+' : ''}
                  {quantity}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTransfer ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedTransfer(null)} />
          <div className="fixed bottom-0 right-0 top-0 z-50 w-full overflow-y-auto bg-white shadow-xl dark:bg-gray-800 md:w-[600px]">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTransfer.folio}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedTransfer.originNodeName} → {selectedTransfer.destinationNodeName}
                  </p>
                </div>
                <button onClick={() => setSelectedTransfer(null)} className="text-2xl text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <div className="mt-4">{getStatusBadge(selectedTransfer.status)}</div>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Timeline</h3>
                <div className="space-y-3">
                  {getTransferTimeline(selectedTransfer).map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="text-xl">{event.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{event.label}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{event.user}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          {event.timestamp.toLocaleString('es-MX', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Productos</h3>
                <div className="space-y-2">
                  {selectedTransfer.products.map((product) => (
                    <div key={`${selectedTransfer.id}-${product.productId}`} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                      <div className="mb-2 flex justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{product.productName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Enviados</p>
                          <p className="font-medium text-gray-900 dark:text-white">{product.quantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Recibidos</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedTransfer.status === 'received' ? product.quantity : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Unidad</p>
                          <p className="font-medium text-gray-900 dark:text-white">{product.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
