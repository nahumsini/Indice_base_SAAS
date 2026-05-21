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
  | 'workflow';

interface OperationalTipDefinitionBase {
  id: string;
  category: OperationalTipCategory;
  icon: OperationalTipIcon;
  stageId?: OperationalJourneyStageId;
}

export const operationalTips = [
  {
    id: 'notifications',
    category: 'header',
    icon: 'bell',
  },
  {
    id: 'languageSelector',
    category: 'header',
    icon: 'globe',
  },
  {
    id: 'darkMode',
    category: 'header',
    icon: 'moon',
  },
  {
    id: 'operationalJourney',
    category: 'header',
    icon: 'route',
  },
  {
    id: 'profileSettings',
    category: 'header',
    icon: 'profile',
  },
  {
    id: 'favorites',
    category: 'workflow',
    icon: 'star',
  },
  {
    id: 'companySetup',
    category: 'module',
    icon: 'building',
    stageId: 'company_setup',
  },
  {
    id: 'businessMaturity',
    category: 'workflow',
    icon: 'checklist',
    stageId: 'company_setup',
  },
  {
    id: 'humanResources',
    category: 'module',
    icon: 'team',
    stageId: 'human_resources',
  },
  {
    id: 'attendanceControl',
    category: 'workflow',
    icon: 'attendance',
    stageId: 'human_resources',
  },
  {
    id: 'operationalProcesses',
    category: 'module',
    icon: 'workflow',
    stageId: 'operations',
  },
  {
    id: 'financeControl',
    category: 'module',
    icon: 'finance',
    stageId: 'finance',
  },
  {
    id: 'commercialOperation',
    category: 'module',
    icon: 'commerce',
    stageId: 'commercial',
  },
  {
    id: 'analyticsKpis',
    category: 'module',
    icon: 'analytics',
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

function hasNoStage(tip: OperationalTipDefinition): boolean {
  return !('stageId' in tip);
}

export function buildOperationalTipsForStage(
  activeStageId: OperationalJourneyStageId | undefined,
): OperationalTipDefinition[] {
  const stageTips = activeStageId
    ? operationalTips.filter((tip) => belongsToStage(tip, activeStageId))
    : [];
  const globalWorkflowTips = operationalTips.filter((tip) => tip.category === 'workflow' && hasNoStage(tip));
  const headerTips = operationalTips.filter((tip) => tip.category === 'header');

  return [
    ...stageTips,
    ...globalWorkflowTips,
    ...headerTips,
  ];
}
