import { AlertTriangle, CheckCircle2, FileUp, PackageCheck, X } from 'lucide-react';
import {
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import type { CreateContactInput, SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuote } from '../../types';
import type { InventoryWarehouse } from '../../Inventory/types/inventoryTypes';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecordDraft, SalesBusinessOption } from '../types/salesTypes';
import { formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { getSalesPaymentMethodForStorage, normalizeSalesPaymentMethod, salesPaymentMethodIds } from '../utils/salesPaymentMethods';
import { FormField, salesFieldClassName, SectionCard } from './SalesModalPrimitives';
import { SalesCustomerSelector } from './SalesCustomerSelector';
import { SalesLineItemsEditor } from './SalesLineItemsEditor';
import { SalesPaymentAccountField } from './SalesPaymentAccountField';

export type SalesCreateStepId = 'origin' | 'operation' | 'review';

export const salesCreateStepIds: SalesCreateStepId[] = ['origin', 'operation', 'review'];

type SalesCreateFormProps = {
  activeStep: SalesCreateStepId;
  form: SaleRecordDraft;
  quoteOptions: SalesQuote[];
  contacts: SalesContact[];
  opportunities: SalesOpportunity[];
  selectedQuote: SalesQuote | null;
  products: SalesCatalogItem[];
  warehouses: InventoryWarehouse[];
  businessOptions: SalesBusinessOption[];
  isReady: boolean;
  stepError?: string;
  t: SalesRecordsTranslations;
  onFormChange: (patch: Partial<SaleRecordDraft>) => void;
  onCustomerSelection: (contactId: string, contact?: SalesContact) => void;
  onCreateCustomer: (contact: CreateContactInput) => Promise<SalesContact>;
  onOpportunitySelection: (opportunityId: string) => void;
  onQuoteSelection: (quoteId: string) => void;
};

function SalesLineItemsPreview({
  form,
  selectedQuote,
  t,
}: {
  form: SaleRecordDraft;
  selectedQuote: SalesQuote | null;
  t: SalesRecordsTranslations;
}) {
  const saleLines = form.saleLines;
  const quoteLines = selectedQuote?.items ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <div className="grid min-w-[680px] grid-cols-[1.4fr_70px_120px_100px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800">
          <span>{t.modal.summaryColumns.item}</span>
          <span>{t.modal.summaryColumns.quantity}</span>
          <span className="text-right">{t.modal.summaryColumns.unitPrice}</span>
          <span className="text-center">{t.modal.summaryColumns.tax}</span>
          <span className="text-right">{t.modal.summaryColumns.total}</span>
        </div>
        {saleLines.map((item) => (
          <div key={item.id} className="grid min-w-[680px] grid-cols-[1.4fr_70px_120px_100px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900 dark:text-white">{item.productName}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.sku}</span>
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">{item.quantity}</span>
            <span className="text-right font-medium text-slate-700 dark:text-slate-200">{formatSalesCurrency(item.unitPrice, form.currency)}</span>
            <span className="text-center text-slate-600 dark:text-slate-300">{item.taxPercent}%</span>
            <span className="text-right font-medium text-slate-900 dark:text-white">{formatSalesCurrency(item.subtotal, form.currency)}</span>
          </div>
        ))}
        {!saleLines.length ? quoteLines.map((item) => (
          <div key={item.id} className="grid min-w-[680px] grid-cols-[1.4fr_70px_120px_100px_120px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900 dark:text-white">{item.productName}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.sku}</span>
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">{item.quantity}</span>
            <span className="text-right font-medium text-slate-700 dark:text-slate-200">{formatSalesCurrency(item.unitPrice, form.currency)}</span>
            <span className="text-center text-slate-600 dark:text-slate-300">{item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`}</span>
            <span className="text-right font-medium text-slate-900 dark:text-white">{formatSalesCurrency(item.quantity * item.unitPrice, form.currency)}</span>
          </div>
        )) : null}
        {!saleLines.length && !quoteLines.length ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t.modal.workspace.noItems}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OriginStep({
  form,
  quoteOptions,
  contacts,
  opportunities,
  selectedQuote,
  t,
  onCustomerSelection,
  onCreateCustomer,
  onOpportunitySelection,
  onQuoteSelection,
}: Pick<
  SalesCreateFormProps,
  | 'form'
  | 'quoteOptions'
  | 'contacts'
  | 'opportunities'
  | 'selectedQuote'
  | 't'
  | 'onCustomerSelection'
  | 'onCreateCustomer'
  | 'onOpportunitySelection'
  | 'onQuoteSelection'
>) {
  return (
    <div className="space-y-4">
      <SectionCard title={t.modal.wizard.originTitle} description={t.modal.wizard.originDescription}>
        <FormField label={`${t.modal.fields.customerName} *`}>
          <SalesCustomerSelector
            contacts={contacts}
            selectedContactId={form.contactId ?? form.customerId}
            selectedCustomerName={form.customerName}
            t={t}
            onSelectCustomer={onCustomerSelection}
            onCreateCustomer={onCreateCustomer}
          />
        </FormField>

        <section className="grid gap-4 md:grid-cols-2">
          <FormField label={t.modal.fields.opportunitySelector}>
            <Select value={form.prospectId ?? 'none'} onValueChange={onOpportunitySelection}>
              <SelectTrigger aria-label={t.modal.fields.opportunitySelector} className={salesFieldClassName}><SelectValue placeholder={t.modal.placeholders.opportunitySelector} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.modal.workspace.directSale}</SelectItem>
                {opportunities.map((opportunity) => (
                  <SelectItem key={opportunity.id} value={opportunity.id}>
                    {opportunity.opportunityName} · {opportunity.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label={t.modal.fields.quoteSelector}>
            <Select value={form.quoteId ?? 'none'} onValueChange={onQuoteSelection}>
              <SelectTrigger aria-label={t.modal.fields.quoteSelector} className={salesFieldClassName}><SelectValue placeholder={t.modal.placeholders.quoteSelector} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.modal.workspace.directSale}</SelectItem>
                {quoteOptions.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    {quote.quoteNumber} · {quote.clientName} · {formatSalesCurrency(quote.total, quote.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </section>

        {selectedQuote ? (
          <IndiceModalSummary
            className="mt-5"
            columns={3}
            description={t.modal.wizard.inheritedFieldsHelper}
            icon={<CheckCircle2 className="h-5 w-5" />}
            items={[
              { id: 'quote', label: t.modal.fields.quoteReference, value: form.quoteReference || t.common.notAvailable },
              { id: 'customer', label: t.modal.fields.customerName, value: form.customerName || t.common.notAvailable },
              { id: 'seller', label: t.modal.fields.sellerName, value: form.sellerName || t.common.notAvailable },
              { id: 'total', label: t.modal.fields.totalAmount, value: formatSalesCurrency(form.totalAmount, form.currency), emphasized: true },
              { id: 'currency', label: t.modal.fields.currency, value: form.currency || t.common.notAvailable },
              { id: 'expiration', label: t.modal.workspace.expirationDate, value: formatSalesDate(selectedQuote.expirationDate) },
            ]}
            title={t.modal.wizard.approvedQuoteSelected}
            variant="success"
          />
        ) : null}
      </SectionCard>
    </div>
  );
}

function OperationStep({
  form,
  businessOptions,
  products,
  warehouses,
  t,
  onFormChange,
}: Pick<
  SalesCreateFormProps,
  | 'form'
  | 'businessOptions'
  | 'products'
  | 'warehouses'
  | 't'
  | 'onFormChange'
>) {
  const operationalContext = getSalesOperationalContext(form.businessId);
  const selectedPaymentMethod = normalizeSalesPaymentMethod(form.paymentMethod);
  const availableWarehouses = warehouses.filter((warehouse) => warehouse.status === 'active');
  const evidenceFiles = form.paymentEvidenceFiles ?? [];

  const updateEvidenceFiles = (files: File[]) => {
    onFormChange({
      paymentEvidenceFiles: files,
      paymentEvidenceStatus: 'missing',
    });
  };

  return (
    <div className="space-y-4">
      <SectionCard title={t.modal.wizard.operationTitle} description={t.modal.wizard.operationDescription}>
        <section className="grid gap-4 md:grid-cols-2">
          <FormField label={`${t.modal.fields.warehouse} *`}>
            <Select
              value={form.warehouseId || 'none'}
              onValueChange={(warehouseId) => {
                const warehouse = warehouses.find((item) => item.id === warehouseId);
                onFormChange({
                  warehouseId,
                  warehouseName: warehouse?.name ?? '',
                  businessUnitId: warehouse?.businessUnitId ?? '',
                  businessUnitName: warehouse?.businessUnitName ?? '',
                  businessId: warehouse?.businessId ?? '',
                  businessName: warehouse?.businessName ?? '',
                  paymentAccountId: undefined,
                  paymentAccountName: undefined,
                  saleLines: form.saleLines.map((line) => ({
                    ...line,
                    warehouseId,
                    businessUnitId: warehouse?.businessUnitId ?? '',
                    businessId: warehouse?.businessId ?? '',
                  })),
                });
              }}
            >
              <SelectTrigger aria-label={t.modal.fields.warehouse} className={salesFieldClassName}><SelectValue placeholder={t.modal.fields.warehouse} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>{t.modal.fields.warehouse}</SelectItem>
                {availableWarehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={`${t.modal.fields.saleDate} *`}>
            <Input aria-label={t.modal.fields.saleDate} type="date" value={form.saleDate} onChange={(event) => onFormChange({ saleDate: event.target.value })} className={salesFieldClassName} />
          </FormField>
        </section>

        <IndiceModalSummary
          className="mt-5"
          columns={3}
          items={[
            { id: 'unit', label: t.modal.fields.businessUnit, value: form.businessUnitName || t.common.notAvailable },
            { id: 'business', label: t.modal.fields.business, value: form.businessName || t.common.notAvailable },
            { id: 'legal-name', label: t.modal.operationalContext.legalName, value: operationalContext.legalName || t.common.notAvailable },
            { id: 'warehouse', label: t.modal.operationalContext.defaultWarehouse, value: form.warehouseName || operationalContext.defaultWarehouse || t.common.notAvailable },
            { id: 'items', label: t.modal.workspace.itemsLabel, value: String(form.saleLines.length) },
            { id: 'seller', label: t.modal.fields.sellerName, value: form.sellerName || t.common.notAvailable },
          ]}
          variant="muted"
        />
      </SectionCard>

      <SectionCard title={t.modal.sections.items} description={t.modal.itemsHelper}>
        <SalesLineItemsEditor form={form} products={products} t={t} onFormChange={onFormChange} />
      </SectionCard>

      <SectionCard title={t.modal.sections.payment} description={t.modal.wizard.paymentDescription}>
        <section className="grid gap-4 md:grid-cols-2">
          <FormField label={t.modal.fields.paymentMethod}>
            <Select
              value={selectedPaymentMethod || undefined}
              onValueChange={(value) => onFormChange({ paymentMethod: getSalesPaymentMethodForStorage(value) })}
            >
              <SelectTrigger aria-label={t.modal.fields.paymentMethod} className={salesFieldClassName}>
                <SelectValue placeholder={t.modal.placeholders.paymentMethod} />
              </SelectTrigger>
              <SelectContent>
                {salesPaymentMethodIds.map((method) => (
                  <SelectItem key={method} value={method}>{t.modal.paymentMethods[method]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t.modal.fields.paymentReference}>
            <Input aria-label={t.modal.fields.paymentReference} value={form.paymentReference} onChange={(event) => onFormChange({ paymentReference: event.target.value })} placeholder={t.modal.placeholders.paymentReference} className={salesFieldClassName} />
          </FormField>
          <FormField label={t.modal.fields.paymentAccount}>
            <SalesPaymentAccountField
              businessId={form.businessId}
              businessUnitId={form.businessUnitId}
              businessOptions={businessOptions}
              currency={form.currency}
              selectedId={form.paymentAccountId}
              t={t}
              onSelect={(account) => onFormChange({ paymentAccountId: account?.id, paymentAccountName: account?.name })}
            />
          </FormField>
          <FormField label={t.modal.fields.paymentEvidenceStatus}>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center transition hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/5 dark:border-slate-700 dark:bg-slate-800/50">
              <FileUp className="mb-1 h-5 w-5 text-[#B63B32]" />
              <span className="text-sm font-medium text-slate-800 dark:text-white">{t.modal.paymentEvidence.upload}</span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.modal.paymentEvidence.helper}</span>
              <input
                type="file"
                className="sr-only"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => updateEvidenceFiles([...evidenceFiles, ...Array.from(event.target.files ?? [])])}
              />
            </label>
            {evidenceFiles.length ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t.modal.paymentEvidence.selected(evidenceFiles.length)}</p>
                {evidenceFiles.map((file, index) => (
                  <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
                    <span className="truncate text-slate-700 dark:text-slate-200">{file.name}</span>
                    <button type="button" aria-label={t.modal.paymentEvidence.remove} onClick={() => updateEvidenceFiles(evidenceFiles.filter((_, fileIndex) => fileIndex !== index))}>
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </FormField>
          <FormField label={t.modal.fields.notes}>
            <Textarea aria-label={t.modal.fields.notes} value={form.notes} onChange={(event) => onFormChange({ notes: event.target.value })} placeholder={t.modal.placeholders.notes} className="min-h-24 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </FormField>
        </section>
      </SectionCard>
    </div>
  );
}

function ReviewStep({
  form,
  isReady,
  selectedQuote,
  t,
}: Pick<SalesCreateFormProps, 'form' | 'isReady' | 'selectedQuote' | 't'>) {
  const operationalContext = getSalesOperationalContext(form.businessId);
  const selectedPaymentMethod = normalizeSalesPaymentMethod(form.paymentMethod);

  return (
    <div className="space-y-4">
      <section className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3',
        isReady
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100',
      )}>
        {isReady ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
        <div>
          <h3 className="text-sm font-medium">{isReady ? t.modal.wizard.readyTitle : t.modal.wizard.pendingTitle}</h3>
          <p className="mt-1 text-sm leading-6 opacity-80">{isReady ? t.modal.wizard.readyDescription : t.modal.wizard.pendingDescription}</p>
        </div>
      </section>

      <SectionCard title={t.modal.wizard.reviewTitle} description={t.modal.wizard.reviewDescription}>
        <IndiceModalSummary
          className="border-0 bg-transparent p-0 dark:bg-transparent"
          columns={3}
          items={[
            { id: 'customer', label: t.modal.fields.customerName, value: form.customerName || t.common.notAvailable },
            { id: 'quote', label: t.modal.fields.quoteReference, value: form.quoteReference || t.common.notAvailable },
            { id: 'seller', label: t.modal.fields.sellerName, value: form.sellerName || t.common.notAvailable },
            { id: 'date', label: t.modal.fields.saleDate, value: formatSalesDate(form.saleDate) },
            { id: 'unit', label: t.modal.fields.businessUnit, value: form.businessUnitName || t.common.notAvailable },
            { id: 'business', label: t.modal.fields.business, value: form.businessName || t.common.notAvailable },
            { id: 'warehouse', label: t.modal.operationalContext.defaultWarehouse, value: form.warehouseName || operationalContext.defaultWarehouse || t.common.notAvailable },
            { id: 'payment-method', label: t.modal.fields.paymentMethod, value: selectedPaymentMethod ? t.modal.paymentMethods[selectedPaymentMethod] : t.common.notAvailable },
            { id: 'payment-reference', label: t.modal.fields.paymentReference, value: form.paymentReference || t.common.notAvailable },
            { id: 'payment-account', label: t.modal.fields.paymentAccount, value: form.paymentAccountName || t.common.notAvailable },
          ]}
        />
      </SectionCard>

      <SectionCard title={t.modal.sections.items} description={t.modal.itemsHelper}>
        <SalesLineItemsPreview form={form} selectedQuote={selectedQuote} t={t} />
        <IndiceModalSummary
          className="mt-4"
          columns={4}
          items={[
            { id: 'subtotal', label: t.invoice.subtotal, value: formatSalesCurrency(form.subtotal, form.currency) },
            { id: 'discount', label: t.invoice.discount, value: formatSalesCurrency(form.discountTotal, form.currency) },
            { id: 'tax', label: t.modal.fields.taxTotal, value: formatSalesCurrency(form.taxTotal, form.currency) },
            { id: 'total', label: t.modal.fields.totalAmount, value: formatSalesCurrency(form.totalAmount, form.currency), emphasized: true },
          ]}
          variant="accent"
        />
      </SectionCard>

      <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        {t.modal.inventoryHelper}
      </p>
    </div>
  );
}

export function SalesCreateForm({
  activeStep,
  form,
  quoteOptions,
  contacts,
  opportunities,
  selectedQuote,
  products,
  warehouses,
  businessOptions,
  isReady,
  stepError,
  t,
  onCustomerSelection,
  onCreateCustomer,
  onFormChange,
  onOpportunitySelection,
  onQuoteSelection,
}: SalesCreateFormProps) {
  return (
    <div className="space-y-4">
      <IndiceModalWizardStepper
        accent="coral"
        activeStepId={activeStep}
        progressLabel={t.modal.wizard.progressLabel}
        steps={salesCreateStepIds.map((stepId) => ({ id: stepId, label: t.modal.wizard.steps[stepId] }))}
      />

      <IndiceModalValidation messages={stepError ? [stepError] : []} />

      {activeStep === 'origin' ? (
        <OriginStep
          form={form}
          quoteOptions={quoteOptions}
          contacts={contacts}
          opportunities={opportunities}
          selectedQuote={selectedQuote}
          t={t}
          onCustomerSelection={onCustomerSelection}
          onCreateCustomer={onCreateCustomer}
          onOpportunitySelection={onOpportunitySelection}
          onQuoteSelection={onQuoteSelection}
        />
      ) : null}

      {activeStep === 'operation' ? (
        <OperationStep
          form={form}
          businessOptions={businessOptions}
          products={products}
          warehouses={warehouses}
          t={t}
          onFormChange={onFormChange}
        />
      ) : null}

      {activeStep === 'review' ? <ReviewStep form={form} isReady={isReady} selectedQuote={selectedQuote} t={t} /> : null}
    </div>
  );
}
