import { mockTransfers } from './mocks/inventory.mock';
import type { Transfer } from './types/inventory.types';

export default function RecepcionesTab() {
  const pendingReceptions = mockTransfers.filter(t => t.status === 'in_transit' || t.status === 'approved');
  const hasTransferDifferences = (transfer: Transfer) => transfer.notes?.toLowerCase().includes('diferencia') ?? false;
  const getTransferQuantity = (transfer: Transfer) =>
    transfer.products.reduce((total, product) => total + product.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">📥</div>
          <p className="text-3xl font-medium">{pendingReceptions.length}</p>
          <p className="text-sm opacity-90">Pendientes</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-3xl font-medium">{mockTransfers.filter(t => t.status === 'received' && !hasTransferDifferences(t)).length}</p>
          <p className="text-sm opacity-90">Sin Diferencias</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-3xl font-medium">{mockTransfers.filter(hasTransferDifferences).length}</p>
          <p className="text-sm opacity-90">Con Diferencias</p>
        </div>
      </div>

      <div className="space-y-4">
        {pendingReceptions.map(transfer => (
          <div key={transfer.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{transfer.folio}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  De: {transfer.originNodeName}
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                Pendiente Recepción
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Productos</p>
                <p className="font-medium text-gray-900 dark:text-white">{getTransferQuantity(transfer)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enviado</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {transfer.sentAt?.toLocaleDateString('es-MX')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">ETA</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {transfer.eta?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                Confirmar Recepción
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                Reportar Diferencia
              </button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                Ver Detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
