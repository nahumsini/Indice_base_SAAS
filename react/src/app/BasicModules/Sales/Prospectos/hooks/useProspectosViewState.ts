import { useEffect, useMemo, useState } from 'react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { OpportunityColumnId, OpportunitySortState, OpportunityView } from '../types/prospectosTypes';
import { getInitialOpportunityColumns, refreshOpportunityColumns } from '../utils/prospectosFilters';
import { opportunityColumnsStorageKey } from '../utils/prospectosStatus';

export function useProspectosViewState() {
  const [activeView, setActiveView] = useState<OpportunityView>('table');
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(getInitialOpportunityColumns);
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
  const tableMinWidth = Math.max(1320, visibleColumns.length * 168 + 310);

  const handleSort = (columnId: OpportunityColumnId) => {
    setSortState((current) => ({
      columnId,
      direction: current.columnId === columnId && current.direction === 'asc' ? 'desc' : 'asc',
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
    tableMinWidth,
    sortState,
    handleSort,
  };
}

