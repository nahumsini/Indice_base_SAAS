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
  canManageCashRegisters: boolean;
  selectedCashRegisterId: string;
  preferredCurrencyCode: string;
  isLoading: boolean;
  isOpeningShift: boolean;
  error: string;
  notice?: string;
  onOpenShiftModal: () => void;
  onCloseOpenShiftModal: () => void;
  onOpenShift: (initialCash: number, openingNote?: string, currencyCode?: string) => void | Promise<void>;
  onSelectCashRegister: (cashRegisterId: string) => void;
  onRetry: () => void | Promise<void>;
  onClearError: () => void;
  onClearNotice?: () => void;
}

export function SaleNoShiftState({
  isOpenShiftModalOpen,
  registerContext,
  warehouses,
  activeCashRegisters,
  canManageCashRegisters,
  selectedCashRegisterId,
  preferredCurrencyCode,
  isLoading,
  isOpeningShift,
  error,
  notice = '',
  onOpenShiftModal,
  onCloseOpenShiftModal,
  onOpenShift,
  onSelectCashRegister,
  onRetry,
  onClearError,
  onClearNotice,
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
    : notice && hasCashRegisters
      ? 'Turno cerrado'
      : hasCashRegisters
        ? 'Abre un turno'
      : 'Configura POS para operar';
  const description = isLoading
    ? 'Estamos leyendo cajas y turnos activos desde POS.'
    : notice && hasCashRegisters
      ? 'El corte quedó guardado. Puedes consultarlo o iniciar el siguiente turno.'
      : hasCashRegisters
        ? 'Selecciona una caja y confirma el fondo inicial para habilitar la terminal.'
      : 'POS necesita un almacén y una caja vinculada antes de abrir turno.';

  const goToWarehouses = () => {
    navigate('/inventory/warehouses');
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

  const handleEnsureWarehouseRegister = async (warehouseId: string) => {
    const createdOrExisting = await posBackendApi.ensureCashRegisterForWarehouse(warehouseId);
    await onRetry();
    onSelectCashRegister(String(createdOrExisting.id));
    return String(createdOrExisting.id);
  };

  return (
    <>
      <div className="flex min-h-[calc(100vh-240px)] items-center justify-center">
        <div className="w-full max-w-4xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:p-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg bg-gray-950 text-white dark:bg-white dark:text-gray-950">
            <LogIn className="h-10 w-10" />
          </div>
          <h2 className="mb-2 text-center text-2xl font-medium text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-center text-sm font-medium text-gray-600 dark:text-gray-400">
            {description}
          </p>

          {!hasCashRegisters && (
            <PosSetupProgress hasWarehouses={hasWarehouses} hasCashRegisters={hasCashRegisters} />
          )}

          {(error || notice || setupError || setupNotice) && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-left text-sm font-medium ${
              setupNotice || notice
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
            }`}>
              <span className="flex gap-2">
                {setupNotice || notice ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{setupNotice || notice || setupError || error}</span>
              </span>
            </div>
          )}

          {!isLoading && !hasCashRegisters && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5 text-left dark:border-gray-700 dark:bg-gray-900/40">
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
                canManageCashRegisters ? (
                  <FirstUseAction
                    icon={Monitor}
                    title="Paso 2: crea una caja vinculada"
                    description="Ya hay almacenes disponibles. Crea una caja POS ligera para seleccionar almacén, código y nombre; después podrás abrir turno."
                    primaryLabel="Crear caja"
                    secondaryLabel="Ir a almacenes"
                    onPrimary={() => setIsCreateRegisterModalOpen(true)}
                    onSecondary={goToWarehouses}
                  />
                ) : (
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <h3 className="font-medium text-gray-950 dark:text-white">Se necesita una caja activa</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Solicita a un administrador que cree una caja vinculada a este almacén. Los cajeros pueden abrir turnos, pero no cambiar la estructura operativa.</p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {notice && hasCashRegisters ? (
              <button
                type="button"
                onClick={() => {
                  onClearNotice?.();
                  navigate('/point-of-sale/cortes');
                }}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              >
                Ver corte
              </button>
            ) : null}
            {error && (
              <button
                type="button"
                onClick={onClearError}
                className="rounded-lg px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Limpiar
              </button>
            )}
            {hasCashRegisters && (
              <button
                onClick={onOpenShiftModal}
                disabled={isLoading || isOpeningShift}
                className="rounded-lg bg-orange-600 px-6 py-3 font-medium text-white shadow-md transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isOpeningShift ? 'Abriendo...' : notice ? 'Abrir otro turno' : 'Abrir turno'}
              </button>
            )}
          </div>
        </div>
      </div>

      {hasCashRegisters && (
        <OpenShiftModal
          isOpen={isOpenShiftModalOpen}
          registerContext={registerContext}
          warehouses={warehouses}
          cashRegisters={activeCashRegisters}
          selectedCashRegisterId={selectedCashRegisterId}
          preferredCurrencyCode={preferredCurrencyCode}
          isSubmitting={isOpeningShift}
          onClose={onCloseOpenShiftModal}
          onConfirm={onOpenShift}
          onSelectCashRegister={onSelectCashRegister}
          onEnsureWarehouseRegister={canManageCashRegisters ? handleEnsureWarehouseRegister : undefined}
        />
      )}

      {canManageCashRegisters ? (
        <CreateCashRegisterModal
          isOpen={isCreateRegisterModalOpen}
          warehouses={warehouses}
          isSubmitting={isCreatingRegister}
          onClose={() => setIsCreateRegisterModalOpen(false)}
          onConfirm={handleCreateCashRegister}
        />
      ) : null}
    </>
  );
}
