import { useState } from 'react';
import { CalendarDays, ClipboardList, Download, Edit, RotateCcw, ShoppingCart, TrendingDown, TrendingUp, User } from 'lucide-react';
import type { Product } from '../../shared/commercial/products';
import type { InventoryMovement, MovementType } from '../../shared/commercial/inventory';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface MovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  movements: InventoryMovement[];
}

export function MovementHistoryModal({ isOpen, onClose, product, movements }: MovementHistoryModalProps) {
  const [exportNotice, setExportNotice] = useState('');

  if (!isOpen) {
    return null;
  }

  const formatDate = (date: Date) => new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  const getMovementTypeLabel = (type: MovementType) => {
    const labels = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Ajuste',
      venta: 'Venta',
      devolucion: 'Devolucion',
    };
    return labels[type];
  };

  const getMovementTypeIcon = (type: MovementType) => {
    const icons = {
      entrada: <TrendingUp className="h-4 w-4" />,
      salida: <TrendingDown className="h-4 w-4" />,
      ajuste: <Edit className="h-4 w-4" />,
      venta: <ShoppingCart className="h-4 w-4" />,
      devolucion: <RotateCcw className="h-4 w-4" />,
    };
    return icons[type];
  };

  const getMovementTypeColor = (type: MovementType) => {
    const colors = {
      entrada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      salida: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      ajuste: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      venta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      devolucion: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return colors[type];
  };

  const handleExport = () => {
    setExportNotice('Exportacion preparada. Falta conectar el generador de archivo del historial de inventario.');
  };

  const sortedMovements = [...movements].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <PosModalFrame
      modalType="operational-workspace"
      actions={(
        <button
          type="button"
          onClick={handleExport}
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
          title="Exportar historial"
          aria-label="Exportar historial"
        >
          <Download className="h-5 w-5" />
        </button>
      )}
      closeLabel="Cerrar historial"
      eyebrow="Inventario POS"
      icon={<ClipboardList className="h-6 w-6" />}
      onClose={onClose}
      size="lg"
      subtitle={`${product.name} - ${product.barcode}`}
      title="Historial de movimientos"
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cerrar
          </button>
        </div>
      )}
    >
      <div className="space-y-5">
        {exportNotice ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {exportNotice}
          </div>
        ) : null}

        <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="grid grid-cols-4 gap-4 text-center">
            <SummaryStat label="Stock actual" value={String(product.currentStock)} />
            <SummaryStat label="Minimo" value={String(product.minStock)} tone="warning" />
            <SummaryStat label="Maximo" value={String(product.maxStock)} tone="info" />
            <SummaryStat label="Movimientos" value={String(movements.length)} tone="purple" />
          </div>
        </section>

        {sortedMovements.length === 0 ? (
          <section className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
            <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="font-bold text-gray-500 dark:text-gray-400">No hay movimientos registrados para este producto.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {sortedMovements.map((movement) => (
              <article
                key={movement.id}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black ${getMovementTypeColor(movement.type)}`}>
                      {getMovementTypeIcon(movement.type)}
                      {getMovementTypeLabel(movement.type)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-black text-gray-900 dark:text-white">{movement.reason}</p>
                      {movement.reference ? (
                        <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-400">Ref: {movement.reference}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{movement.user}</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(movement.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-6">
                    <StockChange label="Anterior" value={String(movement.previousStock)} />
                    <div className={`rounded px-3 py-1 text-sm font-black ${
                      movement.newStock > movement.previousStock
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : movement.newStock < movement.previousStock
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {movement.newStock > movement.previousStock ? '+' : ''}
                      {movement.newStock - movement.previousStock}
                    </div>
                    <StockChange label="Nuevo" value={String(movement.newStock)} strong />
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </PosModalFrame>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'info' | 'purple';
}) {
  const toneClass = {
    default: 'text-gray-950 dark:text-white',
    warning: 'text-yellow-700 dark:text-yellow-300',
    info: 'text-blue-700 dark:text-blue-300',
    purple: 'text-purple-700 dark:text-purple-300',
  }[tone];

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function StockChange({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`${strong ? 'font-black text-gray-950 dark:text-white' : 'font-bold text-gray-600 dark:text-gray-400'} text-lg`}>
        {value}
      </p>
    </div>
  );
}
