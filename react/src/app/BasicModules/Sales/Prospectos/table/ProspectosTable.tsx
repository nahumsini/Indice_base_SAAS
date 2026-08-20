import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import {
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
  type IndiceTableAlignment,
} from '../../../../components/table/IndiceTableEngine';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import {
  TableBody,
  TableCell,
  TableRow,
} from '../../../../components/ui/table';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import type { OpportunityColumnId, OpportunitySortState } from '../types/prospectosTypes';
import {
  defaultOpportunityColumnWidths,
  minimumOpportunityColumnWidths,
  opportunityActionsColumnWidth,
} from '../utils/prospectosStatus';
import { ProspectosTableRow } from './ProspectosTableRow';

const rightAlignedOpportunityColumns = new Set<OpportunityColumnId>(['estimatedValue', 'pipeline', 'probability']);
const centeredOpportunityColumns = new Set<OpportunityColumnId>(['stage', 'temperature', 'status']);

function getOpportunityColumnAlignment(columnId: OpportunityColumnId): IndiceTableAlignment {
  if (rightAlignedOpportunityColumns.has(columnId)) return 'right';
  if (centeredOpportunityColumns.has(columnId)) return 'center';
  return 'left';
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
  onDownloadQuote,
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
  onDownloadQuote: (opportunity: SalesOpportunity, quote: SalesQuote) => void;
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

  const pagination = (
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
  );
  const tableColumns: Array<IndiceTableColumnDefinition<OpportunityColumnId>> = visibleColumns.map((column) => {
    const columnId = column.id as OpportunityColumnId;
    return {
      id: columnId,
      label: column.label,
      width: columnWidths[columnId] ?? defaultOpportunityColumnWidths[columnId],
      defaultWidth: defaultOpportunityColumnWidths[columnId],
      contentMinimumWidth: minimumOpportunityColumnWidths[columnId],
      alignment: getOpportunityColumnAlignment(columnId),
      sortable: true,
      resizeLabel: copy.table.resizeColumn(column.label),
    };
  });

  return (
    <IndiceTableShell pagination={pagination}>
      <IndiceOperationalTable minimumWidth={tableMinWidth}>
          <IndiceTableColGroup columns={tableColumns} actionsWidth={opportunityActionsColumnWidth} />
          <IndiceTableHeaderRow
            actions={{ label: copy.table.actions, width: opportunityActionsColumnWidth }}
            columns={tableColumns}
            onResize={onResizeColumn}
            onSort={onSort}
            sortState={sortState}
          />
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
                onDownloadQuote={onDownloadQuote}
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
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
