import { useEffect, useState } from 'react';
import { saveCashClosing } from '../../shared/cashClosingStorage';
import type { CashClosingInput, CashClosingRecord, CashClosingStatus, CashRegisterContext } from '../../shared/cashClosing.types';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import type { CashMovement, Shift } from '../types/shift.types';

interface UseSaleShiftOptions {
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
  formatCurrency: (amount: number) => string;
  registerContext: CashRegisterContext;
}

export function useSaleShift({ pushActivity, formatCurrency, registerContext }: UseSaleShiftOptions) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  useEffect(() => {
    if (!currentShift) {
      setShowOpenShiftModal(true);
    }
  }, []);

  const handleOpenShift = (initialCash: number, openingNote?: string) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      cashierId: registerContext.responsibleUserId,
      cashierName: registerContext.responsibleUserName,
      companyId: registerContext.companyId,
      companyName: registerContext.companyName,
      businessUnitId: registerContext.businessUnitId,
      businessUnitName: registerContext.businessUnitName,
      businessId: registerContext.businessId,
      businessName: registerContext.businessName,
      cashRegisterId: registerContext.cashRegisterId,
      cashRegisterCode: registerContext.cashRegisterCode,
      cashRegisterName: registerContext.cashRegisterName,
      startTime: new Date(),
      initialCash,
      expectedCash: initialCash,
      status: 'open',
      sales: 0,
      totalSales: 0,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      refundsTotal: 0,
      cashMovementsTotal: 0,
      openingNote,
    };

    setCurrentShift(newShift);
    setShowOpenShiftModal(false);
    pushActivity({
      type: 'shift',
      title: 'Caja abierta',
      description: `${newShift.cashRegisterCode} · Fondo inicial ${formatCurrency(initialCash)}`,
      actor: newShift.cashierName,
      badge: 'Caja abierta',
      tone: 'info',
    });
  };

  const handleCloseShift = (closing: CashClosingInput) => {
    if (!currentShift) {
      return;
    }

    const cashExpected = currentShift.expectedCash;
    const cardExpected = currentShift.cardSales;
    const transferExpected = currentShift.transferSales;
    const expectedTotal = cashExpected + cardExpected + transferExpected;
    const countedTotal = closing.countedCash + closing.countedCard + closing.countedTransfer;
    const difference = countedTotal - expectedTotal;
    const closingStatus: CashClosingStatus = Math.abs(difference) < 1
      ? 'balanced'
      : difference > 0
      ? 'over'
      : 'short';

    const closedShift: Shift = {
      ...currentShift,
      endTime: new Date(),
      actualCash: closing.countedCash,
      difference,
      status: 'closed',
    };

    const closingRecord: CashClosingRecord = {
      id: `closing-${Date.now()}`,
      shiftId: currentShift.id,
      companyId: currentShift.companyId,
      companyName: currentShift.companyName,
      businessUnitId: currentShift.businessUnitId,
      businessUnitName: currentShift.businessUnitName,
      businessId: currentShift.businessId,
      businessName: currentShift.businessName,
      cashRegisterId: currentShift.cashRegisterId,
      cashRegisterCode: currentShift.cashRegisterCode,
      cashRegisterName: currentShift.cashRegisterName,
      responsibleUserId: currentShift.cashierId,
      responsibleUserName: currentShift.cashierName,
      openedAt: currentShift.startTime,
      closedAt: closedShift.endTime ?? new Date(),
      openingFund: currentShift.initialCash,
      cashExpected,
      cashCounted: closing.countedCash,
      cardExpected,
      cardCounted: closing.countedCard,
      transferExpected,
      transferCounted: closing.countedTransfer,
      totalSales: currentShift.totalSales,
      totalRefunds: currentShift.refundsTotal,
      totalMovements: currentShift.cashMovementsTotal,
      expectedTotal,
      countedTotal,
      difference,
      status: closingStatus,
      notes: closing.notes,
    };

    saveCashClosing(closingRecord);
    console.log('Turno cerrado:', closedShift);
    alert(`Caja cerrada.\nVentas: ${closedShift.sales}\nTotal: ${formatCurrency(closedShift.totalSales)}\nDiferencia: ${formatCurrency(difference)}`);

    setCurrentShift(null);
    setShowCloseShiftModal(false);
    setCashMovements([]);
    setTimeout(() => setShowOpenShiftModal(true), 500);
  };

  const handleCashMovement = (type: CashMovement['type'], amount: number, reason: string) => {
    if (!currentShift) {
      return;
    }

    const movement: CashMovement = {
      id: `movement-${Date.now()}`,
      shiftId: currentShift.id,
      type,
      amount,
      reason,
      timestamp: new Date(),
      cashierName: currentShift.cashierName,
    };

    setCashMovements((currentMovements) => [...currentMovements, movement]);

    const expectedCash = type === 'entry'
      ? currentShift.expectedCash + amount
      : currentShift.expectedCash - amount;

    setCurrentShift({
      ...currentShift,
      expectedCash,
      cashMovementsTotal: type === 'entry'
        ? currentShift.cashMovementsTotal + amount
        : currentShift.cashMovementsTotal - amount,
    });

    alert(`${type === 'entry' ? 'Entrada' : 'Salida'} registrada: ${formatCurrency(amount)}`);
    pushActivity({
      type: 'cash',
      title: type === 'entry' ? 'Entrada de efectivo registrada' : 'Salida de efectivo registrada',
      description: reason,
      actor: currentShift.cashierName,
      badge: formatCurrency(amount),
      tone: type === 'entry' ? 'success' : 'warning',
    });
  };

  return {
    currentShift,
    setCurrentShift,
    showOpenShiftModal,
    setShowOpenShiftModal,
    showCloseShiftModal,
    setShowCloseShiftModal,
    showCashMovementModal,
    setShowCashMovementModal,
    cashMovements,
    handleOpenShift,
    handleCloseShift,
    handleCashMovement,
  };
}
