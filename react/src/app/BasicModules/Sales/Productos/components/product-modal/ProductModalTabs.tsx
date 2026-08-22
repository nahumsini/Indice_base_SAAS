import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle } from 'lucide-react';
import { IndiceModalWizardStepper, type IndiceModalWizardStep } from '../../../../../components/indice-modal';
import type { ProductsTranslations } from '../../translations';
import type { SalesCatalogItem } from '../../../types';
import type { ProductCategoryConfig } from '../../types/productCategoryTypes';
import type { ProductFormState } from '../../types/productosTypes';
import {
  productModalWizardStepIds,
  type ProductModalWizardStepId,
} from './productModalConstants';
import { ProductCommercialSection } from './ProductCommercialSection';
import { ProductGeneralSection } from './ProductGeneralSection';
import { ProductMediaSection } from './ProductMediaSection';
import { ProductPresentationSection } from './ProductPresentationSection';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import { ProductUsageReadinessSection } from './ProductUsageReadinessSection';

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h2 className="text-lg font-medium text-slate-950">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function ProductModalTabs({
  activeStep,
  form,
  t,
  categories,
  typeOptions,
  statusOptions,
  baseUnitOptions,
  saleUnitOptions,
  catalogItems,
  previewProduct,
  onFormChange,
  onOpenLabelGenerator,
  onQuickCreateCategory,
}: {
  activeStep: ProductModalWizardStepId;
  form: ProductFormState;
  t: ProductsTranslations;
  categories: ProductCategoryConfig[];
  typeOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  baseUnitOptions: Array<{ value: string; label: string }>;
  saleUnitOptions: Array<{ value: string; label: string }>;
  catalogItems: SalesCatalogItem[];
  previewProduct: SalesCatalogItem;
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
  onOpenLabelGenerator: () => void;
  onQuickCreateCategory: (name: string) => void;
}) {
  const steps: IndiceModalWizardStep<ProductModalWizardStepId>[] = productModalWizardStepIds.map((stepId) => ({
    id: stepId,
    label: stepId === 'availability' ? t.usage.title : t.productWizard.steps[stepId],
  }));

  return (
    <div className="min-w-0 space-y-4">
      <div className="sticky top-0 z-20 -mx-1 bg-slate-50 px-1 pb-2">
        <IndiceModalWizardStepper
          accent="coral"
          activeStepId={activeStep}
          progressLabel={t.productWizard.progressLabel}
          steps={steps}
        />
      </div>

      {activeStep === 'basics' ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <StepHeading
            title={t.productWizard.steps.basics}
            description={t.productWizard.descriptions.basics}
          />
          <ProductGeneralSection
            form={form}
            t={t}
            categories={categories}
            typeOptions={typeOptions}
            statusOptions={statusOptions}
            onFormChange={onFormChange}
            onOpenLabelGenerator={onOpenLabelGenerator}
            onQuickCreateCategory={onQuickCreateCategory}
          />
        </section>
      ) : null}

      {activeStep === 'commercial' ? (
        <div className="space-y-4">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t.productWizard.steps.commercial}
              description={t.productWizard.descriptions.commercial}
            />
            <ProductCommercialSection form={form} t={t} onFormChange={onFormChange} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <ProductPresentationSection
              form={form}
              t={t}
              baseUnitOptions={baseUnitOptions}
              saleUnitOptions={saleUnitOptions}
              catalogItems={catalogItems}
              onFormChange={onFormChange}
            />
          </section>
        </div>
      ) : null}

      {activeStep === 'availability' ? (
        <div className="space-y-4">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t.usage.title}
              description={t.usage.description}
            />
            <ProductUsageReadinessSection form={form} t={t} onFormChange={onFormChange} />
          </section>

          {form.usesInventory && !form.visibility.includes('POS') ? (
            <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{t.usage.labels.inventory}: {t.usage.ready}</p>
                <p className="mt-1 text-sm leading-6">
                  {t.usage.labels.pos}: {t.usage.notReady}. {t.usage.toggles.readyForPOS.description}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeStep === 'review' ? (
        <div className="space-y-4">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t.productWizard.steps.review}
              description={t.productWizard.descriptions.review}
            />
            <ProductMediaSection form={form} t={t} onFormChange={onFormChange} />
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t.productWizard.previewTitle}
              description={t.productWizard.previewDescription}
            />
            <ProductPreviewPanel embedded product={previewProduct} form={form} t={t} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
