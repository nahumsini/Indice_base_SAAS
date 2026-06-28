import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import {
  columnWidthsStorageKey,
  columnsStorageKey,
  createDefaultColumns,
  employeeSelectionColumnWidth,
  getDefaultEmployeeColumnWidth,
  getMinimumEmployeeColumnWidth,
} from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';
import { getInitialColumns } from '../utils/employees.utils';

function getInitialColumnWidths() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawWidths = window.localStorage.getItem(columnWidthsStorageKey);
    if (!rawWidths) {
      return {};
    }

    const parsedWidths = JSON.parse(rawWidths) as Record<string, unknown>;
    const nextWidths: Record<string, number> = {};

    Object.entries(parsedWidths).forEach(([columnId, width]) => {
      if (typeof width !== 'number') {
        return;
      }

      nextWidths[columnId] = Math.max(getMinimumEmployeeColumnWidth(columnId), width);
    });

    return nextWidths;
  } catch {
    return {};
  }
}

export function useEmployeesColumns(copy: EmployeesTranslations) {
  const defaultColumns = useMemo(() => createDefaultColumns(copy), [copy]);
  const fixedColumns = useMemo<ColumnConfig[]>(
    () => [
      { id: 'actions', label: copy.columns.actions, visible: true, locked: true },
    ],
    [copy.columns.actions],
  );
  const [columns, setColumns] = useState<ColumnConfig[]>(() => getInitialColumns(defaultColumns));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => getInitialColumnWidths());
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );
  const getColumnWidth = useCallback(
    (columnId: string) => columnWidths[columnId] ?? getDefaultEmployeeColumnWidth(columnId),
    [columnWidths],
  );
  const tableMinWidth = useMemo(
    () =>
      Math.max(
        1120,
        employeeSelectionColumnWidth +
          visibleColumns.reduce((totalWidth, column) => totalWidth + getColumnWidth(column.id), 0) +
          fixedColumns.reduce((totalWidth, column) => totalWidth + getColumnWidth(column.id), 0),
      ),
    [fixedColumns, getColumnWidth, visibleColumns],
  );

  useEffect(() => {
    setColumns((currentColumns) => {
      const translated = getInitialColumns(defaultColumns);
      const supportedColumnIds = new Set(translated.map((column) => column.id));
      const hasUnsupportedColumns = currentColumns.some((column) => !supportedColumnIds.has(column.id));
      const needsLabelRefresh = translated.some((nextColumn) => {
        const currentColumn = currentColumns.find((column) => column.id === nextColumn.id);
        return currentColumn?.label !== nextColumn.label;
      });

      return hasUnsupportedColumns || needsLabelRefresh ? translated : currentColumns;
    });
  }, [defaultColumns]);

  useEffect(() => {
    window.localStorage.setItem(columnsStorageKey, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    window.localStorage.setItem(columnWidthsStorageKey, JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    if (!resizingColumn) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.max(
        getMinimumEmployeeColumnWidth(resizingColumn),
        resizeStartWidth + event.clientX - resizeStartX,
      );

      setColumnWidths((currentWidths) => ({
        ...currentWidths,
        [resizingColumn]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  const handleResizeStart = useCallback((event: ReactMouseEvent, columnId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setResizingColumn(columnId);
    setResizeStartX(event.clientX);
    setResizeStartWidth(getColumnWidth(columnId));
  }, [getColumnWidth]);

  return {
    columnWidths,
    columns,
    fixedColumns,
    getColumnWidth,
    handleResizeStart,
    resizingColumn,
    setColumns,
    selectionColumnWidth: employeeSelectionColumnWidth,
    tableMinWidth,
    visibleColumns,
  };
}
