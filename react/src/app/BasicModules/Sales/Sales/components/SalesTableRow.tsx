import type { ReactNode } from 'react';
import { BadgePercent, Eye, FileSearch, PackageCheck, Send, XCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SalesColumnId } from '../types/salesTypes';
import { formatCommissionRate, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { InventoryMovementBadge } from './InventoryMovementBadge';
import { SalesStatusBadge } from './SalesStatusBadge';
import { ValidationStatusBadge } from './ValidationStatusBadge';

function OptionalText({
  value,
  fallback,
}: {
  value: string;
  fallback: string;
}) {
  return <span className={value ? 'text-slate-700 dark:text-slate-200' : 'font-medium text-slate-400'}>{value || fallback}</span>;
}

function RowActionButton({
  label,
  icon,
  className,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={label}
      aria-label={label}
      className={cn(
        'h-9 w-9 shrink-0 rounded-lg border transition-colors',
        className,
        disabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-800',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </Button>
  );
}

export function SalesTableRow({
  record,
  visibleColumns,
  t,
  onView,
  onPreviewSummary,
  onManageCommission,
  onPrepareMovement,
  onSendToFinance,
  onCancelSale,
}: {
  record: SaleRecord;
  visibleColumns: SalesColumnId[];
  t: SalesRecordsTranslations;
  onView: (record: SaleRecord) => void;
  onPreviewSummary: (record: SaleRecord) => void;
  onManageCommission: (record: SaleRecord) => void;
  onPrepareMovement: (record: SaleRecord) => void;
  onSendToFinance: (record: SaleRecord) => void;
  onCancelSale: (record: SaleRecord) => void;
}) {
  const isVisible = (column: SalesColumnId) => visibleColumns.includes(column);
  const isCancelled = record.commercialStatus === 'cancelled';
  const movementPrepared = record.inventoryMovementStatus !== 'not_generated';
  const financeApproved = record.financeStatus === 'approved';

  return (
    <TableRow className="border-slate-200 hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-800/70">
      {isVisible('saleNumber') ? (
        <TableCell className="px-5 py-5">
          <div className="min-w-[160px]">
            <p className="font-black text-slate-950 dark:text-white">{record.saleNumber}</p>
            <p className="mt-1 text-xs font-semibold text-[#B63B32]">{record.id}</p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('customer') ? (
        <TableCell className="px-5 py-5">
          <div className="min-w-[180px]">
            <p className="font-bold text-slate-950 dark:text-white">{record.customerName}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{record.quoteReference}</p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('seller') ? (
        <TableCell className="px-5 py-5">
          <div className="min-w-[190px]">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{record.sellerName}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {[record.businessUnitName, record.businessName].filter(Boolean).join(' · ') || t.common.notAvailable}
            </p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('total') ? (
        <TableCell className="px-5 py-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">{formatSalesCurrency(record.totalAmount, record.currency)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{record.currency}</p>
        </TableCell>
      ) : null}
      {isVisible('saleDate') ? <TableCell className="px-5 py-5 text-sm font-semibold text-slate-700 dark:text-slate-200">{formatSalesDate(record.saleDate)}</TableCell> : null}
      {isVisible('commercialStatus') ? <TableCell className="px-5 py-5"><SalesStatusBadge status={record.commercialStatus} t={t} /></TableCell> : null}
      {isVisible('financeStatus') ? <TableCell className="px-5 py-5"><ValidationStatusBadge label={t.statuses.finance[record.financeStatus]} tone={record.financeStatus} /></TableCell> : null}
      {isVisible('inventoryStatus') ? <TableCell className="px-5 py-5"><ValidationStatusBadge label={t.statuses.inventory[record.inventoryStatus]} tone={record.inventoryStatus} /></TableCell> : null}
      {isVisible('inventoryMovement') ? <TableCell className="px-5 py-5"><InventoryMovementBadge status={record.inventoryMovementStatus} t={t} /></TableCell> : null}
      {isVisible('commissionStatus') ? (
        <TableCell className="px-5 py-5">
          <div className="space-y-2">
            <ValidationStatusBadge label={t.statuses.commission[record.commissionStatus]} tone={record.commissionStatus} />
            <p className="text-sm font-black text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('quoteReference') ? <TableCell className="px-5 py-5 text-sm font-semibold text-slate-700 dark:text-slate-200">{record.quoteReference}</TableCell> : null}
      {isVisible('paymentMethod') ? <TableCell className="px-5 py-5 text-sm"><OptionalText value={record.paymentMethod} fallback={t.common.notAvailable} /></TableCell> : null}
      {isVisible('paymentEvidence') ? <TableCell className="px-5 py-5"><ValidationStatusBadge label={t.statuses.paymentEvidence[record.paymentEvidenceStatus]} tone={record.paymentEvidenceStatus} /></TableCell> : null}
      {isVisible('deliveryStatus') ? <TableCell className="px-5 py-5"><ValidationStatusBadge label={t.statuses.delivery[record.deliveryStatus]} tone={record.deliveryStatus} /></TableCell> : null}
      {isVisible('commissionAmount') ? (
        <TableCell className="px-5 py-5">
          <p className="text-sm font-black text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{formatCommissionRate(record.commissionRate)}</p>
        </TableCell>
      ) : null}
      {isVisible('movementReference') ? <TableCell className="px-5 py-5 text-sm"><OptionalText value={record.inventoryMovementReference} fallback={t.common.notAvailable} /></TableCell> : null}
      {isVisible('actions') ? (
        <TableCell className="px-5 py-5">
          <div className="flex min-w-[282px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/60">
            <RowActionButton
              label={t.common.view}
              icon={<Eye className="h-4 w-4" />}
              className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20"
              onClick={() => onView(record)}
            />
            <RowActionButton
              label={t.table.actions.previewSummary}
              icon={<FileSearch className="h-4 w-4" />}
              className="border-blue-500/25 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-blue-300"
              onClick={() => onPreviewSummary(record)}
            />
            <RowActionButton
              label={t.table.actions.manageCommission}
              icon={<BadgePercent className="h-4 w-4" />}
              className="border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] hover:bg-[#F4C84A]/25"
              onClick={() => onManageCommission(record)}
            />
            <RowActionButton
              label={movementPrepared ? t.table.actions.alreadyPrepared : t.table.actions.prepareMovement}
              icon={<PackageCheck className="h-4 w-4" />}
              className="border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/15"
              disabled={isCancelled || movementPrepared}
              onClick={() => onPrepareMovement(record)}
            />
            <RowActionButton
              label={financeApproved ? t.table.actions.financeApproved : t.table.actions.sendToFinance}
              icon={<Send className="h-4 w-4" />}
              className="border-violet-500/25 bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300"
              disabled={isCancelled || financeApproved}
              onClick={() => onSendToFinance(record)}
            />
            <RowActionButton
              label={isCancelled ? t.table.actions.cancelled : t.table.actions.cancelSale}
              icon={<XCircle className="h-4 w-4" />}
              className="border-[#FF6B5E]/30 bg-white text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:bg-slate-900"
              disabled={isCancelled}
              onClick={() => onCancelSale(record)}
            />
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
