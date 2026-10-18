import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Search, SlidersHorizontal, X } from 'lucide-react';
import type { OpportunityFlowStage, SalesOpportunity } from '../../salesCrmContext';
import { useLanguage } from '../../../../shared/context';
import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { IndiceHorizontalScrollControls } from '../../../../components/ui/horizontal-scroll-controls';
import { cn } from '../../../../components/ui/utils';
import type { ProspectosCopy } from '../translations';
import { getOpportunityStageLabel } from '../utils/prospectosFlow';
import { ProspectosKanbanColumn } from './ProspectosKanbanColumn';
import type { KanbanCardActions } from './ProspectosKanbanCard';
import { getKanbanCopy } from './kanbanCopy';
import { getKanbanTiming, kanbanWorkspaceDefaults, matchesKanbanAttention, sortKanbanOpportunities, validateKanbanWorkspace, type KanbanAttention, type KanbanSort } from './kanbanModel';
import { useKanbanPosition } from './useKanbanPosition';
import { useKanbanFullscreen } from './useKanbanFullscreen';
import { SellerWorkspace } from '../seller/SellerWorkspace';
import { getSellerCopy } from '../seller/sellerCopy';
import { IndiceWorkspaceNavigation } from '../../../../components/frontend-os/IndiceWorkspaceNavigation';

export function ProspectosKanban({
  copy, opportunities, scopeOpportunities, stages, flowId, flowName, businessTimezone, expanded, onExpandedChange, searchQuery, onSearchChange, stageFilter, currentOwnerId = null, sellerName = '', onRefresh = async () => {}, ...actions
}: KanbanCardActions & {
  copy: ProspectosCopy; opportunities: SalesOpportunity[]; scopeOpportunities: SalesOpportunity[]; stages: OpportunityFlowStage[];
  flowId: number; flowName: string; businessTimezone: string; expanded: boolean; onExpandedChange: (expanded: boolean) => void;
  currentOwnerId?: number | null; sellerName?: string; onRefresh?: () => Promise<unknown>;
  searchQuery: string; onSearchChange: (query: string) => void; stageFilter: string;
}) {
  const { currentLanguage } = useLanguage();
  const labels = getKanbanCopy(currentLanguage.code);
  const sellerCopy = getSellerCopy(currentLanguage.code);
  const [sellerStarted, setSellerStarted] = useState(false);
  const [sellerView, setSellerView] = useState<'daily' | 'board'>('daily');
  useEffect(() => { if (expanded) setSellerStarted(true); }, [expanded]);
  const [state, setState] = useState(kanbanWorkspaceDefaults);
  const [now, setNow] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fullscreen = useKanbanFullscreen(onExpandedChange);
  const ready = useWorkspaceNavigationMemory({
    moduleKey: 'sales', tabKey: 'prospects-kanban-' + flowId, state, defaults: kanbanWorkspaceDefaults, rememberScroll: false,
    onRestore: value => setState(validateKanbanWorkspace(value, stages)),
  });
  const position = useKanbanPosition(flowId, ready);
  const validated = validateKanbanWorkspace(state, stages);
  const mobileStage = stages.some(stage => stage.key === stageFilter) ? stageFilter : validated.mobileStage;
  const timings = useMemo(() => new Map(opportunities.map(opportunity => [opportunity.id, getKanbanTiming(opportunity, stages.find(stage => stage.key === opportunity.stage), now, businessTimezone)])), [opportunities, stages, now, businessTimezone]);
  const sorted = useMemo(() => sortKanbanOpportunities(opportunities, validated.sort, timings), [opportunities, validated.sort, timings]);
  const visible = sorted.filter(opportunity => matchesKanbanAttention(timings.get(opportunity.id)!, validated.attention)
    && (!validated.attentionStage || opportunity.stage === validated.attentionStage));
  const counts = {
    all: opportunities.length,
    overdue: opportunities.filter(opportunity => timings.get(opportunity.id)!.state === 'overdue').length,
    unscheduled: opportunities.filter(opportunity => timings.get(opportunity.id)!.unscheduled).length,
  };
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    const refresh = () => setNow(new Date());
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);
  const setAttention = (attention: KanbanAttention, stage = '') => {
    setState(current => ({ ...current, attention, attentionStage: stage, mobileStage: stage || current.mobileStage }));
    // A new result starts at its beginning; returning to the module restores that position.
    scrollRef.current?.querySelectorAll<HTMLElement>('[role="region"]').forEach(element => { element.scrollTop = 0; });
  };
  const attentionStageLabel = stages.find(stage => stage.key === validated.attentionStage);
  if (!ready) return <p role="status" className="py-8 text-sm text-slate-500">{labels.loading}</p>;

  return (
    <section ref={fullscreen.rootRef} aria-label={labels.title} className={cn('min-w-0 overflow-hidden bg-white dark:bg-slate-800', expanded
      ? 'flex h-dvh w-screen flex-col' : 'rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700')}>
      {expanded ? <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><div className="mr-auto"><h2 className="text-xl font-medium">{sellerCopy.title}</h2><p className="text-xs text-slate-500">{copy.flow.selectFlow}: {flowName}</p></div><IndiceWorkspaceNavigation<'daily' | 'board'> ariaLabel={sellerCopy.title} tone="coral" variant="views" value={sellerView} onValueChange={setSellerView} items={[{id:'daily',label:sellerCopy.daily},{id:'board',label:sellerCopy.board}]} /><Button variant="outline" onClick={() => void fullscreen.exit()} disabled={fullscreen.pending}><Minimize2 />{sellerCopy.exit}</Button></header> : null}
      {sellerStarted ? <div className={cn('min-h-0 flex-1', !(expanded && sellerView === 'daily') && 'hidden')}><SellerWorkspace flowId={flowId} flowName={flowName} opportunities={scopeOpportunities} stages={stages} timezone={businessTimezone} locale={currentLanguage.code} ownerId={currentOwnerId} sellerName={sellerName} copy={copy} active={expanded && sellerView === 'daily'} onRefresh={onRefresh} {...actions} /></div> : null}
      <div className={cn(expanded && 'flex min-h-0 flex-1 flex-col', expanded && sellerView === 'daily' && 'hidden')}>
      <div className={cn('shrink-0 space-y-3 border-b border-slate-200 p-3 sm:p-4 dark:border-slate-700', expanded && 'max-h-[50dvh] overflow-y-auto')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><h2 className="text-base font-medium text-slate-900 dark:text-slate-100">{labels.title}</h2>{expanded ? <p className="mt-1 break-words text-sm font-medium text-[#b63b32] dark:text-[#ff9c93]">{copy.flow.selectFlow}: {flowName}</p> : null}<p role="status" className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">{labels.count(visible.length, scopeOpportunities.length)}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={validated.sort} onValueChange={value => setState(current => ({ ...current, sort: value as KanbanSort }))}>
              <SelectTrigger aria-label={labels.sort} className="h-9 w-[210px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{(['next_action', 'newest', 'oldest', 'amount'] as const).map(value => <SelectItem key={value} value={value}>{labels[value]}</SelectItem>)}</SelectContent>
            </Select>
            {!expanded ? <Button type="button" variant="outline" onClick={() => void fullscreen.toggle()} disabled={fullscreen.pending} aria-pressed={expanded} className="h-9 rounded-lg">
              {expanded ? <Minimize2 /> : <Maximize2 />}{expanded ? labels.restore : labels.expand}
            </Button> : null}
          </div>
        </div>
        {fullscreen.failed ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{labels.fullscreenError}</p> : null}
        {expanded ? <div className="flex gap-2">
          <div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label={labels.search} placeholder={labels.search} value={searchQuery} onChange={event => onSearchChange(event.target.value)} className="pl-9" /></div>
          <Button type="button" variant="outline" onClick={() => void fullscreen.exit()} disabled={fullscreen.pending} aria-label={labels.filters}><SlidersHorizontal /><span className="hidden sm:inline">{labels.filters}</span></Button>
        </div> : null}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'overdue', 'unscheduled'] as const).map(attention => <button key={attention} type="button" aria-pressed={validated.attention === attention && !validated.attentionStage} onClick={() => setAttention(attention)}
            className={cn('inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]', validated.attention === attention && !validated.attentionStage
              ? 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#ff9c93]' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700')}>
            {labels[attention]}<span className="tabular-nums">{counts[attention]}</span>
          </button>)}
          {attentionStageLabel ? <Button variant="ghost" size="sm" onClick={() => setAttention('all')} aria-label={labels.clear}>{labels[validated.attention]} · {getOpportunityStageLabel(attentionStageLabel, copy.options.stages)}<X /></Button> : null}
          <span className="ml-auto hidden text-xs text-slate-400 lg:inline">{labels.drag}</span>
        </div>
        <div className="md:hidden">
          <Select value={mobileStage} onValueChange={value => setState(current => ({ ...current, mobileStage: value }))}>
            <SelectTrigger aria-label={labels.stage}><SelectValue /></SelectTrigger>
            <SelectContent>{stages.filter(stage => stageFilter === 'all' || stage.key === stageFilter).map(stage => <SelectItem key={stage.key} value={stage.key}>{getOpportunityStageLabel(stage, copy.options.stages)} · {visible.filter(opportunity => opportunity.stage === stage.key).length}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className={cn('relative', expanded && 'min-h-0 flex-1')}>
        <div ref={element => { scrollRef.current = element; position.register('horizontal', element); }} onScroll={event => position.remember('horizontal', event.currentTarget)} className={cn('overflow-x-auto overscroll-x-contain bg-slate-50/40 p-2.5 sm:p-3 dark:bg-slate-900/20', expanded && 'h-full')}>
          <div className={cn('grid grid-cols-1 gap-3 md:grid-flow-col md:auto-cols-[304px] md:grid-cols-none', expanded && 'h-full min-h-0')}>
            {stages.map(stage => <ProspectosKanbanColumn key={stage.key} copy={copy} labels={labels} locale={currentLanguage.code} stage={stage} stages={stages}
              opportunities={visible.filter(opportunity => opportunity.stage === stage.key)} allOpportunities={opportunities}
              totalCount={scopeOpportunities.filter(opportunity => opportunity.stage === stage.key).length}
              overdueCount={opportunities.filter(opportunity => opportunity.stage === stage.key && timings.get(opportunity.id)!.state === 'overdue').length}
              timings={timings} mobileActive={stage.key === mobileStage} fullHeight={expanded} onOverdue={() => setAttention('overdue', stage.key)}
              register={position.register} remember={position.remember} {...actions} />)}
          </div>
        </div>
        <IndiceHorizontalScrollControls scrollRef={scrollRef} verticalPositionClassName="top-24" />
      </div>
      </div>
    </section>
  );
}
