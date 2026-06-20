import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleDollarSign, X } from 'lucide-react';
import type {
  ReceivableAccount,
  ReceivablePaymentMethod,
} from '../../../CommerceCore/receivables';

interface ReceivablePaymentModalProps {
  receivable: ReceivableAccount | null;
  onClose: () => void;
  onSave: (payment: {
    amount: number;
    paidAt: string;
    method: ReceivablePaymentMethod;
    reference?: string;
    notes?: string;
  }) => void;
}

const paymentMethodLabels: Record<ReceivablePaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit_note: 'Nota de credito',
  other: 'Otro',
};

const inputClassName = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white';

export function ReceivablePaymentModal({ receivable, onClose, onSave }: ReceivablePaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<ReceivablePaymentMethod>('transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!receivable) {
      return;
    }

    setAmount(receivable.balance.toFixed(2));
    setPaidAt(new Date().toISOString().slice(0, 10));
    setMethod('transfer');
    setReference('');
    setNotes('');
    setError('');
  }, [receivable]);

  if (!receivable) {
    return null;
  }

  const handleSave = () => {
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Captura un abono mayor a cero.');
      return;
    }

    if (paymentAmount > receivable.balance) {
      setError('El abono no puede superar el saldo pendiente.');
      return;
    }

    onSave({
      amount: paymentAmount,
      paidAt,
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3 bg-emerald-600 px-5 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black">Registrar abono</h3>
              <p className="text-sm text-white/80">{receivable.customerName} · {receivable.saleNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 sm:grid-cols-3">
            <Summary label="Original" value={formatCurrency(receivable.originalAmount, receivable.currency)} />
            <Summary label="Pagado" value={formatCurrency(receivable.paidAmount, receivable.currency)} />
            <Summary label="Saldo" value={formatCurrency(receivable.balance, receivable.currency)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Monto">
              <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClassName} />
            </Field>
            <Field label="Fecha">
              <input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className={inputClassName} />
            </Field>
            <Field label="Metodo">
              <select value={method} onChange={(event) => setMethod(event.target.value as ReceivablePaymentMethod)} className={inputClassName}>
                {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Referencia">
            <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Transferencia, voucher o folio interno" className={inputClassName} />
          </Field>

          <Field label="Notas">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={`${inputClassName} min-h-[92px]`} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 bg-emerald-600 px-5 py-4 dark:border-gray-700">
          <button onClick={onClose} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Cancelar</button>
          <button onClick={handleSave} className="rounded-lg bg-white px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-50">Guardar abono</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-base font-black text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);
