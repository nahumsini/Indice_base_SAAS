import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, FileSearch } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import {
  createSaleFromQuote,
  validateSaleDraftForBackendReadiness,
} from '../../services/salesWorkflowBridge';
import type { SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuote } from '../../types';
import type { SalesWorkflowValidationCode } from '../../types/salesWorkflow';
import { defaultSalesCurrency } from '../../utils/salesCurrency';
import { salesBusinessOptions, salesBusinessUnitOptions } from '../data/salesBusinessOptions';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRecord } from '../types/commissions';
import type { SaleLifecycleSignals, SaleLine, SaleRecord, SaleRecordDraft } from '../types/salesTypes';
import { formatCommissionType } from '../utils/commissionRules';
import { calculateCommissionAmount, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { SalesCreateForm } from './SalesCreateForm';
import { SaleSummaryPreviewModal } from './SaleSummaryPreviewModal';
import { DetailField, SectionCard } from './SalesModalPrimitives';
import { SalesOperationalContextCard } from './SalesOperationalContextCard';
import { SalesStatusSelectors } from './SalesStatusSelectors';

const actionClassNames = getSalesModalActionClassNames('coral');

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
    prospectId: undefined,
    contactId: undefined,
    customerId: undefined,
    sellerId: undefined,
    quoteId: undefined,
    quoteReference: '',
    saleDocumentReference: '',
    customerName: '',
    sellerName: '',
    saleDate: getTodayIsoDate(),
    totalAmount: 0,
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    marginTotal: 0,
    currency: defaultSalesCurrency,
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
    saleLines: [],
    notes: '',
  };
}

function withBusinessScope(lines: SaleLine[], businessUnitId: string, businessId: string, warehouseId: string) {
  return lines.map((line) => ({
    ...line,
    businessUnitId,
    businessId,
    warehouseId,
  }));
}

function parseOpportunityValue(value?: string) {
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function SalesDetailModal({
  open,
  record,
  quotes,
  products,
  contacts,
  opportunities,
  lifecycle,
  commissionRecords = [],
  t,
  onOpenChange,
  onCreate,
  onUpdate,
  onQuoteConverted,
}: {
  open: boolean;
  record: SaleRecord | null;
  quotes: SalesQuote[];
  products: SalesCatalogItem[];
  contacts: SalesContact[];
  opportunities: SalesOpportunity[];
  lifecycle?: SaleLifecycleSignals;
  commissionRecords?: CommissionRecord[];
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: SaleRecordDraft) => void;
  onUpdate: (saleId: string, patch: Partial<SaleRecord>) => void;
  onQuoteConverted: (quoteId: string, opportunityId?: string) => void;
}) {
  const isCreateMode = !record;
  const [form, setForm] = useState<SaleRecordDraft>(() => getInitialDraft(record));
  const [isSummaryPreviewOpen, setIsSummaryPreviewOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<SalesWorkflowValidationCode[]>([]);

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
  const selectedOpportunity = useMemo(
    () => (
      opportunities.find((opportunity) => opportunity.id === form.prospectId)
      ?? (selectedQuote?.opportunityId ? opportunities.find((opportunity) => opportunity.id === selectedQuote.opportunityId) : null)
      ?? null
    ),
    [form.prospectId, opportunities, selectedQuote?.opportunityId],
  );
  const opportunityOptions = useMemo(() => {
    const acceptedOpportunityIds = new Set(acceptedQuotes.map((quote) => quote.opportunityId).filter(Boolean));

    return [...opportunities].sort((left, right) => {
      const leftHasAcceptedQuote = acceptedOpportunityIds.has(left.id) ? 1 : 0;
      const rightHasAcceptedQuote = acceptedOpportunityIds.has(right.id) ? 1 : 0;

      if (leftHasAcceptedQuote !== rightHasAcceptedQuote) {
        return rightHasAcceptedQuote - leftHasAcceptedQuote;
      }

      return left.opportunityName.localeCompare(right.opportunityName);
    });
  }, [acceptedQuotes, opportunities]);
  const opportunityQuoteOptions = useMemo(
    () => (selectedOpportunity ? quoteOptions.filter((quote) => quote.opportunityId === selectedOpportunity.id) : quoteOptions),
    [quoteOptions, selectedOpportunity],
  );
  const businessOptions = useMemo(
    () => salesBusinessOptions.filter((business) => !form.businessUnitId || business.businessUnitId === form.businessUnitId),
    [form.businessUnitId],
  );
  const operationalContext = useMemo(() => getSalesOperationalContext(form.businessId), [form.businessId]);

  useEffect(() => {
    if (open) {
      setForm(getInitialDraft(record));
      setValidationErrors([]);
    }
  }, [open, record]);

  const calculatedCommissionAmount = useMemo(
    () => calculateCommissionAmount(Number(form.totalAmount) || 0, Number(form.commissionRate) || 0),
    [form.commissionRate, form.totalAmount],
  );

  const buildFormFromQuote = (current: SaleRecordDraft, quote: SalesQuote) => {
    const context = getSalesOperationalContext(current.businessId);
    const contact = contacts.find((item) => item.id === quote.clientId);
    const prospect = opportunities.find((item) => item.id === quote.opportunityId);
    const conversion = createSaleFromQuote({
      quote,
      products,
      contact,
      prospect,
      businessScope: {
        businessUnitId: current.businessUnitId ?? '',
        businessUnitName: current.businessUnitName,
        businessId: current.businessId ?? '',
        businessName: current.businessName,
        warehouseId: context.defaultWarehouse,
      },
      saleId: `DRAFT-${quote.id}`,
      saleDate: current.saleDate || getTodayIsoDate(),
      currency: quote.currency ?? context.currency,
      commissionRate: current.commissionRate,
    });

    return {
      ...current,
      ...conversion.saleDraft,
      notes: t.modal.generatedFromQuote(quote.quoteNumber, quote.notes),
    };
  };

  const handleOpportunitySelection = (opportunityId: string) => {
    const opportunity = opportunityOptions.find((item) => item.id === opportunityId);
    if (!opportunity) return;

    setForm((current) => {
      const contact = contacts.find((item) => item.id === opportunity.contactId);
      const linkedQuotes = quoteOptions.filter((quote) => quote.opportunityId === opportunity.id);
      const linkedAcceptedQuotes = linkedQuotes.filter((quote) => quote.status === 'Approved' || quote.status === 'Closed Won');
      const autoSelectedQuote = linkedAcceptedQuotes.length === 1 ? linkedAcceptedQuotes[0] : null;
      const estimatedValue = parseOpportunityValue(opportunity.estimatedValue);
      const opportunityPatch: SaleRecordDraft = {
        ...current,
        prospectId: opportunity.id,
        contactId: contact?.id ?? opportunity.contactId ?? current.contactId,
        customerId: contact?.id ?? opportunity.contactId ?? current.customerId,
        customerName: contact?.company || opportunity.company || current.customerName,
        sellerName: opportunity.owner || current.sellerName,
        totalAmount: autoSelectedQuote ? current.totalAmount : estimatedValue || current.totalAmount,
        subtotal: autoSelectedQuote ? current.subtotal : estimatedValue || current.subtotal,
        taxTotal: autoSelectedQuote ? current.taxTotal : 0,
        discountTotal: autoSelectedQuote ? current.discountTotal : 0,
        marginTotal: autoSelectedQuote ? current.marginTotal : 0,
        currency: opportunity.currency || current.currency,
        quoteId: autoSelectedQuote ? current.quoteId : undefined,
        quoteReference: autoSelectedQuote ? current.quoteReference : '',
        saleLines: autoSelectedQuote ? current.saleLines : [],
        inventoryMovementStatus: autoSelectedQuote ? current.inventoryMovementStatus : 'not_generated',
        inventoryMovementReference: autoSelectedQuote ? current.inventoryMovementReference : '',
        notes: t.modal.generatedFromOpportunity(opportunity.opportunityName),
      };

      return autoSelectedQuote ? buildFormFromQuote(opportunityPatch, autoSelectedQuote) : opportunityPatch;
    });
    setValidationErrors([]);
  };

  const handleQuoteSelection = (quoteId: string) => {
    const quote = quoteOptions.find((item) => item.id === quoteId);
    if (!quote) return;

    setForm((current) => buildFormFromQuote(current, quote));
    setValidationErrors([]);
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
      saleLines: withBusinessScope(
        current.saleLines,
        businessUnitId,
        firstBusiness?.id ?? '',
        context.defaultWarehouse,
      ),
    }));
    setValidationErrors([]);
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
      saleLines: withBusinessScope(
        current.saleLines,
        business?.businessUnitId ?? current.businessUnitId ?? '',
        businessId,
        context.defaultWarehouse,
      ),
    }));
    setValidationErrors([]);
  };

  const handleStatusChange = (patch: Partial<SaleRecord>) => {
    if (!record) return;
    onUpdate(record.id, patch);
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleCreate = () => {
    const validation = validateSaleDraftForBackendReadiness(form);
    const quoteIsConvertible = !selectedQuote || selectedQuote.status === 'Approved' || selectedQuote.status === 'Closed Won';
    const errors = quoteIsConvertible
      ? validation.errors
      : [...validation.errors, 'quoteNotApproved' as const];

    if (errors.length) {
      setValidationErrors(Array.from(new Set(errors)));
      return;
    }

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
    if (form.quoteId) {
      onQuoteConverted(form.quoteId, form.prospectId);
    }
    onOpenChange(false);
  };

  return (
    <>
      <SalesModalFrame
        open={open}
        onOpenChange={onOpenChange}
        icon={<ClipboardCheck className="h-6 w-6" />}
        title={isCreateMode ? t.modal.createTitle : t.modal.detailTitle}
        description={t.modal.description}
        contentClassName="!flex max-h-[92vh] w-[96vw] !max-w-[1480px] flex-col"
        bodyClassName="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5"
        footerClassName="shrink-0"
        footer={(
          <>
            <Button
              variant="outline"
              className={actionClassNames.secondary}
              onClick={() => setIsSummaryPreviewOpen(true)}
              disabled={!form.customerName.trim()}
            >
              <FileSearch className="h-4 w-4" />
              {t.modal.previewSaleSummary}
            </Button>
            <Button variant="outline" className={actionClassNames.secondary} onClick={() => onOpenChange(false)}>{isCreateMode ? t.common.cancel : t.common.close}</Button>
            {isCreateMode ? <Button className={actionClassNames.primary} onClick={handleCreate}>{t.common.save}</Button> : null}
          </>
        )}
      >
          <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3 text-sm font-semibold text-[#B63B32]">
            {t.modal.quoteHelper}
          </div>

          {validationErrors.length ? (
            <div className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 px-4 py-3 text-sm font-semibold text-[#B63B32]">
              <p className="mb-2 font-black">{t.modal.validationTitle}</p>
              <ul className="space-y-1">
                {validationErrors.map((error) => <li key={error}>{t.modal.validationErrors[error]}</li>)}
              </ul>
            </div>
          ) : null}

          {isCreateMode ? (
            <SalesCreateForm
              form={form}
              acceptedQuotes={acceptedQuotes}
              quoteOptions={opportunityQuoteOptions}
              opportunities={opportunityOptions}
              selectedOpportunity={selectedOpportunity}
              selectedQuote={selectedQuote}
              businessOptions={businessOptions}
              t={t}
              onFormChange={(patch) => {
                setForm((current) => ({ ...current, ...patch }));
                setValidationErrors([]);
              }}
              onOpportunitySelection={handleOpportunitySelection}
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

              <SectionCard title={t.modal.sections.postSaleSnapshot} description={t.modal.postSaleSnapshotHelper}>
                <section className="grid gap-4 md:grid-cols-2">
                  <DetailField label={t.modal.fields.customerHealth} value={lifecycle ? t.lifecycle.health[lifecycle.health] : t.common.notAvailable} />
                  <DetailField label={t.modal.fields.relationship} value={lifecycle ? t.lifecycle.relationship[lifecycle.relationship] : t.common.notAvailable} />
                  <DetailField label={t.modal.fields.nextFollowUpDate} value={lifecycle?.nextFollowUpDate ?? t.common.notAvailable} />
                  <DetailField label={t.modal.fields.renewalDate} value={lifecycle?.renewalDate ?? t.common.notAvailable} />
                  <DetailField label={t.modal.fields.openCases} value={String(lifecycle?.openCases ?? 0)} />
                  <DetailField label={t.modal.fields.postSaleStatus} value={lifecycle?.postSaleStatus ?? t.lifecycle.noPostSaleStatus} />
                </section>
              </SectionCard>

              <SectionCard title={t.modal.sections.commissionBreakdown} description={t.modal.commissionBreakdownHelper}>
                {commissionRecords.length ? (
                  <section className="space-y-3">
                    {commissionRecords.map((commission) => (
                      <div key={commission.id} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                        <DetailField label={t.commissions.detail.fields.salesRep} value={commission.salesRepName} />
                        <DetailField label={t.commissions.detail.fields.product} value={commission.productName} />
                        <DetailField label={t.commissions.detail.fields.ruleName} value={commission.commissionRuleName} />
                        <DetailField label={t.commissions.detail.fields.commissionType} value={formatCommissionType(commission.commissionType)} />
                        <DetailField label={t.commissions.detail.fields.commissionAmount} value={formatSalesCurrency(commission.commissionAmount, commission.currency)} />
                        <DetailField label={t.commissions.detail.fields.status} value={t.commissions.statuses[commission.status]} />
                      </div>
                    ))}
                  </section>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    {t.commissions.detail.noCommissionRecords}
                  </div>
                )}
              </SectionCard>

              <SectionCard title={t.modal.sections.notes}>
                <DetailField label={t.modal.fields.notes} value={form.notes || t.common.notAvailable} />
              </SectionCard>
            </>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {t.modal.inventoryHelper}
          </div>
      </SalesModalFrame>
      <SaleSummaryPreviewModal
        open={isSummaryPreviewOpen}
        sale={{ ...form, commissionAmount: form.commissionAmount ?? calculatedCommissionAmount }}
        quote={selectedQuote}
        t={t}
        onOpenChange={setIsSummaryPreviewOpen}
      />
    </>
  );
}
