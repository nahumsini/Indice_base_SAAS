import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  ChevronRight,
  Gauge,
  PackageSearch,
  ScatterChart,
  TrendingUp,
  Users,
  Warehouse,
  Workflow,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { CompactDiagnosisCopy } from './compactDiagnosisTranslations';
import type { DiagnosisCopy } from './diagnosisTranslations';
import {
  findingPriority,
  formatFindingValue,
  getFindingCopy,
  LoadingPanel,
  StatusBadge,
} from './DiagnosisWorkspaceViews';
import type { DiagnosisViewId, DiagnosisWorkspaceCopy } from './diagnosisWorkspaceTranslations';
import type {
  ExecutiveDiagnosisFinding,
  ExecutiveDiagnosisSector,
  ExecutiveDiagnosisSectorId,
  ExecutiveKpiResponse,
} from './types';

type NavigateHandler = (page?: string) => void;

const sectorPresentation: Record<ExecutiveDiagnosisSectorId, { icon: LucideIcon; marker: string; surface: string }> = {
  people: { icon: Users, marker: 'bg-[#59C3A5]', surface: 'bg-[#59C3A5]/10 text-[#176B5B] dark:text-[#8FE0CA]' },
  processes: { icon: Workflow, marker: 'bg-[#F4C84A]', surface: 'bg-[#F4C84A]/15 text-[#8A6500] dark:text-[#F8D96D]' },
  products: { icon: PackageSearch, marker: 'bg-[#FF6B5E]', surface: 'bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FF9D94]' },
  finance: { icon: BadgeDollarSign, marker: 'bg-[#147514]', surface: 'bg-[#147514]/10 text-[#147514] dark:text-[#8ED48E]' },
};

const specializedTools: Array<{ id: DiagnosisViewId; icon: LucideIcon }> = [
  { id: 'health', icon: Gauge },
  { id: 'portfolio', icon: ScatterChart },
  { id: 'profitability', icon: TrendingUp },
  { id: 'inventory', icon: Warehouse },
];

export function CompactDiagnosisOverview({ compactCopy, copy, data, loading, locale, onNavigate, onSectorSelect, onViewChange, workspaceCopy }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  data: ExecutiveKpiResponse | null;
  loading: boolean;
  locale: string;
  onNavigate?: NavigateHandler;
  onSectorSelect: (sectorId: ExecutiveDiagnosisSectorId) => void;
  onViewChange: (view: DiagnosisViewId) => void;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  const [selectedSectorId, setSelectedSectorId] = useState<ExecutiveDiagnosisSectorId | null>(null);
  const [showAllSignals, setShowAllSignals] = useState(false);
  if (loading || !data) return <LoadingPanel label={copy.loading} />;

  const diagnosis = data.diagnosis;
  const allFindings = diagnosis.sectors.flatMap((sector) => sector.findings);
  const criticalCount = allFindings.filter((finding) => finding.available && finding.severity === 'critical').length;
  const watchCount = allFindings.filter((finding) => finding.available && finding.severity === 'watch').length;
  const missingCount = allFindings.filter((finding) => !finding.available).length;
  const prioritySector = diagnosis.sectors.find((sector) => sector.id === diagnosis.prioritySectorId);
  const priorityFinding = prioritySector ? sortFindings(prioritySector.findings)[0] : undefined;
  const selectedSector = diagnosis.sectors.find((sector) => sector.id === selectedSectorId) ?? null;

  const selectSector = (sectorId: ExecutiveDiagnosisSectorId) => {
    setSelectedSectorId((current) => current === sectorId ? null : sectorId);
    setShowAllSignals(false);
    onSectorSelect(sectorId);
  };

  return (
    <section role="tabpanel" data-testid="compact-diagnosis-overview" className="space-y-4">
      <DecisionSummary compactCopy={compactCopy} copy={copy} coverage={diagnosis.coveragePercent} criticalCount={criticalCount} decisionReady={diagnosis.decisionReady} missingCount={missingCount} score={diagnosis.score} status={diagnosis.status} watchCount={watchCount} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <SectorComparison compactCopy={compactCopy} copy={copy} sectors={diagnosis.sectors} selectedSectorId={selectedSectorId} onSelect={selectSector} />
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {selectedSector ? (
            <SectorDecisionPanel compactCopy={compactCopy} copy={copy} currency={data.domains.preferredCurrency} locale={locale} onClose={() => setSelectedSectorId(null)} onNavigate={onNavigate} onShowAll={() => setShowAllSignals((current) => !current)} sector={selectedSector} showAll={showAllSignals} workspaceCopy={workspaceCopy} />
          ) : (
            <PriorityDecisionPanel compactCopy={compactCopy} copy={copy} currency={data.domains.preferredCurrency} finding={priorityFinding} locale={locale} onNavigate={onNavigate} sector={prioritySector} workspaceCopy={workspaceCopy} />
          )}
        </aside>
      </div>

      <section data-testid="analysis-tools" className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-2 px-2 py-1 lg:w-52">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Wrench className="h-4 w-4" /></span>
          <span className="text-sm font-medium text-slate-950 dark:text-white">{compactCopy.tools.title}</span>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4">
          {specializedTools.map(({ id, icon: Icon }) => (
            <button key={id} type="button" onClick={() => onViewChange(id)} className="flex min-h-10 items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-200">
              <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{workspaceCopy.navigation.items[id]}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function DecisionSummary({ compactCopy, copy, coverage, criticalCount, decisionReady, missingCount, score, status, watchCount }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  coverage: number;
  criticalCount: number;
  decisionReady: boolean;
  missingCount: number;
  score: number | null;
  status: ExecutiveKpiResponse['diagnosis']['status'];
  watchCount: number;
}) {
  const metrics = [
    { label: compactCopy.summary.coverage, value: `${coverage}%`, tone: 'text-slate-950 dark:text-white' },
    { label: compactCopy.summary.critical, value: String(criticalCount), tone: criticalCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-950 dark:text-white' },
    { label: compactCopy.summary.watch, value: String(watchCount), tone: watchCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-950 dark:text-white' },
    { label: compactCopy.summary.missing, value: String(missingCount), tone: missingCount > 0 ? 'text-slate-600 dark:text-slate-300' : 'text-slate-950 dark:text-white' },
  ];
  return (
    <article data-testid="decision-summary" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-2 md:grid-cols-5">
        <div className="col-span-2 flex items-center justify-between gap-3 border-b border-slate-200 bg-blue-50/60 px-4 py-3 dark:border-slate-700 dark:bg-blue-950/20 md:col-span-1 md:border-b-0 md:border-r">
          <div><p className="text-xs text-slate-500 dark:text-slate-400">{compactCopy.summary.ime}</p><p className="mt-0.5 text-2xl font-medium tabular-nums text-slate-950 dark:text-white">{score === null ? '—' : Math.round(score)}<span className="ml-1 text-xs font-normal text-slate-500">/ 100</span></p></div>
          <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>
        {metrics.map((metric) => <div key={metric.label} className="border-b border-slate-100 px-4 py-3 odd:border-r dark:border-slate-800 md:border-b-0 md:border-r md:last:border-r-0"><p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p><p className={cn('mt-1 text-lg font-medium tabular-nums', metric.tone)}>{metric.value}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm dark:border-slate-800"><StatusBadge copy={copy} status={status} /><span className="text-slate-600 dark:text-slate-300">{decisionReady ? compactCopy.summary.ready : compactCopy.summary.review}</span></div>
    </article>
  );
}

function SectorComparison({ compactCopy, copy, onSelect, sectors, selectedSectorId }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  onSelect: (sectorId: ExecutiveDiagnosisSectorId) => void;
  sectors: ExecutiveDiagnosisSector[];
  selectedSectorId: ExecutiveDiagnosisSectorId | null;
}) {
  return (
    <section data-testid="sector-comparison" aria-labelledby="sector-comparison-title" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h2 id="sector-comparison-title" className="text-base font-medium text-slate-950 dark:text-white">{compactCopy.sectors.title}</h2><span className="text-xs text-slate-500 dark:text-slate-400">{sectors.length}</span></header>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {sectors.map((sector) => {
          const presentation = sectorPresentation[sector.id];
          const Icon = presentation.icon;
          const selected = selectedSectorId === sector.id;
          const issueCount = sector.findings.filter((finding) => !finding.available || finding.severity !== 'healthy').length;
          return (
            <button key={sector.id} type="button" aria-pressed={selected} onClick={() => onSelect(sector.id)} className={cn('group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:hover:bg-slate-800/60 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_auto]', selected && 'bg-blue-50/70 dark:bg-blue-950/25')}>
              <span className="flex min-w-0 items-center gap-3"><span className={cn('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', presentation.surface)}><span className={cn('absolute bottom-0 left-0 top-0 w-1 rounded-l-lg', presentation.marker)} /><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-950 dark:text-white">{copy.sectors[sector.id]}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{issueCount} {compactCopy.summary.signals}</span></span></span>
              <span className="hidden min-w-0 sm:block"><span className="mb-1 flex items-center justify-between text-[11px] text-slate-500"><span>{compactCopy.summary.coverage}</span><span>{sector.coveragePercent}%</span></span><span className="block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${sector.coveragePercent}%` }} /></span></span>
              <span className="hidden items-center justify-end gap-2 sm:flex"><span className="text-lg font-medium tabular-nums text-slate-950 dark:text-white">{sector.score === null ? '—' : Math.round(sector.score)}</span><StatusBadge copy={copy} status={sector.status} /></span>
              <span className="flex items-center gap-2 sm:gap-1"><span className="text-lg font-medium tabular-nums text-slate-950 dark:text-white sm:hidden">{sector.score === null ? '—' : Math.round(sector.score)}</span><ChevronRight className={cn('h-4 w-4 text-slate-400 transition', selected && 'rotate-90 text-blue-600')} /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PriorityDecisionPanel({ compactCopy, copy, currency, finding, locale, onNavigate, sector, workspaceCopy }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  currency: string;
  finding?: ExecutiveDiagnosisFinding;
  locale: string;
  onNavigate?: NavigateHandler;
  sector?: ExecutiveDiagnosisSector;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{finding?.severity === 'healthy' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span><div className="min-w-0"><p className="text-xs text-slate-500 dark:text-slate-400">{compactCopy.priority.title}</p><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{sector ? copy.sectors[sector.id] : compactCopy.summary.status}</p></div></header>
      <div className="flex flex-1 flex-col p-4">
        {finding ? <><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-medium text-slate-950 dark:text-white">{getFindingCopy(copy, finding.code).title}</h3><SignalStatus copy={copy} finding={finding} /></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{compactCopy.priority.evidence}</p><p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{formatFindingValue(finding, currency, locale, copy)}</p><p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{compactCopy.priority.action}</p><p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{getFindingCopy(copy, finding.code).action}</p>{onNavigate ? <Button type="button" onClick={() => onNavigate(finding.ownerModule)} className="mt-5 h-10 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">{workspaceCopy.actions.openModule} {workspaceCopy.modules[finding.ownerModule] ?? finding.ownerModule}<ArrowUpRight className="h-4 w-4" /></Button> : null}</> : <p className="text-sm text-slate-600 dark:text-slate-300">{compactCopy.priority.noIssue}</p>}
      </div>
    </div>
  );
}

function SectorDecisionPanel({ compactCopy, copy, currency, locale, onClose, onNavigate, onShowAll, sector, showAll, workspaceCopy }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  currency: string;
  locale: string;
  onClose: () => void;
  onNavigate?: NavigateHandler;
  onShowAll: () => void;
  sector: ExecutiveDiagnosisSector;
  showAll: boolean;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  const signals = sortFindings(sector.findings);
  const visibleSignals = showAll ? signals : signals.slice(0, 3);
  return <div className="flex h-full flex-col"><header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div><p className="text-xs text-slate-500 dark:text-slate-400">{compactCopy.sectors.open}</p><h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.sectors[sector.id]}</h3></div><button type="button" aria-label={compactCopy.sectors.close} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></header><div className="divide-y divide-slate-100 px-4 dark:divide-slate-800">{visibleSignals.map((finding) => <div key={finding.code} className="py-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-slate-950 dark:text-white">{getFindingCopy(copy, finding.code).title}</p><SignalStatus copy={copy} finding={finding} /></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatFindingValue(finding, currency, locale, copy)}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{getFindingCopy(copy, finding.code).action}</p>{onNavigate ? <button type="button" onClick={() => onNavigate(finding.ownerModule)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300">{workspaceCopy.actions.openModule}<ArrowRight className="h-3.5 w-3.5" /></button> : null}</div>)}</div>{signals.length > 3 ? <div className="mt-auto border-t border-slate-100 p-2 dark:border-slate-800"><Button type="button" variant="ghost" onClick={onShowAll} className="h-9 w-full rounded-lg text-blue-700 dark:text-blue-300">{showAll ? compactCopy.sectors.showLess : `${compactCopy.sectors.showAll} (${signals.length})`}</Button></div> : null}</div>;
}

function SignalStatus({ copy, finding }: { copy: DiagnosisCopy; finding: ExecutiveDiagnosisFinding }) {
  return finding.available ? <StatusBadge copy={copy} status={finding.severity} /> : <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copy.unavailable}</span>;
}

function sortFindings(findings: ExecutiveDiagnosisFinding[]) {
  return [...findings].sort((left, right) => findingPriority(right) - findingPriority(left));
}
