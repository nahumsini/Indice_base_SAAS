import { CheckCircle, Copy, Landmark } from 'lucide-react';
import { useState } from 'react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface TransferPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: () => void;
}

export function TransferPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: TransferPaymentModalProps) {
  const [copiedField, setCopiedField] = useState('');

  const accountInfo = {
    bank: 'BBVA',
    accountNumber: '0123456789',
    clabe: '012180001234567890',
    beneficiary: 'Mi Negocio SA de CV',
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);

  const handleCopy = async (field: string, text: string) => {
    await navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      closeLabel="Cerrar pago por transferencia"
      eyebrow="Cobro POS"
      icon={<Landmark className="h-6 w-6" />}
      onClose={onClose}
      size="sm"
      subtitle="Confirma el reflejo bancario antes de cerrar el ticket."
      title="Pago por transferencia"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirmPayment} className={posModalPrimaryActionClassName}>
            <CheckCircle className="h-5 w-5" />
            Confirmar transferencia
          </button>
        </div>
      )}
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-center dark:border-blue-500/30 dark:bg-blue-500/10">
          <p className="text-sm font-black text-blue-700 dark:text-blue-200">Total a transferir</p>
          <p className="mt-2 text-4xl font-black text-blue-800 dark:text-blue-100">
            {formatCurrency(totalAmount)}
          </p>
        </section>

        <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-sm font-black text-gray-700 dark:text-gray-300">Datos para transferencia</h3>
          <TransferInfo label="Banco" value={accountInfo.bank} />
          <TransferInfo label="Beneficiario" value={accountInfo.beneficiary} />
          <CopyableTransferInfo
            label="Numero de cuenta"
            value={accountInfo.accountNumber}
            copied={copiedField === 'account'}
            onCopy={() => handleCopy('account', accountInfo.accountNumber)}
          />
          <CopyableTransferInfo
            label="CLABE"
            value={accountInfo.clabe}
            copied={copiedField === 'clabe'}
            onCopy={() => handleCopy('clabe', accountInfo.clabe)}
          />
        </section>

        <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/30 dark:bg-yellow-500/10">
          <p className="text-sm font-bold text-yellow-800 dark:text-yellow-100">
            Confirma el pago solo cuando veas reflejada la transferencia en tu cuenta.
          </p>
        </section>
      </div>
    </PosModalFrame>
  );
}

function TransferInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/50">
      <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function CopyableTransferInfo({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 break-all font-mono font-black text-gray-900 dark:text-white">{value}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#FF6B5E] transition hover:bg-[#FF6B5E]/10"
          title="Copiar"
          aria-label={`Copiar ${label}`}
        >
          {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
