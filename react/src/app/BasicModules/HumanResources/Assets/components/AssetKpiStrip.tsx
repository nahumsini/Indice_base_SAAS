import { Archive, CheckCircle2, CircleDollarSign, Eye, PackageCheck, Wrench } from 'lucide-react';
import type { AssetKpiCopy } from '../translations';
import { OperationalKpiArea, getOperationalKpiCurrencyCopy } from '../../../shared/operational';
import { useKpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import { formatBusinessCurrencyAmount } from '../../../shared/businessCurrency';
import { useLanguage } from '../../../../shared/context';

interface AssetKpiStripProps {
  assignedCount: number;
  assetIds: number[];
  availableCount: number;
  copy: AssetKpiCopy;
  maintenanceCount: number;
  preferredCurrency: string;
  selectedCount?: number;
  totalCount: number;
  visibleCount: number;
}

export function AssetKpiStrip({
  assignedCount,
  assetIds,
  availableCount,
  copy,
  maintenanceCount,
  preferredCurrency,
  selectedCount = 0,
  totalCount,
  visibleCount,
}: AssetKpiStripProps) {
  const { currentLanguage } = useLanguage();
  const currencyCopy = getOperationalKpiCurrencyCopy(currentLanguage.code);
  const aggregate = useKpiMonetaryAggregate({ metric: 'HR_ASSET_VALUE', preferredCurrency, ids: assetIds });
  const assetValueLabel = aggregate.data && !aggregate.loading
    ? formatBusinessCurrencyAmount(aggregate.data.preferredTotal, preferredCurrency, { maximumFractionDigits: 0 }) : '—';
  const nativeBreakdownLabel = aggregate.data?.nativeTotals
    .map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency, { maximumFractionDigits: 0 })).join(' / ') || preferredCurrency;

  return (
    <OperationalKpiArea
      className="mb-5"
      metrics={[
        { id: 'total', icon: <Archive className="h-4 w-4" />, label: copy.cards.total, value: totalCount },
        { id: 'assigned', icon: <PackageCheck className="h-4 w-4" />, label: copy.cards.assigned, value: assignedCount, valueClassName: 'text-emerald-600' },
        { id: 'available', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.cards.available, value: availableCount, valueClassName: 'text-blue-600' },
        { id: 'maintenance', icon: <Wrench className="h-4 w-4" />, label: copy.cards.maintenance, value: maintenanceCount, valueClassName: 'text-amber-600' },
        { id: 'visible', icon: <Eye className="h-4 w-4" />, label: copy.kpis.visibleAfterFilters, value: visibleCount },
        { id: 'value', icon: <CircleDollarSign className="h-4 w-4" />, label: copy.kpis.assetValue, value: assetValueLabel, valueClassName: 'text-[#59C3A5]' },
      ]}
      distributionSegments={[
        { id: 'assigned', label: copy.cards.assigned, count: assignedCount, className: 'bg-emerald-500' },
        { id: 'available', label: copy.cards.available, count: availableCount, className: 'bg-blue-500' },
        { id: 'maintenance', label: copy.cards.maintenance, count: maintenanceCount, className: 'bg-amber-500' },
      ]}
      insight={copy.kpis.summary(assignedCount, availableCount, maintenanceCount, selectedCount, visibleCount, totalCount)}
      insightIcon={<Archive className="h-4 w-4" />}
      currencyContext={{
        preferredCurrency, nativeBreakdown: nativeBreakdownLabel,
        rateLabel: aggregate.data?.exchangeRate.mode === 'daily' ? currencyCopy.dailyRate : currencyCopy.unavailable,
        effectiveDate: aggregate.data?.exchangeRate.effectiveDate, source: aggregate.data?.exchangeRate.source,
        isPartial: Boolean(aggregate.error || aggregate.data?.partial),
        excludedCount: aggregate.data?.excludedRecords ?? (aggregate.error ? assetIds.length : 0), labels: currencyCopy,
      }}
    />
  );
}
