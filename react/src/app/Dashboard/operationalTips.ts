import type { OperationalJourneyStageId } from './operationalJourney';

export type OperationalTipCategory = 'header' | 'stage' | 'module' | 'workflow';

export type OperationalTipIcon =
  | 'analytics'
  | 'attendance'
  | 'bell'
  | 'building'
  | 'checklist'
  | 'commerce'
  | 'finance'
  | 'globe'
  | 'moon'
  | 'profile'
  | 'route'
  | 'star'
  | 'team'
  | 'wallet'
  | 'chart'
  | 'workflow';

interface OperationalTipDefinitionBase {
  id: string;
  category: OperationalTipCategory;
  icon: OperationalTipIcon;
  stageId?: OperationalJourneyStageId;
}

export const operationalTips = [
  {
    id: 'companyStructure',
    category: 'module',
    icon: 'building',
    stageId: 'company_setup',
  },
  {
    id: 'companyMaturity',
    category: 'workflow',
    icon: 'checklist',
    stageId: 'company_setup',
  },
  {
    id: 'companyVisibility',
    category: 'workflow',
    icon: 'analytics',
    stageId: 'company_setup',
  },
  {
    id: 'hrCollaborators',
    category: 'module',
    icon: 'team',
    stageId: 'human_resources',
  },
  {
    id: 'hrAttendance',
    category: 'workflow',
    icon: 'attendance',
    stageId: 'human_resources',
  },
  {
    id: 'hrPayroll',
    category: 'workflow',
    icon: 'finance',
    stageId: 'human_resources',
  },
  {
    id: 'processAgenda',
    category: 'module',
    icon: 'workflow',
    stageId: 'operations',
  },
  {
    id: 'processProjects',
    category: 'workflow',
    icon: 'checklist',
    stageId: 'operations',
  },
  {
    id: 'processRecurring',
    category: 'workflow',
    icon: 'route',
    stageId: 'operations',
  },
  {
    id: 'financeExpenses',
    category: 'module',
    icon: 'finance',
    stageId: 'finance',
  },
  {
    id: 'financePettyCash',
    category: 'workflow',
    icon: 'wallet',
    stageId: 'finance',
  },
  {
    id: 'financeApprovals',
    category: 'workflow',
    icon: 'checklist',
    stageId: 'finance',
  },
  {
    id: 'commercialPointOfSale',
    category: 'module',
    icon: 'commerce',
    stageId: 'commercial',
  },
  {
    id: 'commercialSales',
    category: 'workflow',
    icon: 'team',
    stageId: 'commercial',
  },
  {
    id: 'commercialPipeline',
    category: 'workflow',
    icon: 'workflow',
    stageId: 'commercial',
  },
  {
    id: 'analyticsKpiSelection',
    category: 'module',
    icon: 'analytics',
    stageId: 'analytics',
  },
  {
    id: 'analyticsPerformance',
    category: 'workflow',
    icon: 'chart',
    stageId: 'analytics',
  },
  {
    id: 'analyticsReview',
    category: 'workflow',
    icon: 'checklist',
    stageId: 'analytics',
  },
] as const satisfies ReadonlyArray<OperationalTipDefinitionBase>;

export type OperationalTipDefinition = typeof operationalTips[number];
export type OperationalTipId = OperationalTipDefinition['id'];

function belongsToStage(
  tip: OperationalTipDefinition,
  stageId: OperationalJourneyStageId,
): boolean {
  return 'stageId' in tip && tip.stageId === stageId;
}

export function buildOperationalTipsForStage(
  activeStageId: OperationalJourneyStageId | undefined,
): OperationalTipDefinition[] {
  const stageTips = activeStageId
    ? operationalTips.filter((tip) => belongsToStage(tip, activeStageId))
    : [];

  return stageTips;
}
