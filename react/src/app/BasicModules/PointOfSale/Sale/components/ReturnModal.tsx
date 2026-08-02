import { useState } from 'react';
import { AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saleId: string, type: 'full' | 'partial') => void;
}

export function ReturnModal({ isOpen, onClose, onConfirm }: ReturnModalProps) {
  const [saleId, setSaleId] = useState('');
  const [returnType, setReturnType] = useState<'full' | 'partial'>('full');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const nextSaleId = saleId.trim();

    if (!nextSaleId) {
      setError('Ingresa el numero de venta.');
      return;
    }

    onConfirm(nextSaleId, returnType);
    setSaleId('');
    setReturnType('full');
    setError('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar devolución"
      eyebrow="Operación sensible"
      icon={<RotateCcw className="h-6 w-6" />}
      onClose={onClose}
      size="sm"
      subtitle="Verifica el ticket original antes de restaurar el inventario o generar una nota."
      title="Procesar devolución"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={saleId.trim() ? `Venta ${saleId.trim()} · ${returnType === 'full' ? 'Devolución total' : 'Devolución parcial'}` : 'Selecciona la venta que deseas devolver'}
      footer={(
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!saleId.trim()}
          className={posModalPrimaryActionClassName}
        >
          <CheckCircle className="h-5 w-5" />
          Procesar
        </button>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/30 dark:bg-yellow-500/10">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700 dark:text-yellow-200" />
          <div className="text-sm text-yellow-800 dark:text-yellow-100">
            <p className="font-medium">Importante</p>
            <p className="mt-1 font-medium">
              La devolucion puede restaurar inventario y generar una nota de credito segun la configuracion del flujo.
            </p>
          </div>
        </section>

        <section>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Numero de venta
          </label>
          <input
            type="text"
            value={saleId}
            onChange={(event) => {
              setSaleId(event.target.value);
              setError('');
            }}
            placeholder="V123456-0001"
            className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            autoFocus
          />
        </section>

        <section>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de devolucion</p>
          <div className="grid grid-cols-2 gap-2">
            <ReturnTypeButton
              active={returnType === 'full'}
              title="Total"
              description="Todos los productos"
              onClick={() => setReturnType('full')}
            />
            <ReturnTypeButton
              active={returnType === 'partial'}
              title="Parcial"
              description="Algunos productos"
              onClick={() => setReturnType('partial')}
            />
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
          <InfoRow label="Reembolso" value="Nota de credito" />
          <InfoRow label="Inventario" value="Se restaurara" />
        </section>
      </div>
    </PosModalFrame>
  );
}

function ReturnTypeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 p-4 text-left transition-all ${
        active
          ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#A7352C] dark:text-[#FFB5AE]'
          : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'
      }`}
    >
      <p className="text-sm font-medium">Devolucion {title}</p>
      <p className="mt-1 text-xs font-medium">{description}</p>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-medium text-gray-600 dark:text-gray-400">{label}:</span>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
