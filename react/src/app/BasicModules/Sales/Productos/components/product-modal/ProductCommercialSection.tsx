import type { Dispatch, SetStateAction } from 'react';
import { Calculator, CircleDollarSign } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../components/ui/select';
import { salesCurrencyOptions } from '../../../utils/salesCurrency';
import type { ProductsTranslations } from '../../translations';
import type { ProductFormState } from '../../types/productosTypes';
import { formatProductCurrency } from '../../utils/productFormatters';
import { productFieldClassName } from './productModalConstants';
import { ProductMarginGuidance } from './ProductMarginGuidance';
import {
  getPriceBuilderSnapshot,
  getRoundedCurrencyValue,
  getRoundedPercentValue,
} from './productPricing';

function ProductNumberField({
  label,
  value,
  min = '0',
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Input
        className={productFieldClassName}
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ProductCommercialSection({
  form,
  t,
  onFormChange,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
}) {
  const pricing = getPriceBuilderSnapshot(form);

  const applySuggestedPrice = () => {
    onFormChange((current) => ({
      ...current,
      price: String(getRoundedCurrencyValue(pricing.suggestedPrice)),
    }));
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
          <Calculator className="h-5 w-5 text-[#B63B32]" />
          {t.priceBuilder.title}
        </h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{t.priceBuilder.description}</p>
        <p className="mt-2 rounded-lg border border-[#F4C84A]/35 bg-[#F4C84A]/15 px-3 py-2 text-xs font-bold leading-5 text-[#7A5404]">
          {t.priceBuilder.temporaryValuesNote}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">{t.priceBuilder.costBlock}</p>
          <ProductNumberField
            label={t.priceBuilder.baseCost}
            value={form.cost}
            onChange={(value) => onFormChange((current) => ({ ...current, cost: value }))}
          />
          <ProductNumberField
            label={t.priceBuilder.logisticsCost}
            value={form.logisticsCost}
            onChange={(value) => onFormChange((current) => ({ ...current, logisticsCost: value }))}
          />
          <ProductNumberField
            label={t.priceBuilder.additionalCost}
            value={form.additionalCost}
            onChange={(value) => onFormChange((current) => ({ ...current, additionalCost: value }))}
          />
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">{t.priceBuilder.totalCost}</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{formatProductCurrency(pricing.totalCost, form.currency)}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">{t.priceBuilder.suggestionBlock}</p>
          <ProductNumberField
            label={t.priceBuilder.desiredMargin}
            value={form.desiredMarginPercentage}
            onChange={(value) => onFormChange((current) => ({ ...current, desiredMarginPercentage: value }))}
          />
          <div className="rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/10 p-3">
            <p className="text-xs font-bold text-[#177d66]">{t.priceBuilder.suggestedPrice}</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{formatProductCurrency(pricing.suggestedPrice, form.currency)}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-2 rounded-lg border-[#FF6B5E]/25 bg-white text-sm font-bold text-[#B63B32] hover:bg-[#FF6B5E]/10"
            onClick={applySuggestedPrice}
          >
            <CircleDollarSign className="h-4 w-4" />
            {t.priceBuilder.applySuggestedPrice}
          </Button>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">{t.priceBuilder.finalBlock}</p>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.labels.currency}</label>
            <Select value={form.currency} onValueChange={(value) => onFormChange((current) => ({ ...current, currency: value }))}>
              <SelectTrigger className={productFieldClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {salesCurrencyOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ProductNumberField
            label={t.priceBuilder.finalSalePrice}
            value={form.price}
            onChange={(value) => onFormChange((current) => ({ ...current, price: value }))}
          />
          <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-3">
            <p className="text-xs font-bold text-[#B63B32]">{t.priceBuilder.estimatedMargin}</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{getRoundedPercentValue(pricing.actualMargin)}%</p>
          </div>
          <ProductNumberField
            label={t.packaging.wholesalePrice}
            value={form.wholesalePrice}
            onChange={(value) => onFormChange((current) => ({ ...current, wholesalePrice: value }))}
          />
          <ProductNumberField
            label={t.packaging.wholesaleMinimumQuantity}
            min="1"
            value={form.wholesaleMinimumQuantity}
            onChange={(value) => onFormChange((current) => ({ ...current, wholesaleMinimumQuantity: value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProductNumberField
          label={t.packaging.minimumSaleQuantity}
          min="1"
          value={form.minimumSaleQuantity}
          onChange={(value) => onFormChange((current) => ({ ...current, minimumSaleQuantity: value }))}
        />
      </div>

      <ProductMarginGuidance form={form} t={t} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
        {t.priceBuilder.taxesInQuoteNote}
      </div>
    </section>
  );
}
