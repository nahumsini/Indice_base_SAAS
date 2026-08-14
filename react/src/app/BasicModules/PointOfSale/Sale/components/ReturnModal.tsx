import { useState } from 'react';
import { AlertCircle, CheckCircle, RotateCcw, X } from 'lucide-react';
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
  workspaceMode?: boolean;
}

export function ReturnModal({ isOpen, onClose, onConfirm, workspaceMode = false }: ReturnModalProps) {
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

  if (workspaceMode) {
    const summary = saleId.trim()
      ? `Venta ${saleId.trim()} · ${returnType === 'full' ? 'Devolución total' : 'Devolución parcial'}`
      : 'Selecciona la venta que deseas devolver';

    return (
      <section data-pos-left-workspace="return" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-gray-700 dark:bg-gray-800">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-[#222831] px-5 py-3 text-white dark:border-gray-700">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/20 text-[#FFAAA2]" aria-hidden="true">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-medium">Procesar devolución</h2>
              <p className="truncate text-sm text-gray-300">Verifica el ticket antes de restaurar inventario.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20" aria-label="Cerrar devolución">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-gray-950/30">
          <div className="mx-auto max-w-2xl space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <section className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/30 dark:bg-yellow-500/10">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700 dark:text-yellow-200" />
              <div className="text-sm text-yellow-800 dark:text-yellow-100">
                <p className="font-medium">Operación sensible</p>
                <p className="mt-1 font-medium">Puede restaurar inventario y generar una nota de crédito.</p>
              </div>
            </section>

            <section>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Número de venta</label>
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
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de devolución</p>
              <div className="grid grid-cols-2 gap-2">
                <ReturnTypeButton active={returnType === 'full'} title="Total" description="Todos los productos" onClick={() => setReturnType('full')} />
                <ReturnTypeButton active={returnType === 'partial'} title="Parcial" description="Algunos productos" onClick={() => setReturnType('partial')} />
              </div>
            </section>

            <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
              <InfoRow label="Reembolso" value="Nota de crédito" />
              <InfoRow label="Inventario" value="Se restaurará" />
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <button type="button" onClick={onClose} className="min-h-12 rounded-lg border border-gray-300 px-5 font-medium text-[#222831] dark:border-gray-600 dark:text-white">Cancelar</button>
          <p className="min-w-0 flex-1 truncate text-sm text-gray-500">{summary}</p>
          <button type="button" onClick={handleConfirm} disabled={!saleId.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#FF6B5E] px-5 font-medium text-[#222831] disabled:opacity-40">
            <CheckCircle className="h-5 w-5" />
            Procesar
          </button>
        </footer>
      </section>
    );
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
