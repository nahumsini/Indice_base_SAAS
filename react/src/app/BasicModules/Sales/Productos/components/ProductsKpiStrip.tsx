import type { ReactNode } from 'react';
import { CircleDollarSign, PackageCheck, ShoppingCart, TrendingUp, Warehouse } from 'lucide-react';
import { productTypes, type SalesCatalogItem } from '../../salesCrmContext';
import { cn } from '../../../../components/ui/utils';
import { productTypeProgressStyles } from '../utils/productStyles';
import type { ProductTypeCount } from '../types/productosTypes';
import { formatProductCurrency } from '../utils/productFormatters';

function CatalogMetric({
  icon,
  value,
  label,
  valueClassName = 'text-slate-950',
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  valueClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm">
        {icon}
      </span>
      <span className="text-base font-semibold">
        <span className={cn('mr-2 font-bold', valueClassName)}>{value}</span>
        <span className="text-slate-600">{label}</span>
      </span>
    </span>
  );
}

export function ProductsKpiStrip({
  totalCount,
  activeCount,
  inventoryValue,
  estimatedProfit,
  readyForSalesCount,
  posReadyCount,
  publicCatalogCount,
  typeCounts,
  metricLabels,
  typeLabels,
}: {
  totalCount: number;
  activeCount: number;
  inventoryValue: number;
  estimatedProfit: number;
  readyForSalesCount: number;
  posReadyCount: number;
  publicCatalogCount: number;
  typeCounts: ProductTypeCount[];
  metricLabels: {
    activeItems: string;
    inventoryValue: string;
    estimatedProfit: string;
    readyForSales: string;
    posReady: string;
    publicCatalogEnabled: string;
  };
  typeLabels: Record<SalesCatalogItem['type'], string>;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-slate-600">
        <CatalogMetric icon={<PackageCheck className="h-4 w-4" />} value={activeCount} label={metricLabels.activeItems} valueClassName="text-[#FF6B5E]" />
        <CatalogMetric icon={<Warehouse className="h-4 w-4" />} value={formatProductCurrency(inventoryValue)} label={metricLabels.inventoryValue} valueClassName="text-[#9a6b05]" />
        <CatalogMetric icon={<TrendingUp className="h-4 w-4" />} value={formatProductCurrency(estimatedProfit)} label={metricLabels.estimatedProfit} valueClassName="text-[#177d66]" />
        <CatalogMetric icon={<CircleDollarSign className="h-4 w-4" />} value={readyForSalesCount} label={metricLabels.readyForSales} valueClassName="text-[#2563EB]" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
          {typeCounts.map(({ type, count }) => {
            const width = totalCount > 0 ? (count / totalCount) * 100 : 0;
            return <div key={type} className={cn('h-full', productTypeProgressStyles[type])} style={{ width: `${width}%` }} aria-hidden="true" />;
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-3 py-1 text-[#177d66]">
            <ShoppingCart className="h-3.5 w-3.5" />
            {posReadyCount} {metricLabels.posReady}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-[#B63B32]">
            <CircleDollarSign className="h-3.5 w-3.5" />
            {publicCatalogCount} {metricLabels.publicCatalogEnabled}
          </span>
          {productTypes.map((type) => (
            <span key={type} className="inline-flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', productTypeProgressStyles[type])} />
              {typeLabels[type]}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
