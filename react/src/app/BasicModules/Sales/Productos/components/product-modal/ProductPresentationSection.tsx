import type { Dispatch, SetStateAction } from 'react';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../components/ui/select';
import { Textarea } from '../../../../../components/ui/textarea';
import type { SalesProductBaseUnit, SalesProductSaleUnit } from '../../../salesCrmContext';
import type { SalesCatalogItem } from '../../../types';
import type { ProductsTranslations } from '../../translations';
import type { ProductBundleDraft, ProductFormState } from '../../types/productosTypes';
import { productFieldClassName } from './productModalConstants';
import { ProductFormSelect } from './ProductModalFields';

function updateBundleItems(
  onFormChange: Dispatch<SetStateAction<ProductFormState>>,
  updater: (items: ProductBundleDraft[]) => ProductBundleDraft[],
) {
  onFormChange((current) => ({
    ...current,
    bundleItems: updater(current.bundleItems),
  }));
}

function SectionHelper({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
      {children}
    </div>
  );
}

function PresentationExamples({ examples }: { examples: string[] }) {
  if (examples.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((example) => (
        <span key={example} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
          {example}
        </span>
      ))}
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Input
        className={productFieldClassName}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NotesField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Textarea
        className={productFieldClassName}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ProductPresentationSection({
  form,
  t,
  baseUnitOptions,
  saleUnitOptions,
  catalogItems,
  onFormChange,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
  baseUnitOptions: Array<{ value: string; label: string }>;
  saleUnitOptions: Array<{ value: string; label: string }>;
  catalogItems: SalesCatalogItem[];
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
}) {
  const addBundleItem = () => {
    updateBundleItems(onFormChange, (current) => [
      ...current,
      {
        id: `bundle-${Date.now()}-${current.length + 1}`,
        name: '',
        quantity: '1',
        unit: form.baseUnit,
        notes: '',
      },
    ]);
  };

  const estimatedBundlePrice = form.bundleItems.reduce((total, item) => {
    const catalogItem = catalogItems.find((product) => product.name === item.name);
    return total + (catalogItem?.price ?? 0) * (Number(item.quantity) || 0);
  }, 0);

  const renderProductPresentation = () => (
    <div className="grid gap-4 md:grid-cols-3">
      <ProductFormSelect
        label={t.packaging.baseUnit}
        value={form.baseUnit}
        onValueChange={(value) => onFormChange((current) => ({ ...current, baseUnit: value as SalesProductBaseUnit }))}
        options={baseUnitOptions}
      />
      <ProductFormSelect
        label={t.packaging.saleUnit}
        value={form.saleUnit}
        onValueChange={(value) => onFormChange((current) => ({ ...current, saleUnit: value as SalesProductSaleUnit }))}
        options={saleUnitOptions}
      />
      <TextField
        label={t.packaging.unitsPerSaleUnit}
        value={form.unitsPerSaleUnit}
        onChange={(value) => onFormChange((current) => ({ ...current, unitsPerSaleUnit: value }))}
      />
      <div className="md:col-span-3">
        <TextField
          label={t.packaging.packagingBarcode}
          value={form.packagingBarcode}
          placeholder={t.form.placeholders.barcode}
          onChange={(value) => onFormChange((current) => ({ ...current, packagingBarcode: value }))}
        />
      </div>
      <div className="md:col-span-3">
        <NotesField
          label={t.packaging.notes}
          value={form.packagingNotes}
          placeholder={t.packaging.notesPlaceholder}
          onChange={(value) => onFormChange((current) => ({ ...current, packagingNotes: value }))}
        />
      </div>
    </div>
  );

  const renderServicePresentation = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <ProductFormSelect
        label={t.presentation.serviceUnit}
        value={form.serviceUnit}
        onValueChange={(value) => onFormChange((current) => ({ ...current, serviceUnit: value }))}
        options={Object.entries(t.presentation.serviceUnitLabels).map(([value, label]) => ({ value, label }))}
      />
      <TextField
        label={t.presentation.estimatedDuration}
        value={form.serviceEstimatedDuration}
        placeholder={t.presentation.estimatedDurationPlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, serviceEstimatedDuration: value }))}
      />
      <NotesField
        label={t.presentation.scopeNotes}
        value={form.serviceScopeNotes}
        placeholder={t.presentation.scopeNotesPlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, serviceScopeNotes: value }))}
      />
      <NotesField
        label={t.presentation.deliveryNotes}
        value={form.serviceDeliveryNotes}
        placeholder={t.presentation.deliveryNotesPlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, serviceDeliveryNotes: value }))}
      />
    </div>
  );

  const renderBundlePresentation = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={t.presentation.packageLabel}
          value={form.name}
          placeholder={t.form.placeholders.name}
          onChange={(value) => onFormChange((current) => ({ ...current, name: value }))}
        />
        <ProductFormSelect
          label={t.packaging.saleUnit}
          value={form.saleUnit}
          onValueChange={(value) => onFormChange((current) => ({ ...current, saleUnit: value as SalesProductSaleUnit }))}
          options={saleUnitOptions}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-950">{t.packaging.bundleTitle}</h4>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{t.packaging.bundleDescription}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-3 text-sm font-bold text-[#B63B32] hover:bg-[#FF6B5E]/10"
            onClick={addBundleItem}
          >
            <Plus className="h-4 w-4" />
            {t.packaging.addBundleItem}
          </Button>
        </div>

        <datalist id="product-component-options">
          {catalogItems.map((product) => (
            <option key={product.id} value={product.name} />
          ))}
        </datalist>

        {form.bundleItems.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-500">
            {t.packaging.emptyBundle}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {form.bundleItems.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-[minmax(0,1.3fr)_100px_150px_minmax(0,1fr)_auto] md:items-center">
                <Input
                  className={productFieldClassName}
                  list="product-component-options"
                  value={item.name}
                  onChange={(event) => updateBundleItems(onFormChange, (current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, name: event.target.value } : currentItem)))}
                  placeholder={t.packaging.bundleItem}
                />
                <Input
                  className={productFieldClassName}
                  min="1"
                  type="number"
                  value={item.quantity}
                  onChange={(event) => updateBundleItems(onFormChange, (current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, quantity: event.target.value } : currentItem)))}
                  placeholder={t.packaging.bundleQuantity}
                />
                <Select
                  value={item.unit}
                  onValueChange={(value) => updateBundleItems(onFormChange, (current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, unit: value as SalesProductBaseUnit } : currentItem)))}
                >
                  <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none focus:ring-[#FF6B5E]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {baseUnitOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className={productFieldClassName}
                  value={item.notes}
                  onChange={(event) => updateBundleItems(onFormChange, (current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, notes: event.target.value } : currentItem)))}
                  placeholder={t.packaging.bundleNotes}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  onClick={() => updateBundleItems(onFormChange, (current) => current.filter((currentItem) => currentItem.id !== item.id))}
                  aria-label={t.media.remove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-3">
        <p className="text-xs font-black uppercase tracking-normal text-[#B63B32]">{t.presentation.packageSummary}</p>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {t.presentation.packageSummaryValue(form.bundleItems.length, estimatedBundlePrice)}
        </p>
      </div>

      <NotesField
        label={t.packaging.notes}
        value={form.packagingNotes}
        placeholder={t.packaging.notesPlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, packagingNotes: value }))}
      />
    </div>
  );

  const renderSubscriptionPresentation = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <ProductFormSelect
        label={t.presentation.billingFrequency}
        value={form.subscriptionFrequency}
        onValueChange={(value) => onFormChange((current) => ({ ...current, subscriptionFrequency: value }))}
        options={Object.entries(t.presentation.subscriptionFrequencyLabels).map(([value, label]) => ({ value, label }))}
      />
      <TextField
        label={t.presentation.billingCycleLabel}
        value={form.subscriptionCycleLabel}
        placeholder={t.presentation.billingCyclePlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, subscriptionCycleLabel: value }))}
      />
      <TextField
        label={t.presentation.minimumTerm}
        value={form.subscriptionMinimumTerm}
        placeholder={t.presentation.minimumTermPlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, subscriptionMinimumTerm: value }))}
      />
      <NotesField
        label={t.presentation.renewalBehavior}
        value={form.subscriptionRenewalBehavior}
        placeholder={t.presentation.renewalBehaviorPlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, subscriptionRenewalBehavior: value }))}
      />
      <div className="md:col-span-2">
        <NotesField
          label={t.presentation.cancellationNotes}
          value={form.subscriptionCancellationNotes}
          placeholder={t.presentation.cancellationNotesPlaceholder}
          onChange={(value) => onFormChange((current) => ({ ...current, subscriptionCancellationNotes: value }))}
        />
      </div>
    </div>
  );

  const renderOperationalItemPresentation = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField
        label={t.presentation.internalReference}
        value={form.internalReference}
        placeholder={t.presentation.internalReferencePlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, internalReference: value }))}
      />
      <NotesField
        label={t.presentation.operationalUseNotes}
        value={form.operationalUseNotes}
        placeholder={t.presentation.operationalUseNotesPlaceholder}
        onChange={(value) => onFormChange((current) => ({ ...current, operationalUseNotes: value }))}
      />
    </div>
  );

  const renderActivePresentation = () => {
    if (form.type === 'Service') {
      return renderServicePresentation();
    }

    if (form.type === 'Package') {
      return renderBundlePresentation();
    }

    if (form.type === 'Subscription') {
      return renderSubscriptionPresentation();
    }

    if (form.type === 'Operational item') {
      return renderOperationalItemPresentation();
    }

    return renderProductPresentation();
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
          <Boxes className="h-5 w-5 text-[#B63B32]" />
          {t.packaging.title}
        </h3>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{t.packaging.description}</p>
      </div>

      <SectionHelper>{t.presentation.helpers[form.type]}</SectionHelper>
      <PresentationExamples examples={t.presentation.examples[form.type]} />

      {renderActivePresentation()}
    </section>
  );
}
