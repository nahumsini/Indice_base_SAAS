import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CashClosingInput, CashRegisterContext } from '../../shared/cashClosing.types';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import {
  posBackendApi,
  type PosCashMovementResponse,
  type PosCashMovementType,
  type PosShiftClosingSummaryResponse,
  type PosShiftResponse,
} from '../services/posBackendApi';
import type { CashMovement, Shift } from '../types/shift.types';
import { buildShiftFromBackend, getPosRequestErrorMessage, toBackendId, toShiftId } from '../utils/posShiftMappers';

interface UseSaleShiftOptions {
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
  formatCurrency: (amount: number) => string;
  registerContext: CashRegisterContext | null;
  backendCurrentShift: PosShiftResponse | null;
  isRegisterContextLoading: boolean;
  canOpenShift: boolean;
  currency: string;
  refreshRegisterContext: () => Promise<void>;
}

const toNumber = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const movementLabels: Record<PosCashMovementType, string> = {
  CASH_IN: 'Entrada de efectivo',
  CASH_OUT: 'Salida de efectivo',
  SAFE_DROP: 'Retiro a caja fuerte',
  CORRECTION: 'Correccion de efectivo',
};

const movementTone: Record<PosCashMovementType, OperationalActivity['tone']> = {
  CASH_IN: 'success',
  CASH_OUT: 'warning',
  SAFE_DROP: 'warning',
  CORRECTION: 'info',
};

const mapCashMovement = (movement: PosCashMovementResponse, cashierName: string): CashMovement => ({
  id: String(movement.id),
  shiftId: String(movement.shiftId),
  type: movement.movementType,
  amount: toNumber(movement.amount),
  currencyCode: movement.currencyCode,
  reason: movement.reason,
  reference: movement.reference?.trim() || undefined,
  timestamp: movement.createdAt ? new Date(movement.createdAt) : new Date(),
  cashierName,
});

export function useSaleShift({
  pushActivity,
  formatCurrency,
  registerContext,
  backendCurrentShift,
  isRegisterContextLoading,
  canOpenShift,
  currency,
  refreshRegisterContext,
}: UseSaleShiftOptions) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [closingSummary, setClosingSummary] = useState<PosShiftClosingSummaryResponse | null>(null);
  const [closingSummaryError, setClosingSummaryError] = useState('');
  const [shiftNotice, setShiftNotice] = useState('');
  const [shiftError, setShiftError] = useState('');
  const [isOpeningShift, setIsOpeningShift] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [isLoadingClosingSummary, setIsLoadingClosingSummary] = useState(false);
  const [isCreatingCashMovement, setIsCreatingCashMovement] = useState(false);

  const backendShiftId = useMemo(() => toShiftId(backendCurrentShift?.id), [backendCurrentShift?.id]);

  useEffect(() => {
    if (!backendCurrentShift || !registerContext) {
      return;
    }

    setCurrentShift((existingShift) => {
      const backendShift = buildShiftFromBackend(backendCurrentShift, registerContext);

      if (existingShift?.id !== backendShiftId) {
        return backendShift;
      }

      return {
        ...existingShift,
        expectedCash: backendShift.expectedCash,
        status: backendShift.status,
        ...(backendShift.endTime ? { endTime: backendShift.endTime } : {}),
        ...(backendShift.actualCash !== undefined ? { actualCash: backendShift.actualCash } : {}),
        ...(backendShift.difference !== undefined ? { difference: backendShift.difference } : {}),
      };
    });
    setShowOpenShiftModal(false);
  }, [backendCurrentShift, backendShiftId, registerContext]);

  const loadCashMovements = useCallback(async (shiftId: number, cashierName: string) => {
    const response = await posBackendApi.listCashMovements(shiftId);
    const mappedMovements = response.items.map((movement) => mapCashMovement(movement, cashierName));
    setCashMovements(mappedMovements);
    return mappedMovements;
  }, []);

  useEffect(() => {
    const shiftId = toBackendId(currentShift?.id);
    if (!shiftId || !currentShift) {
      setCashMovements([]);
      return;
    }

    void loadCashMovements(shiftId, currentShift.cashierName).catch((error) => {
      setShiftError(getPosRequestErrorMessage(error, 'No se pudieron cargar los movimientos de efectivo.'));
    });
  }, [currentShift?.cashierName, currentShift?.id, loadCashMovements]);

  useEffect(() => {
    if (!isRegisterContextLoading && !backendShiftId && !currentShift && canOpenShift) {
      setShowOpenShiftModal(true);
    }
  }, [backendShiftId, canOpenShift, currentShift, isRegisterContextLoading]);

  const handleOpenShift = async (initialCash: number, openingNote?: string, selectedCurrencyCode?: string) => {
    if (!registerContext) {
      setShiftError('No hay una caja configurada. Crea una caja desde la configuración POS antes de abrir turno.');
      return;
    }

    const cashRegisterId = toBackendId(registerContext.cashRegisterId);
    if (!cashRegisterId) {
      setShiftError('La caja seleccionada no tiene un identificador valido.');
      return;
    }

    const openingCurrency = String(selectedCurrencyCode || currency)
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{3}$/.test(openingCurrency)) {
      setShiftError('Selecciona una divisa valida para abrir caja.');
      return;
    }

    setIsOpeningShift(true);
    setShiftError('');

    try {
      const openedShift = await posBackendApi.openShift({
        cashRegisterId,
        openingAmount: initialCash,
        currencyCode: openingCurrency,
        openingNote,
      });
      const newShift = buildShiftFromBackend(openedShift, registerContext);

      setCurrentShift(newShift);
      setShowOpenShiftModal(false);
      setShiftNotice(`Caja abierta. Fondo inicial: ${formatCurrency(initialCash)}.`);
      pushActivity({
        type: 'shift',
        title: 'Caja abierta',
        description: `${newShift.cashRegisterCode} · Fondo inicial ${formatCurrency(initialCash)}`,
        actor: newShift.cashierName,
        badge: 'Caja abierta',
        tone: 'info',
      });
      void refreshRegisterContext();
    } catch (error) {
      setShiftError(getPosRequestErrorMessage(error, 'No se pudo abrir la caja.'));
    } finally {
      setIsOpeningShift(false);
    }
  };

  const loadClosingSummary = useCallback(async () => {
    if (!currentShift) {
      return;
    }

    const shiftId = toBackendId(currentShift.id);
    if (!shiftId) {
      setShiftError('El turno actual no tiene un identificador valido para cierre.');
      return;
    }

    setClosingSummary(null);
    setClosingSummaryError('');
    setIsLoadingClosingSummary(true);

    try {
      const summary = await posBackendApi.getShiftClosingSummary(shiftId);
      setClosingSummary(summary);
    } catch (error) {
      setClosingSummaryError(getPosRequestErrorMessage(error, 'No se pudo cargar el resumen real de cierre.'));
    } finally {
      setIsLoadingClosingSummary(false);
    }
  }, [currentShift]);

  const openCloseShiftModal = async () => {
    if (!currentShift) {
      return;
    }

    setShowCloseShiftModal(true);
    await loadClosingSummary();
  };

  const closeCloseShiftModal = () => {
    if (isClosingShift) {
      return;
    }

    setShowCloseShiftModal(false);
    setClosingSummary(null);
    setClosingSummaryError('');
  };

  const handleCloseShift = async (closing: CashClosingInput) => {
    if (!currentShift) {
      return;
    }

    const shiftId = toBackendId(currentShift.id);
    if (!shiftId) {
      setShiftError('El turno actual no tiene un identificador valido para cierre.');
      return;
    }

    if (!closingSummary) {
      setClosingSummaryError('Carga el resumen real de cierre antes de cerrar el turno.');
      return;
    }

    if (closing.countedCash < 0) {
      setClosingSummaryError('El efectivo contado no puede ser negativo.');
      return;
    }

    setIsClosingShift(true);
    setShiftError('');
    setClosingSummaryError('');

    try {
      const closedBackendShift = await posBackendApi.closeShift(shiftId, {
        countedCashAmount: closing.countedCash,
        closingNote: closing.notes,
      });
      const difference = toNumber(closedBackendShift.overShortAmount) || closing.countedCash - toNumber(closingSummary.expectedCashAmount);
      setShiftNotice(
        `Caja cerrada. Tickets: ${closingSummary.ticketsCount} · Total: ${formatCurrency(toNumber(closingSummary.totalSalesAmount))} · Diferencia: ${formatCurrency(difference)}.`,
      );

      setCurrentShift(null);
      setShowCloseShiftModal(false);
      setClosingSummary(null);
      setCashMovements([]);
      await refreshRegisterContext();
      if (canOpenShift) {
        setTimeout(() => setShowOpenShiftModal(true), 500);
      }
    } catch (error) {
      const message = getPosRequestErrorMessage(error, 'No se pudo cerrar el turno.');
      setClosingSummaryError(message);
      setShiftError(message);
    } finally {
      setIsClosingShift(false);
    }
  };

  const handleCashMovement = async (type: PosCashMovementType, amount: number, reason: string, reference?: string) => {
    if (!currentShift) {
      return;
    }

    const shiftId = toBackendId(currentShift.id);
    const cashRegisterId = toBackendId(currentShift.cashRegisterId);
    const currencyCode = currentShift.currencyCode || currency;

    if (!shiftId || !cashRegisterId) {
      setShiftError('El turno actual no tiene caja valida para registrar movimientos.');
      return;
    }

    if (!amount || amount <= 0) {
      setShiftError('El movimiento requiere un monto mayor a cero.');
      return;
    }

    if (!reason.trim()) {
      setShiftError('El movimiento requiere un motivo.');
      return;
    }

    if (currencyCode !== currentShift.currencyCode) {
      setShiftError('La moneda del movimiento debe coincidir con la moneda del turno.');
      return;
    }

    setIsCreatingCashMovement(true);
    setShiftError('');

    try {
      await posBackendApi.createCashMovement({
        shiftId,
        cashRegisterId,
        movementType: type,
        amount,
        currencyCode,
        reason: reason.trim(),
        reference: reference?.trim() || null,
      });
      const nextMovements = await loadCashMovements(shiftId, currentShift.cashierName);

      const backendShift = await posBackendApi.getShift(shiftId);
      if (registerContext) {
        setCurrentShift((existingShift) => {
          if (!existingShift || existingShift.id !== currentShift.id) {
            return existingShift;
          }

          const refreshedShift = buildShiftFromBackend(backendShift, registerContext);
          return {
            ...existingShift,
            expectedCash: refreshedShift.expectedCash,
            status: refreshedShift.status,
            cashMovementsTotal: cashMovementsTotalFromMovements(nextMovements),
          };
        });
      }

      setShowCashMovementModal(false);
      setShiftNotice(`${movementLabels[type]} registrada: ${formatCurrency(amount)}.`);
      pushActivity({
        type: 'cash',
        title: `${movementLabels[type]} registrada`,
        description: reason,
        actor: currentShift.cashierName,
        badge: formatCurrency(amount),
        tone: movementTone[type],
      });
      await refreshRegisterContext();
    } catch (error) {
      const message = getPosRequestErrorMessage(error, 'No se pudo registrar el movimiento de efectivo.');
      setShiftError(message);
      throw new Error(message);
    } finally {
      setIsCreatingCashMovement(false);
    }
  };

  return {
    currentShift,
    setCurrentShift,
    showOpenShiftModal,
    setShowOpenShiftModal,
    showCloseShiftModal,
    setShowCloseShiftModal,
    openCloseShiftModal,
    closeCloseShiftModal,
    showCashMovementModal,
    setShowCashMovementModal,
    cashMovements,
    closingSummary,
    closingSummaryError,
    shiftNotice,
    clearShiftNotice: () => setShiftNotice(''),
    shiftError,
    clearShiftError: () => setShiftError(''),
    isOpeningShift,
    isClosingShift,
    isLoadingClosingSummary,
    loadClosingSummary,
    isCreatingCashMovement,
    handleOpenShift,
    handleCloseShift,
    handleCashMovement,
  };
}

function cashMovementsTotalFromMovements(movements: CashMovement[]) {
  return movements.reduce((total, movement) => {
    if (movement.type === 'CASH_IN' || movement.type === 'CORRECTION') {
      return total + movement.amount;
    }

    return total - movement.amount;
  }, 0);
}
