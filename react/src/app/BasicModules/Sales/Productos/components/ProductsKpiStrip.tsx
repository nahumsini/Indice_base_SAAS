import { Children, type ReactNode } from 'react';
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
  valueClassName = 'text-slate-950 dark:text-white',
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  valueClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {icon}
      </span>
      <span className="text-sm font-semibold">
        <span className={cn('mr-2 font-bold', valueClassName)}>{value}</span>
        <span className="font-bold text-slate-600 dark:text-slate-300">{label}</span>
      </span>
    </span>
  );
}

function CatalogMetricGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-slate-600 dark:text-slate-300">
      {items.map((child, index) => (
        <div key={index} className="flex items-center gap-4">
          {index > 0 ? (
            <span className="hidden h-5 w-px rounded-full bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden="true" />
          ) : null}
          {child}
        </div>
      ))}
    </div>
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
      <CatalogMetricGroup>
        <CatalogMetric icon={<PackageCheck className="h-4 w-4" />} value={activeCount} label={metricLabels.activeItems} valueClassName="text-[#FF6B5E]" />
        <CatalogMetric icon={<Warehouse className="h-4 w-4" />} value={formatProductCurrency(inventoryValue)} label={metricLabels.inventoryValue} valueClassName="text-[#9a6b05]" />
        <CatalogMetric icon={<TrendingUp className="h-4 w-4" />} value={formatProductCurrency(estimatedProfit)} label={metricLabels.estimatedProfit} valueClassName="text-[#177d66]" />
        <CatalogMetric icon={<CircleDollarSign className="h-4 w-4" />} value={readyForSalesCount} label={metricLabels.readyForSales} valueClassName="text-[#2563EB]" />
      </CatalogMetricGroup>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          {typeCounts.map(({ type, count }) => {
            const width = totalCount > 0 ? (count / totalCount) * 100 : 0;
            return <div key={type} className={cn('h-full', productTypeProgressStyles[type])} style={{ width: `${width}%` }} aria-hidden="true" />;
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500 dark:text-slate-300 xl:justify-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-3 py-1 text-[#177d66] dark:border-[#59C3A5]/35 dark:bg-[#59C3A5]/15 dark:text-[#7EE0C3]">
            <ShoppingCart className="h-3.5 w-3.5" />
            {posReadyCount} {metricLabels.posReady}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-[#B63B32] dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]">
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
