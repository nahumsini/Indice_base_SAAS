import { useMemo, useState } from 'react';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import {
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../../../../components/table/IndiceTableEngine';
import {
  TableBody,
  TableCell,
  TableRow,
} from '../../../../components/ui/table';
import { usePersistentColumnWidths } from '../../../../hooks/usePersistentColumnWidths';
import type { SalesOpportunity, SalesQuote } from '../../types';
import { getOpportunityNativePipelineTotals } from '../../Prospectos/utils/prospectosPipeline';
import type { SalesKpisTranslations } from '../translations';

type ProspectKpiColumnId = 'prospect' | 'customer' | 'stage' | 'owner' | 'value' | 'nextAction' | 'status';
type ProspectKpiSortState = { columnId: ProspectKpiColumnId; direction: 'asc' | 'desc' };

const prospectKpiColumnWidths: Record<ProspectKpiColumnId, number> = {
  prospect: 230,
  customer: 190,
  stage: 150,
  owner: 180,
  value: 190,
  nextAction: 250,
  status: 160,
};

const prospectKpiMinimumWidths: Record<ProspectKpiColumnId, number> = {
  prospect: 180,
  customer: 160,
  stage: 130,
  owner: 150,
  value: 165,
  nextAction: 200,
  status: 140,
};

const prospectKpiColumnIds = Object.keys(prospectKpiColumnWidths) as ProspectKpiColumnId[];
const prospectKpiCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });

function StatusPill({ label }: { label: string }) {
  const tone = label === 'Overdue'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
    : label === 'Closed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
      : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200';

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}

export function SalesProspectsPerformanceTable({
  copy,
  items,
  quotes,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  copy: SalesKpisTranslations;
  items: SalesOpportunity[];
  quotes: SalesQuote[];
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const [sortState, setSortState] = useState<ProspectKpiSortState>({ columnId: 'prospect', direction: 'asc' });
  const columnLabels = useMemo<Record<ProspectKpiColumnId, string>>(() => ({
    prospect: copy.prospectsTable.columns.prospect,
    customer: copy.prospectsTable.columns.customer,
    stage: copy.prospectsTable.columns.stage,
    owner: copy.prospectsTable.columns.owner,
    value: copy.prospectsTable.columns.value,
    nextAction: copy.prospectsTable.columns.nextAction,
    status: copy.prospectsTable.columns.status,
  }), [copy.prospectsTable.columns]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<ProspectKpiColumnId>({
    defaults: prospectKpiColumnWidths,
    headerLabels: columnLabels,
    minWidths: prospectKpiMinimumWidths,
    sortableColumnIds: prospectKpiColumnIds,
    storageKey: 'sales-kpi-prospects-column-widths-v2',
  });
  const pipelineByOpportunity = useMemo(() => new Map(items.map((item) => [
    item.id,
    getOpportunityNativePipelineTotals(item, quotes),
  ])), [items, quotes]);
  const sortedItems = useMemo(() => [...items].sort((left, right) => {
    const valueFor = (item: SalesOpportunity, columnId: ProspectKpiColumnId) => {
      switch (columnId) {
        case 'prospect': return item.opportunityName;
        case 'customer': return item.company;
        case 'stage': return item.stage;
        case 'owner': return item.owner;
        case 'value': return pipelineByOpportunity.get(item.id)?.totalLabel ?? '';
        case 'nextAction': return `${item.nextActionDate} ${item.nextAction}`;
        case 'status': return item.status;
        default: return '';
      }
    };
    const comparison = prospectKpiCollator.compare(
      String(valueFor(left, sortState.columnId)),
      String(valueFor(right, sortState.columnId)),
    );
    const directedComparison = sortState.direction === 'asc' ? comparison : -comparison;
    return directedComparison || prospectKpiCollator.compare(left.id, right.id);
  }), [items, pipelineByOpportunity, sortState]);
  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = totalItems === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const pageEnd = Math.min(page * pageSize, totalItems);
  const tableMinimumWidth = prospectKpiColumnIds.reduce((total, columnId) => total + columnWidths[columnId], 0);
  const tableColumns: Array<IndiceTableColumnDefinition<ProspectKpiColumnId>> = prospectKpiColumnIds.map((columnId) => ({
    id: columnId,
    label: columnLabels[columnId],
    width: columnWidths[columnId],
    defaultWidth: prospectKpiColumnWidths[columnId],
    contentMinimumWidth: prospectKpiMinimumWidths[columnId],
    alignment: columnId === 'value' ? 'right' : columnId === 'status' ? 'center' : 'left',
    sortable: true,
    resizeLabel: `${columnLabels[columnId]}: ajustar ancho`,
  }));

  const handleSort = (columnId: ProspectKpiColumnId) => {
    setSortState((current) => current.columnId === columnId
      ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { columnId, direction: 'asc' });
    onPageChange(1);
  };

  return (
    <IndiceTableShell
      pagination={(
        <DataTablePagination
          currentPage={page}
          itemLabel={copy.pagination.records}
          labels={{
            next: copy.pagination.next,
            previous: copy.pagination.previous,
            rowsPerPage: copy.pagination.rows,
            page: (current, total) => `${copy.pagination.page} ${current} / ${total}`,
          }}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100, 200]}
          pageStart={pageStart}
          totalCount={totalItems}
          totalPages={totalPages}
        />
      )}
    >
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.prospectsTable.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy.prospectsTable.subtitle}</p>
      </div>

      <IndiceOperationalTable minimumWidth={tableMinimumWidth}>
        <IndiceTableColGroup columns={tableColumns} />
        <IndiceTableHeaderRow
          columns={tableColumns}
          onResize={resizeColumn}
          onSort={handleSort}
          sortState={sortState}
        />
        <TableBody>
          {paginatedItems.map((item) => {
            const commercialValue = pipelineByOpportunity.get(item.id) ?? getOpportunityNativePipelineTotals(item, quotes);
            return (
              <TableRow key={item.id} className="border-slate-100 dark:border-slate-700">
                <TableCell className="whitespace-normal px-5 py-4">
                  <p className="font-medium text-slate-950 dark:text-white">{item.opportunityName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.id}</p>
                </TableCell>
                <TableCell className="whitespace-normal px-5 py-4 text-slate-700 dark:text-slate-200">{item.company}</TableCell>
                <TableCell className="whitespace-normal px-5 py-4 text-slate-700 dark:text-slate-200">{item.stage}</TableCell>
                <TableCell className="whitespace-normal px-5 py-4 text-slate-700 dark:text-slate-200">{item.owner}</TableCell>
                <TableCell className="whitespace-normal px-5 py-4 text-right font-medium text-slate-900 dark:text-white">
                  <p>{commercialValue.totalLabel}</p>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {commercialValue.quoteCount} {commercialValue.quoteCount === 1 ? 'cotización' : 'cotizaciones'}
                  </p>
                </TableCell>
                <TableCell className="whitespace-normal px-5 py-4 text-slate-700 dark:text-slate-200">{item.nextAction} - {item.nextActionDate}</TableCell>
                <TableCell className="px-5 py-4 text-center">
                  <StatusPill label={item.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
