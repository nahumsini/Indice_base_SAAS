import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  Compass,
  FileQuestion,
  Flag,
  Lightbulb,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { DiagnosisCopy } from './diagnosisTranslations';
import type { DiagnosisViewId, DiagnosisWorkspaceCopy } from './diagnosisWorkspaceTranslations';
import type {
  ExecutiveDiagnosisFinding,
  ExecutiveDiagnosisKind,
  ExecutiveDiagnosisSector,
  ExecutiveDiagnosisSectorId,
  ExecutiveKpiResponse,
  ExecutiveKpiStatus,
} from './types';

const statusStyles: Record<ExecutiveKpiStatus, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200',
  watch: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200',
  critical: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-200',
};

const kindStyles: Record<ExecutiveDiagnosisKind, string> = {
  strength: 'border-emerald-300 border-t-emerald-500 bg-emerald-50/80 dark:border-emerald-900 dark:border-t-emerald-500 dark:bg-emerald-950/25',
  opportunity: 'border-blue-300 border-t-blue-500 bg-blue-50/80 dark:border-blue-900 dark:border-t-blue-500 dark:bg-blue-950/25',
  symptom: 'border-amber-300 border-t-amber-500 bg-amber-50/80 dark:border-amber-900 dark:border-t-amber-500 dark:bg-amber-950/25',
  data_gap: 'border-rose-300 border-t-rose-500 bg-rose-50/80 dark:border-rose-900 dark:border-t-rose-500 dark:bg-rose-950/25',
};

const kindLetterStyles: Record<ExecutiveDiagnosisKind, string> = {
  strength: 'border-emerald-300 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950',
  opportunity: 'border-blue-300 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-blue-950',
  symptom: 'border-amber-300 bg-amber-500 text-amber-950 dark:border-amber-500 dark:bg-amber-400',
  data_gap: 'border-rose-300 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500 dark:text-rose-950',
};

const sectorPresentation: Record<ExecutiveDiagnosisSectorId, { icon: LucideIcon; accent: string; iconStyle: string }> = {
  people: { icon: Users, accent: 'border-l-[#59C3A5]', iconStyle: 'border-[#59C3A5]/40 bg-[#59C3A5]/15 text-[#176B5B] dark:text-[#8FE0CA]' },
  processes: { icon: Workflow, accent: 'border-l-[#F4C84A]', iconStyle: 'border-[#F4C84A]/50 bg-[#F4C84A]/15 text-[#8A6500] dark:text-[#F8D96D]' },
  products: { icon: PackageSearch, accent: 'border-l-[#FF6B5E]', iconStyle: 'border-[#FF6B5E]/40 bg-[#FF6B5E]/15 text-[#B63B32] dark:text-[#FF9D94]' },
  finance: { icon: BadgeDollarSign, accent: 'border-l-[#147514]', iconStyle: 'border-[#147514]/40 bg-[#147514]/10 text-[#147514] dark:text-[#78C978]' },
};

const kindIcons: Record<ExecutiveDiagnosisKind, LucideIcon> = {
  strength: ShieldCheck,
  symptom: Stethoscope,
  opportunity: Lightbulb,
  data_gap: FileQuestion,
};

type NavigateHandler = (page?: string) => void;

export function DiagnosisSummaryView({
  copy,
  data,
  embedded = false,
  loading,
  onSectorSelect,
  onViewChange,
  selectedSectorId,
  unified = false,
  workspaceCopy,
}: {
  copy: DiagnosisCopy;
  data: ExecutiveKpiResponse | null;
  embedded?: boolean;
  loading: boolean;
  onSectorSelect: (sectorId: ExecutiveDiagnosisSectorId) => void;
  onViewChange: (view: DiagnosisViewId) => void;
  selectedSectorId?: ExecutiveDiagnosisSectorId;
  unified?: boolean;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  if (loading || !data) return <LoadingPanel label={copy.loading} />;
  const diagnosis = data.diagnosis;
  const prioritySector = diagnosis.sectors.find((sector) => sector.id === diagnosis.prioritySectorId);
  const priorityFinding = prioritySector
    ? [...prioritySector.findings].sort((left, right) => findingPriority(right) - findingPriority(left))[0]
    : undefined;
  const criticalLevers = diagnosis.sectors.flatMap((sector) => sector.findings).filter((finding) => finding.severity === 'critical').length;
  const cards: Array<{
    id: string;
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    action: () => void;
    selected: boolean;
    tone: string;
  }> = [
    {
      id: 'coverage', label: copy.overview.coverage, value: `${diagnosis.coveragePercent}%`,
      detail: copy.overview.methodology, icon: ShieldCheck, action: () => onViewChange('map'), selected: false, tone: 'border-l-slate-500',
    },
    {
      id: 'priority', label: copy.overview.priority, value: copy.sectors[diagnosis.prioritySectorId],
      detail: workspaceCopy.sectorShortcuts[diagnosis.prioritySectorId], icon: AlertTriangle,
      action: () => { onSectorSelect(diagnosis.prioritySectorId); if (!unified) onViewChange('sectors'); }, selected: false, tone: 'border-l-amber-500',
    },
    {
      id: 'readiness', label: workspaceCopy.summary.readiness,
      value: diagnosis.decisionReady ? copy.overview.ready : copy.overview.review,
      detail: diagnosis.dataQuality.note, icon: diagnosis.decisionReady ? CheckCircle2 : AlertTriangle,
      action: () => onViewChange('map'), selected: false, tone: diagnosis.decisionReady ? 'border-l-emerald-500' : 'border-l-amber-500',
    },
    {
      id: 'critical-levers', label: workspaceCopy.maturity.criticalLevers, value: String(criticalLevers),
      detail: workspaceCopy.maturity.leversSubtitle, icon: Target,
      action: () => onViewChange('map'), selected: false, tone: criticalLevers > 0 ? 'border-l-rose-500' : 'border-l-emerald-500',
    },
    ...diagnosis.sectors.map((sector) => {
      const maturity = getMaturityReading(sector.score, workspaceCopy);
      return {
        id: `sector-${sector.id}`,
        label: copy.sectors[sector.id],
        value: sector.score === null ? copy.overview.noScore : `${Math.round(sector.score)} / 100`,
        detail: sector.score === null
          ? workspaceCopy.maturity.noScore
          : `${maturity.label} · ${copy.overview.coverage} ${sector.coveragePercent}%`,
        icon: sectorPresentation[sector.id].icon,
        action: () => { onSectorSelect(sector.id); if (!unified) onViewChange('sectors'); },
        selected: unified && selectedSectorId === sector.id,
        tone: sectorPresentation[sector.id].accent,
      };
    }),
  ];

  return (
    <section role={embedded ? 'region' : 'tabpanel'} data-testid="diagnosis-summary-view" aria-labelledby="diagnosis-summary-title">
      <ViewHeader id="diagnosis-summary-title" title={workspaceCopy.summary.title} subtitle={workspaceCopy.summary.subtitle} />
      <MaturityJourney
        copy={workspaceCopy}
        coveragePercent={diagnosis.coveragePercent}
        score={diagnosis.score}
        suggestedAction={priorityFinding ? getFindingCopy(copy, priorityFinding.code).action : null}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ action, detail, icon: Icon, id, label, selected, tone, value }) => (
          <button
            key={id}
            type="button"
            onClick={action}
            aria-label={`${workspaceCopy.summary.openDetail}: ${label}`}
            className={cn(
              'group min-h-36 rounded-xl border border-l-4 border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700',
              tone,
              selected && 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-100 dark:border-blue-600 dark:bg-blue-950/25 dark:ring-blue-950',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300"><Icon className="h-4 w-4" /></span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-blue-600" />
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export function DiagnosisSectorView({
  copy,
  data,
  embedded = false,
  loading,
  locale,
  onNavigate,
  onSectorSelect,
  selectedSectorId,
  workspaceCopy,
}: {
  copy: DiagnosisCopy;
  data: ExecutiveKpiResponse | null;
  embedded?: boolean;
  loading: boolean;
  locale: string;
  onNavigate?: NavigateHandler;
  onSectorSelect: (sectorId: ExecutiveDiagnosisSectorId) => void;
  selectedSectorId: ExecutiveDiagnosisSectorId;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  if (loading || !data) return <LoadingPanel label={copy.loading} />;
  const selected = data.diagnosis.sectors.find((sector) => sector.id === selectedSectorId)
    ?? data.diagnosis.sectors[0];
  if (!selected) return <EmptyPanel label={copy.noFindings} />;
  const presentation = sectorPresentation[selected.id];
  const SelectedIcon = presentation.icon;
  const findings = [...selected.findings].sort((left, right) => findingPriority(right) - findingPriority(left));

  return (
    <section role={embedded ? 'region' : 'tabpanel'} data-testid="diagnosis-sector-view" aria-labelledby="diagnosis-sector-title">
      <ViewHeader id="diagnosis-sector-title" title={workspaceCopy.sectors.title} subtitle={workspaceCopy.sectors.subtitle} />
      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label={workspaceCopy.sectors.selector} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {data.diagnosis.sectors.map((sector) => {
            const current = sector.id === selected.id;
            const Icon = sectorPresentation[sector.id].icon;
            const maturity = getMaturityReading(sector.score, workspaceCopy);
            return (
              <button
                key={sector.id}
                type="button"
                aria-pressed={current}
                onClick={() => onSectorSelect(sector.id)}
                className={cn(
                  'min-h-20 w-full rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                  current
                    ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm dark:border-blue-600 dark:bg-blue-950/35 dark:text-blue-100'
                    : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-300 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:border-slate-600',
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', sectorPresentation[sector.id].iconStyle)}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{copy.sectors[sector.id]}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{sector.score === null ? copy.overview.noScore : maturity.label}</span>
                  </span>
                  <span className="text-sm font-medium">{sector.score === null ? '—' : Math.round(sector.score)}</span>
                </span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><span className="block h-full rounded-full bg-blue-600 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, sector.score ?? 0))}%` }} /></span>
              </button>
            );
          })}
        </nav>

        <article className={cn('rounded-xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900', presentation.accent)}>
          <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', presentation.iconStyle)}><SelectedIcon className="h-5 w-5" /></span>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{workspaceCopy.sectors.detail}</p>
                <h3 className="mt-0.5 text-lg font-medium text-slate-950 dark:text-white">{copy.sectors[selected.id]}</h3>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:text-right">
              <div><p className="text-xs text-slate-500 dark:text-slate-400">{copy.overview.coverage}</p><p className="mt-0.5 text-sm font-medium text-slate-950 dark:text-white">{selected.coveragePercent}%</p></div>
              <StatusBadge copy={copy} status={selected.status} />
            </div>
          </header>
          <MaturityJourney
            copy={workspaceCopy}
            coveragePercent={selected.coveragePercent}
            score={selected.score}
            suggestedAction={findings[0] ? getFindingCopy(copy, findings[0].code).action : null}
          />
          <div className="mt-5">
            <h4 className="text-base font-medium text-slate-950 dark:text-white">{workspaceCopy.maturity.leversTitle}</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{workspaceCopy.maturity.leversSubtitle}</p>
          </div>
          <div className="mt-3 space-y-3">
            {findings.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noFindings}</p> : findings.map((finding) => (
              <FindingRow key={finding.code} copy={copy} currency={data.domains.preferredCurrency} finding={finding} locale={locale} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function MaturityJourney({ copy, coveragePercent, score, suggestedAction }: {
  copy: DiagnosisWorkspaceCopy;
  coveragePercent: number;
  score: number | null;
  suggestedAction: string | null;
}) {
  const maturity = getMaturityReading(score, copy);
  const nextLabel = maturity.index >= 0 && maturity.index < copy.maturity.stages.length - 1
    ? copy.maturity.stages[maturity.index + 1]
    : null;
  const guidanceTitle = score === null
    ? copy.maturity.nextStep
    : nextLabel ? copy.maturity.nextStep : copy.maturity.complete;
  const progress = Math.max(0, Math.min(100, score ?? 0));
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-blue-900 bg-[#0B1F3A] text-white shadow-md">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs text-blue-200"><Compass className="h-4 w-4" />{copy.maturity.routeTitle}</p>
              <h4 className="mt-1 text-lg font-medium">{score === null ? copy.maturity.noScore : `${copy.maturity.currentLevel}: ${maturity.label}`}</h4>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100/80">{score === null ? copy.maturity.routeSubtitle : maturity.description}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-right">
              <p className="text-2xl font-medium">{score === null ? '—' : Math.round(score)}</p>
              <p className="text-[11px] text-blue-100/75">IME / 100 · {coveragePercent}%</p>
            </div>
          </div>

          <div className="mt-5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score ?? undefined} aria-label={copy.maturity.routeTitle}>
            <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-blue-400 transition-[width] duration-700" style={{ width: `${progress}%` }} /></div>
            <ol className="mt-3 grid grid-cols-5 gap-1.5">
              {copy.maturity.stages.map((stage, index) => {
                const complete = maturity.index >= 0 && index < maturity.index;
                const active = index === maturity.index;
                return (
                  <li key={stage} className="min-w-0 text-center">
                    <span className={cn(
                      'mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium',
                      complete && 'border-emerald-300 bg-emerald-400 text-emerald-950',
                      active && 'border-white bg-white text-[#0B1F3A] shadow-md ring-4 ring-blue-400/25',
                      !complete && !active && 'border-white/20 bg-white/10 text-blue-100/70',
                    )}>{complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</span>
                    <span className={cn('mt-1.5 block truncate text-[11px]', active ? 'text-white' : 'text-blue-100/65')}>{stage}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <aside className="rounded-xl border border-white/15 bg-white/10 p-4">
          <div className="flex items-center gap-2 text-xs text-blue-100/75"><Sparkles className="h-4 w-4 text-amber-300" />{guidanceTitle}</div>
          {nextLabel ? <p className="mt-2 text-sm"><span className="text-blue-100/70">{copy.maturity.nextLevel}:</span> <span className="font-medium">{nextLabel}</span></p> : null}
          <p className="mt-2 text-sm leading-6 text-white">{suggestedAction ?? copy.maturity.routeSubtitle}</p>
          <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-[11px] leading-5 text-blue-100/60"><Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" />{copy.maturity.methodologyNote}</div>
        </aside>
      </div>
    </section>
  );
}

export function DiagnosisMapView({ copy, data, loading, locale, onNavigate, workspaceCopy }: {
  copy: DiagnosisCopy;
  data: ExecutiveKpiResponse | null;
  loading: boolean;
  locale: string;
  onNavigate?: NavigateHandler;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  if (loading || !data) return <LoadingPanel label={copy.loading} />;
  const kinds: ExecutiveDiagnosisKind[] = ['strength', 'opportunity', 'symptom', 'data_gap'];
  const entries = data.diagnosis.sectors.flatMap((sector) => sector.findings.map((finding) => ({ sector, finding })));
  return (
    <section role="tabpanel" data-testid="diagnosis-map-view" aria-labelledby="diagnosis-map-title">
      <ViewHeader id="diagnosis-map-title" title={copy.mapTitle} subtitle={copy.mapSubtitle} />
      <div className="relative grid gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-2 lg:p-4" aria-label={workspaceCopy.swot.acronym}>
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-[10px] font-medium text-white shadow-lg dark:border-slate-900 dark:bg-white dark:text-slate-950 lg:flex">
          {workspaceCopy.swot.acronym}
        </span>
        {kinds.map((kind) => {
          const Icon = kindIcons[kind];
          const matches = entries.filter(({ finding }) => finding.kind === kind);
          return (
            <article key={kind} className={cn('rounded-xl border border-t-4 p-4 shadow-sm sm:p-5', kindStyles[kind])}>
              <header className="flex items-center gap-3">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-2xl font-medium shadow-sm', kindLetterStyles[kind])}>{workspaceCopy.swot.letters[kind]}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 text-base font-medium text-slate-950 dark:text-white"><Icon className="h-4 w-4 shrink-0" />{copy.kinds[kind]}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{workspaceCopy.swot.acronym}</p>
                </div>
                <span className="rounded-full border border-current/15 bg-white/70 px-2.5 py-1 text-xs font-medium dark:bg-slate-900/70">{matches.length}</span>
              </header>
              <div className="mt-4 space-y-3">
                {matches.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noFindings}</p> : matches.map(({ finding, sector }) => (
                  <div key={finding.code} className="rounded-xl border border-white/80 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/80">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-sm font-medium text-slate-950 dark:text-white">{getFindingCopy(copy, finding.code).title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.sectors[sector.id]} · {formatFindingValue(finding, data.domains.preferredCurrency, locale, copy)}</p></div>
                      <StatusBadge copy={copy} status={finding.severity} />
                    </div>
                    <ModuleAction ownerModule={finding.ownerModule} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CrossSectorPatternsView({ copy, data, loading, onNavigate, workspaceCopy }: {
  copy: DiagnosisCopy;
  data: ExecutiveKpiResponse | null;
  loading: boolean;
  onNavigate?: NavigateHandler;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  if (loading || !data) return <LoadingPanel label={copy.loading} />;
  return (
    <section role="tabpanel" data-testid="diagnosis-patterns-view" aria-labelledby="diagnosis-patterns-title">
      <ViewHeader id="diagnosis-patterns-title" title={copy.crossTitle} subtitle={copy.crossSubtitle} />
      {data.diagnosis.crossSectorFindings.length === 0 ? <EmptyPanel label={copy.noFindings} /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.diagnosis.crossSectorFindings.map((finding) => {
            const itemCopy = copy.cross[finding.code] ?? { title: humanize(finding.code), action: copy.overview.review };
            return (
              <article key={finding.code} className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3"><p className="font-medium text-slate-950 dark:text-white">{itemCopy.title}</p><StatusBadge copy={copy} status={finding.severity} /></div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{itemCopy.action}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{finding.sectorIds.map((sector) => copy.sectors[sector]).join(' · ')}</p>
                <ModuleAction ownerModule={finding.ownerModule} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FindingRow({ copy, currency, finding, locale, onNavigate, workspaceCopy }: {
  copy: DiagnosisCopy;
  currency: string;
  finding: ExecutiveDiagnosisFinding;
  locale: string;
  onNavigate?: NavigateHandler;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  const itemCopy = getFindingCopy(copy, finding.code);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/75 p-3 dark:border-slate-700 dark:bg-slate-950/45">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm font-medium text-slate-950 dark:text-white">{itemCopy.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.evidence}: {formatFindingValue(finding, currency, locale, copy)}</p></div>
        <StatusBadge copy={copy} status={finding.severity} />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300"><span className="font-medium">{copy.recommendedAction}:</span> {itemCopy.action}</p>
      <ModuleAction ownerModule={finding.ownerModule} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />
    </div>
  );
}

function ModuleAction({ onNavigate, ownerModule, workspaceCopy }: {
  onNavigate?: NavigateHandler;
  ownerModule: string;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  if (!onNavigate || !ownerModule) return null;
  const label = workspaceCopy.modules[ownerModule] ?? humanize(ownerModule);
  return (
    <Button type="button" variant="ghost" onClick={() => onNavigate(ownerModule)} className="mt-2 h-9 rounded-xl px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40">
      {workspaceCopy.actions.openModule} {label}<ArrowUpRight className="h-4 w-4" />
    </Button>
  );
}

function ViewHeader({ id, subtitle, title }: { id: string; subtitle: string; title: string }) {
  return <div className="mb-3"><h2 id={id} className="text-lg font-medium text-slate-950 dark:text-white">{title}</h2><p className="mt-1 max-w-4xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p></div>;
}

export function StatusBadge({ copy, status }: { copy: DiagnosisCopy; status: ExecutiveKpiStatus }) {
  return <span className={cn('inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-medium', statusStyles[status])}>{copy.statuses[status]}</span>;
}

export function LoadingPanel({ label }: { label: string }) {
  return <section aria-busy="true" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" /></div><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p></section>;
}

function EmptyPanel({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">{label}</div>;
}

export function findingPriority(finding: ExecutiveDiagnosisFinding) {
  if (!finding.available) return 4;
  if (finding.severity === 'critical') return 3;
  if (finding.severity === 'watch') return 2;
  return 1;
}

export function getFindingCopy(copy: DiagnosisCopy, code: string) {
  return copy.findings[code] ?? { title: humanize(code), action: copy.overview.review };
}

export function humanize(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/^./, (character) => character.toUpperCase());
}

export function formatFindingValue(finding: ExecutiveDiagnosisFinding, currency: string, locale: string, copy: DiagnosisCopy) {
  if (!finding.available || finding.value === null) return copy.unavailable;
  const formatter = finding.unit === 'money'
    ? new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 })
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const suffix = finding.unit === 'percent' ? '%' : '';
  const current = `${formatter.format(finding.value)}${suffix}`;
  if (finding.previousValue === null) return finding.partial ? `${current} · ${copy.partial}` : current;
  return `${copy.current}: ${current} · ${copy.previous}: ${formatter.format(finding.previousValue)}${suffix}`;
}

export function findSector(data: ExecutiveKpiResponse, sectorId: ExecutiveDiagnosisSectorId): ExecutiveDiagnosisSector | undefined {
  return data.diagnosis.sectors.find((sector) => sector.id === sectorId);
}

function getMaturityReading(score: number | null, copy: DiagnosisWorkspaceCopy) {
  if (score === null) {
    return { index: -1, label: copy.maturity.noScore, description: copy.maturity.routeSubtitle };
  }
  const normalizedScore = Math.max(0, Math.min(100, score));
  const index = Math.min(copy.maturity.stages.length - 1, Math.floor(normalizedScore / 20));
  return {
    index,
    label: copy.maturity.stages[index] ?? copy.maturity.noScore,
    description: copy.maturity.stageDescriptions[index] ?? copy.maturity.routeSubtitle,
  };
}
