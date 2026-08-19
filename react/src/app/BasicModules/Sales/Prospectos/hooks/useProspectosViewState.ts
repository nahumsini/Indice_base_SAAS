import { useEffect, useMemo, useState } from 'react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { OpportunityColumnId, OpportunitySortState, OpportunityView } from '../types/prospectosTypes';
import { getInitialOpportunityColumns, refreshOpportunityColumns } from '../utils/prospectosFilters';
import {
  defaultOpportunityColumnWidths,
  opportunityColumnsStorageKey,
  opportunityColumnWidthsStorageKey,
} from '../utils/prospectosStatus';

const columnWidthLimits = {
  min: 120,
  max: 440,
};

function normalizeColumnWidth(width: number) {
  return Math.min(Math.max(Math.round(width), columnWidthLimits.min), columnWidthLimits.max);
}

function getInitialOpportunityColumnWidths(): Record<OpportunityColumnId, number> {
  if (typeof window === 'undefined') {
    return defaultOpportunityColumnWidths;
  }

  try {
    const storedWidths = window.localStorage.getItem(opportunityColumnWidthsStorageKey);
    const parsedWidths = storedWidths
      ? JSON.parse(storedWidths) as Partial<Record<OpportunityColumnId, number>>
      : {};

    return Object.entries(defaultOpportunityColumnWidths).reduce((widths, [columnId, defaultWidth]) => {
      const typedColumnId = columnId as OpportunityColumnId;
      const storedWidth = parsedWidths[typedColumnId];
      widths[typedColumnId] = typeof storedWidth === 'number' && Number.isFinite(storedWidth)
        ? normalizeColumnWidth(storedWidth)
        : defaultWidth;
      return widths;
    }, {} as Record<OpportunityColumnId, number>);
  } catch {
    return defaultOpportunityColumnWidths;
  }
}

export function useProspectosViewState() {
  const [activeView, setActiveView] = useState<OpportunityView>('table');
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(getInitialOpportunityColumns);
  const [columnWidths, setColumnWidths] = useState<Record<OpportunityColumnId, number>>(getInitialOpportunityColumnWidths);
  const [sortState, setSortState] = useState<OpportunitySortState>({ columnId: 'opportunity', direction: 'asc' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(opportunityColumnsStorageKey, JSON.stringify(columns));
    }
  }, [columns]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(opportunityColumnWidthsStorageKey, JSON.stringify(columnWidths));
    }
  }, [columnWidths]);

  useEffect(() => {
    setColumns((currentColumns) => refreshOpportunityColumns(currentColumns));
  }, []);

  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const tableMinWidth = useMemo(
    () => Math.max(
      1320,
      visibleColumns.reduce((total, column) => total + (columnWidths[column.id as OpportunityColumnId] ?? columnWidthLimits.min), 240),
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
    setColumnWidths((currentWidths) => ({
      ...currentWidths,
      [columnId]: normalizeColumnWidth(width),
    }));
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
