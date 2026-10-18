import type { OpportunityFlowStage, SalesOpportunity } from '../../types/opportunities';
import { toBackendOpportunityStageKey } from '../../adapters/salesApiAdapters';
import { getKanbanTiming, sortKanbanOpportunities } from '../kanban/kanbanModel';
import type { CallScript, ScriptContent } from './sellerApi';
export type QueueFilter = 'all' | 'today' | 'overdue' | 'unscheduled';
export function sellerQueue(records: SalesOpportunity[], stages: OpportunityFlowStage[], timezone: string, filter: QueueFilter, mine: boolean, owner: number | null, query: string, now: Date) {
  const timings = new Map(records.map(record => [record.id, getKanbanTiming(record, stages.find(stage => stage.key === record.stage), now, timezone)]));
  return sortKanbanOpportunities(records.filter(record => {
    const timing = timings.get(record.id)!;
    return !['closed','paused'].includes(timing.state) && (!mine || owner !== null && record.ownerUserCompanyId === owner)
      && (filter === 'all' || filter === 'today' && timing.today || filter === 'overdue' && timing.state === 'overdue' || filter === 'unscheduled' && timing.unscheduled)
      && [record.opportunityName,record.contactPerson,record.company,record.phone].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), 'next_action', timings);
}
export function suggestedScript(scripts: CallScript[], stage: string) {
  const active = scripts.filter(script => !script.archived && script.published && script.publishedVersion);
  return active.find(script => script.published!.stageKey === toBackendOpportunityStageKey(stage)) ?? active.find(script => !script.published!.stageKey) ?? null;
}
export function scriptVariables(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (whole, key) => values[key]?.trim() || whole);
}
export function validScript(content: ScriptContent) {
  return content.name.trim().length >= 2 && content.name.length <= 160 && content.goal.length <= 1000
    && content.blocks.length > 0 && content.blocks.length <= 20 && content.blocks.every(block => block.title.trim() && block.title.length <= 100 && block.text.trim() && block.text.length <= 6000)
    && content.blocks.reduce((total, block) => total + block.text.length, 0) <= 40000;
}
