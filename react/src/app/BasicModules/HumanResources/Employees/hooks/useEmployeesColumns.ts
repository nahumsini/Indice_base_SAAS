import { useEffect, useMemo, useState } from 'react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import {
  columnsStorageKey,
  createDefaultColumns,
} from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';
import { getInitialColumns } from '../utils/employees.utils';

export function useEmployeesColumns(copy: EmployeesTranslations) {
  const defaultColumns = useMemo(() => createDefaultColumns(copy), [copy]);
  const fixedColumns = useMemo<ColumnConfig[]>(
    () => [
      { id: 'actions', label: copy.columns.actions, visible: true, locked: true },
    ],
    [copy.columns.actions],
  );
  const [columns, setColumns] = useState<ColumnConfig[]>(() => getInitialColumns(defaultColumns));
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
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

  return {
    columns,
    fixedColumns,
    setColumns,
    visibleColumns,
  };
}
