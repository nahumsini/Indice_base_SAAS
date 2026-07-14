import { useEffect, useState } from 'react';
import type { ColumnConfig } from '../../types/expenseView.types';

export const budgetColumnsStorageKey = 'indice.expenses.budgets.columns.v1';

const cloneColumns = (columns: ColumnConfig[]) => columns.map(column => ({ ...column }));

export function reconcileBudgetColumns(candidateColumns: unknown, defaultColumns: ColumnConfig[]): ColumnConfig[] {
  if (!Array.isArray(candidateColumns)) return cloneColumns(defaultColumns);

  const defaultsByKey = new Map(defaultColumns.map(column => [column.key, column]));
  const restoredKeys = new Set<string>();
  const restoredOptionalColumns: ColumnConfig[] = [];

  candidateColumns.forEach(candidateColumn => {
    if (!candidateColumn || typeof candidateColumn !== 'object') return;

    const candidate = candidateColumn as Partial<ColumnConfig>;
    if (typeof candidate.key !== 'string' || restoredKeys.has(candidate.key)) return;

    const defaultColumn = defaultsByKey.get(candidate.key);
    if (!defaultColumn || defaultColumn.fixed) return;

    restoredKeys.add(candidate.key);
    restoredOptionalColumns.push({
      ...defaultColumn,
      visible: typeof candidate.visible === 'boolean' ? candidate.visible : defaultColumn.visible,
    });
  });

  const newOptionalColumns = defaultColumns
    .filter(column => !column.fixed && !restoredKeys.has(column.key))
    .map(column => ({ ...column }));
  const fixedColumns = defaultColumns
    .filter(column => column.fixed)
    .map(column => ({ ...column, visible: true }));

  return [...restoredOptionalColumns, ...newOptionalColumns, ...fixedColumns];
}

function loadBudgetColumns(defaultColumns: ColumnConfig[]) {
  if (typeof window === 'undefined') return cloneColumns(defaultColumns);

  try {
    const storedColumns = window.localStorage.getItem(budgetColumnsStorageKey);
    return storedColumns
      ? reconcileBudgetColumns(JSON.parse(storedColumns), defaultColumns)
      : cloneColumns(defaultColumns);
  } catch {
    return cloneColumns(defaultColumns);
  }
}

export function useBudgetTableColumns(defaultColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadBudgetColumns(defaultColumns));
  const defaultColumnsSignature = defaultColumns
    .map(column => `${column.key}:${column.label}:${column.visible}:${Boolean(column.fixed)}`)
    .join('|');

  useEffect(() => {
    setColumns(currentColumns => reconcileBudgetColumns(currentColumns, defaultColumns));
  }, [defaultColumnsSignature]);

  useEffect(() => {
    try {
      window.localStorage.setItem(budgetColumnsStorageKey, JSON.stringify(columns));
    } catch {
      // Column configuration remains usable when browser storage is unavailable.
    }
  }, [columns]);

  return {
    columns,
    applyColumns: (nextColumns: ColumnConfig[]) => {
      setColumns(reconcileBudgetColumns(nextColumns, defaultColumns));
    },
  };
}
