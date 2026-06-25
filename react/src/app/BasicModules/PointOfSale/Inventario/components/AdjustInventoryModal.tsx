import { useState } from 'react';
import { X, Plus, Minus, Edit } from 'lucide-react';
import type { Product } from '../../shared/commercial/products';
import type { InventoryMovement, MovementType } from '../../shared/commercial/inventory';

interface AdjustInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSave: (productId: string, newStock: number, movement: Omit<InventoryMovement, 'id'>) => void;
}

export function AdjustInventoryModal({ isOpen, onClose, product, onSave }: AdjustInventoryModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'entrada' | 'salida' | 'ajuste'>('entrada');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const calculateNewStock = () => {
    if (adjustmentType === 'entrada') {
      return product.currentStock + quantity;
    } else if (adjustmentType === 'salida') {
      return Math.max(0, product.currentStock - quantity);
    } else {
      return quantity;
    }
  };

  const newStock = calculateNewStock();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0 && adjustmentType !== 'ajuste') {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }

    if (adjustmentType === 'ajuste' && quantity < 0) {
      setError('El stock no puede ser negativo.');
      return;
    }

    if (!reason.trim()) {
      setError('Debes especificar un motivo.');
      return;
    }

    const movement: Omit<InventoryMovement, 'id'> = {
      productId: product.id,
      type: adjustmentType,
      quantity: adjustmentType === 'ajuste' ? Math.abs(newStock - product.currentStock) : quantity,
      previousStock: product.currentStock,
      newStock,
      reason: reason.trim(),
      reference: reference.trim() || undefined,
      user: 'Usuario Actual', // En producción, obtener del contexto de autenticación
      date: new Date(),
    };

    onSave(product.id, newStock, movement);
    onClose();

    // Reset form
    setAdjustmentType('entrada');
    setQuantity(0);
    setReason('');
    setReference('');
    setError('');
  };

  const getMovementTypeLabel = (type: MovementType) => {
    const labels = {
      entrada: 'Entrada de Mercancía',
      salida: 'Salida de Mercancía',
      ajuste: 'Ajuste de Inventario',
      venta: 'Venta',
      devolucion: 'Devolución',
    };
    return labels[type];
  };

  const getMovementTypeIcon = (type: MovementType) => {
    const icons = {
      entrada: <Plus className="w-5 h-5" />,
      salida: <Minus className="w-5 h-5" />,
      ajuste: <Edit className="w-5 h-5" />,
      venta: <Minus className="w-5 h-5" />,
      devolucion: <Plus className="w-5 h-5" />,
    };
    return icons[type];
  };

  const getMovementTypeColor = (type: 'entrada' | 'salida' | 'ajuste') => {
    const colors = {
      entrada: 'bg-green-600',
      salida: 'bg-red-600',
      ajuste: 'bg-blue-600',
    };
    return colors[type];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ajustar Inventario
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Current Stock Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Stock Actual</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{product.currentStock}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mínimo</p>
                  <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{product.minStock}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Máximo</p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{product.maxStock}</p>
                </div>
              </div>
            </div>

            {/* Movement Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tipo de Movimiento *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['entrada', 'salida', 'ajuste'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdjustmentType(type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      adjustmentType === type
                        ? `${getMovementTypeColor(type)} text-white border-transparent`
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {getMovementTypeIcon(type)}
                      <span className="text-sm font-medium">{getMovementTypeLabel(type)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {adjustmentType === 'ajuste' ? 'Nuevo Stock Total *' : 'Cantidad *'}
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={adjustmentType === 'ajuste' ? 'Stock total después del ajuste' : 'Cantidad a agregar/quitar'}
              />
            </div>

            {/* Preview New Stock */}
            {quantity > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Stock después del ajuste:</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                      {newStock}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Diferencia:</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      newStock > product.currentStock
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {newStock > product.currentStock ? '+' : ''}{newStock - product.currentStock}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Motivo *
              </label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Describe el motivo del ajuste (ej: Compra a proveedor, Merma, Inventario físico, etc.)"
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Referencia (Opcional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Ej: OC-2026-001, MERMA-001, INV-2026-05"
              />
            </div>

            {/* Warning if stock will be low */}
            {newStock < product.minStock && newStock > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>Advertencia: El stock quedará por debajo del mínimo ({product.minStock} unidades)</span>
                </p>
              </div>
            )}

            {/* Warning if out of stock */}
            {newStock === 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
                  <span className="text-lg">🚫</span>
                  <span>Advertencia: El producto quedará AGOTADO</span>
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            Guardar ajuste
          </button>
        </div>
      </div>
    </div>
  );
}
