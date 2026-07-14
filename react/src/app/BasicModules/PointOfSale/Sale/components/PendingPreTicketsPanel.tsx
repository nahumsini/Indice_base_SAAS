import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Clock, ReceiptText, User } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const nextPreTicket = preTickets[0];

  return (
    <div className="overflow-hidden rounded-lg border border-[#F4C84A]/35 bg-white shadow-sm dark:border-[#F4C84A]/20 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#F4C84A]/10 dark:hover:bg-[#F4C84A]/10"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A]/25 dark:bg-[#F4C84A]/15" aria-hidden="true">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-[#222831] dark:text-white">Preventas pendientes</h3>
            <p className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
              {preTickets.length === 0
                ? 'Sin tickets pausados para cobrar'
                : nextPreTicket
                ? `${preTickets.length} listas · siguiente ${nextPreTicket.code} · ${formatCurrency(nextPreTicket.total)}`
                : `${preTickets.length} listas para cobrar`}
            </p>
          </div>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#222831] text-white dark:bg-gray-700 dark:text-gray-200">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {isOpen && (
      <div className="max-h-72 space-y-2 overflow-y-auto border-t border-gray-200 p-3 dark:border-gray-700">
        {preTickets.map((preTicket) => (
          <button
            key={preTicket.id}
            onClick={() => onPullPreTicket(preTicket.id)}
            className="group w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-[#59C3A5]/50 hover:bg-[#59C3A5]/10 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-[#59C3A5]/40 dark:hover:bg-[#59C3A5]/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-gray-950 dark:text-white">{preTicket.code}</p>
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {preTicket.items.length} lineas
                  </span>
                  <span className="rounded-md bg-[#59C3A5]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#14745F] dark:bg-[#59C3A5]/15 dark:text-[#9DE7D3]">
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
                <span className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white transition group-hover:bg-[#1D4ED8]">
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
      )}
    </div>
  );
}
