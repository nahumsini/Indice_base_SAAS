import type { Dispatch, SetStateAction } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';
import type { QuoteStatus, SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuoteItem } from '../../types';
import { getSalesModalStyles } from '../../salesModalStyles';
import type { QuotesTranslations } from '../translations';
import type { QuoteFormState, QuoteTotals } from '../types/quoteBuilderTypes';
import { getQuoteHealthState } from '../utils/quoteReadiness';
import { QuoteBuilderTabs } from './components/QuoteBuilderTabs';
import { QuoteSummaryPanel } from './components/QuoteSummaryPanel';

const quoteModalStyles = getSalesModalStyles('coral');

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
  quoteStatusOptions,
  sellerOptions,
  formatCurrency,
  onOpenChange,
  onClose,
  onFormChange,
  onSellerChange,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
  onSubmit,
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
  quoteStatusOptions: Array<{ value: QuoteStatus; label: string }>;
  sellerOptions: Array<{ value: string; label: string }>;
  formatCurrency: (value: number) => string;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onSellerChange: (value: string) => void;
  onAddProduct: (product: SalesCatalogItem) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onSubmit: () => void;
}) {
  const health = getQuoteHealthState({
    form,
    selectedContact,
    items,
    products,
    totals,
  });

  const modalOpportunityOptions = opportunityOptions.filter((option) => option.value !== 'all');

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : onClose())}>
      <DialogContent
        className={cn(
          quoteModalStyles.content,
          'grid h-[90vh] max-h-[900px] w-[calc(100vw-3rem)] max-w-[1500px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[1500px]',
        )}
        closeButtonClassName={quoteModalStyles.close}
      >
        <DialogHeader className={quoteModalStyles.header}>
          <DialogTitle className={quoteModalStyles.title}>
            <FileText className={cn('h-5 w-5', quoteModalStyles.icon)} />
            {isEditMode ? t.actions.edit : t.sections.builderTitle}
          </DialogTitle>
          <DialogDescription className={quoteModalStyles.description}>{t.sections.builderDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 overflow-hidden xl:grid-cols-[minmax(720px,1fr)_430px]">
          <div className={cn(quoteModalStyles.body, 'min-h-0 overflow-y-auto')}>
            <QuoteBuilderTabs
              form={form}
              items={items}
              contacts={contacts}
              products={products}
              totals={totals}
              t={t}
              opportunityOptions={modalOpportunityOptions}
              quoteStatusOptions={quoteStatusOptions}
              sellerOptions={sellerOptions}
              formatCurrency={formatCurrency}
              onFormChange={onFormChange}
              onSellerChange={onSellerChange}
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

        <DialogFooter className={quoteModalStyles.footer}>
          <Button variant="outline" className={quoteModalStyles.secondaryButton} onClick={onClose}>{t.common.cancel}</Button>
          <Button className={quoteModalStyles.primaryButton} onClick={onSubmit}>
            <Plus className="h-4 w-4" />
            {isEditMode ? t.common.save : t.builder.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
