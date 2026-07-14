import { useEffect, useState } from 'react';
import { DEFAULT_EXPENSE_COLUMNS } from '../constants/expenseColumns';
import type { ColumnConfig } from '../types/expenseView.types';

export const expenseColumnsStorageKey = 'indice.expenses.expenses.columns.v1';

const defaultExpenseColumns = () => DEFAULT_EXPENSE_COLUMNS.map(column => ({ ...column }));

const reconcileExpenseColumns = (storedColumns: unknown): ColumnConfig[] => {
  if (!Array.isArray(storedColumns)) return defaultExpenseColumns();

  const defaultsByKey = new Map(DEFAULT_EXPENSE_COLUMNS.map(column => [column.key, column]));
  const restoredKeys = new Set<string>();
  const restoredColumns: ColumnConfig[] = [];

  storedColumns.forEach(storedColumn => {
    if (!storedColumn || typeof storedColumn !== 'object') return;

    const candidate = storedColumn as Partial<ColumnConfig>;
    if (typeof candidate.key !== 'string' || restoredKeys.has(candidate.key)) return;

    const defaultColumn = defaultsByKey.get(candidate.key);
    if (!defaultColumn) return;

    restoredKeys.add(candidate.key);
    restoredColumns.push({
      ...defaultColumn,
      visible: defaultColumn.fixed
        ? true
        : typeof candidate.visible === 'boolean'
          ? candidate.visible
          : defaultColumn.visible,
    });
  });

  const newColumns = DEFAULT_EXPENSE_COLUMNS
    .filter(column => !restoredKeys.has(column.key))
    .map(column => ({ ...column }));

  return restoredColumns.length > 0
    ? [...restoredColumns, ...newColumns]
    : defaultExpenseColumns();
};

const getInitialExpenseColumns = (): ColumnConfig[] => {
  if (typeof window === 'undefined') return defaultExpenseColumns();

  try {
    const storedColumns = window.localStorage.getItem(expenseColumnsStorageKey);
    return storedColumns
      ? reconcileExpenseColumns(JSON.parse(storedColumns))
      : defaultExpenseColumns();
  } catch {
    return defaultExpenseColumns();
  }
};

export function useExpenseColumns() {
  const [columns, setColumns] = useState<ColumnConfig[]>(getInitialExpenseColumns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(expenseColumnsStorageKey, JSON.stringify(columns));
    } catch {
      // The table remains usable when storage is unavailable or full.
    }
  }, [columns]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...columns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);
    setColumns(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const showAllColumns = () => {
    setColumns(current => current.map(column => ({ ...column, visible: true })));
  };

  const hideOptionalColumns = () => {
    setColumns(current => current.map(column => (column.fixed ? column : { ...column, visible: false })));
  };

  const updateColumnVisibility = (index: number, visible: boolean) => {
    setColumns(current => {
      const nextColumns = [...current];
      nextColumns[index] = { ...nextColumns[index], visible };
      return nextColumns;
    });
  };

  const applyColumns = (nextColumns: ColumnConfig[]) => {
    setColumns(reconcileExpenseColumns(nextColumns));
  };

  return {
    applyColumns,
    columns,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    hideOptionalColumns,
    showAllColumns,
    updateColumnVisibility,
  };
}
