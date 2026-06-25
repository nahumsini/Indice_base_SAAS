import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Textarea } from '../../../../components/ui/textarea';
import { salesBusinessUnitOptions } from '../data/salesBusinessOptions';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesOpportunity, SalesQuote } from '../../types';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecordDraft, SalesBusinessOption } from '../types/salesTypes';
import { formatSalesCurrency, formatSalesDate } from '../utils/salesFormatters';
import { paymentEvidenceStatuses } from '../utils/salesStatuses';
import { DetailField, FormField, salesFieldClassName, SectionCard } from './SalesModalPrimitives';
import { SalesCreateSummaryPanel } from './SalesCreateSummaryPanel';

type SalesCreateTabId = 'customer' | 'items' | 'inventory' | 'payment' | 'review';

const salesCreateTabIds: SalesCreateTabId[] = ['customer', 'items', 'inventory', 'payment', 'review'];

type SalesCreateFormProps = {
  form: SaleRecordDraft;
  acceptedQuotes: SalesQuote[];
  quoteOptions: SalesQuote[];
  opportunities: SalesOpportunity[];
  selectedOpportunity: SalesOpportunity | null;
  selectedQuote: SalesQuote | null;
  businessOptions: SalesBusinessOption[];
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
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="grid min-w-[760px] grid-cols-[1.4fr_90px_130px_110px_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-800">
        <span>{t.modal.summaryColumns.item}</span>
        <span>{t.modal.summaryColumns.quantity}</span>
        <span className="text-right">{t.modal.summaryColumns.unitPrice}</span>
        <span className="text-center">{t.modal.summaryColumns.tax}</span>
        <span className="text-right">{t.modal.summaryColumns.total}</span>
      </div>
      <div className="overflow-x-auto">
        {saleLines.map((item) => (
          <div key={item.id} className="grid min-w-[760px] grid-cols-[1.4fr_90px_130px_110px_130px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
            <span className="min-w-0">
              <span className="block truncate font-black text-slate-900 dark:text-white">{item.productName}</span>
              <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.sku}</span>
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{item.quantity}</span>
            <span className="text-right font-bold text-slate-700 dark:text-slate-200">{formatSalesCurrency(item.unitPrice, form.currency)}</span>
            <span className="text-center font-bold text-slate-700 dark:text-slate-200">{item.taxPercent}%</span>
            <span className="text-right font-black text-slate-900 dark:text-white">{formatSalesCurrency(item.subtotal, form.currency)}</span>
          </div>
        ))}
        {!saleLines.length ? quoteLines.map((item) => (
          <div key={item.id} className="grid min-w-[760px] grid-cols-[1.4fr_90px_130px_110px_130px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
            <span className="min-w-0">
              <span className="block truncate font-black text-slate-900 dark:text-white">{item.productName}</span>
              <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.sku}</span>
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{item.quantity}</span>
            <span className="text-right font-bold text-slate-700 dark:text-slate-200">{formatSalesCurrency(item.unitPrice, form.currency)}</span>
            <span className="text-center font-bold text-slate-700 dark:text-slate-200">{item.taxLabel ? `${item.taxLabel} ${item.taxPercent}%` : `${item.taxPercent}%`}</span>
            <span className="text-right font-black text-slate-900 dark:text-white">{formatSalesCurrency(item.quantity * item.unitPrice, form.currency)}</span>
          </div>
        )) : null}
        {!saleLines.length && !quoteLines.length ? (
          <div className="px-4 py-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t.modal.workspace.noItems}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SalesCreateForm({
  form,
  acceptedQuotes,
  quoteOptions,
  opportunities,
  selectedOpportunity,
  selectedQuote,
  businessOptions,
  t,
  onFormChange,
  onOpportunitySelection,
  onQuoteSelection,
  onBusinessUnitSelection,
  onBusinessSelection,
}: SalesCreateFormProps) {
  const [activeTab, setActiveTab] = useState<SalesCreateTabId>('customer');
  const operationalContext = getSalesOperationalContext(form.businessId);
  const acceptedLinkedQuotes = quoteOptions.filter((quote) => quote.status === 'Approved' || quote.status === 'Closed Won');
  const hasOpportunityQuoteOptions = quoteOptions.length > 0;
  const opportunityHelper = !selectedOpportunity
    ? t.modal.workspace.noOpportunitySelected
    : acceptedLinkedQuotes.length > 0
      ? t.modal.workspace.approvedQuotesAvailable(acceptedLinkedQuotes.length)
      : t.modal.workspace.noApprovedQuoteForOpportunity;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SalesCreateTabId)} className="min-h-0 gap-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-5">
          {salesCreateTabIds.map((tabId) => (
            <TabsTrigger
              key={tabId}
              value={tabId}
              className="h-10 rounded-lg px-3 text-sm font-black data-[state=active]:bg-[#FF6B5E] data-[state=active]:text-white dark:text-slate-200"
            >
              {t.modal.tabs[tabId]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="customer" className="mt-0 space-y-5">
          <SectionCard title={t.modal.sections.closeSource} description={t.modal.opportunitySelectorHelper}>
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4 text-sm font-semibold leading-6 text-[#B63B32] dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/10 dark:text-[#FFB5AE]">
              {selectedOpportunity ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
              <span>{opportunityHelper}</span>
            </div>

            <section className="grid gap-4 xl:grid-cols-2">
              <FormField label={t.modal.fields.opportunitySelector}>
                <Select value={form.prospectId ?? 'none'} onValueChange={onOpportunitySelection}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue placeholder={t.modal.placeholders.opportunitySelector} /></SelectTrigger>
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

              <FormField label={t.modal.fields.quoteSelector}>
                <Select value={form.quoteId ?? 'none'} onValueChange={onQuoteSelection}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue placeholder={t.modal.placeholders.quoteSelector} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      {hasOpportunityQuoteOptions ? t.modal.placeholders.quoteSelector : t.modal.workspace.noLinkedQuotes}
                    </SelectItem>
                    {quoteOptions.map((quote) => (
                      <SelectItem key={quote.id} value={quote.id}>
                        {(quote.status === 'Approved' || quote.status === 'Closed Won') ? `${t.modal.acceptedQuoteBadge} · ` : ''}{quote.quoteNumber} · {quote.clientName} · {formatSalesCurrency(quote.total, quote.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </section>

            {acceptedQuotes.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-4 py-3 text-sm font-semibold text-[#9a6b05] dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/15 dark:text-[#F8DC7E]">
                {t.modal.quoteFallbackHelper}
              </div>
            ) : null}

            <section className="mt-4 grid gap-4 md:grid-cols-3">
              <DetailField label={t.modal.fields.quoteReference} value={form.quoteReference || t.common.notAvailable} />
              <DetailField label={t.modal.workspace.opportunityStage} value={selectedOpportunity?.stage ?? t.common.notAvailable} />
              <DetailField label={t.modal.workspace.opportunityValue} value={selectedOpportunity?.estimatedValue || t.common.notAvailable} />
            </section>
          </SectionCard>

          <SectionCard title={t.modal.sections.commercialClose}>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label={t.modal.fields.customerName}>
                <Input value={form.customerName} onChange={(event) => onFormChange({ customerName: event.target.value })} placeholder={t.modal.placeholders.customerName} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.modal.fields.sellerName}>
                <Input value={form.sellerName} onChange={(event) => onFormChange({ sellerName: event.target.value })} placeholder={t.modal.placeholders.sellerName} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.modal.fields.saleDate}>
                <Input type="date" value={form.saleDate} onChange={(event) => onFormChange({ saleDate: event.target.value })} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.modal.fields.totalAmount}>
                <Input type="number" value={form.totalAmount} onChange={(event) => onFormChange({ totalAmount: Number(event.target.value) })} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.modal.fields.currency}>
                <Input value={form.currency} onChange={(event) => onFormChange({ currency: event.target.value.toUpperCase() })} className={salesFieldClassName} />
              </FormField>
              <DetailField label={t.modal.workspace.expirationDate} value={selectedQuote ? formatSalesDate(selectedQuote.expirationDate) : t.common.notAvailable} />
            </section>
          </SectionCard>
        </TabsContent>

        <TabsContent value="items" className="mt-0 space-y-5">
          <SectionCard title={t.modal.sections.items} description={t.modal.itemsHelper}>
            <SalesLineItemsPreview form={form} selectedQuote={selectedQuote} t={t} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="inventory" className="mt-0 space-y-5">
          <SectionCard title={t.modal.sections.operationalReadiness} description={t.modal.inventoryExecutionHelper}>
            <section className="grid gap-4 md:grid-cols-2">
              <FormField label={t.modal.fields.businessUnit}>
                <Select value={form.businessUnitId || 'none'} onValueChange={onBusinessUnitSelection}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{salesBusinessUnitOptions.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label={t.modal.fields.business}>
                <Select value={form.businessId || 'none'} onValueChange={onBusinessSelection}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.common.none}</SelectItem>
                    {businessOptions.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailField label={t.modal.operationalContext.legalName} value={operationalContext.legalName} />
              <DetailField label={operationalContext.taxIdentifierLabel || t.modal.operationalContext.taxIdentifier} value={operationalContext.taxIdentifier || t.common.notAvailable} />
              <DetailField label={t.modal.operationalContext.defaultWarehouse} value={operationalContext.defaultWarehouse} />
              <DetailField label={t.modal.fields.inventoryMovementStatus} value={t.statuses.movement[form.inventoryMovementStatus]} />
            </section>
          </SectionCard>
        </TabsContent>

        <TabsContent value="payment" className="mt-0 space-y-5">
          <SectionCard title={t.modal.sections.payment}>
            <section className="grid gap-4 md:grid-cols-3">
              <FormField label={t.modal.fields.paymentMethod}>
                <Input value={form.paymentMethod} onChange={(event) => onFormChange({ paymentMethod: event.target.value })} placeholder={t.modal.placeholders.paymentMethod} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.modal.fields.paymentReference}>
                <Input value={form.paymentReference} onChange={(event) => onFormChange({ paymentReference: event.target.value })} placeholder={t.modal.placeholders.paymentReference} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.modal.fields.paymentEvidenceStatus}>
                <Select value={form.paymentEvidenceStatus} onValueChange={(value) => onFormChange({ paymentEvidenceStatus: value as SaleRecordDraft['paymentEvidenceStatus'] })}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentEvidenceStatuses.map((option) => <SelectItem key={option} value={option}>{t.statuses.paymentEvidence[option]}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </section>
          </SectionCard>

          <SectionCard title={t.modal.sections.notes}>
            <FormField label={t.modal.fields.notes}>
              <Textarea value={form.notes} onChange={(event) => onFormChange({ notes: event.target.value })} placeholder={t.modal.placeholders.notes} className="min-h-24 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </FormField>
          </SectionCard>
        </TabsContent>

        <TabsContent value="review" className="mt-0 space-y-5">
          <SectionCard title={t.modal.sections.review} description={t.modal.reviewHelper}>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailField label={t.modal.fields.customerName} value={form.customerName || t.common.notAvailable} />
              <DetailField label={t.modal.fields.quoteReference} value={form.quoteReference || t.common.notAvailable} />
              <DetailField label={t.modal.fields.saleDate} value={formatSalesDate(form.saleDate)} />
              <DetailField label={t.modal.fields.totalAmount} value={formatSalesCurrency(form.totalAmount, form.currency)} />
              <DetailField label={t.modal.fields.currency} value={form.currency || t.common.notAvailable} />
              <DetailField label={t.modal.fields.taxTotal} value={formatSalesCurrency(form.taxTotal, form.currency)} />
              <DetailField label={t.modal.fields.businessUnit} value={form.businessUnitName || t.common.notAvailable} />
              <DetailField label={t.modal.fields.business} value={form.businessName || t.common.notAvailable} />
              <DetailField label={t.modal.fields.paymentEvidenceStatus} value={t.statuses.paymentEvidence[form.paymentEvidenceStatus]} />
            </section>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <SalesCreateSummaryPanel
        form={form}
        selectedOpportunity={selectedOpportunity}
        selectedQuote={selectedQuote}
        t={t}
      />
    </div>
  );
}
