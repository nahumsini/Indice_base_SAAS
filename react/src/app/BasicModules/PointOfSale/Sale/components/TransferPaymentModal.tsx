import { Smartphone, X, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface TransferPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: () => void;
}

export function TransferPaymentModal({ isOpen, onClose, totalAmount, onConfirmPayment }: TransferPaymentModalProps) {
  const [copied, setCopied] = useState(false);

  // Mock bank account info
  const accountInfo = {
    bank: 'BBVA',
    accountNumber: '0123456789',
    clabe: '012180001234567890',
    beneficiary: 'Mi Negocio SA de CV',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-purple-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Pago por Transferencia</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Total Display */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total a transferir</p>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Account Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Datos para transferencia
            </h3>

            {/* Bank */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Banco</p>
              <p className="font-semibold text-gray-900 dark:text-white">{accountInfo.bank}</p>
            </div>

            {/* Beneficiary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Beneficiario</p>
              <p className="font-semibold text-gray-900 dark:text-white">{accountInfo.beneficiary}</p>
            </div>

            {/* Account Number */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de cuenta</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">{accountInfo.accountNumber}</p>
                </div>
                <button
                  onClick={() => handleCopy(accountInfo.accountNumber)}
                  className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                  title="Copiar"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* CLABE */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CLABE</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white text-sm">{accountInfo.clabe}</p>
                </div>
                <button
                  onClick={() => handleCopy(accountInfo.clabe)}
                  className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                  title="Copiar"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <span className="font-semibold">Importante:</span> Confirma el pago solo cuando veas reflejada la transferencia en tu cuenta.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmPayment}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Confirmar Transferencia
          </button>
        </div>
      </div>
    </div>
  );
}
