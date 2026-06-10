import { LogIn } from 'lucide-react';
import type { CashRegisterContext } from '../../shared/cashClosing.types';
import { OpenShiftModal } from './OpenShiftModal';

interface SaleNoShiftStateProps {
  isOpenShiftModalOpen: boolean;
  registerContext: CashRegisterContext;
  onOpenShiftModal: () => void;
  onOpenShift: (initialCash: number, openingNote?: string) => void;
}

export function SaleNoShiftState({
  isOpenShiftModalOpen,
  registerContext,
  onOpenShiftModal,
  onOpenShift,
}: SaleNoShiftStateProps) {
  return (
    <>
      <div className="flex min-h-[calc(100vh-240px)] items-center justify-center">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg bg-gray-950 text-white dark:bg-white dark:text-gray-950">
            <LogIn className="h-10 w-10" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Abre la caja
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Confirma el fondo inicial para habilitar la terminal de venta
          </p>
          <button
            onClick={onOpenShiftModal}
            className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-orange-700"
          >
            Abrir caja
          </button>
        </div>
      </div>

      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        registerContext={registerContext}
        onClose={() => {}}
        onConfirm={onOpenShift}
      />
    </>
  );
}
