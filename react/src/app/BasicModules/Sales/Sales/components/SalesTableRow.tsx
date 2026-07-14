import type { ReactNode } from 'react';
import { BadgePercent, CreditCard, Eye, FileSearch, PackageCheck, Send, XCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleCustomerHealthStatus, SaleCustomerRelationshipStatus, SaleLifecycleSignals, SaleRecord, SalesColumnId } from '../types/salesTypes';
import { formatCommissionRate, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { InventoryMovementBadge } from './InventoryMovementBadge';
import { SalesStatusBadge } from './SalesStatusBadge';
import { ValidationStatusBadge } from './ValidationStatusBadge';

const relationshipClasses: Record<SaleCustomerRelationshipStatus, string> = {
  first_purchase: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  recurring: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  renewal: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  recovered: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  dormant: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const healthClasses: Record<SaleCustomerHealthStatus, string> = {
  healthy: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  attention: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  at_risk: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]',
  lost: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const salesCellClassName = 'overflow-hidden whitespace-normal px-5 py-5 align-top';

function OptionalText({
  value,
  fallback,
}: {
  value: string;
  fallback: string;
}) {
  return <span className={cn('block min-w-0 break-words', value ? 'text-slate-700 dark:text-slate-200' : 'font-medium text-slate-400')}>{value || fallback}</span>;
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
  const control = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25',
        className,
        disabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-800',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{control}</span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-[220px] rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold leading-4 text-white shadow-xl"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function SalesTableRow({
  record,
  selected,
  visibleColumns,
  lifecycle,
  t,
  onSelectionChange,
  onView,
  onPreviewSummary,
  onManageCommission,
  onPrepareMovement,
  onSendToFinance,
  onSendToCredit,
  onCancelSale,
}: {
  record: SaleRecord;
  selected: boolean;
  visibleColumns: SalesColumnId[];
  lifecycle?: SaleLifecycleSignals;
  t: SalesRecordsTranslations;
  onSelectionChange: (checked: boolean) => void;
  onView: (record: SaleRecord) => void;
  onPreviewSummary: (record: SaleRecord) => void;
  onManageCommission: (record: SaleRecord) => void;
  onPrepareMovement: (record: SaleRecord) => void;
  onSendToFinance: (record: SaleRecord) => void;
  onSendToCredit: (record: SaleRecord) => void;
  onCancelSale: (record: SaleRecord) => void;
}) {
  const isVisible = (column: SalesColumnId) => visibleColumns.includes(column);
  const isCancelled = record.commercialStatus === 'cancelled';
  const movementPrepared = record.inventoryMovementStatus !== 'not_generated';
  const financeApproved = record.financeStatus === 'approved';
  const relationship = lifecycle?.relationship ?? 'first_purchase';
  const health = lifecycle?.health ?? 'healthy';

  return (
    <TableRow className="border-slate-200 align-top hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-800/70">
      <TableCell className="w-[56px] px-5 py-5 align-top">
        <Checkbox
          aria-label={t.table.selection.selectSale(record.saleNumber)}
          checked={selected}
          className="border-slate-300 data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
          onCheckedChange={(checked) => onSelectionChange(checked === true)}
        />
      </TableCell>
      {isVisible('saleNumber') ? (
        <TableCell className={salesCellClassName}>
          <div className="min-w-0 max-w-full">
            <p className="break-all font-semibold text-slate-950 dark:text-white">{record.saleNumber}</p>
            <p className="mt-1 break-all text-xs font-semibold text-[#B63B32]">{record.id}</p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('customer') ? (
        <TableCell className={salesCellClassName}>
          <div className="min-w-0 max-w-full">
            <p className="break-words font-bold text-slate-950 dark:text-white">{record.customerName}</p>
            <p className="mt-1 break-all text-xs font-semibold text-slate-500">{record.quoteReference}</p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('seller') ? (
        <TableCell className={salesCellClassName}>
          <div className="min-w-0 max-w-full">
            <p className="break-words text-sm font-bold text-slate-800 dark:text-slate-100">{record.sellerName}</p>
            <p className="mt-1 break-words text-xs font-semibold text-slate-500">
              {[record.businessUnitName, record.businessName].filter(Boolean).join(' · ') || t.common.notAvailable}
            </p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('total') ? (
        <TableCell className={salesCellClassName}>
          <p className="break-words text-sm font-semibold text-slate-950 dark:text-white">{formatSalesCurrency(record.totalAmount, record.currency)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{record.currency}</p>
        </TableCell>
      ) : null}
      {isVisible('saleDate') ? <TableCell className={cn(salesCellClassName, 'text-sm font-semibold text-slate-700 dark:text-slate-200')}>{formatSalesDate(record.saleDate)}</TableCell> : null}
      {isVisible('relationship') ? (
        <TableCell className={salesCellClassName}>
          <span className={cn('inline-flex h-auto max-w-full whitespace-normal break-words rounded-full border px-3 py-1 text-xs font-bold', relationshipClasses[relationship])}>
            {t.lifecycle.relationship[relationship]}
          </span>
        </TableCell>
      ) : null}
      {isVisible('customerHealth') ? (
        <TableCell className={salesCellClassName}>
          <span className={cn('inline-flex h-auto max-w-full whitespace-normal break-words rounded-full border px-3 py-1 text-xs font-bold', healthClasses[health])}>
            {t.lifecycle.health[health]}
          </span>
        </TableCell>
      ) : null}
      {isVisible('postSaleStatus') ? (
        <TableCell className={salesCellClassName}>
          <OptionalText value={lifecycle?.postSaleStatus ?? ''} fallback={t.lifecycle.noPostSaleStatus} />
        </TableCell>
      ) : null}
      {isVisible('commercialStatus') ? <TableCell className={salesCellClassName}><SalesStatusBadge status={record.commercialStatus} t={t} /></TableCell> : null}
      {isVisible('financeStatus') ? <TableCell className={salesCellClassName}><ValidationStatusBadge label={t.statuses.finance[record.financeStatus]} tone={record.financeStatus} /></TableCell> : null}
      {isVisible('inventoryStatus') ? <TableCell className={salesCellClassName}><ValidationStatusBadge label={t.statuses.inventory[record.inventoryStatus]} tone={record.inventoryStatus} /></TableCell> : null}
      {isVisible('inventoryMovement') ? <TableCell className={salesCellClassName}><InventoryMovementBadge status={record.inventoryMovementStatus} t={t} /></TableCell> : null}
      {isVisible('commission') ? (
        <TableCell className={salesCellClassName}>
          <div className="space-y-2">
            <ValidationStatusBadge label={t.statuses.commission[record.commissionStatus]} tone={record.commissionStatus} />
            <p className="break-words text-sm font-semibold text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('commissionStatus') ? (
        <TableCell className={salesCellClassName}>
          <div className="space-y-2">
            <ValidationStatusBadge label={t.statuses.commission[record.commissionStatus]} tone={record.commissionStatus} />
            <p className="break-words text-sm font-semibold text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p>
          </div>
        </TableCell>
      ) : null}
      {isVisible('quoteReference') ? <TableCell className={cn(salesCellClassName, 'break-all text-sm font-semibold text-slate-700 dark:text-slate-200')}>{record.quoteReference}</TableCell> : null}
      {isVisible('paymentMethod') ? <TableCell className={cn(salesCellClassName, 'text-sm')}><OptionalText value={record.paymentMethod} fallback={t.common.notAvailable} /></TableCell> : null}
      {isVisible('paymentEvidence') ? <TableCell className={salesCellClassName}><ValidationStatusBadge label={t.statuses.paymentEvidence[record.paymentEvidenceStatus]} tone={record.paymentEvidenceStatus} /></TableCell> : null}
      {isVisible('deliveryStatus') ? <TableCell className={salesCellClassName}><ValidationStatusBadge label={t.statuses.delivery[record.deliveryStatus]} tone={record.deliveryStatus} /></TableCell> : null}
      {isVisible('commissionAmount') ? (
        <TableCell className={salesCellClassName}>
          <p className="break-words text-sm font-semibold text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{formatCommissionRate(record.commissionRate)}</p>
        </TableCell>
      ) : null}
      {isVisible('movementReference') ? <TableCell className={cn(salesCellClassName, 'text-sm')}><OptionalText value={record.inventoryMovementReference} fallback={t.common.notAvailable} /></TableCell> : null}
      {isVisible('actions') ? (
        <TableCell className={cn(salesCellClassName, 'px-4')}>
          <div className="mx-auto grid w-fit grid-cols-[repeat(3,2.25rem)] gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <RowActionButton
              label={t.common.view}
              icon={<Eye className="h-4 w-4" />}
              className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
              onClick={() => onView(record)}
            />
            <RowActionButton
              label={t.table.actions.previewSummary}
              icon={<FileSearch className="h-4 w-4" />}
              className="border-[#FF6B5E]/25 bg-white text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
              onClick={() => onPreviewSummary(record)}
            />
            <RowActionButton
              label={t.table.actions.manageCommission}
              icon={<BadgePercent className="h-4 w-4" />}
              className="border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] hover:bg-[#F4C84A]/25 dark:text-[#F7D973] dark:hover:bg-[#F4C84A]/25"
              onClick={() => onManageCommission(record)}
            />
            <RowActionButton
              label={movementPrepared ? t.table.actions.alreadyPrepared : t.table.actions.prepareMovement}
              icon={<PackageCheck className="h-4 w-4" />}
              className="border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/15 dark:text-[#7AD8BF] dark:hover:bg-[#59C3A5]/20"
              disabled={isCancelled || movementPrepared}
              onClick={() => onPrepareMovement(record)}
            />
            <RowActionButton
              label={financeApproved ? t.table.actions.financeApproved : t.table.actions.sendToFinance}
              icon={<Send className="h-4 w-4" />}
              className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15 dark:text-blue-300 dark:hover:bg-[#2563EB]/20"
              disabled={isCancelled || financeApproved}
              onClick={() => onSendToFinance(record)}
            />
            <RowActionButton
              label={t.table.actions.sendToCredit}
              icon={<CreditCard className="h-4 w-4" />}
              className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              disabled={isCancelled}
              onClick={() => onSendToCredit(record)}
            />
            <RowActionButton
              label={isCancelled ? t.table.actions.cancelled : t.table.actions.cancelSale}
              icon={<XCircle className="h-4 w-4" />}
              className="border-[#FF6B5E]/30 bg-white text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
              disabled={isCancelled}
              onClick={() => onCancelSale(record)}
            />
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
