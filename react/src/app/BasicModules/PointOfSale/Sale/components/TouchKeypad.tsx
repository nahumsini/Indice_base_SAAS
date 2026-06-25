import { Archive, Eye, Maximize2, RotateCcw } from 'lucide-react';

const quantityOptions = [1, 2, 3, 5, 10];

export function TouchKeypad({
  selectedQuantity,
  suspendedCount,
  canSuspendSale,
  onQuantityChange,
  onOpenSalePanel,
  onOpenReturn,
  onSuspendSale,
  onFullscreen,
}: {
  selectedQuantity: number;
  suspendedCount: number;
  canSuspendSale: boolean;
  onQuantityChange: (quantity: number) => void;
  onOpenSalePanel: () => void;
  onOpenReturn: () => void;
  onSuspendSale: () => void;
  onFullscreen: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#222831]/10 bg-[#F7F8FA] p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Controles tactiles</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Acciones rapidas de caja</p>
        </div>
        {suspendedCount > 0 && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            {suspendedCount} en espera
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {quantityOptions.map((quantity) => (
          <button
            key={quantity}
            type="button"
            onClick={() => onQuantityChange(quantity)}
            className={`min-h-12 rounded-xl text-sm font-black transition active:scale-95 ${
            selectedQuantity === quantity
                ? 'bg-[#FF6B5E] text-white shadow-md'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-[#FF6B5E]/10 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700'
            }`}
          >
            x{quantity}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSuspendSale}
          disabled={!canSuspendSale}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-[#F4C84A]/15 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
        >
          <Archive className="h-4 w-4" />
          Pausar
        </button>
        <button
          type="button"
          onClick={onOpenSalePanel}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
        >
          <Eye className="h-4 w-4" />
          Ticket
        </button>
        <button
          type="button"
          onClick={onOpenReturn}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-[#FF6B5E]/10 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
        >
          <RotateCcw className="h-4 w-4" />
          Devolucion
        </button>
        <button
          type="button"
          onClick={onFullscreen}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-[#222831]/5 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
        >
          <Maximize2 className="h-4 w-4" />
          Pantalla
        </button>
      </div>
    </section>
  );
}
