import type { Dispatch, SetStateAction } from 'react';
import { Barcode, Boxes, ChevronDown, PackageX, Settings2, Wand2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../../../components/ui/collapsible';
import { Input } from '../../../../../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../../../../../components/ui/radio-group';
import { Textarea } from '../../../../../components/ui/textarea';
import { cn } from '../../../../../components/ui/utils';
import type {
  SalesProductStatus,
  SalesProductType,
} from '../../../salesCrmContext';
import type { ProductsTranslations } from '../../translations';
import type { ProductCategoryConfig } from '../../types/productCategoryTypes';
import type { ProductFormState } from '../../types/productosTypes';
import { productFieldClassName } from './productModalConstants';
import { createAutomaticSku } from './productModalUtils';
import { ProductFormSelect } from './ProductModalFields';
import { ProductQuickCategoryInput } from './ProductQuickCategoryInput';

export function ProductGeneralSection({
  form,
  t,
  categories,
  typeOptions,
  statusOptions,
  onFormChange,
  onOpenLabelGenerator,
  onQuickCreateCategory,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
  categories: ProductCategoryConfig[];
  typeOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
  onOpenLabelGenerator: () => void;
  onQuickCreateCategory: (name: string) => void;
}) {
  const shouldShowBarcode = form.type === 'Product' || form.type === 'Package';
  const canConfigureInventory = form.type === 'Product' || form.type === 'Package';

  const handleTypeChange = (value: string) => {
    const nextType = value as SalesProductType;

    onFormChange((current) => ({
      ...current,
      type: nextType,
      usesInventory: nextType === 'Product' || nextType === 'Package'
        ? current.usesInventory
        : false,
      visibility: nextType === 'Operational item' && current.visibility !== 'Internal'
        ? 'Internal'
        : current.visibility,
    }));
  };

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">{t.form.fields.name}</label>
        <Input
          className={productFieldClassName}
          value={form.name}
          onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
          placeholder={t.form.placeholders.name}
        />
      </div>

      <div className="space-y-2">
        <ProductFormSelect
          label={t.form.fields.type}
          value={form.type}
          onValueChange={handleTypeChange}
          options={typeOptions}
        />
        <p className="text-xs font-medium leading-5 text-slate-500">{t.itemTypeHelpers[form.type]}</p>
      </div>

      <ProductQuickCategoryInput
        value={form.category}
        categories={categories}
        t={t}
        onValueChange={(value) => onFormChange((current) => ({ ...current, category: value }))}
        onCreateCategory={onQuickCreateCategory}
      />

      <div className="space-y-3 md:col-span-2">
        <div>
          <p className="text-sm font-medium text-slate-700">{t.inventoryTracking.title}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            {canConfigureInventory ? t.inventoryTracking.description : t.inventoryTracking.unavailableForType}
          </p>
        </div>
        <RadioGroup
          className="grid gap-3 md:grid-cols-2"
          value={form.usesInventory ? 'tracked' : 'untracked'}
          onValueChange={(value) => onFormChange((current) => ({ ...current, usesInventory: value === 'tracked' }))}
        >
          {([
            {
              value: 'tracked',
              icon: Boxes,
              label: t.inventoryTracking.tracked.label,
              description: t.inventoryTracking.tracked.description,
              disabled: !canConfigureInventory,
            },
            {
              value: 'untracked',
              icon: PackageX,
              label: t.inventoryTracking.untracked.label,
              description: t.inventoryTracking.untracked.description,
              disabled: false,
            },
          ] as const).map((option) => {
            const Icon = option.icon;
            const selected = (form.usesInventory ? 'tracked' : 'untracked') === option.value;

            return (
              <label
                key={option.value}
                className={cn(
                  'flex min-h-[92px] items-start gap-3 rounded-xl border p-4 transition-colors',
                  selected
                    ? 'border-[#FF6B5E] bg-[#FF6B5E]/8 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  option.disabled && 'cursor-not-allowed opacity-50 hover:border-slate-200 hover:bg-white',
                  !option.disabled && 'cursor-pointer',
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  disabled={option.disabled}
                  aria-label={option.label}
                  className="mt-1 border-slate-300 text-[#FF6B5E] data-[state=checked]:border-[#FF6B5E]"
                />
                <span className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
                  selected ? 'bg-[#FF6B5E]/15 text-[#B63B32]' : 'bg-slate-100 text-slate-500',
                )}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-950">{option.label}</span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{option.description}</span>
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">{t.form.fields.sku}</label>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            className={productFieldClassName}
            value={form.sku}
            onChange={(event) => onFormChange((current) => ({ ...current, sku: event.target.value }))}
            placeholder={t.form.placeholders.sku}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10"
            onClick={() => onFormChange((current) => ({ ...current, sku: createAutomaticSku(current) }))}
          >
            <Wand2 className="h-4 w-4" />
            {t.skuGenerator.action}
          </Button>
        </div>
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-slate-700">{t.form.fields.description}</label>
        <Textarea
          className={productFieldClassName}
          value={form.description}
          onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
          placeholder={t.form.placeholders.description}
        />
      </div>

      <Collapsible className="md:col-span-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left [&[data-state=open]>svg]:rotate-180">
            <span className="flex min-w-0 items-start gap-3">
              <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B63B32]" />
              <span>
                <span className="block text-sm font-medium text-slate-800">{t.productWizard.advancedIdentity}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{t.productWizard.advancedIdentityDescription}</span>
              </span>
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-slate-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ProductFormSelect
                label={t.form.fields.status}
                value={form.status}
                onValueChange={(value) => onFormChange((current) => ({ ...current, status: value as SalesProductStatus }))}
                options={statusOptions}
              />
              {shouldShowBarcode ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t.form.fields.barcode}</label>
                  <div className="grid gap-2">
                    <Input
                      className={productFieldClassName}
                      value={form.barcode}
                      onChange={(event) => onFormChange((current) => ({ ...current, barcode: event.target.value }))}
                      placeholder={t.form.placeholders.barcode}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10"
                      onClick={onOpenLabelGenerator}
                    >
                      <Barcode className="h-4 w-4" />
                      {t.labelsGenerator.open}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </section>
  );
}
