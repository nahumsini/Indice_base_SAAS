import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Archive, Plus, Tags } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import {
  productBaseUnits,
  productSaleUnits,
  productStatuses,
  productTypes,
} from '../../salesCrmContext';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryConfig } from '../types/productCategoryTypes';
import type { ProductFormState } from '../types/productosTypes';
import { ProductLabelGeneratorModal } from './ProductLabelGeneratorModal';
import { ProductModalTabs } from './product-modal/ProductModalTabs';
import type { ProductModalWizardStepId } from './product-modal/productModalConstants';
import { buildPreviewProduct, createAutomaticSku } from './product-modal/productModalUtils';

const productActionClassNames = getSalesModalActionClassNames('coral');

export function ProductCreateModal({
  open,
  form,
  t,
  mode = 'create',
  catalogItems = [],
  categories,
  isSaving = false,
  saveError = null,
  onOpenChange,
  onFormChange,
  onSubmit,
  onQuickCreateCategory,
}: {
  open: boolean;
  form: ProductFormState;
  t: ProductsTranslations;
  mode?: 'create' | 'edit';
  catalogItems?: SalesCatalogItem[];
  categories: ProductCategoryConfig[];
  isSaving?: boolean;
  saveError?: string | null;
  onOpenChange: (open: boolean) => void;
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
  onSubmit: () => void | Promise<void>;
  onQuickCreateCategory: (name: string) => void;
}) {
  const [isLabelGeneratorOpen, setIsLabelGeneratorOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<ProductModalWizardStepId>('basics');
  const [stepError, setStepError] = useState('');
  const previewProduct = useMemo(() => buildPreviewProduct(form), [form]);
  const isEditMode = mode === 'edit';
  const stepOrder: ProductModalWizardStepId[] = ['basics', 'commercial', 'review'];
  const activeStepIndex = stepOrder.indexOf(activeStep);

  const typeOptions = productTypes.map((type) => ({ value: type, label: t.typeLabels[type] }));
  const statusOptions = productStatuses.map((status) => ({ value: status, label: t.statusLabels[status] }));
  const baseUnitOptions = productBaseUnits.map((unit) => ({ value: unit, label: t.packaging.baseUnitLabels[unit] }));
  const saleUnitOptions = productSaleUnits.map((unit) => ({ value: unit, label: t.packaging.saleUnitLabels[unit] }));

  useEffect(() => {
    if (open) {
      setActiveStep('basics');
      setStepError('');
    }
  }, [mode, open]);

  const goBack = () => {
    if (activeStepIndex <= 0) {
      onOpenChange(false);
      return;
    }

    setStepError('');
    setActiveStep(stepOrder[activeStepIndex - 1]);
  };

  const goForward = () => {
    if (activeStep === 'basics') {
      const missingFields = [
        !form.name.trim() ? t.form.fields.name : '',
        !form.category.trim() ? t.form.fields.category : '',
      ].filter(Boolean);

      if (missingFields.length > 0) {
        setStepError(t.form.validationMissingRequired(missingFields.join(', ')));
        return;
      }

      if (!form.sku.trim()) {
        onFormChange((current) => ({ ...current, sku: createAutomaticSku(current) }));
      }
    }

    setStepError('');
    setActiveStep(stepOrder[Math.min(activeStepIndex + 1, stepOrder.length - 1)]);
  };

  return (
    <>
      <SalesModalFrame
        open={open}
        onOpenChange={onOpenChange}
        title={isEditMode ? t.form.editTitle : t.form.title}
        description={isEditMode ? t.form.editDescription : t.form.description}
        icon={<Tags className="h-6 w-6" />}
        modalType="wizard"
        busy={isSaving}
        contentClassName="h-[min(92dvh,880px)]"
        bodyClassName="!max-h-none min-h-0 flex-1 overflow-y-auto bg-slate-50 p-0"
        footerLeading={(
          <span className="text-xs font-medium text-white/90">
            {t.productWizard.stepCounter(activeStepIndex + 1, stepOrder.length)}
          </span>
        )}
        footer={(
          <>
            <Button variant="outline" className={productActionClassNames.secondary} disabled={isSaving} onClick={goBack}>
              {activeStep === 'basics' ? <Archive className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {activeStep === 'basics' ? t.common.cancel : t.productWizard.back}
            </Button>
            <Button
              className={productActionClassNames.primary}
              disabled={isSaving}
              onClick={() => {
                if (activeStep === 'review') {
                  void onSubmit();
                } else {
                  goForward();
                }
              }}
            >
              {activeStep === 'review' ? <Plus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {activeStep === 'review'
                ? (isEditMode ? t.form.updateSubmit : t.form.submit)
                : t.productWizard.next}
            </Button>
          </>
        )}
      >
          <div className="mx-auto w-full max-w-[860px] p-4 sm:p-6">
              <IndiceModalValidation
                className="mb-4"
                messages={[stepError || saveError].filter(Boolean)}
                title={stepError ? t.productWizard.requiredTitle : undefined}
              />
              <ProductModalTabs
                activeStep={activeStep}
                form={form}
                t={t}
                categories={categories}
                typeOptions={typeOptions}
                statusOptions={statusOptions}
                baseUnitOptions={baseUnitOptions}
                saleUnitOptions={saleUnitOptions}
                catalogItems={catalogItems}
                previewProduct={previewProduct}
                onFormChange={onFormChange}
                onOpenLabelGenerator={() => setIsLabelGeneratorOpen(true)}
                onQuickCreateCategory={onQuickCreateCategory}
              />
          </div>
      </SalesModalFrame>

      <ProductLabelGeneratorModal
        open={isLabelGeneratorOpen}
        t={t}
        onOpenChange={setIsLabelGeneratorOpen}
        onApply={(primaryLabel, labels) => onFormChange((current) => ({ ...current, barcode: primaryLabel, generatedLabels: labels }))}
      />
    </>
  );
}
