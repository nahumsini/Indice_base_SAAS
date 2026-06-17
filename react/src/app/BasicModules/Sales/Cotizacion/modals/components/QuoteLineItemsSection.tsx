import type { SalesCatalogItem, SalesQuoteItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState } from '../../types/quoteBuilderTypes';
import { QuoteLineItemRow } from './QuoteLineItemRow';

export function QuoteLineItemsSection({
  items,
  products,
  form,
  t,
  formatCurrency,
  onUpdateItem,
  onRemoveItem,
}: {
  items: SalesQuoteItem[];
  products: SalesCatalogItem[];
  form: QuoteFormState;
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-4">
        <h3 className="text-base font-black text-slate-950">{t.lineItems.title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{t.lineItems.description}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
          {t.builder.emptyItems}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <QuoteLineItemRow
              key={item.id}
              item={item}
              product={products.find((product) => product.id === item.productId)}
              products={products}
              form={form}
              t={t}
              formatCurrency={formatCurrency}
              onUpdate={(patch) => onUpdateItem(item.id, patch)}
              onRemove={() => onRemoveItem(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
