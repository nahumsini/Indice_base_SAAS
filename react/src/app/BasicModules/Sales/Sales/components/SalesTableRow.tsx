import type { ReactNode } from 'react';
import {
  BadgePercent,
  CreditCard,
  Eye,
  FileDown,
  FileSearch,
  MoreHorizontal,
  PackageCheck,
  Send,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type {
  SaleCustomerHealthStatus,
  SaleCustomerRelationshipStatus,
  SaleLifecycleSignals,
  SaleReceivableSummary,
  SaleRecord,
  SaleSourceSummary,
  SalesColumnId,
} from '../types/salesTypes';
import { formatCommissionRate, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { getSaleNextActionKey } from '../utils/salesOperationalSignals';
import { isSalesCreditPaymentMethod, normalizeSalesPaymentMethod } from '../utils/salesPaymentMethods';
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

const nextActionClasses = {
  cancelled: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  validateCommercial: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  resolveCommercial: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  createReceivable: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  resolveFinance: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  uploadEvidence: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  validatePayment: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  collectBalance: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  resolveInventory: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  prepareInventory: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  validateInventory: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  startDelivery: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
  completeDelivery: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
} as const;

const salesCellClassName = 'overflow-hidden whitespace-normal px-4 py-4 align-top';

function OptionalText({ value, fallback }: { value: string; fallback: string }) {
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
      <TooltipTrigger asChild><span className="inline-flex">{control}</span></TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-[220px] rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium leading-4 text-white shadow-xl">
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
  receivable,
  source,
  t,
  onSelectionChange,
  onView,
  onPreviewSummary,
  onDownloadQuote,
  onDownloadInvoice,
  onManageCommission,
  onPrepareMovement,
  onSendToFinance,
  onSendToCredit,
  onOpenReceivables,
  onCancelSale,
}: {
  record: SaleRecord;
  selected: boolean;
  visibleColumns: SalesColumnId[];
  lifecycle?: SaleLifecycleSignals;
  receivable?: SaleReceivableSummary;
  source?: SaleSourceSummary;
  t: SalesRecordsTranslations;
  onSelectionChange: (checked: boolean) => void;
  onView: (record: SaleRecord) => void;
  onPreviewSummary: (record: SaleRecord) => void;
  onDownloadQuote: (record: SaleRecord) => void;
  onDownloadInvoice: (record: SaleRecord) => void;
  onManageCommission: (record: SaleRecord) => void;
  onPrepareMovement: (record: SaleRecord) => void;
  onSendToFinance: (record: SaleRecord) => void;
  onSendToCredit: (record: SaleRecord) => void;
  onOpenReceivables: (record: SaleRecord) => void;
  onCancelSale: (record: SaleRecord) => void;
}) {
  const isVisible = (column: SalesColumnId) => visibleColumns.includes(column);
  const isCancelled = record.commercialStatus === 'cancelled';
  const movementPrepared = record.inventoryMovementStatus !== 'not_generated';
  const financeApproved = record.financeStatus === 'approved';
  const relationship = lifecycle?.relationship ?? 'first_purchase';
  const health = lifecycle?.health ?? 'healthy';
  const nextAction = getSaleNextActionKey(record, receivable);
  const paymentMethodId = normalizeSalesPaymentMethod(record.paymentMethod);
  const paymentMethodLabel = paymentMethodId
    ? t.modal.paymentMethods[paymentMethodId]
    : record.paymentMethod || t.common.notAvailable;
  const isCredit = isSalesCreditPaymentMethod(record.paymentMethod);
  const marginRate = record.totalAmount > 0 ? (record.marginTotal / record.totalAmount) * 100 : 0;
  const businessContext = [record.businessUnitName, record.businessName].filter(Boolean).join(' · ');

  return (
    <TableRow className="border-slate-200 align-top hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-800/70">
      <TableCell className="w-[56px] px-4 py-4 align-top">
        <Checkbox
          aria-label={t.table.selection.selectSale(record.saleNumber)}
          checked={selected}
          className="border-slate-300 data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
          onCheckedChange={(checked) => onSelectionChange(checked === true)}
        />
      </TableCell>

      {isVisible('saleNumber') ? (
        <TableCell className={salesCellClassName}>
          <p className="break-all font-medium text-slate-950 dark:text-white">{record.saleNumber}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{formatSalesDate(record.saleDate)}</p>
          <p className="mt-2 break-words text-xs font-medium text-[#B63B32]">{source?.opportunityName || t.table.operational.directSale}</p>
          {source?.quoteReference ? <p className="mt-1 break-all text-xs text-slate-500">{source.quoteReference}</p> : null}
        </TableCell>
      ) : null}

      {isVisible('customer') ? (
        <TableCell className={salesCellClassName}>
          <p className="break-words font-medium text-slate-950 dark:text-white">{record.customerName}</p>
          <p className="mt-1 break-words text-xs font-medium text-slate-500">{businessContext || t.common.notAvailable}</p>
          {record.warehouseName ? <p className="mt-2 break-words text-xs text-slate-500">{t.table.operational.warehouse}: {record.warehouseName}</p> : null}
        </TableCell>
      ) : null}

      {isVisible('seller') ? <TableCell className={salesCellClassName}><p className="break-words text-sm font-medium text-slate-800 dark:text-slate-100">{record.sellerName}</p></TableCell> : null}

      {isVisible('total') ? (
        <TableCell className={salesCellClassName}>
          <p className="break-words text-sm font-medium text-slate-950 dark:text-white">{formatSalesCurrency(record.totalAmount, record.currency)}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{record.currency}</p>
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">{t.table.operational.margin}: {formatSalesCurrency(record.marginTotal, record.currency)} · {Math.round(marginRate)}%</p>
        </TableCell>
      ) : null}

      {isVisible('saleDate') ? <TableCell className={cn(salesCellClassName, 'text-sm font-medium text-slate-700 dark:text-slate-200')}>{formatSalesDate(record.saleDate)}</TableCell> : null}
      {isVisible('relationship') ? <TableCell className={salesCellClassName}><span className={cn('inline-flex h-auto max-w-full whitespace-normal break-words rounded-full border px-3 py-1 text-xs font-medium', relationshipClasses[relationship])}>{t.lifecycle.relationship[relationship]}</span></TableCell> : null}
      {isVisible('customerHealth') ? <TableCell className={salesCellClassName}><span className={cn('inline-flex h-auto max-w-full whitespace-normal break-words rounded-full border px-3 py-1 text-xs font-medium', healthClasses[health])}>{t.lifecycle.health[health]}</span></TableCell> : null}
      {isVisible('postSaleStatus') ? <TableCell className={salesCellClassName}><OptionalText value={lifecycle?.postSaleStatus ?? ''} fallback={t.lifecycle.noPostSaleStatus} /></TableCell> : null}
      {isVisible('commercialStatus') ? <TableCell className={salesCellClassName}><SalesStatusBadge status={record.commercialStatus} t={t} /></TableCell> : null}

      {isVisible('financeStatus') ? (
        <TableCell className={salesCellClassName}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-950 dark:text-white">{paymentMethodLabel}</span>
              <ValidationStatusBadge label={t.statuses.finance[record.financeStatus]} tone={record.financeStatus} />
            </div>
            {isCredit ? (
              receivable ? (
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p>{t.table.operational.collected}: <strong>{formatSalesCurrency(receivable.paidAmount, receivable.currency)}</strong></p>
                  <p>{t.table.operational.balance}: <strong className="text-emerald-700 dark:text-emerald-300">{formatSalesCurrency(receivable.balance, receivable.currency)}</strong></p>
                  <p>{t.table.operational.dueDate}: {formatSalesDate(receivable.nextPaymentDate || receivable.dueDate)}</p>
                  <button type="button" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-300" onClick={() => onOpenReceivables(record)}><WalletCards className="h-3.5 w-3.5" /> {t.table.operational.openReceivables}</button>
                </div>
              ) : (
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" onClick={() => onOpenReceivables(record)}><WalletCards className="h-3.5 w-3.5" /> {t.table.operational.creditPending}</button>
              )
            ) : <p className="text-xs text-slate-500">{t.table.operational.evidence}: {t.statuses.paymentEvidence[record.paymentEvidenceStatus]}</p>}
          </div>
        </TableCell>
      ) : null}

      {isVisible('inventoryStatus') ? <TableCell className={salesCellClassName}><ValidationStatusBadge label={t.statuses.inventory[record.inventoryStatus]} tone={record.inventoryStatus} /></TableCell> : null}
      {isVisible('inventoryMovement') ? <TableCell className={salesCellClassName}><InventoryMovementBadge status={record.inventoryMovementStatus} t={t} /></TableCell> : null}
      {isVisible('commission') ? <TableCell className={salesCellClassName}><div className="space-y-2"><ValidationStatusBadge label={t.statuses.commission[record.commissionStatus]} tone={record.commissionStatus} /><p className="break-words text-sm font-medium text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p></div></TableCell> : null}
      {isVisible('commissionStatus') ? <TableCell className={salesCellClassName}><div className="space-y-2"><ValidationStatusBadge label={t.statuses.commission[record.commissionStatus]} tone={record.commissionStatus} /><p className="break-words text-sm font-medium text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p></div></TableCell> : null}
      {isVisible('quoteReference') ? <TableCell className={cn(salesCellClassName, 'break-all text-sm font-medium text-slate-700 dark:text-slate-200')}>{record.quoteReference}</TableCell> : null}
      {isVisible('paymentMethod') ? <TableCell className={cn(salesCellClassName, 'text-sm')}><OptionalText value={paymentMethodLabel} fallback={t.common.notAvailable} /></TableCell> : null}
      {isVisible('paymentEvidence') ? <TableCell className={salesCellClassName}><ValidationStatusBadge label={t.statuses.paymentEvidence[record.paymentEvidenceStatus]} tone={record.paymentEvidenceStatus} /></TableCell> : null}

      {isVisible('deliveryStatus') ? (
        <TableCell className={salesCellClassName}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><ValidationStatusBadge label={t.statuses.delivery[record.deliveryStatus]} tone={record.deliveryStatus} /><span className="text-xs font-medium text-slate-500">{t.table.operational.delivery}</span></div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{t.table.operational.inventory}: {t.statuses.inventory[record.inventoryStatus]}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{t.table.operational.movement}: {t.statuses.movement[record.inventoryMovementStatus]}</p>
          </div>
        </TableCell>
      ) : null}

      {isVisible('commissionAmount') ? <TableCell className={salesCellClassName}><p className="break-words text-sm font-medium text-slate-950 dark:text-white">{formatSalesCurrency(record.commissionAmount, record.currency)}</p><p className="mt-1 text-xs font-medium text-slate-500">{formatCommissionRate(record.commissionRate)}</p></TableCell> : null}
      {isVisible('movementReference') ? <TableCell className={cn(salesCellClassName, 'text-sm')}><OptionalText value={record.inventoryMovementReference} fallback={t.common.notAvailable} /></TableCell> : null}

      {isVisible('nextAction') ? <TableCell className={salesCellClassName}><span className={cn('inline-flex max-w-full whitespace-normal rounded-full border px-3 py-1.5 text-xs font-medium leading-4', nextActionClasses[nextAction])}>{t.table.nextActions[nextAction]}</span></TableCell> : null}

      {isVisible('actions') ? (
        <TableCell className={cn(salesCellClassName, 'px-3')}>
          <div className="mx-auto grid w-fit grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <RowActionButton label={t.common.view} icon={<Eye className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20 dark:text-[#FFB0AA]" onClick={() => onView(record)} />
            <RowActionButton label={t.table.actions.downloadInvoice} icon={<FileDown className="h-4 w-4" />} className="border-violet-500/25 bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300" onClick={() => onDownloadInvoice(record)} />
            <RowActionButton label={t.table.actions.downloadQuote} icon={<FileDown className="h-4 w-4" />} className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300" disabled={!source?.hasQuoteDocument} onClick={() => onDownloadQuote(record)} />
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" aria-label={t.table.actions.moreActions} className="h-9 w-9 rounded-lg border-slate-200 text-slate-600 shadow-sm dark:border-slate-700 dark:text-slate-300"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white">{t.table.actions.moreActions}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => onPreviewSummary(record)}><FileSearch className="mr-2 h-4 w-4" />{t.table.actions.previewSummary}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onManageCommission(record)}><BadgePercent className="mr-2 h-4 w-4" />{t.table.actions.manageCommission}</DropdownMenuItem>
                <DropdownMenuItem disabled={isCancelled || movementPrepared} onSelect={() => onPrepareMovement(record)}><PackageCheck className="mr-2 h-4 w-4" />{movementPrepared ? t.table.actions.alreadyPrepared : t.table.actions.prepareMovement}</DropdownMenuItem>
                <DropdownMenuItem disabled={isCancelled || financeApproved} onSelect={() => onSendToFinance(record)}><Send className="mr-2 h-4 w-4" />{financeApproved ? t.table.actions.financeApproved : t.table.actions.sendToFinance}</DropdownMenuItem>
                <DropdownMenuItem disabled={isCancelled} onSelect={() => onSendToCredit(record)}><CreditCard className="mr-2 h-4 w-4" />{t.table.actions.sendToCredit}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isCancelled} className="text-red-700 focus:text-red-700 dark:text-red-300" onSelect={() => onCancelSale(record)}><XCircle className="mr-2 h-4 w-4" />{isCancelled ? t.table.actions.cancelled : t.table.actions.cancelSale}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
