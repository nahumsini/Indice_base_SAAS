import { useState } from 'react';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: () => void;
}

export function CardPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: CardPaymentModalProps) {
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);

  const handleConfirm = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onConfirmPayment();
    }, 1500);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      closeLabel="Cerrar pago con tarjeta"
      eyebrow="Cobro POS"
      icon={<CreditCard className="h-6 w-6" />}
      isCloseDisabled={processing}
      onClose={onClose}
      size="sm"
      subtitle="Confirma la autorizacion de la terminal antes de cerrar la venta."
      title="Pago con tarjeta"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className={posModalSecondaryActionClassName}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing}
            className={posModalPrimaryActionClassName}
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Procesando
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Confirmar pago
              </>
            )}
          </button>
        </div>
      )}
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-center dark:border-blue-500/30 dark:bg-blue-500/10">
          <p className="text-sm font-black text-blue-700 dark:text-blue-200">Total a cobrar</p>
          <p className="mt-2 text-4xl font-black text-blue-800 dark:text-blue-100">
            {formatCurrency(totalAmount)}
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {processing ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#FF6B5E]" />
                Procesando pago...
              </span>
            ) : (
              'Solicita al cliente pasar su tarjeta por la terminal.'
            )}
          </p>
        </section>

        <section className="rounded-lg bg-gray-950 p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-800">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-400">Terminal de pago</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
            {processing ? <div className="h-full animate-pulse bg-[#FF6B5E]" /> : null}
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-500">
            {processing ? 'Esperando confirmacion...' : 'Lista para recibir pago'}
          </p>
        </section>
      </div>
    </PosModalFrame>
  );
}
