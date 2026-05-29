import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SalesColumnId } from '../types/salesTypes';
import { SalesTableRow } from './SalesTableRow';

export function SalesTable({
  records,
  visibleColumns,
  t,
  onViewRecord,
  onPreviewSummary,
  onManageCommission,
  onPrepareMovement,
  onSendToFinance,
  onCancelSale,
}: {
  records: SaleRecord[];
  visibleColumns: SalesColumnId[];
  t: SalesRecordsTranslations;
  onViewRecord: (record: SaleRecord) => void;
  onPreviewSummary: (record: SaleRecord) => void;
  onManageCommission: (record: SaleRecord) => void;
  onPrepareMovement: (record: SaleRecord) => void;
  onSendToFinance: (record: SaleRecord) => void;
  onCancelSale: (record: SaleRecord) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <Table className="min-w-[1460px]">
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
            {visibleColumns.map((column) => (
              <TableHead key={column} className="px-5 py-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t.table.columns[column]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="px-5 py-12 text-center">
                <div className="mx-auto max-w-md space-y-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t.table.emptyTitle}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.table.emptyDescription}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : records.map((record) => (
            <SalesTableRow
              key={record.id}
              record={record}
              visibleColumns={visibleColumns}
              t={t}
              onView={onViewRecord}
              onPreviewSummary={onPreviewSummary}
              onManageCommission={onManageCommission}
              onPrepareMovement={onPrepareMovement}
              onSendToFinance={onSendToFinance}
              onCancelSale={onCancelSale}
            />
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
