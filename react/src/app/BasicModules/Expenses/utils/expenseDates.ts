/** Finance API calendar dates have no timezone; keep their displayed day intact. */
export const parseExpenseDate = (value?: string | Date | null, fallback = new Date()): Date => {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

export const formatExpenseDate = (value?: Date | null): string | undefined => {
  if (!value || Number.isNaN(value.getTime())) return undefined;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};
