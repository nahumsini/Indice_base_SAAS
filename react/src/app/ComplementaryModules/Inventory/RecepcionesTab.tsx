import { mockTransfers } from './mocks/inventory.mock';

function getTransferTotalItems(quantities: number[]) {
  return quantities.reduce((sum, quantity) => sum + Math.abs(quantity), 0);
}

export default function RecepcionesTab() {
  const pendingReceptions = mockTransfers.filter(
    (transfer) => transfer.status === 'in_transit' || transfer.status === 'approved',
  );
  const receivedTransfers = mockTransfers.filter((transfer) => transfer.status === 'received');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white">
          <div className="mb-2 text-2xl">📥</div>
          <p className="text-3xl font-bold">{pendingReceptions.length}</p>
          <p className="text-sm opacity-90">Pendientes</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
          <div className="mb-2 text-2xl">✅</div>
          <p className="text-3xl font-bold">{receivedTransfers.length}</p>
          <p className="text-sm opacity-90">Sin diferencias</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-6 text-white">
          <div className="mb-2 text-2xl">⚠️</div>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm opacity-90">Con diferencias</p>
        </div>
      </div>

      <div className="space-y-4">
        {pendingReceptions.map((transfer) => (
          <div key={transfer.id} className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{transfer.folio}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">De: {transfer.originNodeName}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Pendiente recepcion
              </span>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Productos</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {getTransferTotalItems(transfer.products.map((product) => product.quantity))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enviado</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {transfer.sentAt?.toLocaleDateString('es-MX') ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">ETA</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {transfer.eta?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) ?? '-'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700">
                Confirmar recepcion
              </button>
              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700">
                Reportar diferencia
              </button>
              <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                Ver detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
