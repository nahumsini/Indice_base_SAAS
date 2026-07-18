import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/ui/tabs';
import type { ProductsTranslations } from '../../translations';
import type { SalesCatalogItem } from '../../../types';
import type { ProductCategoryConfig } from '../../types/productCategoryTypes';
import type { ProductFormState } from '../../types/productosTypes';
import { productModalTabIds, type ProductModalTabId } from './productModalConstants';
import { ProductCommercialSection } from './ProductCommercialSection';
import { ProductGeneralSection } from './ProductGeneralSection';
import { ProductMediaSection } from './ProductMediaSection';
import { ProductPresentationSection } from './ProductPresentationSection';
import { ProductUsageReadinessSection } from './ProductUsageReadinessSection';

export function ProductModalTabs({
  form,
  t,
  categories,
  typeOptions,
  statusOptions,
  baseUnitOptions,
  saleUnitOptions,
  catalogItems,
  onFormChange,
  onOpenLabelGenerator,
  onQuickCreateCategory,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
  categories: ProductCategoryConfig[];
  typeOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  baseUnitOptions: Array<{ value: string; label: string }>;
  saleUnitOptions: Array<{ value: string; label: string }>;
  catalogItems: SalesCatalogItem[];
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
  onOpenLabelGenerator: () => void;
  onQuickCreateCategory: (name: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProductModalTabId>('general');

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductModalTabId)} className="min-h-0 gap-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-3 xl:grid-cols-5">
        {productModalTabIds.map((tabId) => (
          <TabsTrigger
            key={tabId}
            value={tabId}
            className="h-10 rounded-lg px-3 text-sm font-semibold data-[state=active]:bg-[#FF6B5E] data-[state=active]:text-white"
          >
            {t.modalSections[tabId]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="general" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
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
      </TabsContent>
      <TabsContent value="commercial" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
        <ProductCommercialSection
          form={form}
          t={t}
          onFormChange={onFormChange}
        />
      </TabsContent>
      <TabsContent value="presentation" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
        <ProductPresentationSection
          form={form}
          t={t}
          baseUnitOptions={baseUnitOptions}
          saleUnitOptions={saleUnitOptions}
          catalogItems={catalogItems}
          onFormChange={onFormChange}
        />
      </TabsContent>
      <TabsContent value="media" className="mt-0">
        <ProductMediaSection form={form} t={t} onFormChange={onFormChange} />
      </TabsContent>
      <TabsContent value="usage" className="mt-0 rounded-lg border border-slate-200 bg-white p-4">
        <ProductUsageReadinessSection form={form} t={t} onFormChange={onFormChange} />
      </TabsContent>
    </Tabs>
  );
}
