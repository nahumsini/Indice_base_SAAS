import { useState } from 'react';
import { Printer } from 'lucide-react';
import { posTicketStyles, printPosOperationTicket, type PosOperationTicket } from '../../shared/posOperationTickets';

export function OperationTicketPreview({ ticket }: { ticket: PosOperationTicket }) {
  const [blocked, setBlocked] = useState(false);
  return <div className="space-y-3">
    <button type="button" onClick={() => setBlocked(!printPosOperationTicket(ticket))}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
      <Printer className="h-4 w-4" /> Imprimir ticket
    </button>
    {blocked && <p role="alert" className="text-sm text-amber-700">Habilita las ventanas emergentes y vuelve a imprimir. La operación ya está guardada.</p>}
    <iframe title="Vista previa del ticket" className="h-96 w-full rounded-lg border bg-white"
      sandbox="" srcDoc={`<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><style>${posTicketStyles}</style></head><body>${ticket.bodyHtml}</body></html>`} />
  </div>;
}
