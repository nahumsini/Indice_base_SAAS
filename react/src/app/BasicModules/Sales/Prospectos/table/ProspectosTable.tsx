import type { MouseEvent as ReactMouseEvent } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import type { OpportunityColumnId, OpportunitySortState } from '../types/prospectosTypes';
import { ProspectosTableRow } from './ProspectosTableRow';

function OpportunitySortableHeader({
  column,
  sortState,
  onSort,
}: {
  column: ColumnConfig;
  sortState: OpportunitySortState;
  onSort: (columnId: OpportunityColumnId) => void;
}) {
  const columnId = column.id as OpportunityColumnId;
  const isActive = sortState.columnId === columnId;
  const SortIcon = isActive ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-2 text-left text-xs font-medium tracking-normal text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
      onClick={() => onSort(columnId)}
    >
      <span className="min-w-0 whitespace-normal break-words">{column.label}</span>
      <SortIcon className={cn('h-3.5 w-3.5', isActive ? 'text-[#2563EB]' : 'text-slate-400')} />
    </button>
  );
}

function ColumnResizeHandle({
  columnId,
  label,
  width,
  onResizeColumn,
}: {
  columnId: OpportunityColumnId;
  label: string;
  width: number;
  onResizeColumn: (columnId: OpportunityColumnId, width: number) => void;
}) {
  const handleMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onResizeColumn(columnId, startWidth + moveEvent.clientX - startX);
    };

    const stopResize = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResize);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className="absolute right-0 top-1/2 h-8 w-2 -translate-y-1/2 cursor-col-resize rounded-full transition-colors hover:bg-[#FF6B5E]/35 focus-visible:bg-[#FF6B5E]/35 focus-visible:outline-none"
      onMouseDown={handleMouseDown}
    />
  );
}

export function ProspectosTable({
  copy,
  opportunities,
  quotes,
  visibleColumns,
  columnWidths,
  tableMinWidth,
  sortState,
  ownerSelectOptions,
  resolveOpportunityOwnerValue,
  getOwnerPayloadFromValue,
  onSort,
  onUpdateOpportunity,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onDelete,
  onScheduleChange,
  onResizeColumn,
  paginationState,
  onPaginationChange,
}: {
  copy: ProspectosCopy;
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
  visibleColumns: ColumnConfig[];
  columnWidths: Record<OpportunityColumnId, number>;
  tableMinWidth: number;
  sortState: OpportunitySortState;
  ownerSelectOptions: Array<{ value: string; label: string }>;
  resolveOpportunityOwnerValue: (opportunity: SalesOpportunity) => string;
  getOwnerPayloadFromValue: (value: string) => { ownerUserCompanyId: number | null; owner: string };
  onSort: (columnId: OpportunityColumnId) => void;
  onUpdateOpportunity: (opportunityId: string, patch: Partial<Omit<SalesOpportunity, 'id'>>) => void;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onDelete: (opportunity: SalesOpportunity) => void;
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void;
  onResizeColumn: (columnId: OpportunityColumnId, width: number) => void;
  paginationState?: { currentPage: number; pageSize: number };
  onPaginationChange?: (state: { currentPage: number; pageSize: number }) => void;
}) {
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedOpportunities,
    totalCount,
    totalPages,
  } = useTablePagination({
    controlledCurrentPage: paginationState?.currentPage,
    controlledPageSize: paginationState?.pageSize,
    onPaginationChange,
    rows: opportunities,
  });

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <Table className="table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
              {visibleColumns.map((column) => {
                const columnId = column.id as OpportunityColumnId;
                const columnWidth = columnWidths[columnId] ?? 160;

                return (
                  <TableHead
                    key={column.id}
                    className="relative whitespace-normal px-5 py-5"
                    style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px` }}
                  >
                    <OpportunitySortableHeader column={column} sortState={sortState} onSort={onSort} />
                    <ColumnResizeHandle columnId={columnId} label={column.label} width={columnWidth} onResizeColumn={onResizeColumn} />
                  </TableHead>
                );
              })}
              <TableHead
                className="whitespace-normal px-4 py-5 text-center text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300"
                style={{ width: '240px', minWidth: '240px', maxWidth: '240px' }}
              >
                {copy.table.actions}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOpportunities.map((opportunity) => (
              <ProspectosTableRow
                copy={copy}
                key={opportunity.id}
                opportunity={opportunity}
                quotes={quotes}
                visibleColumns={visibleColumns}
                columnWidths={columnWidths}
                ownerSelectOptions={ownerSelectOptions}
                resolveOpportunityOwnerValue={resolveOpportunityOwnerValue}
                getOwnerPayloadFromValue={getOwnerPayloadFromValue}
                onUpdateOpportunity={onUpdateOpportunity}
                onOpenFiles={onOpenFiles}
                onOpenHistory={onOpenHistory}
                onEdit={onEdit}
                onDelete={onDelete}
                onScheduleChange={onScheduleChange}
              />
            ))}

            {opportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-300">
                  {copy.table.empty}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        currentPage={currentPage}
        itemLabel={copy.header.title.toLocaleLowerCase()}
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
  );
}
