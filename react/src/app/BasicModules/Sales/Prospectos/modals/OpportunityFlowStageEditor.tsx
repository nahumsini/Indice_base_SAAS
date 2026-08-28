import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { OpportunityFlowColorToken, OpportunityFlowStage } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';
import { getOpportunityStageDotClass } from '../utils/prospectosFlow';

const flowColors: OpportunityFlowColorToken[] = ['BLUE', 'AQUA', 'GREEN', 'YELLOW', 'CORAL', 'VIOLET', 'SLATE'];

const reindex = (stages: OpportunityFlowStage[]) => stages.map((stage, position) => ({ ...stage, position }));

function moveStage(stages: OpportunityFlowStage[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= stages.length || toIndex >= stages.length) return stages;
  const nextStages = [...stages];
  const [stage] = nextStages.splice(fromIndex, 1);
  nextStages.splice(toIndex, 0, stage);
  return reindex(nextStages);
}

export function OpportunityFlowStageEditor({
  stages,
  canEdit,
  busy,
  copy,
  onChange,
}: {
  stages: OpportunityFlowStage[];
  canEdit: boolean;
  busy: boolean;
  copy: ProspectosCopy['flow'];
  onChange: (stages: OpportunityFlowStage[]) => void;
}) {
  const openStagesCount = stages.filter((stage) => stage.type === 'OPEN').length;
  const firstTerminalIndex = stages.findIndex((stage) => stage.type !== 'OPEN');

  const updateStage = (key: string, patch: Partial<OpportunityFlowStage>) => {
    onChange(stages.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)));
  };

  const addStage = () => {
    if (!canEdit || stages.length >= 12) return;
    const terminalIndex = stages.findIndex((stage) => stage.type !== 'OPEN');
    const insertAt = terminalIndex < 0 ? stages.length : terminalIndex;
    const next = [...stages];
    next.splice(insertAt, 0, {
      key: `__draft_${Date.now()}_${stages.length}`,
      label: '',
      type: 'OPEN',
      colorToken: 'VIOLET',
      defaultProbabilityPercent: 50,
      position: insertAt,
      required: false,
      opportunityCount: 0,
    });
    onChange(reindex(next));
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-slate-950 dark:text-white">{copy.stageListTitle}</h3>
          <p className="mt-1 text-sm text-slate-500">{copy.maxStages}</p>
        </div>
        <Button type="button" variant="outline" className="h-11 gap-2 rounded-lg" disabled={!canEdit || stages.length >= 12 || busy} onClick={addStage}>
          <Plus className="h-4 w-4" />{copy.addStage}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="hidden grid-cols-[minmax(220px,1fr)_130px_150px_minmax(160px,.7fr)_132px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 lg:grid dark:border-slate-700 dark:bg-slate-800/60">
          <span>{copy.stageName}</span><span>{copy.probability}</span><span>{copy.color}</span><span>{copy.stageUsage}</span><span className="text-right">{copy.stageActions}</span>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {stages.map((stage, index) => {
            const isTerminal = stage.type !== 'OPEN';
            const canMoveUp = canEdit && !isTerminal && index > 0;
            const canMoveDown = canEdit && !isTerminal && firstTerminalIndex > 0 && index < firstTerminalIndex - 1;
            const canRemove = canEdit && !stage.required && stage.opportunityCount === 0 && openStagesCount > 1;
            return (
              <div key={stage.key} className="grid gap-3 px-3 py-3 lg:grid-cols-[minmax(220px,1fr)_130px_150px_minmax(160px,.7fr)_132px] lg:items-center">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 lg:sr-only" htmlFor={`flow-stage-${stage.key}`}>{copy.stageName}</label>
                  <div className="flex items-center gap-2">
                    <span className={cn('h-3 w-3 shrink-0 rounded-full', getOpportunityStageDotClass(stage))} />
                    <Input id={`flow-stage-${stage.key}`} value={stage.label} maxLength={80} disabled={!canEdit || busy} className="h-10 rounded-lg border-slate-200" onChange={(event) => updateStage(stage.key, { label: event.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 lg:sr-only" htmlFor={`flow-probability-${stage.key}`}>{copy.probability}</label>
                  <Input id={`flow-probability-${stage.key}`} type="number" min={0} max={100} value={stage.defaultProbabilityPercent} disabled={!canEdit || busy || isTerminal} className="h-10 rounded-lg border-slate-200" onChange={(event) => updateStage(stage.key, { defaultProbabilityPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-slate-500 lg:sr-only">{copy.color}</span>
                  <Select value={stage.colorToken} disabled={!canEdit || busy} onValueChange={(value) => updateStage(stage.key, { colorToken: value as OpportunityFlowColorToken })}>
                    <SelectTrigger className="h-10 rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>{flowColors.map((color) => <SelectItem key={color} value={color}>{copy.colors[color]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{copy.opportunities(stage.opportunityCount)}</span>
                  {stage.required ? <span className="rounded-full bg-[#FF6B5E]/10 px-2.5 py-1 font-medium text-[#B63B32]">{copy.protectedStage}</span> : null}
                  {!stage.required && stage.opportunityCount > 0 ? <span className="text-amber-700">{copy.inUse}</span> : null}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={copy.moveUp} disabled={!canMoveUp || busy} onClick={() => onChange(moveStage(stages, index, index - 1))}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={copy.moveDown} disabled={!canMoveDown || busy} onClick={() => onChange(moveStage(stages, index, index + 1))}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={copy.remove} disabled={!canRemove || busy} onClick={() => onChange(reindex(stages.filter((item) => item.key !== stage.key)))}><Trash2 className="h-4 w-4 text-[#B63B32]" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
