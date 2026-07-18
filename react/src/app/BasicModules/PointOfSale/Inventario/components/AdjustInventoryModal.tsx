import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Ban, CheckCircle, Edit, Minus, Plus } from 'lucide-react';
import type { Product } from '../../shared/commercial/products';
import type { InventoryMovement, MovementType } from '../../shared/commercial/inventory';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

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

  if (!isOpen) {
    return null;
  }

  const calculateNewStock = () => {
    if (adjustmentType === 'entrada') {
      return product.currentStock + quantity;
    }
    if (adjustmentType === 'salida') {
      return Math.max(0, product.currentStock - quantity);
    }
    return quantity;
  };

  const newStock = calculateNewStock();

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();

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
      user: 'Usuario Actual',
      date: new Date(),
    };

    onSave(product.id, newStock, movement);
    onClose();
    setAdjustmentType('entrada');
    setQuantity(0);
    setReason('');
    setReference('');
    setError('');
  };

  const getMovementTypeLabel = (type: MovementType) => {
    const labels = {
      entrada: 'Entrada de mercancia',
      salida: 'Salida de mercancia',
      ajuste: 'Ajuste de inventario',
      venta: 'Venta',
      devolucion: 'Devolucion',
    };
    return labels[type];
  };

  const getMovementTypeIcon = (type: MovementType) => {
    const icons = {
      entrada: <Plus className="h-5 w-5" />,
      salida: <Minus className="h-5 w-5" />,
      ajuste: <Edit className="h-5 w-5" />,
      venta: <Minus className="h-5 w-5" />,
      devolucion: <Plus className="h-5 w-5" />,
    };
    return icons[type];
  };

  const getMovementTypeColor = (type: 'entrada' | 'salida' | 'ajuste') => {
    const colors = {
      entrada: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100',
      salida: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-100',
      ajuste: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-100',
    };
    return colors[type];
  };

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar ajuste de inventario"
      eyebrow="Inventario POS"
      icon={<Edit className="h-6 w-6" />}
      onClose={onClose}
      size="md"
      subtitle={product.name}
      title="Ajustar inventario"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`Stock actual ${product.currentStock} · Nuevo stock ${newStock}`}
      footer={(
        <button type="button" onClick={() => handleSubmit()} className={posModalPrimaryActionClassName}>
          <CheckCircle className="h-5 w-5" />
          Guardar ajuste
        </button>
      )}
    >
      <form id="pos-adjust-inventory-form" onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <StockStat label="Stock actual" value={String(product.currentStock)} />
            <StockStat label="Minimo" value={String(product.minStock)} tone="warning" />
            <StockStat label="Maximo" value={String(product.maxStock)} tone="info" />
          </div>
        </section>

        <section>
          <label className="mb-3 block text-sm font-black text-gray-700 dark:text-gray-300">
            Tipo de movimiento
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['entrada', 'salida', 'ajuste'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setAdjustmentType(type);
                  setError('');
                }}
                className={`rounded-lg border-2 p-4 transition-all ${
                  adjustmentType === type
                    ? getMovementTypeColor(type)
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  {getMovementTypeIcon(type)}
                  <span className="text-sm font-black">{getMovementTypeLabel(type)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
            {adjustmentType === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'}
          </label>
          <input
            type="number"
            required
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(parseInt(event.target.value, 10) || 0)}
            className="min-h-14 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg font-black text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            placeholder={adjustmentType === 'ajuste' ? 'Stock total despues del ajuste' : 'Cantidad a agregar/quitar'}
          />
        </section>

        {quantity > 0 ? (
          <section className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Stock despues del ajuste</p>
                <p className="mt-1 text-3xl font-black text-[#C64237] dark:text-[#FFB5AE]">{newStock}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Diferencia</p>
                <p className={`mt-1 text-2xl font-black ${newStock > product.currentStock ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {newStock > product.currentStock ? '+' : ''}{newStock - product.currentStock}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">Motivo</label>
          <textarea
            required
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError('');
            }}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            placeholder="Describe el motivo del ajuste"
          />
        </section>

        <section>
          <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">Referencia</label>
          <input
            type="text"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            placeholder="Ej: OC-2026-001, MERMA-001, INV-2026-05"
          />
        </section>

        {newStock < product.minStock && newStock > 0 ? (
          <WarningNotice
            icon={<AlertTriangle className="h-5 w-5 shrink-0" />}
            tone="warning"
            text={`El stock quedara por debajo del minimo (${product.minStock} unidades).`}
          />
        ) : null}

        {newStock === 0 ? (
          <WarningNotice
            icon={<Ban className="h-5 w-5 shrink-0" />}
            tone="danger"
            text="El producto quedara agotado."
          />
        ) : null}
      </form>
    </PosModalFrame>
  );
}

function StockStat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warning' | 'info' }) {
  const toneClass = {
    default: 'text-gray-950 dark:text-white',
    warning: 'text-yellow-700 dark:text-yellow-300',
    info: 'text-blue-700 dark:text-blue-300',
  }[tone];

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-600 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function WarningNotice({ icon, text, tone }: { icon: ReactNode; text: string; tone: 'warning' | 'danger' }) {
  const toneClass = {
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-100',
    danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
  }[tone];

  return (
    <div className={`rounded-lg border p-4 text-sm font-bold ${toneClass}`}>
      <p className="flex items-center gap-2">
        {icon}
        <span>{text}</span>
      </p>
    </div>
  );
}
