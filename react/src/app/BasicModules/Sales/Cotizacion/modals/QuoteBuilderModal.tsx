import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Plus, Printer } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import type { CreateContactInput, SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuoteItem } from '../../types';
import type { SalesRecordsTranslations } from '../../Sales/translations';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { QuotesTranslations } from '../translations';
import type { QuoteFormState, QuoteTotals } from '../types/quoteBuilderTypes';
import { getQuoteHealthState } from '../utils/quoteReadiness';
import { SalesDocumentWizard } from '../../components/SalesDocumentWizard';
import { QuoteBuilderTabs, quoteBuilderStepIds, type QuoteBuilderStepId } from './components/QuoteBuilderTabs';

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
  customerT,
  opportunityOptions,
  sellerOptions,
  formatCurrency,
  isSaving,
  submitError,
  onOpenChange,
  onClose,
  onFormChange,
  onCreateCustomer,
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
  customerT: SalesRecordsTranslations;
  opportunityOptions: Array<{ value: string; label: string }>;
  sellerOptions: Array<{ value: string; label: string }>;
  formatCurrency: (value: number, currency?: string | null) => string;
  isSaving: boolean;
  submitError: string;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onCreateCustomer: (contact: CreateContactInput) => Promise<SalesContact>;
  onSellerChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onAddProduct: (product: SalesCatalogItem) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onSubmit: () => void;
  onSubmitAndPrint: () => void;
}) {
  const [activeStep, setActiveStep] = useState<QuoteBuilderStepId>('customer');
  const [stepError, setStepError] = useState('');
  const health = getQuoteHealthState({
    form,
    selectedContact,
    items,
    products,
    totals,
  });

  const modalOpportunityOptions = opportunityOptions.filter((option) => option.value !== 'all');
  const footerSummary = `${t.summary.items}: ${items.length} · ${t.labels.total}: ${formatCurrency(totals.total, form.currency)}`;
  const activeStepIndex = quoteBuilderStepIds.indexOf(activeStep);
  const customerReady = Boolean(selectedContact);

  useEffect(() => {
    if (open) {
      setActiveStep('customer');
      setStepError('');
    }
  }, [open]);

  const handleBack = () => {
    const previousStep = quoteBuilderStepIds[activeStepIndex - 1];
    if (!previousStep) return;
    setActiveStep(previousStep);
    setStepError('');
  };

  const handleContinue = () => {
    if (activeStep === 'customer' && !customerReady) {
      setStepError(t.health.labels.missingCustomer);
      return;
    }
    if (activeStep === 'items' && items.length === 0) {
      setStepError(t.health.labels.missingItems);
      return;
    }
    if (activeStep === 'conditions' && !form.expirationDate) {
      setStepError(t.health.labels.validityMissing);
      return;
    }
    const nextStep = quoteBuilderStepIds[activeStepIndex + 1];
    if (!nextStep) return;
    setActiveStep(nextStep);
    setStepError('');
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : onClose())}
      closeLabel={t.common.cancel}
      title={isEditMode ? t.actions.edit : t.sections.builderTitle}
      description={t.sections.builderDescription}
      eyebrow={t.common.stepLabel(activeStepIndex + 1, quoteBuilderStepIds.length)}
      icon={<FileText className="h-6 w-6" />}
      modalType="wizard"
      busy={isSaving}
      contentClassName="max-h-[min(92dvh,900px)]"
      bodyClassName="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5 dark:bg-slate-950"
      footerClassName="sm:items-center sm:justify-between"
      footerSummary={footerSummary}
      footer={(
        <>
          {activeStep !== 'customer' ? <Button variant="outline" className={quoteBuilderActionClassNames.secondary} onClick={handleBack} disabled={isSaving}>
            <ChevronLeft className="h-4 w-4" />
            {t.common.back}
          </Button> : null}
          {activeStep === 'summary' ? <Button
            variant="outline"
            className={quoteBuilderActionClassNames.secondary}
            onClick={onSubmitAndPrint}
            disabled={isSaving}
          >
            <Printer className="h-4 w-4" />
            {isSaving ? t.builder.saving : isEditMode ? t.builder.saveAndPrint : t.builder.submitAndPrint}
          </Button> : null}
          {activeStep === 'summary' ? <Button className={quoteBuilderActionClassNames.primary} onClick={onSubmit} disabled={isSaving}>
            <Plus className="h-4 w-4" />
            {isSaving ? t.builder.saving : isEditMode ? t.common.save : t.builder.submit}
          </Button> : <Button className={quoteBuilderActionClassNames.primary} onClick={handleContinue} disabled={isSaving}>
            {t.common.continue}
            <ChevronRight className="h-4 w-4" />
          </Button>}
        </>
      )}
      footerLeading={<Button variant="outline" className={quoteBuilderActionClassNames.secondary} onClick={onClose} disabled={isSaving}>{t.common.cancel}</Button>}
    >
        <SalesDocumentWizard
          activeStepId={activeStep}
          progressLabel={t.sections.builderTitle}
          steps={quoteBuilderStepIds.map((stepId) => ({ id: stepId, label: t.builderSections[stepId] }))}
          validation={<IndiceModalValidation messages={[stepError, submitError].filter(Boolean)} />}
        >
            <QuoteBuilderTabs
              activeStep={activeStep}
              form={form}
              items={items}
              contacts={contacts}
              products={products}
              selectedContact={selectedContact}
              selectedOpportunity={selectedOpportunity}
              totals={totals}
              health={health}
              t={t}
              customerT={customerT}
              opportunityOptions={modalOpportunityOptions}
              sellerOptions={sellerOptions}
              formatCurrency={formatCurrency}
              onFormChange={onFormChange}
              onCreateCustomer={onCreateCustomer}
              onSellerChange={onSellerChange}
              onCurrencyChange={onCurrencyChange}
              onAddProduct={onAddProduct}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
        </SalesDocumentWizard>
    </SalesModalFrame>
  );
}
