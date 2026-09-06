import type { AuthSessionResponse } from '../../../api/auth.types';
import type { HumanResourcesGuidanceTabId } from './types';
import type { EmployeeLearningExceptions } from './humanResourcesLearningModel';

const progressVersion = 1 as const;
const progressStoragePrefix = 'indice.learningMode.humanResources';

type LearningProgressSessionScope = Pick<AuthSessionResponse, 'user' | 'company'>;

export interface HumanResourcesLearningProgress {
  activeAreaId: HumanResourcesGuidanceTabId;
  appliedAreaIds: HumanResourcesGuidanceTabId[];
  employeeExceptions: Record<string, EmployeeLearningExceptions>;
  expanded: boolean;
  selectedEmployeeId: number | null;
  understoodAreaIds: HumanResourcesGuidanceTabId[];
  version: typeof progressVersion;
}

export const defaultHumanResourcesLearningProgress: HumanResourcesLearningProgress = {
  activeAreaId: 'collaborators',
  appliedAreaIds: [],
  employeeExceptions: {},
  expanded: false,
  selectedEmployeeId: null,
  understoodAreaIds: [],
  version: progressVersion,
};

const guidanceAreaIds = new Set<HumanResourcesGuidanceTabId>([
  'collaborators',
  'attendance',
  'control',
  'payroll',
  'announcements',
  'assets',
  'records',
  'permissions',
  'incentives',
  'kpis',
]);

const exemptibleRequirementIds = new Set(['schedule', 'location', 'documents', 'access']);

const normalizeAreaIds = (value: unknown) => Array.isArray(value)
  ? value.filter((areaId): areaId is HumanResourcesGuidanceTabId => guidanceAreaIds.has(areaId))
  : [];

const normalizeEmployeeExceptions = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([employeeId, exceptions]) => {
      if (!exceptions || typeof exceptions !== 'object') {
        return [];
      }

      const normalizedExceptions = Object.fromEntries(
        Object.entries(exceptions).filter(([requirementId, exception]) => {
          if (!exemptibleRequirementIds.has(requirementId) || !exception || typeof exception !== 'object') {
            return false;
          }
          const candidate = exception as { reason?: unknown; updatedAt?: unknown };
          return typeof candidate.reason === 'string'
            && candidate.reason.trim().length > 0
            && typeof candidate.updatedAt === 'string';
        }),
      ) as EmployeeLearningExceptions;

      return Object.keys(normalizedExceptions).length > 0
        ? [[employeeId, normalizedExceptions]]
        : [];
    }),
  );
};

export function normalizeHumanResourcesLearningProgress(
  value: unknown,
): HumanResourcesLearningProgress {
  if (!value || typeof value !== 'object') {
    return { ...defaultHumanResourcesLearningProgress };
  }

  const candidate = value as Partial<HumanResourcesLearningProgress>;
  return {
    activeAreaId: candidate.activeAreaId && guidanceAreaIds.has(candidate.activeAreaId)
      ? candidate.activeAreaId
      : defaultHumanResourcesLearningProgress.activeAreaId,
    appliedAreaIds: normalizeAreaIds(candidate.appliedAreaIds),
    employeeExceptions: normalizeEmployeeExceptions(candidate.employeeExceptions),
    expanded: candidate.expanded === true,
    selectedEmployeeId: typeof candidate.selectedEmployeeId === 'number'
      && Number.isFinite(candidate.selectedEmployeeId)
      ? candidate.selectedEmployeeId
      : null,
    understoodAreaIds: normalizeAreaIds(candidate.understoodAreaIds),
    version: progressVersion,
  };
}

export function buildHumanResourcesLearningProgressKey(session: LearningProgressSessionScope) {
  return `${progressStoragePrefix}:company-${session.company.id}:user-${session.user.id}`;
}
