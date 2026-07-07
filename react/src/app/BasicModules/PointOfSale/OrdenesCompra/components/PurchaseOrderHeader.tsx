import { KeyRound, Plus } from 'lucide-react';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../../shared/components/PointOfSaleTitleBar';

export function PurchaseOrderHeader({
  onCreateOrder,
  onManageSupplierPortal,
}: {
  onCreateOrder: () => void;
  onManageSupplierPortal: () => void;
}) {
  return (
    <PointOfSaleTitleBar
      eyebrow={null}
      icon="📋"
      rhIndent
      title="Compras para punto de venta"
      subtitle="Ordena faltantes a proveedor, recibe mercancia en almacen POS y deja la factura lista para pago."
      actions={(
        <>
          <button
            type="button"
            className={pointOfSaleTitleBarSecondaryActionClassName}
            onClick={onManageSupplierPortal}
          >
            <KeyRound className="h-4 w-4" />
            Portal proveedor
          </button>
          <button
            type="button"
            className={pointOfSaleTitleBarPrimaryActionClassName}
            onClick={onCreateOrder}
          >
            <Plus className="h-4 w-4" />
            Nueva orden de compra
          </button>
        </>
      )}
    />
  );
}
