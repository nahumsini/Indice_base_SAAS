import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, PackageSearch } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { ProductPortfolioCopy } from './productPortfolioTranslations';
import type {
  ExecutiveProductPortfolio,
  ExecutiveProductPortfolioItem,
  ProductPortfolioQuadrant,
  ProductPortfolioStockStatus,
} from './types';

const quadrantStyles: Record<ProductPortfolioQuadrant, { bubble: string; panel: string }> = {
  star: {
    bubble: 'border-emerald-700 bg-emerald-500 text-emerald-950 focus-visible:ring-emerald-700 dark:border-emerald-200 dark:bg-emerald-400',
    panel: 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900 dark:bg-emerald-950/30',
  },
  cash_cow: {
    bubble: 'border-blue-700 bg-blue-500 text-blue-950 focus-visible:ring-blue-700 dark:border-blue-200 dark:bg-blue-400',
    panel: 'border-blue-200 bg-blue-50/75 dark:border-blue-900 dark:bg-blue-950/30',
  },
  question_mark: {
    bubble: 'border-amber-700 bg-amber-400 text-amber-950 focus-visible:ring-amber-700 dark:border-amber-200 dark:bg-amber-300',
    panel: 'border-amber-200 bg-amber-50/75 dark:border-amber-900 dark:bg-amber-950/30',
  },
  dog: {
    bubble: 'border-rose-700 bg-rose-400 text-rose-950 focus-visible:ring-rose-700 dark:border-rose-200 dark:bg-rose-300',
    panel: 'border-rose-200 bg-rose-50/75 dark:border-rose-900 dark:bg-rose-950/30',
  },
  unclassified: {
    bubble: 'border-slate-600 bg-slate-300 text-slate-950 focus-visible:ring-slate-700 dark:border-slate-200 dark:bg-slate-500 dark:text-white',
    panel: 'border-slate-200 bg-slate-50/75 dark:border-slate-700 dark:bg-slate-950/35',
  },
};

const stockStyles: Record<ProductPortfolioStockStatus, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
  low_stock: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
  out_of_stock: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200',
  unavailable: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  not_tracked: 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
};

export function ProductPortfolioMatrix({ copy, loading, locale, onOpenSales, openSalesLabel, portfolio }: {
  copy: ProductPortfolioCopy;
  loading: boolean;
  locale: string;
  onOpenSales?: () => void;
  openSalesLabel?: string;
  portfolio: ExecutiveProductPortfolio | null;
}) {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const classified = useMemo(
    () => portfolio?.items.filter((item) => item.quadrant !== 'unclassified' && item.growthPercent !== null) ?? [],
    [portfolio],
  );
  const unclassified = useMemo(
    () => portfolio?.items.filter((item) => item.quadrant === 'unclassified') ?? [],
    [portfolio],
  );

  useEffect(() => {
    const available = portfolio?.items ?? [];
    if (!available.some((item) => item.productId === selectedProductId)) {
      setSelectedProductId((classified[0] ?? available[0])?.productId ?? null);
    }
  }, [classified, portfolio, selectedProductId]);

  if (loading || !portfolio) {
    return (
      <section aria-busy="true" className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" /></div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{copy.title}</p>
      </section>
    );
  }

  const selected = portfolio.items.find((item) => item.productId === selectedProductId) ?? null;
  const quadrantCounts = new Map(portfolio.quadrants.map((item) => [item.quadrant, item.productCount]));

  return (
    <section data-testid="product-portfolio-matrix" className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-medium text-slate-950 dark:text-white">{copy.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
          </div>
          <span className={cn(
            'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
            portfolio.dataQuality.decisionReady
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
          )}>
            {portfolio.dataQuality.decisionReady ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {portfolio.dataQuality.decisionReady ? copy.dataReady : copy.dataReview}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryFact label={copy.summary.revenue} value={formatMoney(portfolio.totalRevenue, portfolio.preferredCurrency, locale)} />
          <SummaryFact label={copy.summary.eligible} value={formatNumber(portfolio.eligibleProducts, locale)} />
          <SummaryFact label={copy.summary.classified} value={`${formatNumber(portfolio.classifiedProducts, locale)} / ${formatNumber(portfolio.eligibleProducts, locale)}`} />
          <SummaryFact label={copy.summary.comparison} value={`${portfolio.comparisonRange.from} / ${portfolio.comparisonRange.to}`} />
        </div>
      </div>

      {portfolio.items.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
          <PackageSearch className="h-9 w-9 text-slate-400" />
          <p className="max-w-lg text-sm text-slate-600 dark:text-slate-300">{copy.noProducts}</p>
        </div>
      ) : (
        <div className="grid gap-5 p-5 lg:p-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(18rem,0.9fr)]">
          <div className="min-w-0">
            <div className="space-y-2 md:hidden" aria-label={copy.title}>
              {classified.map((item) => (
                <button
                  key={item.productId}
                  type="button"
                  aria-pressed={selectedProductId === item.productId}
                  onClick={() => setSelectedProductId(item.productId)}
                  className={cn(
                    'flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-slate-900',
                    selectedProductId === item.productId ? 'border-blue-500 shadow-sm dark:border-blue-600' : 'border-slate-200 dark:border-slate-700',
                  )}
                >
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-950 dark:text-white">{item.productName}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{copy.quadrants[item.quadrant].title} · {copy.metrics.portfolioShare} {formatPercent(item.portfolioSharePercent, locale, copy.unavailable)}</span></span>
                  <span className="shrink-0 text-sm font-medium text-slate-800 dark:text-slate-100">{formatPercent(item.growthPercent, locale, copy.unavailable)}</span>
                </button>
              ))}
            </div>
            <div className="hidden overflow-x-auto pb-2 md:block">
              <div className="relative min-w-[680px] pb-9 pl-11" aria-label={`${copy.axes.share}; ${copy.axes.growth}`}>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400">
                  {copy.axes.share}: {copy.axes.low} → {copy.axes.high}
                </div>
                <div className="absolute left-0 top-1/2 -translate-x-[41%] -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                  {copy.axes.growth}: {copy.axes.low} → {copy.axes.high}
                </div>
                <div className="relative h-[500px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                  <QuadrantBackground position="left-0 top-0" quadrant="question_mark" copy={copy} count={quadrantCounts.get('question_mark') ?? 0} />
                  <QuadrantBackground position="right-0 top-0" quadrant="star" copy={copy} count={quadrantCounts.get('star') ?? 0} />
                  <QuadrantBackground position="bottom-0 left-0" quadrant="dog" copy={copy} count={quadrantCounts.get('dog') ?? 0} />
                  <QuadrantBackground position="bottom-0 right-0" quadrant="cash_cow" copy={copy} count={quadrantCounts.get('cash_cow') ?? 0} />
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-slate-500/70" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-1/2 border-t border-dashed border-slate-500/70" />
                  {classified.map((item) => (
                    <ProductBubble
                      key={item.productId}
                      copy={copy}
                      item={item}
                      locale={locale}
                      selected={selectedProductId === item.productId}
                      onSelect={() => setSelectedProductId(item.productId)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
              <span>{copy.thresholdNote} {copy.internalNote}{portfolio.truncated ? ` ${copy.displayedNote}` : ''}</span>
            </div>
          </div>

          <ProductEvidence copy={copy} item={selected} locale={locale} currency={portfolio.preferredCurrency} onOpenSales={onOpenSales} openSalesLabel={openSalesLabel} />
        </div>
      )}

      {unclassified.length > 0 ? (
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.noComparable}</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{copy.quadrants.unclassified.action}</p>
            </div>
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{unclassified.length}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unclassified.map((item) => (
              <button key={item.productId} type="button" onClick={() => setSelectedProductId(item.productId)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {item.productName}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50/75 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950/35"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{value}</p></div>;
}

function QuadrantBackground({ copy, count, position, quadrant }: {
  copy: ProductPortfolioCopy;
  count: number;
  position: string;
  quadrant: ProductPortfolioQuadrant;
}) {
  const label = copy.quadrants[quadrant];
  return (
    <div className={cn('pointer-events-none absolute h-1/2 w-1/2 p-3', position, quadrantStyles[quadrant].panel)}>
      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{label.title} · {count}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{label.description}</p>
    </div>
  );
}

function ProductBubble({ copy, item, locale, onSelect, selected }: {
  copy: ProductPortfolioCopy;
  item: ExecutiveProductPortfolioItem;
  locale: string;
  onSelect: () => void;
  selected: boolean;
}) {
  const x = clamp(item.relativeCategorySharePercent, 6, 94);
  const y = clamp(((item.growthPercent ?? -100) + 100) / 2, 7, 93);
  const size = clamp(34 + Math.sqrt(Math.max(item.portfolioSharePercent, 0)) * 5, 36, 76);
  const label = `${item.productName}. ${copy.quadrants[item.quadrant].title}. ${copy.metrics.growth}: ${formatPercent(item.growthPercent, locale, copy.unavailable)}. ${copy.metrics.relativeShare}: ${formatPercent(item.relativeCategorySharePercent, locale, copy.unavailable)}.`;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onSelect}
      className={cn(
        'absolute z-10 flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-medium shadow-md transition-transform hover:z-20 hover:scale-110 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
        quadrantStyles[item.quadrant].bubble,
        selected && 'z-20 scale-110 ring-2 ring-slate-950 ring-offset-2 dark:ring-white dark:ring-offset-slate-950',
      )}
      style={{ bottom: `${y}%`, left: `${x}%`, height: size, width: size }}
    >
      <span className="max-w-[90%] truncate px-1">{shortLabel(item.productName)}</span>
    </button>
  );
}

function ProductEvidence({ copy, currency, item, locale, onOpenSales, openSalesLabel }: {
  copy: ProductPortfolioCopy;
  currency: string;
  item: ExecutiveProductPortfolioItem | null;
  locale: string;
  onOpenSales?: () => void;
  openSalesLabel?: string;
}) {
  if (!item) {
    return <aside className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/35 dark:text-slate-400">{copy.selectPrompt}</aside>;
  }
  const quadrant = copy.quadrants[item.quadrant];
  return (
    <aside className={cn('rounded-2xl border p-4', quadrantStyles[item.quadrant].panel)} aria-live="polite">
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy.selectedProduct}</p>
      <h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{item.productName}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full border border-current/20 bg-white/65 px-2.5 py-1 text-xs font-medium text-slate-800 dark:bg-slate-950/35 dark:text-slate-100">{quadrant.title}</span>
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', stockStyles[item.stockStatus])}>{copy.stock[item.stockStatus]}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <EvidenceFact label={copy.metrics.currentRevenue} value={formatMoney(item.currentRevenue, currency, locale)} />
        <EvidenceFact label={copy.metrics.previousRevenue} value={formatMoney(item.previousRevenue, currency, locale)} />
        <EvidenceFact label={copy.metrics.growth} value={formatPercent(item.growthPercent, locale, copy.unavailable)} />
        <EvidenceFact label={copy.metrics.relativeShare} value={formatPercent(item.relativeCategorySharePercent, locale, copy.unavailable)} />
        <EvidenceFact label={copy.metrics.portfolioShare} value={formatPercent(item.portfolioSharePercent, locale, copy.unavailable)} />
        <EvidenceFact label={copy.metrics.units} value={formatNumber(item.currentUnits, locale)} />
        <EvidenceFact label={copy.metrics.category} value={item.category || copy.unavailable} />
        <EvidenceFact label={copy.metrics.sku} value={item.sku || copy.unavailable} />
      </dl>
      <div className="mt-4 rounded-xl border border-white/80 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-950/45">
        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.columns.action}</p>
        <p className="mt-1 text-sm leading-6 text-slate-800 dark:text-slate-100">{quadrant.action}</p>
        {onOpenSales && openSalesLabel ? (
          <Button type="button" variant="ghost" onClick={onOpenSales} className="mt-2 h-9 rounded-xl px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40">
            {openSalesLabel}<ArrowUpRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

function EvidenceFact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-0.5 break-words text-sm font-medium text-slate-950 dark:text-white">{value}</dd></div>;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function shortLabel(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= 9) return trimmed;
  const words = trimmed.split(/\s+/);
  return words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join('').slice(0, 3) : trimmed.slice(0, 7);
}

function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null, locale: string, unavailable: string) {
  return value === null ? unavailable : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(value)}%`;
}
