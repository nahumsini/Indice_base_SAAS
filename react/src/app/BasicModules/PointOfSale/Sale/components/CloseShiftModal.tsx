import { useState, useEffect } from 'react';
import { X, LogOut, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { Shift } from '../types/shift.types';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  onConfirm: (actualCash: number) => void;
}

export function CloseShiftModal({ isOpen, onClose, shift, onConfirm }: CloseShiftModalProps) {
  const [actualCash, setActualCash] = useState('');
  const [difference, setDifference] = useState(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  useEffect(() => {
    if (isOpen && shift) {
      setActualCash('');
      setDifference(0);
    }
  }, [isOpen, shift]);

  useEffect(() => {
    if (shift) {
      const actual = parseFloat(actualCash) || 0;
      const diff = actual - shift.expectedCash;
      setDifference(diff);
    }
  }, [actualCash, shift]);

  const handleConfirm = () => {
    const actual = parseFloat(actualCash);

    if (!actual || actual < 0) {
      alert('Ingresa el efectivo real en caja');
      return;
    }

    if (Math.abs(difference) > 100) {
      if (!confirm(`Hay una diferencia de ${formatCurrency(Math.abs(difference))}. ¿Continuar?`)) {
        return;
      }
    }

    onConfirm(actual);
  };

  if (!isOpen || !shift) return null;

  const hours = Math.floor((new Date().getTime() - shift.startTime.getTime()) / (1000 * 60 * 60));
  const minutes = Math.floor((new Date().getTime() - shift.startTime.getTime()) / (1000 * 60)) % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <LogOut className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Cerrar Turno</h2>
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
          {/* Shift Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Cajero:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{shift.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Inicio:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {shift.startTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Duración:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {hours}h {minutes}m
              </span>
            </div>
          </div>

          {/* Sales Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-3">Resumen de Ventas</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-blue-600 dark:text-blue-400">Total de ventas:</span>
                <span className="font-bold text-blue-900 dark:text-blue-300">{shift.sales}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-600 dark:text-blue-400">Monto vendido:</span>
                <span className="font-bold text-blue-900 dark:text-blue-300">{formatCurrency(shift.totalSales)}</span>
              </div>
            </div>
          </div>

          {/* Cash Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Efectivo inicial:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(shift.initialCash)}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Efectivo esperado:</span>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-300">{formatCurrency(shift.expectedCash)}</span>
            </div>
          </div>

          {/* Actual Cash Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Efectivo real en caja
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                step="0.01"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Difference Display */}
          {actualCash && parseFloat(actualCash) > 0 && (
            <div className={`rounded-xl p-4 border-2 ${
              Math.abs(difference) < 1
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                : difference > 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                : 'bg-red-50 dark:bg-red-900/20 border-red-500'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {Math.abs(difference) < 1 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className={`w-5 h-5 ${
                    difference > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                  }`} />
                )}
                <p className={`text-sm font-medium ${
                  Math.abs(difference) < 1
                    ? 'text-green-700 dark:text-green-400'
                    : difference > 0
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  {Math.abs(difference) < 1
                    ? 'Cuadre perfecto'
                    : difference > 0
                    ? 'Sobrante en caja'
                    : 'Faltante en caja'}
                </p>
              </div>
              {Math.abs(difference) >= 1 && (
                <p className={`text-3xl font-bold ${
                  difference > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </p>
              )}
            </div>
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
            disabled={!actualCash || parseFloat(actualCash) < 0}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cerrar Turno
          </button>
        </div>
      </div>
    </div>
  );
}
