import type { CashRegisterContext } from '../../shared/cashClosing.types';
import type { PosShiftResponse } from '../services/posBackendApi';
import type { Shift } from '../types/shift.types';

const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toOptionalNumber = (value: number | string | null | undefined): number | undefined => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

export const toShiftId = (value: number | string | null | undefined) => (
  value === null || value === undefined ? '' : String(value)
);

export const toBackendId = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export const getPosRequestErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

export function buildShiftFromBackend(backendShift: PosShiftResponse, registerContext: CashRegisterContext): Shift {
  const openingAmount = toNumber(backendShift.openingAmount);
  const expectedCashAmount = toNumber(backendShift.expectedCashAmount, openingAmount);
  const endTime = backendShift.closedAt ? new Date(backendShift.closedAt) : undefined;
  const actualCash = toOptionalNumber(backendShift.countedCashAmount);
  const difference = toOptionalNumber(backendShift.overShortAmount);
  const openingNote = backendShift.openingNote?.trim() || undefined;

  return {
    id: toShiftId(backendShift.id),
    cashierId: toShiftId(backendShift.openedByUserId || registerContext.responsibleUserId),
    cashierName: registerContext.responsibleUserName,
    companyId: toShiftId(backendShift.companyId || registerContext.companyId),
    companyName: registerContext.companyName,
    businessUnitId: toShiftId(backendShift.unitId ?? registerContext.businessUnitId),
    businessUnitName: registerContext.businessUnitName,
    businessId: toShiftId(backendShift.businessId ?? registerContext.businessId),
    businessName: registerContext.businessName,
    cashRegisterId: toShiftId(backendShift.cashRegisterId || registerContext.cashRegisterId),
    cashRegisterCode: registerContext.cashRegisterCode,
    cashRegisterName: backendShift.cashRegisterName || registerContext.cashRegisterName,
    currencyCode: backendShift.currencyCode?.trim().toUpperCase() || 'MXN',
    startTime: backendShift.openedAt ? new Date(backendShift.openedAt) : new Date(),
    initialCash: openingAmount,
    expectedCash: expectedCashAmount,
    status: backendShift.status === 'CLOSED' || backendShift.status === 'CANCELLED' ? 'closed' : 'open',
    sales: 0,
    subtotalSales: 0,
    taxSales: 0,
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    transferSales: 0,
    refundsTotal: 0,
    cashMovementsTotal: 0,
    ...(endTime ? { endTime } : {}),
    ...(actualCash !== undefined ? { actualCash } : {}),
    ...(difference !== undefined ? { difference } : {}),
    ...(openingNote ? { openingNote } : {}),
  };
}
