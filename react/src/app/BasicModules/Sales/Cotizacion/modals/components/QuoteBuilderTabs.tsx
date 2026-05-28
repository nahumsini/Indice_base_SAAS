import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/ui/tabs';
import type { QuoteStatus, SalesCatalogItem, SalesContact, SalesQuoteItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState, QuoteTotals } from '../../types/quoteBuilderTypes';
import { QuoteCatalogSection } from './QuoteCatalogSection';
import { QuoteConditionsSection } from './QuoteConditionsSection';
import { QuoteCustomerSection } from './QuoteCustomerSection';
import { QuoteLineItemsSection } from './QuoteLineItemsSection';
import { QuotePricingTaxesSection } from './QuotePricingTaxesSection';

type QuoteBuilderTabId = 'customer' | 'items' | 'pricing' | 'conditions' | 'summary';

const quoteBuilderTabIds: QuoteBuilderTabId[] = ['customer', 'items', 'pricing', 'conditions', 'summary'];

export function QuoteBuilderTabs({
  form,
  items,
  contacts,
  products,
  totals,
  t,
  opportunityOptions,
  quoteStatusOptions,
  sellerOptions,
  formatCurrency,
  onFormChange,
  onSellerChange,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
}: {
  form: QuoteFormState;
  items: SalesQuoteItem[];
  contacts: SalesContact[];
  products: SalesCatalogItem[];
  totals: QuoteTotals;
  t: QuotesTranslations;
  opportunityOptions: Array<{ value: string; label: string }>;
  quoteStatusOptions: Array<{ value: QuoteStatus; label: string }>;
  sellerOptions: Array<{ value: string; label: string }>;
  formatCurrency: (value: number) => string;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onSellerChange: (value: string) => void;
  onAddProduct: (product: SalesCatalogItem) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<QuoteBuilderTabId>('customer');

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as QuoteBuilderTabId)} className="min-h-0 gap-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-3 xl:grid-cols-5">
        {quoteBuilderTabIds.map((tabId) => (
          <TabsTrigger
            key={tabId}
            value={tabId}
            className="h-10 rounded-lg px-3 text-sm font-black data-[state=active]:bg-[#FF6B5E] data-[state=active]:text-white"
          >
            {t.builderSections[tabId]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="customer" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
        <QuoteCustomerSection
          form={form}
          t={t}
          contacts={contacts}
          opportunityOptions={opportunityOptions}
          quoteStatusOptions={quoteStatusOptions}
          sellerOptions={sellerOptions}
          onFormChange={onFormChange}
          onSellerChange={onSellerChange}
        />
      </TabsContent>

      <TabsContent value="items" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
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
      </TabsContent>

      <TabsContent value="pricing" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
        <QuotePricingTaxesSection
          form={form}
          items={items}
          products={products}
          totals={totals}
          t={t}
          formatCurrency={formatCurrency}
          onFormChange={onFormChange}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
        />
      </TabsContent>

      <TabsContent value="conditions" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
        <QuoteConditionsSection form={form} t={t} onFormChange={onFormChange} />
      </TabsContent>

      <TabsContent value="summary" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
        <QuotePricingTaxesSection
          form={form}
          items={items}
          products={products}
          totals={totals}
          t={t}
          formatCurrency={formatCurrency}
          onFormChange={onFormChange}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
        />
      </TabsContent>
    </Tabs>
  );
}
