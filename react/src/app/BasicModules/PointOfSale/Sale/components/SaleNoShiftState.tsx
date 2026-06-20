import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  LogIn,
  Monitor,
  Warehouse,
} from 'lucide-react';
import type { CashRegisterContext } from '../../shared/cashClosing.types';
import {
  posBackendApi,
  type PosCashRegisterCreatePayload,
  type PosCashRegisterResponse,
  type PosWarehouseSummary,
} from '../services/posBackendApi';
import { CreateCashRegisterModal } from './CreateCashRegisterModal';
import { OpenShiftModal } from './OpenShiftModal';
import { FirstUseAction, PosSetupProgress } from './PosSetupGuide';

interface SaleNoShiftStateProps {
  isOpenShiftModalOpen: boolean;
  registerContext: CashRegisterContext | null;
  warehouses: PosWarehouseSummary[];
  activeCashRegisters: PosCashRegisterResponse[];
  selectedCashRegisterId: string;
  isLoading: boolean;
  isOpeningShift: boolean;
  error: string;
  onOpenShiftModal: () => void;
  onOpenShift: (initialCash: number, openingNote?: string) => void | Promise<void>;
  onSelectCashRegister: (cashRegisterId: string) => void;
  onRetry: () => void | Promise<void>;
  onClearError: () => void;
}

export function SaleNoShiftState({
  isOpenShiftModalOpen,
  registerContext,
  warehouses,
  activeCashRegisters,
  selectedCashRegisterId,
  isLoading,
  isOpeningShift,
  error,
  onOpenShiftModal,
  onOpenShift,
  onSelectCashRegister,
  onRetry,
  onClearError,
}: SaleNoShiftStateProps) {
  const navigate = useNavigate();
  const [isCreateRegisterModalOpen, setIsCreateRegisterModalOpen] = useState(false);
  const [isCreatingRegister, setIsCreatingRegister] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupNotice, setSetupNotice] = useState('');
  const hasWarehouses = warehouses.length > 0;
  const hasCashRegisters = activeCashRegisters.length > 0;
  const title = isLoading
    ? 'Cargando punto de venta'
    : hasCashRegisters
      ? 'Abre la caja'
      : 'Configura POS para operar';
  const description = isLoading
    ? 'Estamos leyendo cajas y turnos activos desde POS.'
    : hasCashRegisters
      ? 'Confirma el fondo inicial para habilitar la terminal de venta.'
      : 'POS necesita un almacén y una caja vinculada antes de abrir turno.';

  const goToWarehouses = () => {
    navigate('/sales/inventory');
  };

  const handleCreateCashRegister = async (payload: PosCashRegisterCreatePayload) => {
    setIsCreatingRegister(true);
    setSetupError('');
    setSetupNotice('');

    try {
      const createdRegister = await posBackendApi.createCashRegister(payload);
      setIsCreateRegisterModalOpen(false);
      await onRetry();
      onSelectCashRegister(String(createdRegister.id));
      setSetupNotice(`${createdRegister.code} · ${createdRegister.name} quedó lista para abrir turno.`);
    } catch (requestError) {
      setSetupError(requestError instanceof Error ? requestError.message : 'No fue posible crear la caja POS.');
    } finally {
      setIsCreatingRegister(false);
    }
  };

  return (
    <>
      <div className="flex min-h-[calc(100vh-240px)] items-center justify-center">
        <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:p-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-950 text-white dark:bg-white dark:text-gray-950">
            <LogIn className="h-10 w-10" />
          </div>
          <h2 className="mb-2 text-center text-2xl font-black text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
            {description}
          </p>

          {!hasCashRegisters && (
            <PosSetupProgress hasWarehouses={hasWarehouses} hasCashRegisters={hasCashRegisters} />
          )}

          {(error || setupError || setupNotice) && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-left text-sm font-semibold ${
              setupNotice
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
            }`}>
              <span className="flex gap-2">
                {setupNotice ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{setupNotice || setupError || error}</span>
              </span>
            </div>
          )}

          {!isLoading && !hasCashRegisters && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left dark:border-gray-700 dark:bg-gray-900/40">
              {!hasWarehouses ? (
                <FirstUseAction
                  icon={Warehouse}
                  title="Paso 1: crea un almacén"
                  description="POS requiere un almacén antes de crear una caja. Las cajas operan desde almacenes y esa relación alimenta inventario, cortes y reportes."
                  primaryLabel="Ir a almacenes"
                  secondaryLabel="Reintentar"
                  onPrimary={goToWarehouses}
                  onSecondary={onRetry}
                />
              ) : (
                <FirstUseAction
                  icon={Monitor}
                  title="Paso 2: crea una caja vinculada"
                  description="Ya hay almacenes disponibles. Crea una caja POS ligera para seleccionar almacén, código y nombre; después podrás abrir turno."
                  primaryLabel="Crear caja"
                  secondaryLabel="Ir a almacenes"
                  onPrimary={() => setIsCreateRegisterModalOpen(true)}
                  onSecondary={goToWarehouses}
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {error && (
              <button
                type="button"
                onClick={onClearError}
                className="rounded-lg px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Limpiar
              </button>
            )}
            {hasCashRegisters && (
              <button
                onClick={onOpenShiftModal}
                disabled={isLoading || isOpeningShift}
                className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isOpeningShift ? 'Abriendo...' : 'Abrir caja'}
              </button>
            )}
          </div>
        </div>
      </div>

      {hasCashRegisters && (
        <OpenShiftModal
          isOpen={isOpenShiftModalOpen}
          registerContext={registerContext}
          cashRegisters={activeCashRegisters}
          selectedCashRegisterId={selectedCashRegisterId}
          isSubmitting={isOpeningShift}
          onClose={() => {}}
          onConfirm={onOpenShift}
          onSelectCashRegister={onSelectCashRegister}
        />
      )}

      <CreateCashRegisterModal
        isOpen={isCreateRegisterModalOpen}
        warehouses={warehouses}
        isSubmitting={isCreatingRegister}
        onClose={() => setIsCreateRegisterModalOpen(false)}
        onConfirm={handleCreateCashRegister}
      />
    </>
  );
}
