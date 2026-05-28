import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { Archive, Plus, Tags } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  productBaseUnits,
  productSaleUnits,
  productStatuses,
  productTypes,
} from '../../salesCrmContext';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryConfig } from '../types/productCategoryTypes';
import type { ProductFormState } from '../types/productosTypes';
import { ProductLabelGeneratorModal } from './ProductLabelGeneratorModal';
import { ProductModalTabs } from './product-modal/ProductModalTabs';
import { buildPreviewProduct } from './product-modal/productModalUtils';
import { ProductPreviewPanel } from './product-modal/ProductPreviewPanel';

export function ProductCreateModal({
  open,
  form,
  t,
  mode = 'create',
  catalogItems = [],
  categories,
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
  onOpenChange: (open: boolean) => void;
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
  onSubmit: () => void;
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="grid grid-rows-[auto,minmax(0,1fr),auto] gap-0 overflow-hidden rounded-xl border border-[#FF6B5E]/25 bg-white p-0 shadow-2xl"
          closeButtonClassName="text-white hover:bg-white/15 hover:text-white"
          style={{
            width: 'min(96vw, 1500px)',
            maxWidth: 'min(96vw, 1500px)',
            height: 'min(88vh, 860px)',
            maxHeight: '88vh',
          }}
        >
          <DialogHeader className="border-b border-[#FF6B5E]/15 bg-[#FF6B5E] px-6 py-4 text-white">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Tags className="h-6 w-6" />
              {isEditMode ? t.form.editTitle : t.form.title}
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-sm font-semibold leading-6 text-white/90">
              {isEditMode ? t.form.editDescription : t.form.description}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 overflow-hidden xl:grid-cols-[minmax(680px,1fr)_440px]">
            <div className="min-h-0 overflow-y-auto p-5">
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

          <DialogFooter className="border-t border-[#FF6B5E]/20 bg-[#FF6B5E] px-6 py-3">
            <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>
              <Archive className="h-4 w-4" />
              {t.common.cancel}
            </Button>
            <Button className="bg-white text-[#B63B32] hover:bg-white/90" onClick={onSubmit}>
              <Plus className="h-4 w-4" />
              {isEditMode ? t.form.updateSubmit : t.form.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductLabelGeneratorModal
        open={isLabelGeneratorOpen}
        t={t}
        onOpenChange={setIsLabelGeneratorOpen}
        onApply={(primaryLabel, labels) => onFormChange((current) => ({ ...current, barcode: primaryLabel, generatedLabels: labels }))}
      />
    </>
  );
}
