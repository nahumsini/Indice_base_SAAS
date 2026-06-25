import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { cn } from '../../../../../components/ui/utils';
import type { SalesContact, SalesQuoteItem } from '../../../types';
import { FilterSelect } from '../../components/QuoteUi';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState } from '../../types/quoteBuilderTypes';
import { getDaysUntil } from '../../utils/quoteReadiness';
import { QuoteTaxJurisdictionPanel } from './QuoteTaxJurisdictionPanel';

const coralFieldClassName = 'border-slate-200 bg-white shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20';

export function QuoteCustomerSection({
  form,
  t,
  contacts,
  items,
  opportunityOptions,
  sellerOptions,
  onFormChange,
  onSellerChange,
  onCurrencyChange,
  onUpdateItem,
}: {
  form: QuoteFormState;
  t: QuotesTranslations;
  contacts: SalesContact[];
  items: SalesQuoteItem[];
  opportunityOptions: Array<{ value: string; label: string }>;
  sellerOptions: Array<{ value: string; label: string }>;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onSellerChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
}) {
  const daysUntilExpiration = getDaysUntil(form.expirationDate);
  const isExpirationClose = typeof daysUntilExpiration === 'number' && daysUntilExpiration >= 0 && daysUntilExpiration <= 7;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
        <Button
          type="button"
          variant={form.clientMode === 'contact' ? 'default' : 'ghost'}
          className={cn('rounded-lg', form.clientMode === 'contact' && 'bg-[#FF6B5E] text-white hover:bg-[#E85C50]')}
          onClick={() => onFormChange((current) => ({ ...current, clientMode: 'contact' }))}
        >
          {t.builder.modeContact}
        </Button>
        <Button
          type="button"
          variant={form.clientMode === 'temporary' ? 'default' : 'ghost'}
          className={cn('rounded-lg', form.clientMode === 'temporary' && 'bg-[#FF6B5E] text-white hover:bg-[#E85C50]')}
          onClick={() => onFormChange((current) => ({ ...current, clientMode: 'temporary' }))}
        >
          {t.builder.modeTemporary}
        </Button>
      </div>

      {form.clientMode === 'contact' ? (
        <FilterSelect
          label={t.labels.client}
          value={form.clientId}
          onValueChange={(value) => onFormChange((current) => ({ ...current, clientId: value }))}
          options={contacts.map((contact) => ({ value: contact.id, label: `${contact.company} · ${contact.contactPerson}` }))}
        />
      ) : (
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.labels.temporaryClient}</label>
            <Input
              className={coralFieldClassName}
              value={form.temporaryClient}
              onChange={(event) => onFormChange((current) => ({ ...current, temporaryClient: event.target.value }))}
              placeholder={t.builder.temporaryClientPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.labels.contact}</label>
            <Input
              className={coralFieldClassName}
              value={form.contactPerson}
              onChange={(event) => onFormChange((current) => ({ ...current, contactPerson: event.target.value }))}
              placeholder={t.builder.contactPlaceholder}
            />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-5 text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            {t.builder.temporaryCustomerHelper}
          </div>
        </div>
      )}

      <FilterSelect
        label={t.labels.opportunity}
        value={form.opportunityId}
        onValueChange={(value) => onFormChange((current) => ({ ...current, opportunityId: value }))}
        options={opportunityOptions}
      />
      {form.opportunityId === 'none' ? (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-5 text-slate-600">
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
          label={t.labels.seller}
          value={form.assignedSellerValue}
          onValueChange={onSellerChange}
          options={sellerOptions}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.labels.createdDate}</label>
          <Input
            className={coralFieldClassName}
            type="date"
            value={form.createdDate}
            onChange={(event) => onFormChange((current) => ({ ...current, createdDate: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.labels.expirationDate}</label>
          <Input
            className={coralFieldClassName}
            type="date"
            value={form.expirationDate}
            onChange={(event) => onFormChange((current) => ({ ...current, expirationDate: event.target.value }))}
          />
        </div>
      </div>

      {isExpirationClose ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#F4C84A]/40 bg-[#F4C84A]/10 px-4 py-3 text-sm font-semibold leading-5 text-[#9a6b05]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t.builder.expirationWarning(daysUntilExpiration ?? 0)}
        </div>
      ) : null}
    </section>
  );
}
