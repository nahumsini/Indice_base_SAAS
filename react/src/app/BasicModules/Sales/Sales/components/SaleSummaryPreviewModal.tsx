import { FileSearch, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';
import { getSalesModalStyles } from '../../salesModalStyles';
import type { SalesQuote } from '../../types';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SaleRecordDraft } from '../types/salesTypes';
import { formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { DetailField, SectionCard } from './SalesModalPrimitives';
import { InventoryMovementBadge } from './InventoryMovementBadge';
import { ValidationStatusBadge } from './ValidationStatusBadge';

const modalStyles = getSalesModalStyles('coral');

export function SaleSummaryPreviewModal({
  open,
  sale,
  quote,
  t,
  onOpenChange,
}: {
  open: boolean;
  sale: SaleRecord | SaleRecordDraft | null;
  quote?: SalesQuote | null;
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const currency = sale?.currency || 'MXN';
  const totalAmount = sale?.totalAmount || quote?.total || 0;
  const saleLines = sale?.saleLines ?? [];
  const quoteLines = quote?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(modalStyles.content, '!flex max-h-[90vh] max-w-[980px] flex-col !gap-0')} closeButtonClassName={modalStyles.close}>
        <DialogHeader className={cn(modalStyles.header, 'shrink-0')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className={modalStyles.title}>
                <FileSearch className="h-6 w-6" />
                {t.summaryPreview.title}
              </DialogTitle>
              <DialogDescription className={modalStyles.description}>{t.summaryPreview.description}</DialogDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" className={modalStyles.close} onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <SectionCard title={t.summaryPreview.sections.general}>
            <section className="grid gap-3 md:grid-cols-2">
              <DetailField label={t.table.columns.saleNumber} value={sale?.saleNumber ?? t.common.notAvailable} />
              <DetailField label={t.modal.fields.quoteReference} value={sale?.quoteReference || quote?.quoteNumber || t.common.notAvailable} />
              <DetailField label={t.modal.fields.customerName} value={sale?.customerName || quote?.clientName || t.common.notAvailable} />
              <DetailField label={t.modal.fields.sellerName} value={sale?.sellerName || quote?.assignedSeller || t.common.notAvailable} />
              <DetailField label={t.modal.fields.businessUnit} value={sale?.businessUnitName || t.common.notAvailable} />
              <DetailField label={t.modal.fields.business} value={sale?.businessName || t.common.notAvailable} />
            </section>
          </SectionCard>

          <SectionCard title={t.summaryPreview.sections.products}>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="grid grid-cols-[1fr_90px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                <span>{t.modal.summaryColumns.item}</span>
                <span>{t.modal.summaryColumns.quantity}</span>
                <span className="text-right">{t.modal.summaryColumns.total}</span>
              </div>
              {saleLines.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_90px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">{item.productName}</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{item.quantity}</span>
                  <span className="text-right font-black text-slate-900 dark:text-white">{formatSalesCurrency(item.subtotal, currency)}</span>
                </div>
              ))}
              {!saleLines.length ? quoteLines.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_90px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">{item.productName}</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{item.quantity}</span>
                  <span className="text-right font-black text-slate-900 dark:text-white">{formatSalesCurrency(item.quantity * item.unitPrice, currency)}</span>
                </div>
              )) : null}
              {!saleLines.length && !quoteLines.length ? (
                <div className="px-4 py-5 text-sm font-semibold text-slate-500">{t.summaryPreview.noProducts}</div>
              ) : null}
            </div>
          </SectionCard>

          <section className="grid gap-4 lg:grid-cols-2">
            <SectionCard title={t.summaryPreview.sections.totals}>
              <DetailField label={t.modal.fields.totalAmount} value={formatSalesCurrency(totalAmount, currency)} />
            </SectionCard>
            <SectionCard title={t.summaryPreview.sections.payment}>
              <section className="grid gap-3">
                <DetailField label={t.modal.fields.paymentMethod} value={sale?.paymentMethod || t.common.notAvailable} />
                <DetailField label={t.modal.fields.paymentReference} value={sale?.paymentReference || t.common.notAvailable} />
                {sale ? <ValidationStatusBadge label={t.statuses.paymentEvidence[sale.paymentEvidenceStatus]} tone={sale.paymentEvidenceStatus} /> : null}
              </section>
            </SectionCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard title={t.summaryPreview.sections.inventory}>
              {sale ? <InventoryMovementBadge status={sale.inventoryMovementStatus} t={t} /> : null}
            </SectionCard>
            <SectionCard title={t.summaryPreview.sections.validation}>
              <section className="space-y-2">
                {sale ? <ValidationStatusBadge label={t.statuses.finance[sale.financeStatus]} tone={sale.financeStatus} /> : null}
                {sale ? <ValidationStatusBadge label={t.statuses.inventory[sale.inventoryStatus]} tone={sale.inventoryStatus} /> : null}
              </section>
            </SectionCard>
            <SectionCard title={t.summaryPreview.sections.commission}>
              <section className="space-y-3">
                {sale ? <ValidationStatusBadge label={t.statuses.commission[sale.commissionStatus]} tone={sale.commissionStatus} /> : null}
                <DetailField label={t.modal.fields.commissionAmount} value={formatSalesCurrency(sale?.commissionAmount ?? 0, currency)} />
              </section>
            </SectionCard>
          </section>

          <div className="space-y-1 text-xs font-semibold text-slate-500">
            {sale?.saleDate ? <p>{t.modal.fields.saleDate}: {formatSalesDate(sale.saleDate)}</p> : null}
            <p>{t.summaryPreview.footerNote}</p>
          </div>
        </div>

        <DialogFooter className={cn(modalStyles.footer, 'shrink-0')}>
          <Button type="button" className={modalStyles.secondaryButton} onClick={() => onOpenChange(false)}>{t.common.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
