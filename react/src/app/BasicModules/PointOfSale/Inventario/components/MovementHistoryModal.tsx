import { X, TrendingUp, TrendingDown, Edit, ShoppingCart, RotateCcw, Download } from 'lucide-react';
import { Product } from '../../Productos/types/product.types';
import { InventoryMovement, MovementType } from '../types/inventory.types';

interface MovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  movements: InventoryMovement[];
}

export function MovementHistoryModal({ isOpen, onClose, product, movements }: MovementHistoryModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getMovementTypeLabel = (type: MovementType) => {
    const labels = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Ajuste',
      venta: 'Venta',
      devolucion: 'Devolución',
    };
    return labels[type];
  };

  const getMovementTypeIcon = (type: MovementType) => {
    const icons = {
      entrada: <TrendingUp className="w-4 h-4" />,
      salida: <TrendingDown className="w-4 h-4" />,
      ajuste: <Edit className="w-4 h-4" />,
      venta: <ShoppingCart className="w-4 h-4" />,
      devolucion: <RotateCcw className="w-4 h-4" />,
    };
    return icons[type];
  };

  const getMovementTypeColor = (type: MovementType) => {
    const colors = {
      entrada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      salida: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      ajuste: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      venta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      devolucion: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[type];
  };

  const handleExport = () => {
    console.log('Exportar historial:', product.id);
    // TODO: Implement export functionality
  };

  const sortedMovements = [...movements].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Historial de Movimientos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {product.name} - {product.barcode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Exportar historial"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stock Summary */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stock Actual</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{product.currentStock}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mínimo</p>
              <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">{product.minStock}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Máximo</p>
              <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">{product.maxStock}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Movimientos</p>
              <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">{movements.length}</p>
            </div>
          </div>
        </div>

        {/* Movements List */}
        <div className="flex-1 overflow-auto p-6">
          {sortedMovements.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500 dark:text-gray-400">
                No hay movimientos registrados para este producto
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Section - Type and Details */}
                    <div className="flex items-start gap-3 flex-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${getMovementTypeColor(movement.type)}`}>
                        {getMovementTypeIcon(movement.type)}
                        {getMovementTypeLabel(movement.type)}
                      </span>

                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{movement.reason}</p>
                        {movement.reference && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                            Ref: {movement.reference}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>👤 {movement.user}</span>
                          <span>📅 {formatDate(movement.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Stock Changes */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Stock Anterior</p>
                        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                          {movement.previousStock}
                        </p>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className={`px-3 py-1 rounded text-sm font-bold ${
                          movement.newStock > movement.previousStock
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : movement.newStock < movement.previousStock
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {movement.newStock > movement.previousStock ? '+' : ''}
                          {movement.newStock - movement.previousStock}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Nuevo Stock</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {movement.newStock}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
