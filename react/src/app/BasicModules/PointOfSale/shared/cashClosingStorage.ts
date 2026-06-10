import type { CashClosingRecord } from './cashClosing.types';

const CASH_CLOSINGS_STORAGE_KEY = 'indice.pos.cashClosings';

const reviveClosingRecord = (record: CashClosingRecord): CashClosingRecord => ({
  ...record,
  openedAt: new Date(String(record.openedAt)),
  closedAt: new Date(String(record.closedAt)),
});

export function readStoredCashClosings(): CashClosingRecord[] {
  try {
    const serialized = window.localStorage.getItem(CASH_CLOSINGS_STORAGE_KEY);
    if (!serialized) {
      return [];
    }

    return (JSON.parse(serialized) as CashClosingRecord[]).map(reviveClosingRecord);
  } catch (error) {
    console.warn('Unable to read POS cash closings', error);
    return [];
  }
}

export function saveCashClosing(record: CashClosingRecord) {
  try {
    const nextRecords = [record, ...readStoredCashClosings()]
      .filter((candidate, index, records) => records.findIndex((item) => item.id === candidate.id) === index)
      .slice(0, 30);

    window.localStorage.setItem(CASH_CLOSINGS_STORAGE_KEY, JSON.stringify(nextRecords));
  } catch (error) {
    console.warn('Unable to save POS cash closing', error);
  }
}
