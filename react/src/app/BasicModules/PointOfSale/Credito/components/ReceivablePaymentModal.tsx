import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, CircleDollarSign } from 'lucide-react';
import type {
  ReceivableAccount,
  ReceivablePaymentMethod,
} from '../../../CommerceCore/receivables';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

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

const inputClassName = 'min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white';

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
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar abono"
      eyebrow="Crédito POS"
      icon={<CircleDollarSign className="h-6 w-6" />}
      onClose={onClose}
      size="md"
      subtitle={`${receivable.customerName} - ${receivable.saleNumber}`}
      title="Registrar abono"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`Abono ${formatCurrency(Number(amount) || 0, receivable.currency)} · Saldo ${formatCurrency(receivable.balance, receivable.currency)}`}
      footer={(
        <button type="button" onClick={handleSave} className={posModalPrimaryActionClassName}>
          <CheckCircle className="h-5 w-5" />
          Guardar abono
        </button>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-3">
          <Summary label="Original" value={formatCurrency(receivable.originalAmount, receivable.currency)} />
          <Summary label="Pagado" value={formatCurrency(receivable.paidAmount, receivable.currency)} />
          <Summary label="Saldo" value={formatCurrency(receivable.balance, receivable.currency)} />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
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
        </section>

        <Field label="Referencia">
          <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Transferencia, voucher o folio interno" className={inputClassName} />
        </Field>

        <Field label="Notas">
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={`${inputClassName} min-h-[92px]`} />
        </Field>
      </div>
    </PosModalFrame>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-normal text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-base font-medium text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);
