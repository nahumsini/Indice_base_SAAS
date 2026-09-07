import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import {
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../../../../components/table/IndiceTableEngine';
import { Button } from '../../../../components/ui/button';
import {
  TableBody,
  TableCell,
  TableRow,
} from '../../../../components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';
import { cn } from '../../../../components/ui/utils';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { usePersistentColumnWidths } from '../../../../hooks/usePersistentColumnWidths';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRecord, CommissionStatus } from '../types/commissions';
import { formatCommissionMoney, formatSalesDate } from '../utils/salesFormatters';

const statusClasses: Record<CommissionStatus, string> = {
  pending: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  approved: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  paid: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  cancelled: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

type CommissionTableColumnId =
  | 'commissionId'
  | 'salesRep'
  | 'customer'
  | 'sale'
  | 'product'
  | 'commissionAmount'
  | 'status'
  | 'createdDate';

const commissionColumnWidths: Record<CommissionTableColumnId, number> = {
  commissionId: 190,
  salesRep: 170,
  customer: 190,
  sale: 170,
  product: 190,
  commissionAmount: 180,
  status: 150,
  createdDate: 160,
};

const commissionMinimumColumnWidths: Record<CommissionTableColumnId, number> = {
  commissionId: 160,
  salesRep: 150,
  customer: 160,
  sale: 150,
  product: 160,
  commissionAmount: 165,
  status: 130,
  createdDate: 145,
};

const commissionColumnIds = Object.keys(commissionColumnWidths) as CommissionTableColumnId[];
const commissionActionsColumnWidth = 84;
const commissionSortCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });

export function CommissionStatusBadge({
  status,
  t,
  naturalCase = false,
}: {
  status: CommissionStatus;
  t: SalesRecordsTranslations;
  naturalCase?: boolean;
}) {
  return (
    <span className={cn(
      'inline-flex rounded-full border px-3 py-1 text-xs font-medium',
      !naturalCase && 'tracking-normal',
      statusClasses[status],
    )}>
      {t.commissions.statuses[status]}
    </span>
  );
}

export function CommissionTable({
  records,
  t,
  onViewRecord,
}: {
  records: CommissionRecord[];
  t: SalesRecordsTranslations;
  onViewRecord: (record: CommissionRecord) => void;
}) {
  const columns = t.commissions.table.columns;
  const [sortState, setSortState] = useState<{ columnId: CommissionTableColumnId; direction: 'asc' | 'desc' }>({
    columnId: 'createdDate',
    direction: 'desc',
  });
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<CommissionTableColumnId>({
    defaults: commissionColumnWidths,
    headerLabels: columns,
    minWidths: commissionMinimumColumnWidths,
    sortableColumnIds: commissionColumnIds,
    storageKey: 'sales-commissions-column-widths-v2',
  });
  const sortedRecords = useMemo(() => [...records].sort((left, right) => {
    const getSortValue = (record: CommissionRecord) => {
      switch (sortState.columnId) {
        case 'commissionId': return `${record.id} ${record.commissionRuleName}`;
        case 'salesRep': return record.salesRepName;
        case 'customer': return record.customerName;
        case 'sale': return `${record.saleCode} ${record.saleAmount}`;
        case 'product': return record.productName;
        case 'commissionAmount': return record.commissionAmount;
        case 'status': return record.status;
        case 'createdDate': return record.createdDate;
        default: return '';
      }
    };
    const leftValue = getSortValue(left);
    const rightValue = getSortValue(right);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : commissionSortCollator.compare(String(leftValue), String(rightValue));
    const directedResult = sortState.direction === 'asc' ? result : -result;
    return directedResult || commissionSortCollator.compare(left.id, right.id);
  }), [records, sortState]);
  const handleSort = (columnId: CommissionTableColumnId) => {
    setSortState((current) => current.columnId === columnId
      ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { columnId, direction: 'asc' });
  };
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${sortState.columnId}:${sortState.direction}:${records.map((record) => record.id).join('|')}`,
    rows: sortedRecords,
  });
  const commissionTableMinimumWidth = commissionColumnIds.reduce(
    (total, columnId) => total + columnWidths[columnId],
    commissionActionsColumnWidth,
  );
  const tableColumns: Array<IndiceTableColumnDefinition<CommissionTableColumnId>> = commissionColumnIds.map((columnId) => ({
    id: columnId,
    label: columns[columnId],
    width: columnWidths[columnId],
    defaultWidth: commissionColumnWidths[columnId],
    contentMinimumWidth: commissionMinimumColumnWidths[columnId],
    alignment: columnId === 'commissionAmount' ? 'right' : columnId === 'status' ? 'center' : 'left',
    sortable: true,
    resizeLabel: `${columns[columnId]}: ajustar ancho`,
  }));

  return (
    <IndiceTableShell
      pagination={(
        <DataTablePagination
          currentPage={currentPage}
          itemLabel={t.commissions.view.title.toLocaleLowerCase()}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      )}
    >
        <IndiceOperationalTable minimumWidth={commissionTableMinimumWidth}>
          <IndiceTableColGroup columns={tableColumns} actionsWidth={commissionActionsColumnWidth} />
          <IndiceTableHeaderRow
            actions={{ label: columns.actions, width: commissionActionsColumnWidth }}
            columns={tableColumns}
            onResize={resizeColumn}
            onSort={handleSort}
            sortState={sortState}
          />
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-5 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t.commissions.table.emptyTitle}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.commissions.table.emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedRows.map((record) => (
              <TableRow key={record.id} className="border-slate-200 align-top hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-800/70">
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                  <p className="break-all font-medium text-slate-950 dark:text-white">{record.id}</p>
                  <p className="mt-1 break-words text-xs font-medium text-slate-500">{record.commissionRuleName}</p>
                </TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-medium text-slate-800 dark:text-slate-100"><span className="block break-words">{record.salesRepName}</span></TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-medium text-slate-800 dark:text-slate-100"><span className="block break-words">{record.customerName}</span></TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                  <p className="break-all font-medium text-slate-950 dark:text-white">{record.saleCode}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{formatCommissionMoney(record.saleAmount, record.currency)}</p>
                </TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-medium text-slate-700 dark:text-slate-200"><span className="block break-words">{record.productName}</span></TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 text-right align-top font-medium tabular-nums text-slate-950 dark:text-white"><span className="block break-words">{formatCommissionMoney(record.commissionAmount, record.currency)}</span></TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 text-center align-top"><CommissionStatusBadge status={record.status} t={t} /></TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-medium text-slate-700 dark:text-slate-200">{formatSalesDate(record.createdDate)}</TableCell>
                <TableCell className="overflow-hidden whitespace-normal px-4 py-5 text-right align-top">
                  <IndiceTableActionGroup>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t.commissions.table.actions.viewDetail}
                        className="h-9 w-9 rounded-lg border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/25"
                        onClick={() => onViewRecord(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8} className="max-w-[220px] rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium leading-4 text-white shadow-xl">
                      {t.commissions.table.actions.viewDetail}
                    </TooltipContent>
                  </Tooltip>
                  </IndiceTableActionGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
