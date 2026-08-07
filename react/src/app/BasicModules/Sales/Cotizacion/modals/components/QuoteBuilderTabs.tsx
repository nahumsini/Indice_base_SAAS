import type { Dispatch, SetStateAction } from 'react';
import type { CreateContactInput, SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuoteItem } from '../../../types';
import type { SalesRecordsTranslations } from '../../../Sales/translations';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState, QuoteHealthState, QuoteTotals } from '../../types/quoteBuilderTypes';
import { QuoteCatalogSection } from './QuoteCatalogSection';
import { QuoteConditionsSection } from './QuoteConditionsSection';
import { QuoteCustomerSection } from './QuoteCustomerSection';
import { QuoteFinalReviewSection } from './QuoteFinalReviewSection';
import { QuoteLineItemsSection } from './QuoteLineItemsSection';

export type QuoteBuilderStepId = 'customer' | 'items' | 'conditions' | 'summary';

export const quoteBuilderStepIds: QuoteBuilderStepId[] = ['customer', 'items', 'conditions', 'summary'];

export function QuoteBuilderTabs({
  activeStep,
  form,
  items,
  contacts,
  products,
  selectedContact,
  selectedOpportunity,
  totals,
  health,
  t,
  customerT,
  opportunityOptions,
  sellerOptions,
  formatCurrency,
  onFormChange,
  onCreateCustomer,
  onSellerChange,
  onCurrencyChange,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
}: {
  activeStep: QuoteBuilderStepId;
  form: QuoteFormState;
  items: SalesQuoteItem[];
  contacts: SalesContact[];
  products: SalesCatalogItem[];
  selectedContact?: SalesContact | null;
  selectedOpportunity?: SalesOpportunity | null;
  totals: QuoteTotals;
  health: QuoteHealthState;
  t: QuotesTranslations;
  customerT: SalesRecordsTranslations;
  opportunityOptions: Array<{ value: string; label: string }>;
  sellerOptions: Array<{ value: string; label: string }>;
  formatCurrency: (value: number, currency?: string | null) => string;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onCreateCustomer: (contact: CreateContactInput) => Promise<SalesContact>;
  onSellerChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onAddProduct: (product: SalesCatalogItem) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <div className="min-h-0">
      {activeStep === 'customer' ? <section className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteCustomerSection
          form={form}
          t={t}
          customerT={customerT}
          contacts={contacts}
          items={items}
          opportunityOptions={opportunityOptions}
          sellerOptions={sellerOptions}
          onFormChange={onFormChange}
          onCreateCustomer={onCreateCustomer}
          onSellerChange={onSellerChange}
          onCurrencyChange={onCurrencyChange}
          onUpdateItem={onUpdateItem}
        />
      </section> : null}

      {activeStep === 'items' ? <section className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteCatalogSection
          products={products}
          t={t}
          formatCurrency={formatCurrency}
          onAddProduct={onAddProduct}
        />
        <div className="mt-4">
          <QuoteLineItemsSection
            items={items}
            products={products}
            form={form}
            t={t}
            formatCurrency={formatCurrency}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
          />
        </div>
      </section> : null}

      {activeStep === 'conditions' ? <section className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteConditionsSection form={form} t={t} onFormChange={onFormChange} />
      </section> : null}

      {activeStep === 'summary' ? <section className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteFinalReviewSection
          form={form}
          items={items}
          selectedContact={selectedContact}
          selectedOpportunity={selectedOpportunity}
          products={products}
          totals={totals}
          health={health}
          t={t}
          formatCurrency={formatCurrency}
        />
      </section> : null}
    </div>
  );
}
