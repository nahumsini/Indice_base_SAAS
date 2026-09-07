import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, PackageSearch, Target } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { DecisionMatrixCopy, DecisionMatrixViewCopy } from './decisionMatrixTranslations';
import type { ExecutiveDecisionMatrices, ProductPortfolioStockStatus } from './types';

type MatrixQuality = ExecutiveDecisionMatrices['businessHealth']['dataQuality'];
type Metric = { label: string; value: string };
type MatrixPoint = {
  id: string;
  label: string;
  secondary: string;
  quadrant: string;
  x: number;
  y: number;
  weight: number;
  ready: boolean;
  metrics: Metric[];
};

type MatrixQuadrant = { id: string; position: string };

const quadrantTone: Record<string, { bubble: string; panel: string }> = {
  engine: tone('emerald'), winner: tone('emerald'), balanced: tone('emerald'),
  contained_potential: tone('blue'), hidden_gem: tone('blue'), overstock: tone('blue'),
  fragile_growth: tone('amber'), sacrificed_volume: tone('amber'), stockout_risk: tone('amber'),
  priority_intervention: tone('rose'), catalog_drain: tone('rose'), stagnant: tone('rose'),
  unclassified: tone('slate'),
};

export function BusinessHealthMatrixView({ copy, currency, data, loading, locale, onOpen }: {
  copy: DecisionMatrixCopy;
  currency: string;
  data: ExecutiveDecisionMatrices['businessHealth'] | null;
  loading: boolean;
  locale: string;
  onOpen?: () => void;
}) {
  const points = useMemo<MatrixPoint[]>(() => {
    const items = data?.items ?? [];
    const maxRevenue = Math.max(1, ...items.map((item) => item.revenue));
    return items.map((item) => ({
      id: item.itemId,
      label: item.businessName,
      secondary: item.unitName,
      quadrant: item.quadrant,
      x: clamp(item.executionScore, 3, 97),
      y: normalize(item.operatingMarginPercent, -25, 50),
      weight: bubbleWeight(item.revenue, maxRevenue),
      ready: item.decisionReady,
      metrics: [
        { label: copy.health.metrics.revenue, value: money(item.revenue, locale, currency) },
        { label: copy.health.metrics.profit, value: item.decisionReady ? money(item.operatingProfit, locale, currency) : copy.common.unclassified },
        { label: copy.health.metrics.margin, value: item.decisionReady ? percent(item.operatingMarginPercent, locale) : copy.common.unclassified },
        { label: copy.health.metrics.execution, value: percent(item.executionScore, locale) },
        { label: copy.health.metrics.completion, value: percent(item.taskCompletionRate, locale) },
        { label: copy.health.metrics.attendance, value: percent(item.attendanceRate, locale) },
        { label: copy.health.metrics.overdueTasks, value: number(item.overdueTasks, locale) },
        { label: copy.health.metrics.receivables, value: money(item.overdueReceivables, locale, currency) },
      ],
    }));
  }, [copy.health.metrics, copy.common.unclassified, currency, data, locale]);

  return <DecisionMatrix
    actionLabel={copy.common.openProcesses}
    copy={copy.health}
    common={copy.common}
    dataTestId="business-health-matrix"
    loading={loading}
    onOpen={onOpen}
    points={points}
    quality={data?.dataQuality ?? null}
    quadrants={[
      { id: 'fragile_growth', position: 'left-0 top-0' },
      { id: 'engine', position: 'right-0 top-0' },
      { id: 'priority_intervention', position: 'bottom-0 left-0' },
      { id: 'contained_potential', position: 'bottom-0 right-0' },
    ]}
    threshold={`${copy.health.xAxis} ≥ ${number(data?.highExecutionThreshold ?? 70, locale)}% · ${copy.health.yAxis} ≥ ${number(data?.highMarginThreshold ?? 10, locale)}%`}
  />;
}

export function ProductProfitabilityMatrixView({ copy, currency, data, loading, locale, onOpen, stockLabels }: {
  copy: DecisionMatrixCopy;
  currency: string;
  data: ExecutiveDecisionMatrices['productProfitability'] | null;
  loading: boolean;
  locale: string;
  onOpen?: () => void;
  stockLabels: Record<ProductPortfolioStockStatus, string>;
}) {
  const points = useMemo<MatrixPoint[]>(() => {
    const items = data?.items ?? [];
    const maxRevenue = Math.max(1, ...items.map((item) => item.revenue));
    const maxVelocity = Math.max(data?.highVelocityThresholdPerDay ?? 1, ...items.map((item) => item.salesVelocityPerDay), 1);
    return items.map((item) => ({
      id: String(item.productId), label: item.productName, secondary: item.sku || item.category,
      quadrant: item.quadrant,
      x: normalize(item.salesVelocityPerDay, 0, maxVelocity),
      y: normalize(item.contributionMarginPercent ?? -20, -20, 60),
      weight: bubbleWeight(item.revenue, maxRevenue), ready: item.decisionReady,
      metrics: [
        { label: copy.profitability.metrics.revenue, value: money(item.revenue, locale, currency) },
        { label: copy.profitability.metrics.cost, value: nullableMoney(item.cost, locale, currency, copy.common.unclassified) },
        { label: copy.profitability.metrics.contribution, value: nullableMoney(item.contributionMargin, locale, currency, copy.common.unclassified) },
        { label: copy.profitability.metrics.margin, value: nullablePercent(item.contributionMarginPercent, locale, copy.common.unclassified) },
        { label: copy.profitability.metrics.units, value: number(item.unitsSold, locale) },
        { label: copy.profitability.metrics.velocity, value: number(item.salesVelocityPerDay, locale) },
        { label: copy.profitability.metrics.stock, value: item.availableQuantity === null ? stockLabels[item.stockStatus] : number(item.availableQuantity, locale) },
        { label: copy.profitability.metrics.category, value: item.category },
      ],
    }));
  }, [copy, currency, data, locale, stockLabels]);

  return <DecisionMatrix
    actionLabel={copy.common.openSales}
    copy={copy.profitability}
    common={copy.common}
    dataTestId="product-profitability-matrix"
    loading={loading}
    onOpen={onOpen}
    points={points}
    quality={data?.dataQuality ?? null}
    quadrants={[
      { id: 'hidden_gem', position: 'left-0 top-0' },
      { id: 'winner', position: 'right-0 top-0' },
      { id: 'catalog_drain', position: 'bottom-0 left-0' },
      { id: 'sacrificed_volume', position: 'bottom-0 right-0' },
    ]}
    threshold={`${copy.profitability.xAxis} ≥ ${number(data?.highVelocityThresholdPerDay ?? 0, locale)} · ${copy.profitability.yAxis} ≥ ${number(data?.highMarginThresholdPercent ?? 20, locale)}%`}
  />;
}

export function InventoryIntelligenceMatrixView({ copy, currency, data, loading, locale, onOpen, stockLabels }: {
  copy: DecisionMatrixCopy;
  currency: string;
  data: ExecutiveDecisionMatrices['inventoryIntelligence'] | null;
  loading: boolean;
  locale: string;
  onOpen?: () => void;
  stockLabels: Record<ProductPortfolioStockStatus, string>;
}) {
  const points = useMemo<MatrixPoint[]>(() => {
    const items = data?.items ?? [];
    const maxRevenue = Math.max(1, ...items.map((item) => item.revenue));
    const maxVelocity = Math.max(1, ...items.map((item) => item.salesVelocityPerDay));
    const coverageCap = Math.max(data?.highCoverageThresholdDays ?? 60, 90);
    return items.map((item) => ({
      id: String(item.productId), label: item.productName, secondary: item.sku || item.category,
      quadrant: item.quadrant,
      x: normalize(item.salesVelocityPerDay, 0, maxVelocity),
      y: item.quadrant === 'stagnant' ? 90 : normalize(item.stockCoverageDays ?? 0, 0, coverageCap),
      weight: bubbleWeight(item.revenue, maxRevenue), ready: item.decisionReady,
      metrics: [
        { label: copy.inventory.metrics.revenue, value: money(item.revenue, locale, currency) },
        { label: copy.inventory.metrics.units, value: number(item.unitsSold, locale) },
        { label: copy.inventory.metrics.velocity, value: number(item.salesVelocityPerDay, locale) },
        { label: copy.inventory.metrics.available, value: item.availableQuantity === null ? copy.common.unclassified : number(item.availableQuantity, locale) },
        { label: copy.inventory.metrics.minimum, value: item.minimumQuantity === null ? copy.common.unclassified : number(item.minimumQuantity, locale) },
        { label: copy.inventory.metrics.coverage, value: item.stockCoverageDays === null ? copy.common.unclassified : number(item.stockCoverageDays, locale) },
        { label: copy.inventory.metrics.category, value: item.category },
        { label: copy.inventory.metrics.stockStatus, value: stockLabels[item.stockStatus] },
      ],
    }));
  }, [copy, currency, data, locale, stockLabels]);

  return <DecisionMatrix
    actionLabel={copy.common.openInventory}
    copy={copy.inventory}
    common={copy.common}
    dataTestId="inventory-intelligence-matrix"
    loading={loading}
    onOpen={onOpen}
    points={points}
    quality={data?.dataQuality ?? null}
    quadrants={[
      { id: 'stagnant', position: 'left-0 top-0' },
      { id: 'overstock', position: 'right-0 top-0' },
      { id: 'balanced', position: 'bottom-0 left-0' },
      { id: 'stockout_risk', position: 'bottom-0 right-0' },
    ]}
    threshold={`${number(data?.lowCoverageThresholdDays ?? 14, locale)}–${number(data?.highCoverageThresholdDays ?? 60, locale)} ${copy.inventory.yAxis.toLocaleLowerCase()}`}
  />;
}

function DecisionMatrix({ actionLabel, common, copy, dataTestId, loading, onOpen, points, quality, quadrants, threshold }: {
  actionLabel: string;
  common: DecisionMatrixCopy['common'];
  copy: DecisionMatrixViewCopy<string>;
  dataTestId: string;
  loading: boolean;
  onOpen?: () => void;
  points: MatrixPoint[];
  quality: MatrixQuality | null;
  quadrants: MatrixQuadrant[];
  threshold: string;
}) {
  const classified = useMemo(() => points.filter((point) => point.ready && point.quadrant !== 'unclassified'), [points]);
  const unclassified = useMemo(() => points.filter((point) => !point.ready || point.quadrant === 'unclassified'), [points]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!points.some((point) => point.id === selectedId)) setSelectedId((classified[0] ?? points[0])?.id ?? '');
  }, [classified, points, selectedId]);

  if (loading || !quality) {
    return <section aria-busy="true" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" /></div><p className="mt-3 text-sm text-slate-500">{copy.title}</p></section>;
  }

  const selected = points.find((point) => point.id === selectedId) ?? null;
  return (
    <section data-testid={dataTestId} role="tabpanel" className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{copy.eyebrow}</p>
            <h2 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{copy.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
          </div>
          <QualityBadge common={common} quality={quality} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-blue-800 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">{copy.threshold}: {threshold}</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{classified.length} / {points.length}</span>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center"><PackageSearch className="h-9 w-9 text-slate-400" /><p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">{copy.noData}</p></div>
      ) : (
        <div className="grid gap-5 p-5 lg:p-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(18rem,0.9fr)]">
          <div className="min-w-0">
            <div className="space-y-2 md:hidden">
              {points.map((point) => <MobilePoint key={point.id} copy={copy} point={point} selected={point.id === selectedId} onSelect={() => setSelectedId(point.id)} />)}
            </div>
            <div className="hidden overflow-x-auto pb-2 md:block">
              <div className="relative min-w-[680px] pb-9 pl-11">
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-slate-500">{copy.xAxis}: {copy.low} → {copy.high}</span>
                <span className="absolute left-0 top-1/2 -translate-x-[42%] -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs text-slate-500">{copy.yAxis}: {copy.low} → {copy.high}</span>
                <div className="relative h-[500px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                  {quadrants.map((quadrant) => <QuadrantPanel key={quadrant.id} copy={copy} count={classified.filter((point) => point.quadrant === quadrant.id).length} quadrant={quadrant} />)}
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-slate-500/70" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-1/2 border-t border-dashed border-slate-500/70" />
                  {classified.map((point) => <Bubble key={point.id} copy={copy} point={point} selected={point.id === selectedId} onSelect={() => setSelectedId(point.id)} />)}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300"><Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span>{copy.methodology} {quality.note}</span></div>
            {quality.issues.length > 0 ? <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{quality.issues.join(' ')}</span></div> : null}
          </div>
          <PointEvidence actionLabel={actionLabel} common={common} copy={copy} onOpen={onOpen} point={selected} />
        </div>
      )}

      {unclassified.length > 0 ? (
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-medium text-slate-950 dark:text-white">{common.unclassified}</h3><p className="mt-0.5 text-xs text-slate-500">{copy.quadrants.unclassified.action}</p></div><span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs">{unclassified.length}</span></div>
          <div className="mt-3 flex flex-wrap gap-2">{unclassified.map((point) => <button key={point.id} type="button" onClick={() => setSelectedId(point.id)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{point.label}</button>)}</div>
        </div>
      ) : null}
    </section>
  );
}

function QualityBadge({ common, quality }: { common: DecisionMatrixCopy['common']; quality: MatrixQuality }) {
  return <span className={cn('inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium', quality.decisionReady ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200')}>{quality.decisionReady ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{quality.decisionReady ? common.ready : common.review}</span>;
}

function QuadrantPanel({ copy, count, quadrant }: { copy: DecisionMatrixViewCopy<string>; count: number; quadrant: MatrixQuadrant }) {
  const label = copy.quadrants[quadrant.id] ?? copy.quadrants.unclassified;
  return <div className={cn('pointer-events-none absolute h-1/2 w-1/2 p-3', quadrant.position, (quadrantTone[quadrant.id] ?? quadrantTone.unclassified).panel)}><p className="text-xs font-medium text-slate-700 dark:text-slate-200">{label.title} · {count}</p><p className="mt-0.5 max-w-[14rem] text-[11px] leading-4 text-slate-500 dark:text-slate-400">{label.description}</p></div>;
}

function Bubble({ copy, onSelect, point, selected }: { copy: DecisionMatrixViewCopy<string>; onSelect: () => void; point: MatrixPoint; selected: boolean }) {
  const quadrant = copy.quadrants[point.quadrant] ?? copy.quadrants.unclassified;
  const size = point.weight;
  const label = `${point.label}. ${quadrant.title}. ${copy.xAxis}: ${point.x.toFixed(1)}. ${copy.yAxis}: ${point.y.toFixed(1)}.`;
  return <button type="button" aria-label={label} aria-pressed={selected} title={label} onClick={onSelect} className={cn('absolute z-10 flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-medium shadow-md transition-transform hover:z-20 hover:scale-110 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950', (quadrantTone[point.quadrant] ?? quadrantTone.unclassified).bubble, selected && 'z-20 scale-110 ring-2 ring-slate-950 ring-offset-2 dark:ring-white dark:ring-offset-slate-950')} style={{ bottom: `${point.y}%`, left: `${point.x}%`, height: size, width: size }}><span className="max-w-[90%] truncate px-1">{shortLabel(point.label)}</span></button>;
}

function MobilePoint({ copy, onSelect, point, selected }: { copy: DecisionMatrixViewCopy<string>; onSelect: () => void; point: MatrixPoint; selected: boolean }) {
  const quadrant = copy.quadrants[point.quadrant] ?? copy.quadrants.unclassified;
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={cn('flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-slate-900', selected ? 'border-blue-500 shadow-sm dark:border-blue-600' : 'border-slate-200 dark:border-slate-700')}><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-950 dark:text-white">{point.label}</span><span className="mt-0.5 block text-xs text-slate-500">{quadrant.title} · {point.secondary}</span></span><Target className="h-4 w-4 shrink-0 text-blue-600" /></button>;
}

function PointEvidence({ actionLabel, common, copy, onOpen, point }: { actionLabel: string; common: DecisionMatrixCopy['common']; copy: DecisionMatrixViewCopy<string>; onOpen?: () => void; point: MatrixPoint | null }) {
  if (!point) return <aside className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/35 dark:text-slate-400">{copy.selectPrompt}</aside>;
  const quadrant = copy.quadrants[point.quadrant] ?? copy.quadrants.unclassified;
  return <aside className={cn('rounded-2xl border p-4', (quadrantTone[point.quadrant] ?? quadrantTone.unclassified).panel)} aria-live="polite"><p className="text-xs text-slate-500">{common.evidence}</p><h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{point.label}</h3><p className="mt-0.5 text-xs text-slate-500">{point.secondary}</p><span className="mt-3 inline-flex rounded-full border border-current/20 bg-white/65 px-2.5 py-1 text-xs font-medium text-slate-800 dark:bg-slate-950/35 dark:text-slate-100">{quadrant.title}</span><dl className="mt-4 grid grid-cols-2 gap-3">{point.metrics.map((metric) => <div key={metric.label}><dt className="text-[11px] text-slate-500">{metric.label}</dt><dd className="mt-0.5 break-words text-sm font-medium text-slate-950 dark:text-white">{metric.value}</dd></div>)}</dl><div className="mt-4 rounded-xl border border-white/80 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-950/45"><p className="text-xs text-slate-500">{common.recommendation}</p><p className="mt-1 text-sm leading-6 text-slate-800 dark:text-slate-100">{quadrant.action}</p>{onOpen ? <Button type="button" variant="ghost" onClick={onOpen} className="mt-2 h-9 rounded-xl px-2 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40">{actionLabel}<ArrowUpRight className="h-4 w-4" /></Button> : null}</div></aside>;
}

function tone(color: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate') {
  const tones = {
    emerald: { bubble: 'border-emerald-700 bg-emerald-500 text-emerald-950 focus-visible:ring-emerald-700 dark:border-emerald-200 dark:bg-emerald-400', panel: 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900 dark:bg-emerald-950/30' },
    blue: { bubble: 'border-blue-700 bg-blue-500 text-blue-950 focus-visible:ring-blue-700 dark:border-blue-200 dark:bg-blue-400', panel: 'border-blue-200 bg-blue-50/75 dark:border-blue-900 dark:bg-blue-950/30' },
    amber: { bubble: 'border-amber-700 bg-amber-400 text-amber-950 focus-visible:ring-amber-700 dark:border-amber-200 dark:bg-amber-300', panel: 'border-amber-200 bg-amber-50/75 dark:border-amber-900 dark:bg-amber-950/30' },
    rose: { bubble: 'border-rose-700 bg-rose-400 text-rose-950 focus-visible:ring-rose-700 dark:border-rose-200 dark:bg-rose-300', panel: 'border-rose-200 bg-rose-50/75 dark:border-rose-900 dark:bg-rose-950/30' },
    slate: { bubble: 'border-slate-600 bg-slate-300 text-slate-950 focus-visible:ring-slate-700 dark:border-slate-200 dark:bg-slate-500 dark:text-white', panel: 'border-slate-200 bg-slate-50/75 dark:border-slate-700 dark:bg-slate-950/35' },
  };
  return tones[color];
}

function bubbleWeight(value: number, maximum: number) { return clamp(36 + Math.sqrt(Math.max(0, value) / Math.max(1, maximum)) * 38, 36, 76); }
function normalize(value: number, minimum: number, maximum: number) { return clamp(((value - minimum) / Math.max(0.0001, maximum - minimum)) * 90 + 5, 5, 95); }
function clamp(value: number, minimum: number, maximum: number) { return Math.min(Math.max(value, minimum), maximum); }
function shortLabel(value: string) { const trimmed = value.trim(); if (trimmed.length <= 9) return trimmed; const words = trimmed.split(/\s+/); return words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join('').slice(0, 3) : trimmed.slice(0, 7); }
function number(value: number, locale: string) { return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value); }
function percent(value: number, locale: string) { return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(value)}%`; }
function nullablePercent(value: number | null, locale: string, fallback: string) { return value === null ? fallback : percent(value, locale); }
function money(value: number, locale: string, currency = 'MXN') { return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
function nullableMoney(value: number | null, locale: string, currency: string, fallback: string) { return value === null ? fallback : money(value, locale, currency); }
