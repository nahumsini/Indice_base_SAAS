import { Eye } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRecord, CommissionStatus } from '../types/commissions';
import { formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';

const statusClasses: Record<CommissionStatus, string> = {
  pending: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  approved: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  paid: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]',
  cancelled: 'border-slate-300 bg-slate-100 text-slate-500',
};

export function CommissionStatusBadge({
  status,
  t,
}: {
  status: CommissionStatus;
  t: SalesRecordsTranslations;
}) {
  return (
    <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', statusClasses[status])}>
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

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <Table className="min-w-[1280px]">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
              {[columns.commissionId, columns.salesRep, columns.customer, columns.sale, columns.product, columns.commissionAmount, columns.status, columns.createdDate, columns.actions].map((column) => (
                <TableHead key={column} className="px-5 py-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-5 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t.commissions.table.emptyTitle}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.commissions.table.emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.map((record) => (
              <TableRow key={record.id} className="border-slate-200 hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-800/70">
                <TableCell className="px-5 py-5">
                  <p className="font-black text-slate-950 dark:text-white">{record.id}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{record.commissionRuleName}</p>
                </TableCell>
                <TableCell className="px-5 py-5 font-bold text-slate-800 dark:text-slate-100">{record.salesRepName}</TableCell>
                <TableCell className="px-5 py-5 font-bold text-slate-800 dark:text-slate-100">{record.customerName}</TableCell>
                <TableCell className="px-5 py-5">
                  <p className="font-black text-slate-950 dark:text-white">{record.saleCode}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatSalesCurrency(record.saleAmount)}</p>
                </TableCell>
                <TableCell className="px-5 py-5 font-semibold text-slate-700 dark:text-slate-200">{record.productName}</TableCell>
                <TableCell className="px-5 py-5 font-black text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount)}</TableCell>
                <TableCell className="px-5 py-5"><CommissionStatusBadge status={record.status} t={t} /></TableCell>
                <TableCell className="px-5 py-5 font-semibold text-slate-700 dark:text-slate-200">{formatSalesDate(record.createdDate)}</TableCell>
                <TableCell className="px-5 py-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title={t.commissions.table.actions.viewDetail}
                    aria-label={t.commissions.table.actions.viewDetail}
                    className="h-9 w-9 rounded-lg border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20"
                    onClick={() => onViewRecord(record)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
