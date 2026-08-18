import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../../../../api/auth';
import type { CashRegisterContext } from '../../shared/cashClosing.types';
import {
  posBackendApi,
  type PosCashRegisterResponse,
  type PosContextResponse,
  type PosShiftResponse,
  type PosWarehouseSummary,
} from '../services/posBackendApi';

type ResponsibleUser = {
  id: string;
  name: string;
  companyId: string;
};

export type SaleRegisterContextState = {
  registerContext: CashRegisterContext | null;
  warehouses: PosWarehouseSummary[];
  activeCashRegisters: PosCashRegisterResponse[];
  currentOpenShift: PosShiftResponse | null;
  selectedCashRegisterId: string;
  isLoading: boolean;
  error: string;
  setSelectedCashRegisterId: (cashRegisterId: string) => void;
  refreshContext: () => Promise<void>;
  clearError: () => void;
};

const emptyResponsibleUser: ResponsibleUser = {
  id: '',
  name: 'Usuario actual',
  companyId: '',
};

const toId = (value: number | string | null | undefined) => (
  value === null || value === undefined ? '' : String(value)
);

const getErrorMessage = (error: unknown) => (
  error instanceof Error && error.message
    ? error.message
    : 'No se pudo cargar el contexto de punto de venta.'
);

export function useSaleRegisterContext(): SaleRegisterContextState {
  const [responsibleUser, setResponsibleUser] = useState<ResponsibleUser>({
    ...emptyResponsibleUser,
  });
  const [posContext, setPosContext] = useState<PosContextResponse | null>(null);
  const [selectedCashRegisterId, setSelectedCashRegisterId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshContext = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [session, context] = await Promise.all([
        authApi.getSessionOrNull(),
        posBackendApi.context(),
      ]);

      if (session) {
        setResponsibleUser({
          id: String(session.user.id),
          name: session.user.name || emptyResponsibleUser.name,
          companyId: String(session.company.id),
        });
      }

      setPosContext(context);
    } catch (requestError) {
      setPosContext(null);
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  const warehouses = useMemo(
    () => (posContext?.warehouses ?? []).filter((warehouse) => (
      warehouse.status?.toLocaleLowerCase() === 'active'
      && Number.isFinite(Number(warehouse.id))
      && Number.isFinite(Number(warehouse.unitId))
      && Number.isFinite(Number(warehouse.businessId))
    )),
    [posContext?.warehouses],
  );
  const activeCashRegisters = useMemo(
    () => (posContext?.cashRegisters ?? []).filter((register) => {
      if (!register.active || register.status !== 'ACTIVE') return false;
      const warehouse = warehouses.find((candidate) => candidate.id === register.warehouseId);
      return Boolean(
        warehouse
        && warehouse.unitId === register.unitId
        && warehouse.businessId === register.businessId,
      );
    }),
    [posContext?.cashRegisters, warehouses],
  );

  useEffect(() => {
    const currentShiftRegisterId = toId(posContext?.currentOpenShift?.cashRegisterId);

    if (currentShiftRegisterId) {
      setSelectedCashRegisterId(currentShiftRegisterId);
      return;
    }

    const selectedExists = activeCashRegisters.some((register) => toId(register.id) === selectedCashRegisterId);
    if (!selectedExists) {
      setSelectedCashRegisterId(toId(activeCashRegisters[0]?.id));
    }
  }, [activeCashRegisters, posContext?.currentOpenShift?.cashRegisterId, selectedCashRegisterId]);

  const registerContext = useMemo<CashRegisterContext | null>(() => {
    const selectedRegister = activeCashRegisters.find((register) => toId(register.id) === selectedCashRegisterId)
      ?? activeCashRegisters[0]
      ?? null;

    if (!selectedRegister) {
      return null;
    }

    const warehouse = warehouses.find((candidate) => candidate.id === selectedRegister.warehouseId);

    return {
      companyId: toId(selectedRegister.companyId || responsibleUser.companyId),
      companyName: 'Empresa actual',
      businessUnitId: toId(selectedRegister.unitId ?? warehouse?.unitId),
      businessUnitName: warehouse?.unitName || 'Unidad no asignada',
      businessId: toId(selectedRegister.businessId ?? warehouse?.businessId),
      businessName: warehouse?.businessName || warehouse?.name || 'Negocio no asignado',
      warehouseId: toId(selectedRegister.warehouseId),
      warehouseName: selectedRegister.warehouseName || warehouse?.name || '',
      cashRegisterId: toId(selectedRegister.id),
      cashRegisterCode: selectedRegister.code,
      cashRegisterName: selectedRegister.name,
      responsibleUserId: responsibleUser.id,
      responsibleUserName: responsibleUser.name,
    };
  }, [
    activeCashRegisters,
    responsibleUser.companyId,
    responsibleUser.id,
    responsibleUser.name,
    selectedCashRegisterId,
    warehouses,
  ]);

  return useMemo(
    () => ({
      registerContext,
      warehouses,
      activeCashRegisters,
      currentOpenShift: posContext?.currentOpenShift ?? null,
      selectedCashRegisterId,
      isLoading,
      error,
      setSelectedCashRegisterId,
      refreshContext,
      clearError: () => setError(''),
    }),
    [
      activeCashRegisters,
      error,
      isLoading,
      posContext?.currentOpenShift,
      refreshContext,
      registerContext,
      selectedCashRegisterId,
      warehouses,
    ],
  );
}
