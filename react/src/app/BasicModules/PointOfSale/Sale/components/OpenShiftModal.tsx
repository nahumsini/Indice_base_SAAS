import { useState, useRef, useEffect } from 'react';
import { X, User, DollarSign, LogIn } from 'lucide-react';
import { Cashier } from '../types/shift.types';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cashierId: string, cashierName: string, initialCash: number) => void;
}

// Mock cashiers
const mockCashiers: Cashier[] = [
  { id: '1', name: 'Juan Pérez', code: '1001' },
  { id: '2', name: 'María García', code: '1002' },
  { id: '3', name: 'Carlos López', code: '1003' },
  { id: '4', name: 'Ana Martínez', code: '1004' },
];

export function OpenShiftModal({ isOpen, onClose, onConfirm }: OpenShiftModalProps) {
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [initialCash, setInitialCash] = useState('0.00');
  const [cashierCode, setCashierCode] = useState('');

  const codeInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  useEffect(() => {
    if (isOpen) {
      setCashierCode('');
      setSelectedCashier(null);
      setInitialCash('0.00');
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-select cashier by code
  useEffect(() => {
    if (cashierCode.length >= 4) {
      const cashier = mockCashiers.find(c => c.code === cashierCode);
      if (cashier) {
        setSelectedCashier(cashier);
      } else {
        alert('Código de cajero no válido');
        setCashierCode('');
      }
    }
  }, [cashierCode]);

  const handleQuickAmount = (amount: number) => {
    setInitialCash(amount.toFixed(2));
  };

  const handleConfirm = () => {
    if (!selectedCashier) {
      alert('Selecciona un cajero');
      return;
    }

    const amount = parseFloat(initialCash);
    if (amount < 0) {
      alert('El monto inicial no puede ser negativo');
      return;
    }

    onConfirm(selectedCashier.id, selectedCashier.name, amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Abrir Turno</h2>
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
          {/* Cashier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Identificación de Cajero
            </label>

            {!selectedCashier ? (
              <>
                <div className="relative mb-3">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    ref={codeInputRef}
                    type="text"
                    value={cashierCode}
                    onChange={(e) => setCashierCode(e.target.value)}
                    placeholder="Ingresa código de cajero"
                    className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    maxLength={4}
                  />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">O selecciona de la lista:</p>
                <div className="grid grid-cols-2 gap-2">
                  {mockCashiers.map((cashier) => (
                    <button
                      key={cashier.id}
                      onClick={() => setSelectedCashier(cashier)}
                      className="p-3 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-2 border-transparent hover:border-indigo-500 rounded-lg transition-all text-left"
                    >
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{cashier.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Código: {cashier.code}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-500 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{selectedCashier.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Código: {selectedCashier.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCashier(null);
                    setCashierCode('');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Initial Cash */}
          {selectedCashier && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto inicial en caja
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    value={initialCash}
                    onChange={(e) => setInitialCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Montos rápidos</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickAmount(0)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $0
                  </button>
                  <button
                    onClick={() => handleQuickAmount(500)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $500
                  </button>
                  <button
                    onClick={() => handleQuickAmount(1000)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $1,000
                  </button>
                  <button
                    onClick={() => handleQuickAmount(2000)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $2,000
                  </button>
                  <button
                    onClick={() => handleQuickAmount(5000)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $5,000
                  </button>
                </div>
              </div>
            </>
          )}
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
            disabled={!selectedCashier}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Abrir Turno
          </button>
        </div>
      </div>
    </div>
  );
}
