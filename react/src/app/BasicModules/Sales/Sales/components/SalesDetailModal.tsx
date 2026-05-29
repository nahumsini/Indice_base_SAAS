import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, FileSearch } from 'lucide-react';
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
import { salesBusinessOptions, salesBusinessUnitOptions } from '../data/salesBusinessOptions';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SaleRecordDraft } from '../types/salesTypes';
import { calculateCommissionAmount, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { SalesCreateForm } from './SalesCreateForm';
import { SaleSummaryPreviewModal } from './SaleSummaryPreviewModal';
import { DetailField, SectionCard } from './SalesModalPrimitives';
import { SalesOperationalContextCard } from './SalesOperationalContextCard';
import { SalesStatusSelectors } from './SalesStatusSelectors';

const modalStyles = getSalesModalStyles('coral');

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultBusinessScope() {
  const businessUnit = salesBusinessUnitOptions[0];
  const business = salesBusinessOptions.find((item) => item.businessUnitId === businessUnit?.id) ?? salesBusinessOptions[0];

  return {
    businessUnitId: businessUnit?.id ?? '',
    businessUnitName: businessUnit?.name ?? '',
    businessId: business?.id ?? '',
    businessName: business?.name ?? '',
  };
}

function getInitialDraft(record?: SaleRecord | null): SaleRecordDraft {
  return record ?? {
    ...getDefaultBusinessScope(),
    quoteId: undefined,
    quoteReference: '',
    saleDocumentReference: '',
    customerName: '',
    sellerName: '',
    saleDate: getTodayIsoDate(),
    totalAmount: 0,
    currency: 'MXN',
    paymentMethod: '',
    paymentReference: '',
    paymentEvidenceStatus: 'missing',
    commercialStatus: 'pending_validation',
    financeStatus: 'pending',
    inventoryStatus: 'pending',
    deliveryStatus: 'pending',
    commissionStatus: 'pending',
    inventoryMovementStatus: 'not_generated',
    inventoryMovementReference: '',
    commissionRate: 0,
    commissionNotes: '',
    notes: '',
  };
}

export function SalesDetailModal({
  open,
  record,
  quotes,
  t,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  record: SaleRecord | null;
  quotes: SalesQuote[];
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: SaleRecordDraft) => void;
  onUpdate: (saleId: string, patch: Partial<SaleRecord>) => void;
}) {
  const isCreateMode = !record;
  const [form, setForm] = useState<SaleRecordDraft>(() => getInitialDraft(record));
  const [isSummaryPreviewOpen, setIsSummaryPreviewOpen] = useState(false);

  const acceptedQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === 'Approved' || quote.status === 'Closed Won'),
    [quotes],
  );
  const quoteOptions = useMemo(() => {
    if (acceptedQuotes.length === 0) return quotes;
    const acceptedIds = new Set(acceptedQuotes.map((quote) => quote.id));
    return [...acceptedQuotes, ...quotes.filter((quote) => !acceptedIds.has(quote.id))];
  }, [acceptedQuotes, quotes]);
  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === form.quoteId) ?? quotes.find((quote) => quote.quoteNumber === form.quoteReference) ?? null,
    [form.quoteId, form.quoteReference, quotes],
  );
  const businessOptions = useMemo(
    () => salesBusinessOptions.filter((business) => !form.businessUnitId || business.businessUnitId === form.businessUnitId),
    [form.businessUnitId],
  );
  const operationalContext = useMemo(() => getSalesOperationalContext(form.businessId), [form.businessId]);

  useEffect(() => {
    if (open) {
      setForm(getInitialDraft(record));
    }
  }, [open, record]);

  const calculatedCommissionAmount = useMemo(
    () => calculateCommissionAmount(Number(form.totalAmount) || 0, Number(form.commissionRate) || 0),
    [form.commissionRate, form.totalAmount],
  );

  const handleQuoteSelection = (quoteId: string) => {
    const quote = quoteOptions.find((item) => item.id === quoteId);
    if (!quote) return;

    setForm((current) => {
      const context = getSalesOperationalContext(current.businessId);

      return {
        ...current,
        quoteId: quote.id,
        quoteReference: quote.quoteNumber,
        customerName: quote.clientName,
        sellerName: quote.assignedSeller,
        totalAmount: quote.total,
        currency: context.currency,
        commercialStatus: quote.status === 'Approved' || quote.status === 'Closed Won' ? 'approved' : 'pending_validation',
        notes: quote.notes ? `Generated from ${quote.quoteNumber}. ${quote.notes}` : `Generated from ${quote.quoteNumber}.`,
      };
    });
  };

  const handleBusinessUnitSelection = (businessUnitId: string) => {
    const businessUnit = salesBusinessUnitOptions.find((item) => item.id === businessUnitId);
    const firstBusiness = salesBusinessOptions.find((business) => business.businessUnitId === businessUnitId);
    const context = getSalesOperationalContext(firstBusiness?.id);

    setForm((current) => ({
      ...current,
      businessUnitId,
      businessUnitName: businessUnit?.name ?? '',
      businessId: firstBusiness?.id ?? '',
      businessName: firstBusiness?.name ?? '',
      currency: context.currency,
    }));
  };

  const handleBusinessSelection = (businessId: string) => {
    const business = salesBusinessOptions.find((item) => item.id === businessId);
    const context = getSalesOperationalContext(businessId);

    setForm((current) => ({
      ...current,
      businessId,
      businessName: business?.name ?? '',
      businessUnitId: business?.businessUnitId ?? current.businessUnitId,
      businessUnitName: business?.businessUnitName ?? current.businessUnitName,
      currency: context.currency,
    }));
  };

  const handleStatusChange = (patch: Partial<SaleRecord>) => {
    if (!record) return;
    onUpdate(record.id, patch);
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleCreate = () => {
    if (!form.quoteReference.trim() || !form.customerName.trim() || !form.sellerName.trim()) return;

    onCreate({
      ...form,
      quoteReference: form.quoteReference.trim(),
      saleDocumentReference: form.saleDocumentReference?.trim(),
      businessUnitId: form.businessUnitId,
      businessUnitName: form.businessUnitName,
      businessId: form.businessId,
      businessName: form.businessName,
      customerName: form.customerName.trim(),
      sellerName: form.sellerName.trim(),
      paymentMethod: form.paymentMethod.trim(),
      paymentReference: form.paymentReference.trim(),
      inventoryMovementReference: form.inventoryMovementReference.trim(),
      commissionNotes: form.commissionNotes.trim(),
      notes: form.notes.trim(),
      commissionAmount: calculatedCommissionAmount,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(modalStyles.content, '!flex max-h-[90vh] max-w-[980px] flex-col !gap-0')} closeButtonClassName={modalStyles.close}>
        <DialogHeader className={cn(modalStyles.header, 'shrink-0')}>
          <DialogTitle className={modalStyles.title}>
            <ClipboardCheck className="h-6 w-6" />
            {isCreateMode ? t.modal.createTitle : t.modal.detailTitle}
          </DialogTitle>
          <DialogDescription className={modalStyles.description}>{t.modal.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3 text-sm font-semibold text-[#B63B32]">
            {t.modal.quoteHelper}
          </div>

          {isCreateMode ? (
            <SalesCreateForm
              form={form}
              acceptedQuotes={acceptedQuotes}
              quoteOptions={quoteOptions}
              businessOptions={businessOptions}
              t={t}
              onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              onQuoteSelection={handleQuoteSelection}
              onBusinessUnitSelection={handleBusinessUnitSelection}
              onBusinessSelection={handleBusinessSelection}
            />
          ) : (
            <>
              <SectionCard title={t.modal.sections.general}>
                <section className="grid gap-4 md:grid-cols-2">
                  <DetailField label={t.modal.fields.quoteReference} value={form.quoteReference || t.common.notAvailable} />
                  <DetailField label={t.modal.fields.saleDocumentReference} value={form.saleDocumentReference || t.common.notAvailable} />
                  <DetailField label={t.modal.fields.customerName} value={form.customerName} />
                  <DetailField label={t.modal.fields.sellerName} value={form.sellerName} />
                  <DetailField label={t.modal.fields.saleDate} value={formatSalesDate(form.saleDate)} />
                  <DetailField label={t.modal.fields.totalAmount} value={formatSalesCurrency(form.totalAmount, form.currency)} />
                  <DetailField label={t.modal.fields.businessUnit} value={form.businessUnitName || t.common.notAvailable} />
                  <DetailField label={t.modal.fields.business} value={form.businessName || t.common.notAvailable} />
                </section>
              </SectionCard>

              <SalesOperationalContextCard context={operationalContext} t={t} />

              <SectionCard title={t.modal.sections.payment}>
                <DetailField label={t.modal.fields.paymentEvidenceStatus} value={t.statuses.paymentEvidence[form.paymentEvidenceStatus]} />
              </SectionCard>

              <SectionCard title={t.modal.sections.validation}>
                {record ? <SalesStatusSelectors record={{ ...record, ...form }} t={t} onChange={handleStatusChange} /> : null}
              </SectionCard>

              <SectionCard title={t.modal.sections.inventory} description={t.modal.inventoryExecutionHelper}>
                <section className="grid gap-4 md:grid-cols-2">
                  <DetailField label={t.modal.fields.inventoryMovementStatus} value={t.statuses.movement[form.inventoryMovementStatus]} />
                  <DetailField label={t.modal.fields.inventoryMovementReference} value={form.inventoryMovementReference || t.common.notAvailable} />
                </section>
              </SectionCard>

              <SectionCard title={t.modal.sections.notes}>
                <DetailField label={t.modal.fields.notes} value={form.notes || t.common.notAvailable} />
              </SectionCard>
            </>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {t.modal.inventoryHelper}
          </div>
        </div>

        <DialogFooter className={cn(modalStyles.footer, 'shrink-0')}>
          <Button
            variant="outline"
            className={modalStyles.secondaryButton}
            onClick={() => setIsSummaryPreviewOpen(true)}
            disabled={!form.quoteReference.trim()}
          >
            <FileSearch className="h-4 w-4" />
            {t.modal.previewSaleSummary}
          </Button>
          <Button variant="outline" className={modalStyles.secondaryButton} onClick={() => onOpenChange(false)}>{isCreateMode ? t.common.cancel : t.common.close}</Button>
          {isCreateMode ? <Button className={modalStyles.primaryButton} onClick={handleCreate}>{t.common.save}</Button> : null}
        </DialogFooter>
      </DialogContent>
      <SaleSummaryPreviewModal
        open={isSummaryPreviewOpen}
        sale={{ ...form, commissionAmount: form.commissionAmount ?? calculatedCommissionAmount }}
        quote={selectedQuote}
        t={t}
        onOpenChange={setIsSummaryPreviewOpen}
      />
    </Dialog>
  );
}
