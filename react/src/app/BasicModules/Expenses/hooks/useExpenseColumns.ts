import { useState } from 'react';
import { DEFAULT_EXPENSE_COLUMNS } from '../constants/expenseColumns';
import type { ColumnConfig } from '../types/expenseView.types';

export function useExpenseColumns() {
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_EXPENSE_COLUMNS);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
    setColumns(nextColumns);
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
