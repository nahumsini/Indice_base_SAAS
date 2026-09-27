import { useMemo, useState } from 'react';
import { ArrowRight, GitCompareArrows, Plus, SlidersHorizontal, X } from 'lucide-react';
import { IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { CompactDiagnosisCopy } from './compactDiagnosisTranslations';
import type { DiagnosisCopy } from './diagnosisTranslations';
import { formatFindingValue, getFindingCopy, LoadingPanel, StatusBadge } from './DiagnosisWorkspaceViews';
import type { DiagnosisWorkspaceCopy } from './diagnosisWorkspaceTranslations';
import type { ExecutiveDiagnosisFinding, ExecutiveDiagnosisSectorId, ExecutiveKpiResponse } from './types';

type CrossingMode = 'detected' | 'custom';
type NavigateHandler = (page?: string) => void;

export function CrossKpiWorkspace({ compactCopy, copy, data, loading, locale, onNavigate, workspaceCopy }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  data: ExecutiveKpiResponse | null;
  loading: boolean;
  locale: string;
  onNavigate?: NavigateHandler;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  const [mode, setMode] = useState<CrossingMode>('detected');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const modeItems = useMemo(() => [
    { id: 'detected' as const, label: compactCopy.crossing.detected, icon: <GitCompareArrows /> },
    { id: 'custom' as const, label: compactCopy.crossing.customize, icon: <SlidersHorizontal /> },
  ], [compactCopy.crossing.customize, compactCopy.crossing.detected]);
  if (loading || !data) return <LoadingPanel label={copy.loading} />;

  const entries = data.diagnosis.sectors.flatMap((sector) => sector.findings.map((finding) => ({ finding, sectorId: sector.id })));
  const findingsByCode = new Map(entries.map(({ finding }) => [finding.code, finding]));
  const selectedEntries = selectedCodes.flatMap((code) => entries.find(({ finding }) => finding.code === code) ?? []);

  const toggleKpi = (code: string) => {
    setSelectedCodes((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code);
      if (current.length >= 4) return current;
      return [...current, code];
    });
  };

  return (
    <section role="tabpanel" data-testid="cross-kpi-workspace" aria-labelledby="cross-kpi-title" className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 id="cross-kpi-title" className="text-lg font-medium text-slate-950 dark:text-white">{copy.crossTitle}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.crossSubtitle}</p></div>
        <IndiceWorkspaceNavigation<CrossingMode> ariaLabel={compactCopy.navigation.crossings} items={modeItems} onValueChange={setMode} tone="blue" value={mode} variant="views" />
      </div>

      {mode === 'detected' ? (
        <DetectedCrossings compactCopy={compactCopy} copy={copy} currency={data.domains.preferredCurrency} findings={data.diagnosis.crossSectorFindings} findingsByCode={findingsByCode} locale={locale} onCustomize={() => setMode('custom')} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(21rem,0.75fr)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h3 className="text-base font-medium text-slate-950 dark:text-white">{compactCopy.crossing.available}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{compactCopy.crossing.instruction}</p></header>
            <div className="grid gap-x-5 gap-y-4 p-4 lg:grid-cols-2">
              {data.diagnosis.sectors.map((sector) => (
                <div key={sector.id} className="min-w-0"><p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.sectors[sector.id]}</p><div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">{sector.findings.map((finding) => <KpiSelectionRow key={finding.code} blocked={!selectedCodes.includes(finding.code) && selectedCodes.length >= 4} compactCopy={compactCopy} copy={copy} currency={data.domains.preferredCurrency} finding={finding} locale={locale} onToggle={() => toggleKpi(finding.code)} selected={selectedCodes.includes(finding.code)} />)}</div></div>
              ))}
            </div>
          </section>

          <aside className="h-fit min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:sticky xl:top-4">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div><h3 className="text-base font-medium text-slate-950 dark:text-white">{compactCopy.crossing.comparison}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedCodes.length} / 4 {compactCopy.crossing.selected}</p></div><Button type="button" variant="ghost" disabled={selectedCodes.length === 0} onClick={() => setSelectedCodes([])} className="h-8 rounded-lg px-2 text-blue-700 dark:text-blue-300">{compactCopy.crossing.clear}</Button></header>
            {selectedEntries.length === 0 ? <p className="m-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{compactCopy.crossing.empty}</p> : <div className="divide-y divide-slate-100 px-4 dark:divide-slate-800">{selectedEntries.map(({ finding, sectorId }) => <SelectedKpi key={finding.code} compactCopy={compactCopy} copy={copy} currency={data.domains.preferredCurrency} finding={finding} locale={locale} onNavigate={onNavigate} onRemove={() => toggleKpi(finding.code)} sectorId={sectorId} workspaceCopy={workspaceCopy} />)}</div>}
            {selectedCodes.length >= 4 ? <p className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">{compactCopy.crossing.maximum}</p> : null}
          </aside>
        </div>
      )}
    </section>
  );
}

function DetectedCrossings({ compactCopy, copy, currency, findings, findingsByCode, locale, onCustomize, onNavigate, workspaceCopy }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  currency: string;
  findings: ExecutiveKpiResponse['diagnosis']['crossSectorFindings'];
  findingsByCode: Map<string, ExecutiveDiagnosisFinding>;
  locale: string;
  onCustomize: () => void;
  onNavigate?: NavigateHandler;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  if (findings.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><p className="text-sm text-slate-600 dark:text-slate-300">{compactCopy.crossing.noDetected}</p><Button type="button" onClick={onCustomize} className="mt-4 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700"><SlidersHorizontal className="h-4 w-4" />{compactCopy.crossing.createComparison}</Button></div>;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h3 className="text-base font-medium text-slate-950 dark:text-white">{compactCopy.crossing.detected}</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/35 dark:text-blue-300">{findings.length}</span></header>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {findings.map((finding) => {
          const itemCopy = copy.cross[finding.code] ?? { title: finding.code, action: copy.overview.review };
          const evidence = finding.evidenceFindingCodes.flatMap((code) => findingsByCode.get(code) ?? []);
          return (
            <article key={finding.code} className="grid min-w-0 gap-3 px-4 py-4 lg:grid-cols-[minmax(13rem,0.9fr)_minmax(0,1.2fr)_minmax(13rem,1fr)_auto] lg:items-center">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-medium text-slate-950 dark:text-white">{itemCopy.title}</h4><StatusBadge copy={copy} status={finding.severity} /></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{finding.sectorIds.map((sector) => copy.sectors[sector]).join(' · ')}</p></div>
              <div className="min-w-0"><p className="text-[11px] text-slate-500 dark:text-slate-400">{compactCopy.crossing.evidence}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{evidence.map((item) => <span key={item.code} className="text-xs text-slate-700 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">{getFindingCopy(copy, item.code).title}:</span> {formatFindingValue(item, currency, locale, copy)}</span>)}</div></div>
              <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">{itemCopy.action}</p>
              <ModuleLink module={finding.ownerModule} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KpiSelectionRow({ blocked, compactCopy, copy, currency, finding, locale, onToggle, selected }: {
  blocked: boolean;
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  currency: string;
  finding: ExecutiveDiagnosisFinding;
  locale: string;
  onToggle: () => void;
  selected: boolean;
}) {
  return <button type="button" aria-pressed={selected} disabled={blocked} onClick={onToggle} className={cn('flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-45', selected ? 'bg-blue-50 dark:bg-blue-950/25' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60')}><span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900')}>{selected ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-950 dark:text-white">{getFindingCopy(copy, finding.code).title}</span><span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{formatFindingValue(finding, currency, locale, copy)}</span></span><SignalStatus copy={copy} finding={finding} /><span className="sr-only">{selected ? compactCopy.crossing.remove : compactCopy.crossing.customize}</span></button>;
}

function SelectedKpi({ compactCopy, copy, currency, finding, locale, onNavigate, onRemove, sectorId, workspaceCopy }: {
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  currency: string;
  finding: ExecutiveDiagnosisFinding;
  locale: string;
  onNavigate?: NavigateHandler;
  onRemove: () => void;
  sectorId: ExecutiveDiagnosisSectorId;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  return <article className="py-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-xs text-slate-500 dark:text-slate-400">{copy.sectors[sectorId]}</p><h4 className="mt-0.5 text-sm font-medium text-slate-950 dark:text-white">{getFindingCopy(copy, finding.code).title}</h4></div><button type="button" aria-label={`${compactCopy.crossing.remove}: ${getFindingCopy(copy, finding.code).title}`} onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X className="h-4 w-4" /></button></div><div className="mt-2 flex items-center justify-between gap-2"><p className="text-sm font-medium text-slate-950 dark:text-white">{formatFindingValue(finding, currency, locale, copy)}</p><SignalStatus copy={copy} finding={finding} /></div><ModuleLink module={finding.ownerModule} onNavigate={onNavigate} workspaceCopy={workspaceCopy} /></article>;
}

function ModuleLink({ module, onNavigate, workspaceCopy }: { module: string; onNavigate?: NavigateHandler; workspaceCopy: DiagnosisWorkspaceCopy }) {
  if (!onNavigate) return null;
  return <Button type="button" variant="ghost" onClick={() => onNavigate(module)} className="h-9 shrink-0 justify-self-start rounded-lg px-2 text-blue-700 dark:text-blue-300 lg:justify-self-end">{workspaceCopy.actions.openModule}<ArrowRight className="h-4 w-4" /></Button>;
}

function SignalStatus({ copy, finding }: { copy: DiagnosisCopy; finding: ExecutiveDiagnosisFinding }) {
  return finding.available ? <StatusBadge copy={copy} status={finding.severity} /> : <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copy.unavailable}</span>;
}
