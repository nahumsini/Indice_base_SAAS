import { ClipboardCheck, Send, UserRound } from 'lucide-react';
import { pendingPreTickets } from '../shared/commercial/pretickets';
import type { AdvisorKioskQueueItem } from './types';

const advisorQueue: AdvisorKioskQueueItem[] = pendingPreTickets.map((ticket) => ({
  id: ticket.id,
  customerName: ticket.customerName,
  advisorName: ticket.advisorName,
  itemCount: ticket.items.length,
  estimatedTotal: ticket.total,
  status: 'ready',
}));

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(amount);

export default function AdvisorKiosk() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            <UserRound className="h-3.5 w-3.5" />
            Kiosco asesor
          </div>
          <h2 className="text-2xl font-medium text-gray-950 dark:text-white">Pre-tickets asesorados</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Arquitectura frontend lista para que asesores preparen ventas; el cobro sigue viviendo en Venta.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Pre-tickets listos" value={advisorQueue.length} />
        <Kpi label="Productos apartados" value={advisorQueue.reduce((sum, item) => sum + item.itemCount, 0)} />
        <Kpi label="Total estimado" value={formatCurrency(advisorQueue.reduce((sum, item) => sum + item.estimatedTotal, 0))} />
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-100">
        Esta pantalla no cobra ni abre caja; solo prepara la fila operativa para el cajero.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {advisorQueue.map((item) => (
            <div key={item.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-medium text-gray-950 dark:text-white">{item.customerName}</p>
                <p className="text-gray-500 dark:text-gray-400">{item.advisorName} - {item.itemCount} productos</p>
              </div>
              <span className="font-medium text-gray-950 dark:text-white">{formatCurrency(item.estimatedTotal)}</span>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <Send className="h-4 w-4" />
                Enviar a caja
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-medium text-gray-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

