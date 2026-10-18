export type FunnelStatus = 'DRAFT' | 'PLANNED' | 'ARCHIVED';
export type FunnelChannel = 'EMAIL' | 'WHATSAPP' | 'SOCIAL' | 'PHONE' | 'IN_PERSON' | 'MIXED' | 'OTHER';
export type FunnelStage = { name: string; action: string; measure: string; target: number | null };
export type FunnelInput = {
  name: string; objective: string; audience: string; channel: FunnelChannel;
  notes: string; stages: FunnelStage[]; status: FunnelStatus; version: number;
};
export type FunnelPlan = FunnelInput & {
  id: string; updatedAt: string; estimatedConversion: number | null;
  stageEstimates: { estimatedAdvance: number | null }[];
};
export type FunnelPage = { items: FunnelPlan[]; total: number; page: number; pageSize: number };
export type FunnelViewMode = 'list' | 'funnel';

export function normalizeFunnelView(value: unknown): FunnelViewMode { return value === 'funnel' ? 'funnel' : 'list'; }

// Selection is transient and must always belong to the current filtered page.
export function selectVisibleFunnel(plans: FunnelPlan[], id: string | null): FunnelPlan | null {
  return plans.find(plan => plan.id === id) ?? plans[0] ?? null;
}

export function validateFunnel(plan: FunnelInput): 'required' | 'targets' | 'incomplete' | null {
  if (!plan.name.trim() || plan.stages.length < 2 || plan.stages.length > 12 || plan.stages.some(s => !s.name.trim())) return 'required';
  let previous: number | null = null;
  for (const stage of plan.stages) {
    if (stage.target === null) continue;
    if (!Number.isInteger(stage.target) || stage.target < 0 || stage.target > 10000000 || (previous !== null && stage.target > previous)) return 'targets';
    previous = stage.target;
  }
  if (plan.status === 'PLANNED' && (!plan.objective.trim() || !plan.audience.trim()
    || plan.stages.some(s => s.target === null || !s.action.trim() || !s.measure.trim()))) return 'incomplete';
  return null;
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
    channel: plan.channel, notes: plan.notes, stages: plan.stages.map(stage => ({ ...stage })), status: 'DRAFT', version: 0 };
}
