import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { salesBusinessUnitOptions } from '../data/salesBusinessOptions';
import { getSalesOperationalContext } from '../data/salesOperationalContext';
import type { SalesQuote } from '../../types';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecordDraft, SalesBusinessOption } from '../types/salesTypes';
import { formatSalesCurrency } from '../utils/salesFormatters';
import {
  commercialStatuses,
  deliveryStatuses,
  financeStatuses,
  inventoryMovementStatuses,
  inventoryStatuses,
  paymentEvidenceStatuses,
} from '../utils/salesStatuses';
import { DetailField, FormField, salesFieldClassName, SectionCard } from './SalesModalPrimitives';
import { SalesOperationalContextCard } from './SalesOperationalContextCard';

type SalesCreateFormProps = {
  form: SaleRecordDraft;
  acceptedQuotes: SalesQuote[];
  quoteOptions: SalesQuote[];
  businessOptions: SalesBusinessOption[];
  t: SalesRecordsTranslations;
  onFormChange: (patch: Partial<SaleRecordDraft>) => void;
  onQuoteSelection: (quoteId: string) => void;
  onBusinessUnitSelection: (businessUnitId: string) => void;
  onBusinessSelection: (businessId: string) => void;
};

export function SalesCreateForm({
  form,
  acceptedQuotes,
  quoteOptions,
  businessOptions,
  t,
  onFormChange,
  onQuoteSelection,
  onBusinessUnitSelection,
  onBusinessSelection,
}: SalesCreateFormProps) {
  const statusFields = [
    { key: 'commercialStatus', label: t.modal.fields.commercialStatus, options: commercialStatuses, labels: t.statuses.commercial },
    { key: 'financeStatus', label: t.modal.fields.financeStatus, options: financeStatuses, labels: t.statuses.finance },
    { key: 'inventoryStatus', label: t.modal.fields.inventoryStatus, options: inventoryStatuses, labels: t.statuses.inventory },
    { key: 'deliveryStatus', label: t.modal.fields.deliveryStatus, options: deliveryStatuses, labels: t.statuses.delivery },
    { key: 'inventoryMovementStatus', label: t.modal.fields.inventoryMovementStatus, options: inventoryMovementStatuses, labels: t.statuses.movement },
    { key: 'paymentEvidenceStatus', label: t.modal.fields.paymentEvidenceStatus, options: paymentEvidenceStatuses, labels: t.statuses.paymentEvidence },
  ] as const;
  const operationalContext = getSalesOperationalContext(form.businessId);

  const renderStatusField = (field: (typeof statusFields)[number]) => (
    <FormField key={field.key} label={field.label}>
      <Select value={String(form[field.key])} onValueChange={(value) => onFormChange({ [field.key]: value })}>
        <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
        <SelectContent>{field.options.map((option) => <SelectItem key={option} value={option}>{field.labels[option]}</SelectItem>)}</SelectContent>
      </Select>
    </FormField>
  );

  return (
    <>
      <SectionCard title={t.modal.sections.general} description={t.modal.quoteSelectorHelper}>
        <section className="grid gap-4 md:grid-cols-2">
        <FormField label={t.modal.fields.quoteSelector}>
          <Select value={form.quoteId ?? 'none'} onValueChange={onQuoteSelection}>
            <SelectTrigger className={salesFieldClassName}><SelectValue placeholder={t.modal.placeholders.quoteSelector} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>{t.modal.placeholders.quoteSelector}</SelectItem>
              {quoteOptions.map((quote) => (
                <SelectItem key={quote.id} value={quote.id}>
                  {(quote.status === 'Approved' || quote.status === 'Closed Won') ? `${t.modal.acceptedQuoteBadge} · ` : ''}{quote.quoteNumber} · {quote.clientName} · {formatSalesCurrency(quote.total, 'MXN')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <DetailField label={t.modal.fields.quoteReference} value={form.quoteReference || t.common.notAvailable} />
        {acceptedQuotes.length === 0 ? (
          <div className="rounded-lg border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-4 py-3 text-sm font-semibold text-[#9a6b05] md:col-span-2">
            {t.modal.quoteFallbackHelper}
          </div>
        ) : null}
        <FormField label={t.modal.fields.customerName}><Input value={form.customerName} onChange={(event) => onFormChange({ customerName: event.target.value })} placeholder={t.modal.placeholders.customerName} className={salesFieldClassName} /></FormField>
        <FormField label={t.modal.fields.sellerName}><Input value={form.sellerName} onChange={(event) => onFormChange({ sellerName: event.target.value })} placeholder={t.modal.placeholders.sellerName} className={salesFieldClassName} /></FormField>
        <FormField label={t.modal.fields.saleDate}><Input type="date" value={form.saleDate} onChange={(event) => onFormChange({ saleDate: event.target.value })} className={salesFieldClassName} /></FormField>
        <FormField label={t.modal.fields.totalAmount}><Input type="number" value={form.totalAmount} onChange={(event) => onFormChange({ totalAmount: Number(event.target.value) })} className={salesFieldClassName} /></FormField>
        <FormField label={t.modal.fields.currency}><Input value={form.currency} onChange={(event) => onFormChange({ currency: event.target.value.toUpperCase() })} className={salesFieldClassName} /></FormField>
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
      </SectionCard>

      <SalesOperationalContextCard context={operationalContext} t={t} />

      <SectionCard title={t.modal.sections.payment}>
        <section className="grid gap-4 md:grid-cols-2">
        <FormField label={t.modal.fields.paymentMethod}><Input value={form.paymentMethod} onChange={(event) => onFormChange({ paymentMethod: event.target.value })} placeholder={t.modal.placeholders.paymentMethod} className={salesFieldClassName} /></FormField>
        <FormField label={t.modal.fields.paymentReference}><Input value={form.paymentReference} onChange={(event) => onFormChange({ paymentReference: event.target.value })} placeholder={t.modal.placeholders.paymentReference} className={salesFieldClassName} /></FormField>
        {statusFields.filter((field) => field.key === 'paymentEvidenceStatus').map(renderStatusField)}
        </section>
      </SectionCard>

      <SectionCard title={t.modal.sections.validation}>
        <section className="grid gap-4 md:grid-cols-3">
        {statusFields.filter((field) => ['commercialStatus', 'financeStatus', 'deliveryStatus'].includes(field.key)).map(renderStatusField)}
        </section>
      </SectionCard>

      <SectionCard title={t.modal.sections.inventory} description={t.modal.inventoryExecutionHelper}>
        <section className="grid gap-4 md:grid-cols-2">
        {statusFields.filter((field) => ['inventoryStatus', 'inventoryMovementStatus'].includes(field.key)).map(renderStatusField)}
        <FormField label={t.modal.fields.inventoryMovementReference}><Input value={form.inventoryMovementReference} onChange={(event) => onFormChange({ inventoryMovementReference: event.target.value })} placeholder={t.modal.placeholders.movementReference} className={salesFieldClassName} /></FormField>
        <DetailField label={t.modal.fields.inventoryMovementStatus} value={t.statuses.movement[form.inventoryMovementStatus]} />
        </section>
      </SectionCard>

      <SectionCard title={t.modal.sections.notes}>
        <FormField label={t.modal.fields.notes}><Textarea value={form.notes} onChange={(event) => onFormChange({ notes: event.target.value })} placeholder={t.modal.placeholders.notes} className="min-h-24 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" /></FormField>
      </SectionCard>
    </>
  );
}
