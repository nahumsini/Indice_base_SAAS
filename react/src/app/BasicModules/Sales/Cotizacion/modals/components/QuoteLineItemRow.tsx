import { Trash2 } from 'lucide-react';
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
import { ProductThumbnail } from '../../../Productos/components/ProductThumbnail';
import type { SalesCatalogItem, SalesQuoteItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState } from '../../types/quoteBuilderTypes';
import { getQuoteLineExchangeRateLabel } from '../../utils/quoteCurrencyConversion';
import { calculateQuoteLinePricing, getRoundedMargin } from '../../utils/quotePricing';
import {
  createCustomTaxPreset,
  findQuoteTaxPreset,
  getTaxPresetsForJurisdiction,
} from '../../utils/quoteTaxCatalog';

const coralFieldClassName = 'border-slate-200 bg-white shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20';

export function QuoteLineItemRow({
  item,
  product,
  products,
  form,
  t,
  formatCurrency,
  onUpdate,
  onRemove,
}: {
  item: SalesQuoteItem;
  product?: SalesCatalogItem;
  products: SalesCatalogItem[];
  form: QuoteFormState;
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
  onUpdate: (patch: Partial<SalesQuoteItem>) => void;
  onRemove: () => void;
}) {
  const pricing = calculateQuoteLinePricing(item, products);
  const quoteCurrency = item.quoteCurrency ?? form.currency;
  const originalCurrency = item.originalCurrency ?? product?.currency ?? quoteCurrency;
  const originalUnitPrice = item.originalUnitPrice ?? product?.price ?? item.unitPrice;
  const hasCurrencyConversion = originalCurrency.toUpperCase() !== quoteCurrency.toUpperCase();
  const exchangeRateLabel = getQuoteLineExchangeRateLabel(item.exchangeRate);
  const previewProduct = product ?? {
    name: item.productName,
    imageUrl: undefined,
    imageAlt: undefined,
    thumbnailTone: 'coral' as const,
  };
  const jurisdictionPresets = getTaxPresetsForJurisdiction(form.taxJurisdiction);
  const customPreset = createCustomTaxPreset(form.customTaxLabel || t.taxBuilder.customTaxFallback, Number(form.customTaxRate) || 0);
  const taxPresets = form.taxJurisdiction === 'custom'
    ? [customPreset, ...jurisdictionPresets.filter((preset) => preset.id !== customPreset.id)]
    : jurisdictionPresets;
  const hasSelectedPreset = item.taxCode ? taxPresets.some((preset) => preset.id === item.taxCode) : false;
  const selectedTaxCode = item.taxCode && hasSelectedPreset
    ? item.taxCode
    : item.taxIsCustom && form.taxJurisdiction === 'custom'
      ? 'custom-tax'
      : 'manual-rate';

  const handleTaxPresetChange = (taxCode: string) => {
    if (taxCode === 'manual-rate') {
      onUpdate({
        taxCode,
        taxLabel: t.taxBuilder.manualRate,
        taxJurisdiction: form.taxJurisdiction,
        taxIsCustom: true,
      });
      return;
    }

    const preset = taxCode === 'custom-tax' && form.taxJurisdiction === 'custom'
      ? customPreset
      : findQuoteTaxPreset(taxCode);

    if (!preset) {
      return;
    }

    onUpdate({
      taxCode: preset.id,
      taxLabel: preset.label,
      taxJurisdiction: form.taxJurisdiction,
      taxPercent: preset.defaultRate,
      taxIsCustom: preset.id === 'custom-tax' || preset.rateEditable,
    });
  };
  const handleUnitPriceChange = (value: number) => {
    const patch: Partial<SalesQuoteItem> = {
      unitPrice: value,
      convertedUnitPrice: value,
    };

    if (!hasCurrencyConversion) {
      patch.originalUnitPrice = value;
    }

    onUpdate(patch);
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <ProductThumbnail product={previewProduct} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-950">{item.productName}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{item.sku}</p>
            <p className="mt-1 text-xs font-normal text-slate-400">
              {product ? t.productTypeLabels[product.type] : t.common.unassigned}
            </p>
            <p className="mt-2 text-xs font-normal text-slate-500">
              {t.pricing.catalogPrice}: {formatCurrency(originalUnitPrice, originalCurrency)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-fit text-[#b63b32] hover:bg-[#FF6B5E]/10 hover:text-[#b63b32]" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          {t.builder.removeItem}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-6">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{t.labels.quantity}</label>
          <Input className={coralFieldClassName} type="number" min={1} value={item.quantity} onChange={(event) => onUpdate({ quantity: Number(event.target.value) || 1 })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{t.pricing.convertedPrice}</label>
          <Input className={coralFieldClassName} type="number" min={0} value={item.unitPrice} onChange={(event) => handleUnitPriceChange(Number(event.target.value) || 0)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{t.labels.discount}</label>
          <Input className={coralFieldClassName} type="number" min={0} max={100} value={item.discountPercent} onChange={(event) => onUpdate({ discountPercent: Number(event.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{t.taxBuilder.taxPreset}</label>
          <Select value={selectedTaxCode} onValueChange={handleTaxPresetChange}>
            <SelectTrigger className={coralFieldClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taxPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value="manual-rate">{t.taxBuilder.manualRate}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{t.taxBuilder.taxRate}</label>
          <Input
            className={coralFieldClassName}
            type="number"
            min={0}
            value={item.taxPercent}
            onChange={(event) => onUpdate({
              taxPercent: Number(event.target.value) || 0,
              taxCode: item.taxCode ?? 'manual-rate',
              taxLabel: item.taxLabel ?? t.taxBuilder.manualRate,
              taxJurisdiction: form.taxJurisdiction,
              taxIsCustom: true,
            })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{t.labels.subtotal}</label>
          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950">
            {formatCurrency(pricing.lineTotal, quoteCurrency)}
          </div>
        </div>
      </div>

      {hasCurrencyConversion ? (
        <div className="mt-3 rounded-lg border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-3 py-2 text-xs font-medium text-[#7C5604]">
          {t.pricing.exchangeRate}: 1 {originalCurrency} = {exchangeRateLabel} {quoteCurrency} · {item.exchangeRateDate}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{t.labels.notes}</label>
          <Textarea
            className={coralFieldClassName}
            value={item.notes}
            onChange={(event) => onUpdate({ notes: event.target.value })}
            placeholder={t.builder.lineNotesPlaceholder}
          />
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-500">{t.pricing.estimatedCost}</p>
          <p className="mt-1 font-semibold text-slate-950">{formatCurrency(pricing.estimatedCost, quoteCurrency)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-500">{t.pricing.estimatedMargin}</p>
          <p className="mt-1 font-semibold text-[#B63B32]">{getRoundedMargin(pricing.estimatedMargin)}%</p>
        </div>
      </div>
    </article>
  );
}
