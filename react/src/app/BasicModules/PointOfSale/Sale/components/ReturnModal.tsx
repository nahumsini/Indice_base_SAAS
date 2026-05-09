import { useState } from 'react';
import { X, RotateCcw, AlertCircle } from 'lucide-react';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saleId: string, type: 'full' | 'partial') => void;
}

export function ReturnModal({ isOpen, onClose, onConfirm }: ReturnModalProps) {
  const [saleId, setSaleId] = useState('');
  const [returnType, setReturnType] = useState<'full' | 'partial'>('full');

  const handleConfirm = () => {
    if (!saleId.trim()) {
      alert('Ingresa el número de venta');
      return;
    }

    onConfirm(saleId, returnType);
    setSaleId('');
    setReturnType('full');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Procesar Devolución</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Alert */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              <p className="font-semibold mb-1">Importante</p>
              <p>Verifica el ticket original antes de procesar la devolución. Se generará una nota de crédito automáticamente.</p>
            </div>
          </div>

          {/* Sale ID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de venta
            </label>
            <input
              type="text"
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
              placeholder="V123456-0001"
              className="w-full px-4 py-3 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent uppercase"
              autoFocus
            />
          </div>

          {/* Return Type */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de devolución</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setReturnType('full')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  returnType === 'full'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                <p className="font-semibold text-sm">Devolución Total</p>
                <p className="text-xs mt-1">Todos los productos</p>
              </button>
              <button
                onClick={() => setReturnType('partial')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  returnType === 'partial'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                <p className="font-semibold text-sm">Devolución Parcial</p>
                <p className="text-xs mt-1">Algunos productos</p>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Reembolso:</span>
              <span className="font-semibold text-gray-900 dark:text-white">Nota de crédito</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Inventario:</span>
              <span className="font-semibold text-gray-900 dark:text-white">Se restaurará</span>
            </div>
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
            onClick={handleConfirm}
            disabled={!saleId.trim()}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Procesar
          </button>
        </div>
      </div>
    </div>
  );
}
