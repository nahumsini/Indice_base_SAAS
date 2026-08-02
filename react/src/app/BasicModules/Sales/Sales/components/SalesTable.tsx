import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleLifecycleSignals, SaleRecord, SalesColumnId } from '../types/salesTypes';
import { defaultSalesColumnWidths, sortSalesRecords, sortableSalesColumns, type SalesSortState, type SortableSalesColumnId } from '../utils/salesTableColumns';
import { SalesBulkActionsBar } from './SalesBulkActionsBar';
import { SalesTableHeader } from './SalesTableHeader';
import { SalesTableRow } from './SalesTableRow';

export function SalesTable({
  records,
  visibleColumns,
  lifecycleByRecordId,
  t,
  onViewRecord,
  onPreviewSummary,
  onManageCommission,
  onPrepareMovement,
  onSendToFinance,
  onSendToCredit,
  onCancelSale,
}: {
  records: SaleRecord[];
  visibleColumns: SalesColumnId[];
  lifecycleByRecordId: Record<string, SaleLifecycleSignals>;
  t: SalesRecordsTranslations;
  onViewRecord: (record: SaleRecord) => void;
  onPreviewSummary: (record: SaleRecord) => void;
  onManageCommission: (record: SaleRecord) => void;
  onPrepareMovement: (record: SaleRecord) => void;
  onSendToFinance: (record: SaleRecord) => void;
  onSendToCredit: (record: SaleRecord) => void;
  onCancelSale: (record: SaleRecord) => void;
}) {
  const [sortState, setSortState] = useState<SalesSortState>(null);
  const [columnWidths, setColumnWidths] = useState<Record<SalesColumnId, number>>(defaultSalesColumnWidths);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const tableMinWidth = visibleColumns.reduce((total, column) => total + (columnWidths[column] ?? defaultSalesColumnWidths[column]), 56);
  const sortedRecords = useMemo(
    () => sortSalesRecords(records, lifecycleByRecordId, sortState),
    [lifecycleByRecordId, records, sortState],
  );
  const allRecordIds = useMemo(() => sortedRecords.map((record) => record.id), [sortedRecords]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedRecords,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${sortState?.columnId ?? 'none'}:${sortState?.direction ?? 'none'}:${records.map((record) => record.id).join('|')}`,
    rows: sortedRecords,
  });
  const pageRecordIds = useMemo(() => paginatedRecords.map((record) => record.id), [paginatedRecords]);
  const selectedRecords = useMemo(
    () => sortedRecords.filter((record) => selectedIds.has(record.id)),
    [selectedIds, sortedRecords],
  );
  const allVisibleSelected = pageRecordIds.length > 0 && pageRecordIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = !allVisibleSelected && pageRecordIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    setSelectedIds((current) => {
      const recordIdSet = new Set(allRecordIds);
      const next = new Set(Array.from(current).filter((id) => recordIdSet.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [allRecordIds]);

  const handleSort = (column: SalesColumnId) => {
    if (!sortableSalesColumns.has(column)) {
      return;
    }

    setSortState((current) => {
      if (current?.columnId === column) {
        return {
          columnId: column as SortableSalesColumnId,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return { columnId: column as SortableSalesColumnId, direction: 'asc' };
    });
  };

  const handleResizeColumn = (column: SalesColumnId, width: number) => {
    setColumnWidths((current) => ({ ...current, [column]: width }));
  };

  const handleToggleSelection = (recordId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(recordId);
      } else {
        next.delete(recordId);
      }
      return next;
    });
  };

  const handleToggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageRecordIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const runBulkAction = (action: (record: SaleRecord) => void, canRun: (record: SaleRecord) => boolean) => {
    selectedRecords.filter(canRun).forEach(action);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-3">
      <SalesBulkActionsBar
        selectedCount={selectedIds.size}
        t={t}
        onPrepareMovement={() => runBulkAction(onPrepareMovement, (record) => (
          record.commercialStatus !== 'cancelled' && record.inventoryMovementStatus === 'not_generated'
        ))}
        onSendToFinance={() => runBulkAction(onSendToFinance, (record) => (
          record.commercialStatus !== 'cancelled' && record.financeStatus !== 'approved'
        ))}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <Table className="table-fixed" style={{ minWidth: `${Math.max(tableMinWidth, 960)}px` }}>
            <TableHeader>
              <SalesTableHeader
                visibleColumns={visibleColumns}
                columnWidths={columnWidths}
                sortState={sortState}
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                t={t}
                onSort={handleSort}
                onResizeColumn={handleResizeColumn}
                onToggleAllVisible={handleToggleAllVisible}
              />
            </TableHeader>
            <TableBody>
              {sortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="px-5 py-12 text-center">
                    <div className="mx-auto max-w-md space-y-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{t.table.emptyTitle}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t.table.emptyDescription}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.map((record) => (
                <SalesTableRow
                  key={record.id}
                  record={record}
                  selected={selectedIds.has(record.id)}
                  visibleColumns={visibleColumns}
                  lifecycle={lifecycleByRecordId[record.id]}
                  t={t}
                  onSelectionChange={(checked) => handleToggleSelection(record.id, checked)}
                  onView={onViewRecord}
                  onPreviewSummary={onPreviewSummary}
                  onManageCommission={onManageCommission}
                  onPrepareMovement={onPrepareMovement}
                  onSendToFinance={onSendToFinance}
                  onSendToCredit={onSendToCredit}
                  onCancelSale={onCancelSale}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          currentPage={currentPage}
          itemLabel={t.header.title.toLocaleLowerCase()}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}
