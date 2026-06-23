import { FileText, Plus, RefreshCw } from 'lucide-react';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../../shared/components/PointOfSaleTitleBar';

export function PurchaseOrderHeader({
  onCreateInvoice,
  onCreateOrder,
  onRefresh,
  refreshing,
}: {
  onCreateInvoice: () => void;
  onCreateOrder: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <PointOfSaleTitleBar
      eyebrow="Reabastecimiento POS"
      icon="📋"
      title="Ordenes de compra"
      subtitle="Compra a proveedores, recibe producto en almacén y prepara facturas para cuentas por pagar."
      actions={(
        <>
          <button
            type="button"
            className={pointOfSaleTitleBarSecondaryActionClassName}
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            type="button"
            className={pointOfSaleTitleBarSecondaryActionClassName}
            onClick={onCreateInvoice}
          >
            <FileText className="h-4 w-4" />
            Factura proveedor
          </button>
          <button
            type="button"
            className={pointOfSaleTitleBarPrimaryActionClassName}
            onClick={onCreateOrder}
          >
            <Plus className="h-4 w-4" />
            Nueva orden
          </button>
        </>
      )}
    />
  );
}
