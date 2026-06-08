import { LogIn } from 'lucide-react';
import { OpenShiftModal } from './OpenShiftModal';

interface SaleNoShiftStateProps {
  isOpenShiftModalOpen: boolean;
  onOpenShiftModal: () => void;
  onOpenShift: (cashierId: string, cashierName: string, initialCash: number) => void;
}

export function SaleNoShiftState({
  isOpenShiftModalOpen,
  onOpenShiftModal,
  onOpenShift,
}: SaleNoShiftStateProps) {
  return (
    <>
      <div className="h-[calc(100vh-240px)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Inicia tu turno
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Identifícate e ingresa el monto inicial de caja para comenzar a vender
          </p>
          <button
            onClick={onOpenShiftModal}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            Abrir Turno
          </button>
        </div>
      </div>

      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => {}}
        onConfirm={onOpenShift}
      />
    </>
  );
}

