import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { AlertTriangle, Archive, Plus, Tags } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  productBaseUnits,
  productSaleUnits,
  productStatuses,
  productTypes,
} from '../../salesCrmContext';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryConfig } from '../types/productCategoryTypes';
import type { ProductFormState } from '../types/productosTypes';
import { ProductLabelGeneratorModal } from './ProductLabelGeneratorModal';
import { ProductModalTabs } from './product-modal/ProductModalTabs';
import { buildPreviewProduct } from './product-modal/productModalUtils';
import { ProductPreviewPanel } from './product-modal/ProductPreviewPanel';

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
  const previewProduct = useMemo(() => buildPreviewProduct(form), [form]);
  const isEditMode = mode === 'edit';

  const typeOptions = productTypes.map((type) => ({ value: type, label: t.typeLabels[type] }));
  const statusOptions = productStatuses.map((status) => ({ value: status, label: t.statusLabels[status] }));
  const baseUnitOptions = productBaseUnits.map((unit) => ({ value: unit, label: t.packaging.baseUnitLabels[unit] }));
  const saleUnitOptions = productSaleUnits.map((unit) => ({ value: unit, label: t.packaging.saleUnitLabels[unit] }));

  return (
    <>
      <SalesModalFrame
        open={open}
        onOpenChange={onOpenChange}
        title={isEditMode ? t.form.editTitle : t.form.title}
        description={isEditMode ? t.form.editDescription : t.form.description}
        icon={<Tags className="h-6 w-6" />}
        contentClassName="flex h-[min(88vh,860px)] w-[min(96vw,1500px)] max-w-[min(96vw,1500px)] flex-col"
        bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-white p-0"
        footer={(
          <>
            <Button variant="outline" className={productActionClassNames.secondary} onClick={() => onOpenChange(false)}>
              <Archive className="h-4 w-4" />
              {t.common.cancel}
            </Button>
            <Button className={productActionClassNames.primary} disabled={isSaving} onClick={() => void onSubmit()}>
              <Plus className="h-4 w-4" />
              {isEditMode ? t.form.updateSubmit : t.form.submit}
            </Button>
          </>
        )}
      >
          <div className="grid min-h-0 overflow-hidden xl:grid-cols-[minmax(680px,1fr)_440px]">
            <div className="min-h-0 overflow-y-auto bg-slate-50/70 p-5">
              {saveError ? (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#F4C84A]/45 bg-[#F4C84A]/10 px-4 py-3 text-sm font-bold leading-6 text-[#7C5604]" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              ) : null}
              <ProductModalTabs
                form={form}
                t={t}
                categories={categories}
                typeOptions={typeOptions}
                statusOptions={statusOptions}
                baseUnitOptions={baseUnitOptions}
                saleUnitOptions={saleUnitOptions}
                catalogItems={catalogItems}
                onFormChange={onFormChange}
                onOpenLabelGenerator={() => setIsLabelGeneratorOpen(true)}
                onQuickCreateCategory={onQuickCreateCategory}
              />
            </div>

            <ProductPreviewPanel product={previewProduct} form={form} t={t} />
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
