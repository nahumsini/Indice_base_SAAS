import type {
  OpportunityFlowColorToken,
  OpportunityFlowStage,
  OpportunityStage,
} from '../../salesCrmContext';

const stageDotClasses: Record<OpportunityFlowColorToken, string> = {
  BLUE: 'bg-[#2F80FF]',
  AQUA: 'bg-[#59C3A5]',
  GREEN: 'bg-emerald-600',
  YELLOW: 'bg-[#F4C84A]',
  CORAL: 'bg-[#FF6B5E]',
  VIOLET: 'bg-violet-500',
  SLATE: 'bg-slate-500',
};

const stageBadgeClasses: Record<OpportunityFlowColorToken, string> = {
  BLUE: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  AQUA: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  GREEN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  YELLOW: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  CORAL: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  VIOLET: 'border-violet-200 bg-violet-50 text-violet-700',
  SLATE: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function getOpportunityStageConfig(
  stages: OpportunityFlowStage[],
  stageKey: OpportunityStage,
) {
  const normalizedKey = stageKey.trim().toLowerCase();
  return stages.find((stage) => stage.key.trim().toLowerCase() === normalizedKey);
}

export function getOpportunityStageLabel(
  stage: OpportunityFlowStage,
  localizedDefaultLabels: Record<string, string>,
) {
  return stage.usesDefaultLabel
    ? localizedDefaultLabels[stage.key] ?? stage.label
    : stage.label;
}

export function getOpportunityStageLabelByKey(
  stages: OpportunityFlowStage[],
  stageKey: OpportunityStage,
  localizedDefaultLabels: Record<string, string>,
) {
  const stage = getOpportunityStageConfig(stages, stageKey);
  return stage ? getOpportunityStageLabel(stage, localizedDefaultLabels) : stageKey.replace(/_/g, ' ');
}

export function getOpportunityStageDotClass(stage?: OpportunityFlowStage) {
  return stageDotClasses[stage?.colorToken ?? 'SLATE'];
}

export function getOpportunityStageBadgeClass(stage?: OpportunityFlowStage) {
  return stageBadgeClasses[stage?.colorToken ?? 'SLATE'];
}

export function getOpportunityStageKeys(stages: OpportunityFlowStage[]) {
  return stages.map((stage) => stage.key);
}
