import { enCA } from './en-CA';
import type { FinanceLocale, FinanceTranslationOverrides, FinanceTranslations } from './types';

export function mergeFinanceTranslations(
  locale: FinanceLocale,
  overrides: FinanceTranslationOverrides,
): FinanceTranslations {
  return deepMerge({ ...enCA, locale }, overrides);
}

function deepMerge<T>(base: T, overrides: unknown): T {
  if (!isRecord(base) || !isRecord(overrides)) {
    return (overrides === undefined ? base : overrides) as T;
  }

  const next: Record<string, unknown> = { ...base };

  Object.entries(overrides).forEach(([key, value]) => {
    const current = next[key];
    next[key] = isRecord(current) && isRecord(value) ? deepMerge(current, value) : value;
  });

  return next as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
