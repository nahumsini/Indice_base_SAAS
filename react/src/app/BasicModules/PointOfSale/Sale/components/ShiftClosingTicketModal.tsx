import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { cashClosingsApi } from '../../shared/cashClosingsApi';
import { closingTicket, printPosOperationTicket, type PosOperationTicket } from '../../shared/posOperationTickets';
import { PosModalFrame } from './PosModalFrame';
import { OperationTicketPreview } from './OperationTicketPreview';

export type ClosedShiftTicketRequest = { shiftId: number; printWindow: Window | null };
export function ShiftClosingTicketModal({ request, onClose }: { request: ClosedShiftTicketRequest; onClose: () => void }) {
  const [ticket, setTicket] = useState<PosOperationTicket | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const printed = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setError('');
    void (async () => {
      const result = await cashClosingsApi.list({ shiftId: request.shiftId });
      const row = result.items.find(item => item.shiftId === request.shiftId);
      if (!row) throw new Error('El corte guardado todavía no está disponible. Reintenta consultar el ticket.');
      const detail = await cashClosingsApi.detail(row.id);
      if (cancelled) return;
      const next = closingTicket({ ...row, ...detail });
      setTicket(next);
      if (!printed.current) {
        printed.current = true;
        if (request.printWindow && !request.printWindow.closed) printPosOperationTicket(next, request.printWindow);
      }
    })().catch(reason => {
      if (cancelled) return;
      request.printWindow?.close();
      setError(reason instanceof Error ? reason.message : 'No se pudo consultar el ticket.');
    });
    return () => { cancelled = true; };
  }, [request, attempt]);
  return <PosModalFrame title="Ticket de cierre de turno" eyebrow="Corte guardado" subtitle={`Turno ${request.shiftId}`}
    modalType="standard-form" size="sm" icon={<Printer className="h-6 w-6" />} closeLabel="Cerrar ticket" onClose={() => {
      if (request.printWindow && !request.printWindow.closed && request.printWindow.location.href === 'about:blank') request.printWindow.close();
      onClose();
    }}>
    <p className="mb-3 text-sm">El turno quedó cerrado. Puedes imprimir o guardar el ticket como PDF desde la ventana de impresión.</p>
    {error ? <div role="alert" className="space-y-3"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Reintentar consulta</button></div>
      : ticket ? <OperationTicketPreview ticket={ticket} /> : <p>Cargando corte guardado…</p>}
  </PosModalFrame>;
}
