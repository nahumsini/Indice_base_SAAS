import { useEffect, useMemo, useState } from 'react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { usePersistentColumnWidths } from '../../../../hooks/usePersistentColumnWidths';
import type { OpportunityColumnId, OpportunitySortState, OpportunityView } from '../types/prospectosTypes';
import { getInitialOpportunityColumns, refreshOpportunityColumns } from '../utils/prospectosFilters';
import {
  defaultOpportunityColumnWidths,
  minimumOpportunityColumnWidths,
  opportunityActionsColumnWidth,
  opportunityColumnsStorageKey,
  opportunityColumnWidthsStorageKey,
} from '../utils/prospectosStatus';

const opportunityColumnIds = Object.keys(defaultOpportunityColumnWidths) as OpportunityColumnId[];

export function useProspectosViewState() {
  const [activeView, setActiveView] = useState<OpportunityView>('table');
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(getInitialOpportunityColumns);
  const opportunityHeaderLabels = useMemo<Partial<Record<OpportunityColumnId, string>>>(() => (
    Object.fromEntries(columns.map((column) => [column.id, column.label]))
  ), [columns]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<OpportunityColumnId>({
    defaults: defaultOpportunityColumnWidths,
    headerLabels: opportunityHeaderLabels,
    minWidths: minimumOpportunityColumnWidths,
    sortableColumnIds: opportunityColumnIds,
    storageKey: opportunityColumnWidthsStorageKey,
  });
  const [sortState, setSortState] = useState<OpportunitySortState>({ columnId: 'opportunity', direction: 'asc' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(opportunityColumnsStorageKey, JSON.stringify(columns));
    }
  }, [columns]);

  useEffect(() => {
    setColumns((currentColumns) => refreshOpportunityColumns(currentColumns));
  }, []);

  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const tableMinWidth = useMemo(
    () => Math.max(
      1320,
      visibleColumns.reduce((total, column) => total + (columnWidths[column.id as OpportunityColumnId] ?? 120), opportunityActionsColumnWidth),
    ),
    [columnWidths, visibleColumns],
  );

  const handleSort = (columnId: OpportunityColumnId) => {
    setSortState((current) => ({
      columnId,
      direction: current.columnId === columnId && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleResizeColumn = (columnId: OpportunityColumnId, width: number) => {
    resizeColumn(columnId, width);
  };

  return {
    activeView,
    setActiveView,
    isColumnsModalOpen,
    setIsColumnsModalOpen,
    columns,
    setColumns,
    visibleColumns,
    columnWidths,
    tableMinWidth,
    sortState,
    setSortState,
    handleSort,
    handleResizeColumn,
  };
}
