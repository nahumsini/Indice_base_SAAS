import type { FinanceJson, FinanceJsonObject } from '../types/finance-api.types';

export const asObject = (value: FinanceJson): FinanceJsonObject => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

export const asString = (value: unknown, fallback = '') => (
  typeof value === 'string' ? value : fallback
);

export const asNumber = (value: unknown, fallback = 0) => {
  const next = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export const asStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
);

export const toDate = (value?: string | Date | null, fallback = new Date()) => {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

export const toDateInputValue = (value?: Date | string | null) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

export const optionalString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const numericId = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return undefined;
  const raw = typeof value === 'number' ? String(value) : value.trim();
  if (!/^\d+$/.test(raw)) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const isBackendId = (value?: string | number | null) => numericId(value) !== undefined;

export const compactObject = <T extends Record<string, unknown>>(value: T) => (
  Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== ''),
  ) as Partial<T>
);
