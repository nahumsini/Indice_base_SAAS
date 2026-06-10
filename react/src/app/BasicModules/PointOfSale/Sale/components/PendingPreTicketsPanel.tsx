import { ArrowRight, Clock, ReceiptText, User } from 'lucide-react';
import type { PreTicket } from '../../shared/cashClosing.types';

interface PendingPreTicketsPanelProps {
  preTickets: PreTicket[];
  onPullPreTicket: (preTicketId: string) => void;
  formatCurrency: (amount: number) => string;
}

export function PendingPreTicketsPanel({
  preTickets,
  onPullPreTicket,
  formatCurrency,
}: PendingPreTicketsPanelProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <ReceiptText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">Preventas pendientes</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {preTickets.length} listas para cobrar
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-56 space-y-2 overflow-y-auto p-3">
        {preTickets.map((preTicket) => (
          <button
            key={preTicket.id}
            onClick={() => onPullPreTicket(preTicket.id)}
            className="group w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-gray-950 dark:text-white">{preTicket.code}</p>
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {preTicket.items.length} lineas
                  </span>
                  <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {preTicket.status === 'pending' ? 'Pendiente' : 'Cargada'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {preTicket.customerName}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {preTicket.advisorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {preTicket.createdAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black text-gray-950 dark:text-white">{formatCurrency(preTicket.total)}</p>
                <span className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition group-hover:bg-blue-700">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </button>
        ))}

        {preTickets.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sin preventas pendientes</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Las nuevas preventas apareceran aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
