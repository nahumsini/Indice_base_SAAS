import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
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
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionCut } from '../types/commissions';
import { formatSalesCurrency } from '../utils/salesFormatters';

type CommissionCutColumnId = 'code' | 'period' | 'commissions' | 'employees' | 'total' | 'status';

const cutColumnWidths: Record<CommissionCutColumnId, number> = {
  code: 180,
  period: 240,
  commissions: 160,
  employees: 150,
  total: 190,
  status: 190,
};

const cutMinimumColumnWidths: Record<CommissionCutColumnId, number> = {
  code: 150,
  period: 200,
  commissions: 145,
  employees: 135,
  total: 160,
  status: 170,
};

const cutColumnIds = Object.keys(cutColumnWidths) as CommissionCutColumnId[];
const cutSortCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });

export function CommissionCutsTable({
  records,
  totalRecords,
  copy,
}: {
  records: CommissionCut[];
  totalRecords: number;
  copy: SalesRecordsTranslations['commissionWorkspace']['cutsPanel'];
}) {
  const [sortState, setSortState] = useState<{ columnId: CommissionCutColumnId; direction: 'asc' | 'desc' }>({
    columnId: 'period',
    direction: 'desc',
  });
  const labels = useMemo<Record<CommissionCutColumnId, string>>(() => ({
    code: copy.columns.code,
    period: copy.columns.period,
    commissions: copy.columns.commissions,
    employees: copy.columns.employees,
    total: copy.columns.total,
    status: copy.columns.status,
  }), [copy.columns]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<CommissionCutColumnId>({
    defaults: cutColumnWidths,
    headerLabels: labels,
    minWidths: cutMinimumColumnWidths,
    sortableColumnIds: cutColumnIds,
    storageKey: 'sales-commission-cuts-column-widths-v2',
  });
  const sortedRecords = useMemo(() => [...records].sort((left, right) => {
    const getSortValue = (record: CommissionCut) => {
      switch (sortState.columnId) {
        case 'code': return record.cutCode;
        case 'period': return `${record.periodEnd} ${record.periodStart}`;
        case 'commissions': return record.commissionCount;
        case 'employees': return record.employeeCount;
        case 'total': return record.totalAmount;
        case 'status': return record.status;
        default: return '';
      }
    };
    const leftValue = getSortValue(left);
    const rightValue = getSortValue(right);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : cutSortCollator.compare(String(leftValue), String(rightValue));
    const directedResult = sortState.direction === 'asc' ? result : -result;
    return directedResult || left.id - right.id;
  }), [records, sortState]);
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
  const minimumWidth = cutColumnIds.reduce((total, columnId) => total + columnWidths[columnId], 0);
  const handleSort = (columnId: CommissionCutColumnId) => {
    setSortState((current) => current.columnId === columnId
      ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { columnId, direction: 'asc' });
  };
  const tableColumns: Array<IndiceTableColumnDefinition<CommissionCutColumnId>> = cutColumnIds.map((columnId) => ({
    id: columnId,
    label: labels[columnId],
    width: columnWidths[columnId],
    defaultWidth: cutColumnWidths[columnId],
    contentMinimumWidth: cutMinimumColumnWidths[columnId],
    alignment: ['commissions', 'employees', 'total'].includes(columnId) ? 'right' : columnId === 'status' ? 'center' : 'left',
    sortable: true,
    resizeLabel: `${labels[columnId]}: ajustar ancho`,
  }));

  return (
    <IndiceTableShell
      pagination={records.length ? (
        <DataTablePagination
          currentPage={currentPage}
          itemLabel={copy.title.toLocaleLowerCase()}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      ) : undefined}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h3 className="font-medium text-slate-950 dark:text-white">{copy.title}</h3>
          <p className="mt-1 text-xs font-normal text-slate-500">{copy.description}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{copy.count(records.length)}</span>
      </div>
      {records.length ? (
        <IndiceOperationalTable minimumWidth={minimumWidth}>
          <IndiceTableColGroup columns={tableColumns} />
          <IndiceTableHeaderRow
            columns={tableColumns}
            onResize={resizeColumn}
            onSort={handleSort}
            sortState={sortState}
          />
          <TableBody>
            {paginatedRows.map((cut) => (
              <TableRow key={cut.id} className="border-slate-100 hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-800/70">
                <TableCell className="px-5 py-4 font-medium text-slate-950 dark:text-white">{cut.cutCode}</TableCell>
                <TableCell className="px-5 py-4 font-normal text-slate-600 dark:text-slate-300">{cut.periodStart} → {cut.periodEnd}</TableCell>
                <TableCell className="px-5 py-4 text-right font-normal tabular-nums">{cut.commissionCount}</TableCell>
                <TableCell className="px-5 py-4 text-right font-normal tabular-nums">{cut.employeeCount}</TableCell>
                <TableCell className="px-5 py-4 text-right font-medium tabular-nums">
                  {Object.entries(cut.currencyTotals ?? {}).map(([currency, amount]) => (
                    <span key={currency} className="block">{formatSalesCurrency(amount, currency)}</span>
                  ))}
                </TableCell>
                <TableCell className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cut.status === 'consumed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                    {cut.status === 'consumed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                    {cut.status === 'consumed' ? copy.consumed : copy.applied(cut.appliedCount, cut.employeeCount)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </IndiceOperationalTable>
      ) : (
        <div className="p-8 text-center text-sm font-normal text-slate-500">{totalRecords ? copy.noMatch : copy.empty}</div>
      )}
    </IndiceTableShell>
  );
}
