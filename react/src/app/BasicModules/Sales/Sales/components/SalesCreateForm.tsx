import { AlertTriangle, CheckCircle2, ExternalLink, PackageCheck } from 'lucide-react';
import { Link } from 'react-router';
import {
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
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
import type { SalesOpportunity, SalesQuote } from '../../types';
import { salesBusinessUnitOptions } from '../data/salesBusinessOptions';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecordDraft, SalesBusinessOption } from '../types/salesTypes';
import { formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { getSalesPaymentMethodForStorage, normalizeSalesPaymentMethod, salesPaymentMethodIds } from '../utils/salesPaymentMethods';
import { paymentEvidenceStatuses } from '../utils/salesStatuses';
import { FormField, salesFieldClassName, SectionCard } from './SalesModalPrimitives';

export type SalesCreateStepId = 'origin' | 'operation' | 'review';

export const salesCreateStepIds: SalesCreateStepId[] = ['origin', 'operation', 'review'];

type SalesCreateFormProps = {
  activeStep: SalesCreateStepId;
  form: SaleRecordDraft;
  acceptedQuotes: SalesQuote[];
  quoteOptions: SalesQuote[];
  opportunities: SalesOpportunity[];
  selectedOpportunity: SalesOpportunity | null;
  selectedQuote: SalesQuote | null;
  businessOptions: SalesBusinessOption[];
  isReady: boolean;
  stepError?: string;
  t: SalesRecordsTranslations;
  onFormChange: (patch: Partial<SaleRecordDraft>) => void;
  onOpportunitySelection: (opportunityId: string) => void;
  onQuoteSelection: (quoteId: string) => void;
  onBusinessUnitSelection: (businessUnitId: string) => void;
  onBusinessSelection: (businessId: string) => void;
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
  acceptedQuotes,
  quoteOptions,
  opportunities,
  selectedOpportunity,
  selectedQuote,
  t,
  onOpportunitySelection,
  onQuoteSelection,
}: Pick<
  SalesCreateFormProps,
  | 'form'
  | 'acceptedQuotes'
  | 'quoteOptions'
  | 'opportunities'
  | 'selectedOpportunity'
  | 'selectedQuote'
  | 't'
  | 'onOpportunitySelection'
  | 'onQuoteSelection'
>) {
  const noApprovedQuotes = acceptedQuotes.length === 0;
  const noApprovedQuoteForOpportunity = Boolean(selectedOpportunity) && quoteOptions.length === 0;

  return (
    <div className="space-y-4">
      {noApprovedQuotes ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-base font-medium">{t.modal.wizard.noApprovedQuotesTitle}</h3>
              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">{t.modal.wizard.noApprovedQuotesDescription}</p>
              <Button asChild variant="outline" className="mt-4 h-10 rounded-xl border-amber-300 bg-white px-4 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                <Link to="/sales/quotes">
                  {t.modal.wizard.goToQuotes}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <SectionCard title={t.modal.wizard.originTitle} description={t.modal.wizard.originDescription}>
        <section className="grid gap-4 md:grid-cols-2">
          <FormField label={t.modal.fields.opportunitySelector}>
            <Select value={form.prospectId ?? 'none'} onValueChange={onOpportunitySelection}>
              <SelectTrigger aria-label={t.modal.fields.opportunitySelector} className={salesFieldClassName}><SelectValue placeholder={t.modal.placeholders.opportunitySelector} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>{t.modal.placeholders.opportunitySelector}</SelectItem>
                {opportunities.map((opportunity) => (
                  <SelectItem key={opportunity.id} value={opportunity.id}>
                    {opportunity.opportunityName} · {opportunity.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label={`${t.modal.fields.quoteSelector} *`}>
            <Select value={form.quoteId ?? 'none'} onValueChange={onQuoteSelection} disabled={noApprovedQuotes || noApprovedQuoteForOpportunity}>
              <SelectTrigger aria-label={t.modal.fields.quoteSelector} className={salesFieldClassName}><SelectValue placeholder={t.modal.placeholders.quoteSelector} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  {noApprovedQuoteForOpportunity ? t.modal.workspace.noLinkedQuotes : t.modal.placeholders.quoteSelector}
                </SelectItem>
                {quoteOptions.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    {quote.quoteNumber} · {quote.clientName} · {formatSalesCurrency(quote.total, quote.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </section>

        {noApprovedQuoteForOpportunity ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
            {t.modal.workspace.noApprovedQuoteForOpportunity}
          </p>
        ) : null}

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
  t,
  onFormChange,
  onBusinessUnitSelection,
  onBusinessSelection,
}: Pick<
  SalesCreateFormProps,
  | 'form'
  | 'businessOptions'
  | 't'
  | 'onFormChange'
  | 'onBusinessUnitSelection'
  | 'onBusinessSelection'
>) {
  const operationalContext = getSalesOperationalContext(form.businessId);
  const selectedPaymentMethod = normalizeSalesPaymentMethod(form.paymentMethod);

  return (
    <div className="space-y-4">
      <SectionCard title={t.modal.wizard.operationTitle} description={t.modal.wizard.operationDescription}>
        <section className="grid gap-4 md:grid-cols-3">
          <FormField label={`${t.modal.fields.businessUnit} *`}>
            <Select value={form.businessUnitId || 'none'} onValueChange={onBusinessUnitSelection}>
              <SelectTrigger aria-label={t.modal.fields.businessUnit} className={salesFieldClassName}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>{t.modal.fields.businessUnit}</SelectItem>
                {salesBusinessUnitOptions.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={`${t.modal.fields.business} *`}>
            <Select value={form.businessId || 'none'} onValueChange={onBusinessSelection}>
              <SelectTrigger aria-label={t.modal.fields.business} className={salesFieldClassName}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>{t.modal.fields.business}</SelectItem>
                {businessOptions.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}
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
            { id: 'legal-name', label: t.modal.operationalContext.legalName, value: operationalContext.legalName || t.common.notAvailable },
            { id: 'warehouse', label: t.modal.operationalContext.defaultWarehouse, value: operationalContext.defaultWarehouse || t.common.notAvailable },
            { id: 'items', label: t.modal.workspace.itemsLabel, value: String(form.saleLines.length) },
          ]}
          variant="muted"
        />
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
          <FormField label={t.modal.fields.paymentEvidenceStatus}>
            <Select value={form.paymentEvidenceStatus} onValueChange={(value) => onFormChange({ paymentEvidenceStatus: value as SaleRecordDraft['paymentEvidenceStatus'] })}>
              <SelectTrigger aria-label={t.modal.fields.paymentEvidenceStatus} className={salesFieldClassName}><SelectValue /></SelectTrigger>
              <SelectContent>{paymentEvidenceStatuses.map((option) => <SelectItem key={option} value={option}>{t.statuses.paymentEvidence[option]}</SelectItem>)}</SelectContent>
            </Select>
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
            { id: 'warehouse', label: t.modal.operationalContext.defaultWarehouse, value: operationalContext.defaultWarehouse || t.common.notAvailable },
            { id: 'payment-method', label: t.modal.fields.paymentMethod, value: selectedPaymentMethod ? t.modal.paymentMethods[selectedPaymentMethod] : t.common.notAvailable },
            { id: 'payment-reference', label: t.modal.fields.paymentReference, value: form.paymentReference || t.common.notAvailable },
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
  acceptedQuotes,
  quoteOptions,
  opportunities,
  selectedOpportunity,
  selectedQuote,
  businessOptions,
  isReady,
  stepError,
  t,
  onFormChange,
  onOpportunitySelection,
  onQuoteSelection,
  onBusinessUnitSelection,
  onBusinessSelection,
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
          acceptedQuotes={acceptedQuotes}
          quoteOptions={quoteOptions}
          opportunities={opportunities}
          selectedOpportunity={selectedOpportunity}
          selectedQuote={selectedQuote}
          t={t}
          onOpportunitySelection={onOpportunitySelection}
          onQuoteSelection={onQuoteSelection}
        />
      ) : null}

      {activeStep === 'operation' ? (
        <OperationStep
          form={form}
          businessOptions={businessOptions}
          t={t}
          onFormChange={onFormChange}
          onBusinessUnitSelection={onBusinessUnitSelection}
          onBusinessSelection={onBusinessSelection}
        />
      ) : null}

      {activeStep === 'review' ? <ReviewStep form={form} isReady={isReady} selectedQuote={selectedQuote} t={t} /> : null}
    </div>
  );
}
