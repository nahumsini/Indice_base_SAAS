import { campaignReady, copyCampaignBrief, type CampaignBrief } from './campaignModel';
import type { ContentGuide } from './contentGuideModel';
export type FunnelStatus = 'DRAFT' | 'PLANNED' | 'ARCHIVED';
export type FunnelChannel = 'EMAIL' | 'WHATSAPP' | 'SOCIAL' | 'PHONE' | 'IN_PERSON' | 'MIXED' | 'OTHER';
export type FunnelStage = { name: string; action: string; measure: string; target: number | null; content?: string | null };
export type FunnelInput = {
  name: string; objective: string; audience: string; channel: FunnelChannel;
  workshop?: CampaignBrief | null; contentGuide?: ContentGuide | null; notes: string; stages: FunnelStage[]; status: FunnelStatus; version: number;
};
export type FunnelPlan = FunnelInput & {
  id: string; updatedAt: string; estimatedConversion: number | null;
  stageEstimates: { estimatedAdvance: number | null }[];
};
export type FunnelPage = { items: FunnelPlan[]; total: number; page: number; pageSize: number };
export type FunnelViewMode = 'ideas' | 'list' | 'funnel' | 'content' | 'calendar';

export function normalizeFunnelView(value: unknown): FunnelViewMode { return value === 'calendar' ? 'calendar' : value === 'content' ? 'content' : value === 'ideas' ? 'ideas' : value === 'funnel' ? 'funnel' : 'list'; }

// Selection is transient and must always belong to the current filtered page.
export function selectVisibleFunnel(plans: FunnelPlan[], id: string | null): FunnelPlan | null {
  return plans.find(plan => plan.id === id) ?? plans[0] ?? null;
}

export function validateFunnel(plan: FunnelInput): 'required' | 'targets' | 'incomplete' | 'ideaRequired' | 'briefIncomplete' | null {
  if (!plan.name.trim() || (plan.stages.length < 2 && !(plan.workshop && plan.stages.length === 0)) || plan.stages.length > 12 || plan.stages.some(s => !s.name.trim())) return 'required';
  if (plan.workshop && !plan.workshop.idea.trim()) return 'ideaRequired';
  if (firstInvalidFunnelTarget(plan.stages) !== -1) return 'targets';
  if (plan.status === 'PLANNED' && plan.workshop && !campaignReady(plan)) return 'briefIncomplete';
  if (plan.status === 'PLANNED' && !plan.workshop && (!plan.objective.trim() || !plan.audience.trim()
    || plan.stages.some(s => !s.action.trim() || !s.measure.trim()))) return 'incomplete';
  return null;
}

// Used by validation and the editor so an invalid target opens its actual stage.
export function firstInvalidFunnelTarget(stages: FunnelStage[]): number {
  let previous: number | null = null;
  return stages.findIndex(stage => {
    if (stage.target === null) return false;
    if (!Number.isInteger(stage.target) || stage.target < 0 || stage.target > 10000000 || (previous !== null && stage.target > previous)) return true;
    previous = stage.target;
    return false;
  });
}

// Draft preview only. Persisted/list conversion is calculated by the backend.
export function previewConversion(stages: FunnelStage[]): number | null {
  const first = stages[0]?.target;
  const last = stages[stages.length - 1]?.target;
  if (!first || last == null || stages.some((s, index) => s.target === null || !Number.isInteger(s.target)
    || s.target < 0 || s.target > 10000000 || (index > 0 && s.target > (stages[index - 1].target ?? Infinity)))) return null;
  return Math.floor((last * 10000 + first / 2) / first) / 100;
}

export function moveStage<T>(stages: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (index < 0 || index >= stages.length || next < 0 || next >= stages.length) return stages;
  const result = [...stages];
  [result[index], result[next]] = [result[next], result[index]];
  return result;
}

export function duplicateFunnel(plan: FunnelPlan, name: string): FunnelInput {
  return { name: name.slice(0, 180), objective: plan.objective, audience: plan.audience,
    contentGuide: plan.contentGuide ? { ...plan.contentGuide } : plan.contentGuide, channel: plan.channel, notes: plan.notes, workshop: plan.workshop ? copyCampaignBrief(plan.workshop) : plan.workshop, stages: plan.stages.map(stage => ({ ...stage })), status: 'DRAFT', version: 0 };
}
