import { ClipboardList, KeyRound, Plus } from 'lucide-react';
import { PointOfSaleTitleBar } from '../../shared/components/PointOfSaleTitleBar';

const coralSecondaryActionClassName = 'inline-flex h-11 items-center gap-2 rounded-xl border border-[#FF6B5E]/30 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none transition hover:border-[#FF6B5E]/45 hover:bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/35 dark:bg-slate-900 dark:text-[#FFB4AC] dark:hover:bg-[#FF6B5E]/10';
const coralPrimaryActionClassName = 'inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 transition hover:bg-[#E05247]';

export function PurchaseOrderHeader({
  onCreateOrder,
  onManageSupplierPortal,
}: {
  onCreateOrder: () => void;
  onManageSupplierPortal: () => void;
}) {
  return (
    <PointOfSaleTitleBar
      className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10 [&_p:first-of-type]:text-[#B63B32] dark:[&_p:first-of-type]:text-[#FFB4AC]"
      eyebrow="Reabastecimiento POS"
      icon={<ClipboardList className="h-8 w-8 text-[#B63B32] dark:text-[#FFB4AC]" />}
      title="Compras para punto de venta"
      subtitle="Ordena faltantes a proveedor, recibe mercancia en almacen POS y deja la factura lista para pago."
      actions={(
        <>
          <button
            type="button"
            className={coralSecondaryActionClassName}
            onClick={onManageSupplierPortal}
          >
            <KeyRound className="h-4 w-4" />
            Portal proveedor
          </button>
          <button
            type="button"
            className={coralPrimaryActionClassName}
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
