import { useEffect, useState } from 'react';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import type { CashMovement, Shift } from '../types/shift.types';

interface UseSaleShiftOptions {
  pushActivity: (activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => void;
  formatCurrency: (amount: number) => string;
}

export function useSaleShift({ pushActivity, formatCurrency }: UseSaleShiftOptions) {
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

  const handleOpenShift = (cashierId: string, cashierName: string, initialCash: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      cashierId,
      cashierName,
      startTime: new Date(),
      initialCash,
      expectedCash: initialCash,
      status: 'open',
      sales: 0,
      totalSales: 0,
    };

    setCurrentShift(newShift);
    setShowOpenShiftModal(false);
    pushActivity({
      type: 'shift',
      title: 'Shift opened',
      description: `Initial cash ${formatCurrency(initialCash)}`,
      actor: cashierName,
      badge: 'Register open',
      tone: 'info',
    });
  };

  const handleCloseShift = (actualCash: number) => {
    if (!currentShift) {
      return;
    }

    const difference = actualCash - currentShift.expectedCash;

    const closedShift: Shift = {
      ...currentShift,
      endTime: new Date(),
      actualCash,
      difference,
      status: 'closed',
    };

    console.log('Turno cerrado:', closedShift);
    alert(`Turno cerrado.\nVentas: ${closedShift.sales}\nTotal: ${formatCurrency(closedShift.totalSales)}\nDiferencia: ${formatCurrency(difference)}`);

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
    });

    alert(`${type === 'entry' ? 'Entrada' : 'Salida'} registrada: ${formatCurrency(amount)}`);
    pushActivity({
      type: 'cash',
      title: type === 'entry' ? 'Cash entry recorded' : 'Cash withdrawal recorded',
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

