import type { ReceivableAccount } from './types';
import { normalizeReceivable } from './utils';

const STORAGE_KEY = 'indice.commerce.receivables';

export function readStoredReceivables() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedReceivables = window.localStorage.getItem(STORAGE_KEY);
    if (!storedReceivables) {
      return [];
    }

    const parsedReceivables = JSON.parse(storedReceivables) as ReceivableAccount[];
    return parsedReceivables.map(normalizeReceivable);
  } catch {
    return [];
  }
}

export function saveStoredReceivables(receivables: ReceivableAccount[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(receivables.map(normalizeReceivable)));
}

export function upsertStoredReceivable(receivable: ReceivableAccount) {
  const currentReceivables = readStoredReceivables();
  const normalizedReceivable = normalizeReceivable(receivable);
  const nextReceivables = currentReceivables.some((item) => item.id === normalizedReceivable.id)
    ? currentReceivables.map((item) => (item.id === normalizedReceivable.id ? normalizedReceivable : item))
    : [normalizedReceivable, ...currentReceivables];

  saveStoredReceivables(nextReceivables);
  return nextReceivables;
}
