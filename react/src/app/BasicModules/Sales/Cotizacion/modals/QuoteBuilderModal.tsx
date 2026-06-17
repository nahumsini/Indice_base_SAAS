import type { Dispatch, SetStateAction } from 'react';
import { FileText, Plus, Printer } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuoteItem } from '../../types';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import type { QuotesTranslations } from '../translations';
import type { QuoteFormState, QuoteTotals } from '../types/quoteBuilderTypes';
import { getQuoteHealthState } from '../utils/quoteReadiness';
import { QuoteBuilderTabs } from './components/QuoteBuilderTabs';
import { QuoteSummaryPanel } from './components/QuoteSummaryPanel';

const quoteBuilderActionClassNames = getSalesModalActionClassNames('coral');

export function QuoteBuilderModal({
  open,
  isEditMode,
  form,
  items,
  contacts,
  products,
  selectedContact,
  selectedOpportunity,
  totals,
  t,
  opportunityOptions,
  sellerOptions,
  formatCurrency,
  onOpenChange,
  onClose,
  onFormChange,
  onSellerChange,
  onCurrencyChange,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
  onSubmit,
  onSubmitAndPrint,
}: {
  open: boolean;
  isEditMode: boolean;
  form: QuoteFormState;
  items: SalesQuoteItem[];
  contacts: SalesContact[];
  products: SalesCatalogItem[];
  selectedContact?: SalesContact | null;
  selectedOpportunity?: SalesOpportunity | null;
  totals: QuoteTotals;
  t: QuotesTranslations;
  opportunityOptions: Array<{ value: string; label: string }>;
  sellerOptions: Array<{ value: string; label: string }>;
  formatCurrency: (value: number, currency?: string | null) => string;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onSellerChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onAddProduct: (product: SalesCatalogItem) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onSubmit: () => void;
  onSubmitAndPrint: () => void;
}) {
  const health = getQuoteHealthState({
    form,
    selectedContact,
    items,
    products,
    totals,
  });

  const modalOpportunityOptions = opportunityOptions.filter((option) => option.value !== 'all');
  const footerSummary = `${t.summary.items}: ${items.length} · ${t.labels.total}: ${formatCurrency(totals.total, form.currency)}`;

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : onClose())}
      title={isEditMode ? t.actions.edit : t.sections.builderTitle}
      description={t.sections.builderDescription}
      icon={<FileText className="h-6 w-6" />}
      contentClassName="flex h-[min(90vh,900px)] w-[min(96vw,1440px)] max-w-none flex-col sm:max-w-none"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-white p-0 dark:bg-slate-950"
      footerClassName="sm:items-center sm:justify-between"
      footer={(
        <>
          <p className="text-sm font-semibold text-white/85">{footerSummary}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              className={quoteBuilderActionClassNames.secondary}
              onClick={onClose}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="outline"
              className={quoteBuilderActionClassNames.secondary}
              onClick={onSubmitAndPrint}
            >
              <Printer className="h-4 w-4" />
              {isEditMode ? t.builder.saveAndPrint : t.builder.submitAndPrint}
            </Button>
            <Button className={quoteBuilderActionClassNames.primary} onClick={onSubmit}>
              <Plus className="h-4 w-4" />
              {isEditMode ? t.common.save : t.builder.submit}
            </Button>
          </div>
        </>
      )}
    >
        <div className="grid min-h-0 flex-1 overflow-hidden bg-white xl:grid-cols-[minmax(680px,1fr)_420px]">
          <div className="min-h-0 overflow-y-auto bg-white px-6 py-5">
            <QuoteBuilderTabs
              form={form}
              items={items}
              contacts={contacts}
              products={products}
              selectedContact={selectedContact}
              selectedOpportunity={selectedOpportunity}
              totals={totals}
              health={health}
              t={t}
              opportunityOptions={modalOpportunityOptions}
              sellerOptions={sellerOptions}
              formatCurrency={formatCurrency}
              onFormChange={onFormChange}
              onSellerChange={onSellerChange}
              onCurrencyChange={onCurrencyChange}
              onAddProduct={onAddProduct}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          </div>

          <QuoteSummaryPanel
            form={form}
            selectedContact={selectedContact}
            selectedOpportunity={selectedOpportunity}
            itemCount={items.length}
            totals={totals}
            health={health}
            formatCurrency={formatCurrency}
            t={t}
          />
        </div>
    </SalesModalFrame>
  );
}
