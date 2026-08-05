import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck, FileSearch } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import {
  createSaleFromQuote,
  validateSaleDraftForBackendReadiness,
} from '../../services/salesWorkflowBridge';
import type { CreateContactInput, SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuote } from '../../types';
import type { InventoryWarehouse } from '../../Inventory/types/inventoryTypes';
import type { SalesWorkflowValidationCode } from '../../types/salesWorkflow';
import { defaultSalesCurrency } from '../../utils/salesCurrency';
import { salesBusinessOptions, salesBusinessUnitOptions } from '../data/salesBusinessOptions';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRecord } from '../types/commissions';
import type { SaleLifecycleSignals, SaleLine, SaleRecord, SaleRecordDraft, SalesBusinessOption, SalesCurrentSeller } from '../types/salesTypes';
import { formatCommissionType } from '../utils/commissionRules';
import { calculateCommissionAmount, formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { getSalesPaymentMethodForStorage, isSalesCreditPaymentMethod, normalizeSalesPaymentMethod } from '../utils/salesPaymentMethods';
import {
  SalesCreateForm,
  salesCreateStepIds,
  type SalesCreateStepId,
} from './SalesCreateForm';
import { SaleSummaryPreviewModal } from './SaleSummaryPreviewModal';
import { DetailField, SectionCard } from './SalesModalPrimitives';
import { SalesOperationalContextCard } from './SalesOperationalContextCard';
import { SalesStatusSelectors } from './SalesStatusSelectors';

const actionClassNames = getSalesModalActionClassNames('coral');

function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

function getWarehouseBusinessScope(warehouse?: InventoryWarehouse) {
  if (!warehouse) return getDefaultBusinessScope();

  return {
    businessUnitId: warehouse.businessUnitId ?? '',
    businessUnitName: warehouse.businessUnitName ?? '',
    businessId: warehouse.businessId ?? '',
    businessName: warehouse.businessName ?? '',
  };
}

function getInitialDraft(
  record?: SaleRecord | null,
  currentSeller?: SalesCurrentSeller,
  warehouses: InventoryWarehouse[] = [],
): SaleRecordDraft {
  if (record) return record;
  const warehouse = warehouses.find((item) => item.status === 'active');
  const businessScope = getWarehouseBusinessScope(warehouse);

  return {
    ...businessScope,
    prospectId: undefined,
    contactId: undefined,
    customerId: undefined,
    sellerId: currentSeller?.sellerId,
    sellerUserCompanyId: currentSeller?.sellerUserCompanyId ?? null,
    quoteId: undefined,
    quoteReference: '',
    saleDocumentReference: '',
    customerName: '',
    sellerName: currentSeller?.sellerName ?? '',
    warehouseId: warehouse?.id ?? '',
    warehouseName: warehouse?.name ?? '',
    paymentAccountId: undefined,
    paymentAccountName: undefined,
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
  warehouses,
  currentSeller,
  contacts,
  opportunities,
  lifecycle,
  commissionRecords = [],
  t,
  onOpenChange,
  onCreateCustomer,
  onCreate,
  onUpdate,
  onQuoteConverted,
  onCreditSaleCreated,
}: {
  open: boolean;
  record: SaleRecord | null;
  quotes: SalesQuote[];
  products: SalesCatalogItem[];
  warehouses: InventoryWarehouse[];
  currentSeller?: SalesCurrentSeller;
  contacts: SalesContact[];
  opportunities: SalesOpportunity[];
  lifecycle?: SaleLifecycleSignals;
  commissionRecords?: CommissionRecord[];
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onCreateCustomer: (contact: CreateContactInput) => Promise<SalesContact>;
  onCreate: (draft: SaleRecordDraft) => Promise<SaleRecord | null> | SaleRecord | null;
  onUpdate: (saleId: string, patch: Partial<SaleRecord>) => void;
  onQuoteConverted: (quoteId: string, opportunityId?: string) => void;
  onCreditSaleCreated?: (record: SaleRecord) => void;
}) {
  const isCreateMode = !record;
  const [form, setForm] = useState<SaleRecordDraft>(() => getInitialDraft(record, currentSeller, warehouses));
  const [isSummaryPreviewOpen, setIsSummaryPreviewOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<SalesWorkflowValidationCode[]>([]);
  const [activeCreateStep, setActiveCreateStep] = useState<SalesCreateStepId>('origin');
  const [stepError, setStepError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const acceptedQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === 'Approved' || quote.status === 'Closed Won'),
    [quotes],
  );
  const quoteOptions = acceptedQuotes;
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
  const businessOptions = useMemo(() => {
    const warehouseBusinesses = new Map<string, SalesBusinessOption>();
    warehouses
      .filter((warehouse) => warehouse.status === 'active')
      .forEach((warehouse) => {
        if (!warehouse.businessId || !warehouse.businessName || !warehouse.businessUnitId || !warehouse.businessUnitName) return;
        warehouseBusinesses.set(warehouse.businessId, {
          id: warehouse.businessId,
          name: warehouse.businessName,
          code: warehouse.businessId,
          businessUnitId: warehouse.businessUnitId,
          businessUnitName: warehouse.businessUnitName,
        });
      });

    return warehouseBusinesses.size ? [...warehouseBusinesses.values()] : salesBusinessOptions;
  }, [warehouses]);
  const operationalContext = useMemo(() => getSalesOperationalContext(form.businessId), [form.businessId]);

  useEffect(() => {
    if (open) {
      setForm(getInitialDraft(record, currentSeller, warehouses));
      setValidationErrors([]);
      setActiveCreateStep('origin');
      setStepError('');
      setIsSaving(false);
    } else {
      setIsSummaryPreviewOpen(false);
    }
  }, [currentSeller, open, record, warehouses]);

  const calculatedCommissionAmount = useMemo(
    () => calculateCommissionAmount(Number(form.totalAmount) || 0, Number(form.commissionRate) || 0),
    [form.commissionRate, form.totalAmount],
  );
  const createValidation = useMemo(
    () => validateSaleDraftForBackendReadiness(form),
    [form],
  );
  const originStepReady = Boolean(form.customerName.trim());
  const operationStepReady = Boolean(
    form.businessUnitId
    && form.businessUnitId !== 'none'
    && form.businessId
    && form.businessId !== 'none'
    && form.saleDate
    && form.warehouseId
    && form.warehouseId !== 'none',
  );
  const createReady = originStepReady && operationStepReady && createValidation.valid;
  const activeCreateStepIndex = salesCreateStepIds.indexOf(activeCreateStep);
  const createFooterSummary = form.customerName.trim()
    ? t.modal.wizard.footerSummary(
      form.customerName || t.common.notAvailable,
      form.quoteReference || t.modal.workspace.directSale,
      form.saleLines.length,
      formatSalesCurrency(form.totalAmount, form.currency),
    )
    : t.modal.wizard.footerEmpty;

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
        warehouseId: current.warehouseId ?? '',
      },
      saleId: `DRAFT-${quote.id}`,
      saleDate: current.saleDate || getTodayIsoDate(),
      currency: quote.currency ?? context.currency,
      commissionRate: current.commissionRate,
    });

    return {
      ...current,
      ...conversion.saleDraft,
      sellerId: currentSeller?.sellerId ?? current.sellerId,
      sellerUserCompanyId: currentSeller?.sellerUserCompanyId ?? current.sellerUserCompanyId,
      sellerName: currentSeller?.sellerName ?? current.sellerName,
      warehouseId: current.warehouseId,
      warehouseName: current.warehouseName,
      saleLines: withBusinessScope(
        conversion.saleDraft.saleLines,
        current.businessUnitId ?? '',
        current.businessId ?? '',
        current.warehouseId ?? '',
      ),
      notes: t.modal.generatedFromQuote(quote.quoteNumber, quote.notes),
    };
  };

  const clearCommercialSource = (current: SaleRecordDraft): SaleRecordDraft => ({
    ...current,
    prospectId: undefined,
    quoteId: undefined,
    quoteReference: '',
    totalAmount: 0,
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    marginTotal: 0,
    saleLines: [],
    inventoryMovementStatus: 'not_generated',
    inventoryMovementReference: '',
  });

  const handleCustomerSelection = (contactId: string, createdContact?: SalesContact) => {
    const contact = createdContact ?? contacts.find((item) => item.id === contactId);
    if (!contact) return;

    setForm((current) => {
      const currentOpportunity = opportunities.find((item) => item.id === current.prospectId);
      const currentQuote = quotes.find((item) => item.id === current.quoteId);
      const relationContactId = currentQuote?.clientId || currentOpportunity?.contactId;
      const compatibleWithSource = !relationContactId || relationContactId === contact.id;
      const next = compatibleWithSource ? current : clearCommercialSource(current);

      return {
        ...next,
        contactId: contact.id,
        customerId: contact.id,
        customerName: contact.company.trim() || contact.contactPerson.trim() || contact.email.trim(),
      };
    });
    setValidationErrors([]);
    setStepError('');
  };

  const handleOpportunitySelection = (opportunityId: string) => {
    if (opportunityId === 'none') {
      setForm((current) => clearCommercialSource(current));
      setValidationErrors([]);
      setStepError('');
      return;
    }

    const opportunity = opportunityOptions.find((item) => item.id === opportunityId);
    if (!opportunity) return;

    setForm((current) => {
      const contact = contacts.find((item) => item.id === opportunity.contactId);
      const linkedAcceptedQuotes = quoteOptions.filter((quote) => quote.opportunityId === opportunity.id);
      const autoSelectedQuote = linkedAcceptedQuotes.length === 1 ? linkedAcceptedQuotes[0] : null;
      const estimatedValue = parseOpportunityValue(opportunity.estimatedValue);
      const opportunityPatch: SaleRecordDraft = {
        ...current,
        prospectId: opportunity.id,
        contactId: contact?.id ?? opportunity.contactId ?? current.contactId,
        customerId: contact?.id ?? opportunity.contactId ?? current.customerId,
        customerName: contact?.company || opportunity.company || current.customerName,
        sellerId: currentSeller?.sellerId ?? current.sellerId,
        sellerUserCompanyId: currentSeller?.sellerUserCompanyId ?? current.sellerUserCompanyId,
        sellerName: currentSeller?.sellerName ?? current.sellerName,
        totalAmount: autoSelectedQuote ? current.totalAmount : estimatedValue,
        subtotal: autoSelectedQuote ? current.subtotal : estimatedValue,
        taxTotal: autoSelectedQuote ? current.taxTotal : 0,
        discountTotal: autoSelectedQuote ? current.discountTotal : 0,
        marginTotal: autoSelectedQuote ? current.marginTotal : 0,
        currency: opportunity.currency || current.currency,
        quoteId: autoSelectedQuote?.id,
        quoteReference: autoSelectedQuote?.quoteNumber ?? '',
        saleLines: [],
        inventoryMovementStatus: autoSelectedQuote ? current.inventoryMovementStatus : 'not_generated',
        inventoryMovementReference: autoSelectedQuote ? current.inventoryMovementReference : '',
        notes: t.modal.generatedFromOpportunity(opportunity.opportunityName),
      };

      return autoSelectedQuote ? buildFormFromQuote(opportunityPatch, autoSelectedQuote) : opportunityPatch;
    });
    setValidationErrors([]);
    setStepError('');
  };

  const handleQuoteSelection = (quoteId: string) => {
    if (quoteId === 'none') {
      setForm((current) => {
        const opportunity = opportunities.find((item) => item.id === current.prospectId);
        const contact = contacts.find((item) => item.id === opportunity?.contactId);
        const estimatedValue = parseOpportunityValue(opportunity?.estimatedValue);

        return {
          ...current,
          quoteId: undefined,
          quoteReference: '',
          contactId: contact?.id ?? current.contactId,
          customerId: contact?.id ?? current.customerId,
          customerName: contact?.company || opportunity?.company || current.customerName,
          totalAmount: opportunity ? estimatedValue : 0,
          subtotal: opportunity ? estimatedValue : 0,
          discountTotal: 0,
          taxTotal: 0,
          marginTotal: 0,
          saleLines: [],
          inventoryMovementStatus: 'not_generated',
          inventoryMovementReference: '',
        };
      });
      setValidationErrors([]);
      setStepError('');
      return;
    }

    const quote = quoteOptions.find((item) => item.id === quoteId);
    if (!quote) return;

    setForm((current) => buildFormFromQuote(current, quote));
    setValidationErrors([]);
    setStepError('');
  };

  const handleStatusChange = (patch: Partial<SaleRecord>) => {
    if (!record) return;
    onUpdate(record.id, patch);
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleCreateStepBack = () => {
    const previousStep = salesCreateStepIds[activeCreateStepIndex - 1];
    if (!previousStep) return;

    setActiveCreateStep(previousStep);
    setStepError('');
    setValidationErrors([]);
  };

  const handleCreateStepContinue = () => {
    if (activeCreateStep === 'origin') {
      if (!originStepReady) {
        setStepError(t.modal.wizard.originError);
        return;
      }

      setActiveCreateStep('operation');
      setStepError('');
      setValidationErrors([]);
      return;
    }

    if (activeCreateStep === 'operation') {
      if (!operationStepReady) {
        setStepError(t.modal.wizard.operationError);
        return;
      }

      setActiveCreateStep('review');
      setStepError('');
      setValidationErrors(createValidation.errors);
    }
  };

  const handleCreate = async () => {
    if (isSaving) return;

    const selectedQuoteIsConvertible = !selectedQuote
      || selectedQuote.status === 'Approved'
      || selectedQuote.status === 'Closed Won';
    const errors = selectedQuoteIsConvertible
      ? createValidation.errors
      : [...createValidation.errors, 'quoteNotApproved' as const];

    if (errors.length) {
      setValidationErrors(Array.from(new Set(errors)));
      setStepError('');
      if (errors.some((error) => error === 'quoteNotApproved' || error === 'missingCustomer')) {
        setActiveCreateStep('origin');
      } else if (errors.some((error) => error === 'missingBusinessUnit' || error === 'missingBusiness')) {
        setActiveCreateStep('operation');
      } else {
        setActiveCreateStep('review');
      }
      return;
    }

    const paymentMethod = getSalesPaymentMethodForStorage(form.paymentMethod);
    const closesAsCredit = isSalesCreditPaymentMethod(paymentMethod);
    const closesWithImmediatePayment = Boolean(normalizeSalesPaymentMethod(paymentMethod)) && !closesAsCredit;
    const saleDraft: SaleRecordDraft = {
      ...form,
      quoteReference: form.quoteReference.trim(),
      saleDocumentReference: form.saleDocumentReference?.trim(),
      businessUnitId: form.businessUnitId,
      businessUnitName: form.businessUnitName,
      businessId: form.businessId,
      businessName: form.businessName,
      customerName: form.customerName.trim(),
      sellerId: currentSeller?.sellerId ?? form.sellerId,
      sellerUserCompanyId: currentSeller?.sellerUserCompanyId ?? form.sellerUserCompanyId,
      sellerName: (currentSeller?.sellerName ?? form.sellerName).trim(),
      paymentMethod,
      paymentReference: form.paymentReference.trim(),
      // Evidence is only considered uploaded after the object and its metadata
      // have both been persisted once the sale exists.
      paymentEvidenceStatus: form.paymentEvidenceFiles?.length ? 'missing' : form.paymentEvidenceStatus,
      commercialStatus: closesAsCredit || closesWithImmediatePayment ? 'approved' : form.commercialStatus,
      financeStatus: 'pending',
      saleLines: withBusinessScope(
        form.saleLines,
        form.businessUnitId ?? '',
        form.businessId ?? '',
        form.warehouseId ?? '',
      ),
      inventoryMovementReference: form.inventoryMovementReference.trim(),
      commissionNotes: form.commissionNotes.trim(),
      notes: form.notes.trim(),
      commissionAmount: calculatedCommissionAmount,
    };

    setIsSaving(true);
    let createdRecord: SaleRecord | null = null;
    try {
      createdRecord = await onCreate(saleDraft);
    } catch {
      setStepError(t.modal.wizard.saveError);
      return;
    } finally {
      setIsSaving(false);
    }

    if (!createdRecord) {
      setStepError(t.modal.wizard.saveError);
      return;
    }
    if (form.quoteId) {
      onQuoteConverted(form.quoteId, form.prospectId);
    }
    onOpenChange(false);
    if (closesAsCredit) {
      onCreditSaleCreated?.(createdRecord);
    }
  };

  return (
    <>
      <SalesModalFrame
        open={open && !isSummaryPreviewOpen}
        onOpenChange={onOpenChange}
        icon={<ClipboardCheck className="h-6 w-6" />}
        title={isCreateMode ? t.modal.createTitle : t.modal.detailTitle}
        description={t.modal.description}
        eyebrow={isCreateMode ? t.modal.wizard.stepLabel(activeCreateStepIndex + 1, salesCreateStepIds.length) : undefined}
        busy={isSaving}
        closeLabel={isCreateMode ? t.common.cancel : t.common.close}
        modalType={isCreateMode ? 'wizard' : 'large-workspace'}
        contentClassName={isCreateMode ? 'max-h-[min(92dvh,820px)]' : 'h-[92dvh]'}
        bodyClassName={isCreateMode ? 'min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5' : 'min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5'}
        footerClassName="shrink-0"
        footerSummary={isCreateMode ? createFooterSummary : undefined}
        footerLeading={isCreateMode ? (
          <Button variant="outline" className={actionClassNames.secondary} onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t.common.cancel}
          </Button>
        ) : undefined}
        footer={isCreateMode ? (
          <>
            {activeCreateStep !== 'origin' ? (
              <Button variant="outline" className={actionClassNames.secondary} onClick={handleCreateStepBack} disabled={isSaving}>
                <ChevronLeft className="h-4 w-4" />
                {t.modal.wizard.back}
              </Button>
            ) : null}
            {activeCreateStep === 'review' ? (
              <Button
                variant="outline"
                className={actionClassNames.secondary}
                onClick={() => setIsSummaryPreviewOpen(true)}
                disabled={isSaving || !form.customerName.trim()}
              >
                <FileSearch className="h-4 w-4" />
                {t.modal.wizard.preview}
              </Button>
            ) : null}
            {activeCreateStep !== 'review' ? (
              <Button className={actionClassNames.primary} onClick={handleCreateStepContinue} disabled={isSaving}>
                {t.modal.wizard.continue}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className={actionClassNames.primary} onClick={() => { void handleCreate(); }} disabled={isSaving || !createReady}>
                {t.modal.wizard.create}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="outline"
              className={actionClassNames.secondary}
              onClick={() => setIsSummaryPreviewOpen(true)}
              disabled={isSaving || !form.customerName.trim()}
            >
              <FileSearch className="h-4 w-4" />
              {t.modal.previewSaleSummary}
            </Button>
            <Button variant="outline" className={actionClassNames.secondary} onClick={() => onOpenChange(false)} disabled={isSaving}>{t.common.close}</Button>
          </>
        )}
      >
          <IndiceModalValidation
            className="mb-4"
            messages={validationErrors.length && (!isCreateMode || activeCreateStep === 'review')
              ? validationErrors.map((error) => t.modal.validationErrors[error])
              : []}
            title={t.modal.validationTitle}
          />

          {isCreateMode ? (
            <SalesCreateForm
              activeStep={activeCreateStep}
              form={form}
              quoteOptions={opportunityQuoteOptions}
              products={products}
              warehouses={warehouses}
              contacts={contacts}
              opportunities={opportunityOptions}
              selectedQuote={selectedQuote}
              businessOptions={businessOptions}
              isReady={createReady}
              stepError={stepError}
              t={t}
              onCustomerSelection={handleCustomerSelection}
              onCreateCustomer={onCreateCustomer}
              onFormChange={(patch) => {
                setForm((current) => ({ ...current, ...patch }));
                setValidationErrors([]);
                setStepError('');
              }}
              onOpportunitySelection={handleOpportunitySelection}
              onQuoteSelection={handleQuoteSelection}
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
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-normal text-slate-500">
                    {t.commissions.detail.noCommissionRecords}
                  </div>
                )}
              </SectionCard>

              <SectionCard title={t.modal.sections.notes}>
                <DetailField label={t.modal.fields.notes} value={form.notes || t.common.notAvailable} />
              </SectionCard>
            </>
          )}

          {!isCreateMode ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-600">
              {t.modal.inventoryHelper}
            </div>
          ) : null}
      </SalesModalFrame>
      <SaleSummaryPreviewModal
        open={open && isSummaryPreviewOpen}
        sale={{ ...form, commissionAmount: form.commissionAmount ?? calculatedCommissionAmount }}
        quote={selectedQuote}
        t={t}
        onOpenChange={setIsSummaryPreviewOpen}
      />
    </>
  );
}
