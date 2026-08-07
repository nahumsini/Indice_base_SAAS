import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Input } from '../../../../../components/ui/input';
import type { CreateContactInput, SalesContact, SalesQuoteItem } from '../../../types';
import { SalesCustomerSelector } from '../../../Sales/components/SalesCustomerSelector';
import type { SalesRecordsTranslations } from '../../../Sales/translations';
import { FilterSelect } from '../../components/QuoteUi';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState } from '../../types/quoteBuilderTypes';
import { getDaysUntil } from '../../utils/quoteReadiness';
import { QuoteTaxJurisdictionPanel } from './QuoteTaxJurisdictionPanel';

const coralFieldClassName = 'border-slate-200 bg-white shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20';

export function QuoteCustomerSection({
  form,
  t,
  customerT,
  contacts,
  items,
  opportunityOptions,
  sellerOptions,
  onFormChange,
  onCreateCustomer,
  onSellerChange,
  onCurrencyChange,
  onUpdateItem,
}: {
  form: QuoteFormState;
  t: QuotesTranslations;
  customerT: SalesRecordsTranslations;
  contacts: SalesContact[];
  items: SalesQuoteItem[];
  opportunityOptions: Array<{ value: string; label: string }>;
  sellerOptions: Array<{ value: string; label: string }>;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onCreateCustomer: (contact: CreateContactInput) => Promise<SalesContact>;
  onSellerChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
}) {
  const daysUntilExpiration = getDaysUntil(form.expirationDate);
  const isExpirationClose = typeof daysUntilExpiration === 'number' && daysUntilExpiration >= 0 && daysUntilExpiration <= 7;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">{t.labels.client}</label>
        <SalesCustomerSelector
          contacts={contacts}
          selectedContactId={form.clientId}
          selectedCustomerName=""
          t={customerT}
          onSelectCustomer={(contactId) => onFormChange((current) => ({
            ...current,
            clientMode: 'contact',
            clientId: contactId,
            temporaryClient: '',
            contactPerson: '',
          }))}
          onCreateCustomer={onCreateCustomer}
        />
      </div>

      <FilterSelect
        softTypography
        label={t.labels.opportunity}
        value={form.opportunityId}
        onValueChange={(value) => onFormChange((current) => ({ ...current, opportunityId: value }))}
        options={opportunityOptions}
      />
      {form.opportunityId === 'none' ? (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-5 text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {t.builder.noOpportunityHelper}
        </div>
      ) : null}

      <QuoteTaxJurisdictionPanel
        form={form}
        items={items}
        t={t}
        onFormChange={onFormChange}
        onCurrencyChange={onCurrencyChange}
        onUpdateItem={onUpdateItem}
      />

      <div className="grid gap-4">
        <FilterSelect
          softTypography
          label={t.labels.seller}
          value={form.assignedSellerValue}
          onValueChange={onSellerChange}
          options={sellerOptions}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">{t.labels.createdDate}</label>
          <Input
            className={coralFieldClassName}
            type="date"
            value={form.createdDate}
            onChange={(event) => onFormChange((current) => ({ ...current, createdDate: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">{t.labels.expirationDate}</label>
          <Input
            className={coralFieldClassName}
            type="date"
            value={form.expirationDate}
            onChange={(event) => onFormChange((current) => ({ ...current, expirationDate: event.target.value }))}
          />
        </div>
      </div>

      {isExpirationClose ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#F4C84A]/40 bg-[#F4C84A]/10 px-4 py-3 text-sm font-normal leading-5 text-[#9a6b05]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t.builder.expirationWarning(daysUntilExpiration ?? 0)}
        </div>
      ) : null}
    </section>
  );
}
