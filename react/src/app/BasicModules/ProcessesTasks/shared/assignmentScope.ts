import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessUnitOption,
} from '../Processes/types';

export type AssignmentScopeLevel = 'corporate' | 'unit' | 'business';

export interface AssignmentScope {
  level: AssignmentScopeLevel;
  unitId: number | null;
  businessId: number | null;
}

export interface TaskTargetScope {
  unitId: number | null;
  businessId: number | null;
}

function normalizeScopeName(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isCorporateName(value?: string | null) {
  const normalized = normalizeScopeName(value);
  return [
    'corporate office',
    'corporate',
    'head office',
    'holding',
    'oficina central',
    'oficina corporativa',
    'corporativo',
    'sede principal',
  ].includes(normalized);
}

function isHeadquarterBusinessName(value?: string | null) {
  const normalized = normalizeScopeName(value);
  return (
    ['headquarter', 'headquarters', 'headquater', 'hq'].includes(normalized) ||
    normalized.endsWith(' headquarter') ||
    normalized.endsWith(' headquarters') ||
    normalized.endsWith(' hq') ||
    normalized.startsWith('sede ') ||
    normalized.includes(' sede') ||
    normalized.startsWith('matriz ') ||
    normalized.includes(' matriz')
  );
}

export function resolveCollaboratorAssignmentScope(
  collaborator?: ProcessCollaboratorOption | null,
): AssignmentScope | null {
  if (!collaborator) {
    return null;
  }

  if (isCorporateName(collaborator.unitName) || isCorporateName(collaborator.businessName)) {
    return { level: 'corporate', unitId: null, businessId: null };
  }

  const unitId = collaborator.unitId ?? null;
  const businessId = collaborator.businessId ?? null;

  if (unitId == null && businessId == null) {
    return { level: 'corporate', unitId: null, businessId: null };
  }

  if (unitId != null && (businessId == null || isHeadquarterBusinessName(collaborator.businessName))) {
    return { level: 'unit', unitId, businessId: null };
  }

  if (businessId != null) {
    return { level: 'business', unitId, businessId };
  }

  return { level: 'corporate', unitId: null, businessId: null };
}

export function resolveTaskTargetScope(
  unitId: number | null | undefined,
  businessId: number | null | undefined,
  businessOptions: ProcessBusinessOption[],
): TaskTargetScope {
  const resolvedBusinessId = businessId ?? null;
  const business = resolvedBusinessId != null
    ? businessOptions.find((option) => option.id === resolvedBusinessId) ?? null
    : null;

  return {
    unitId: unitId ?? business?.unitId ?? null,
    businessId: resolvedBusinessId,
  };
}

export function canManageTaskScope(
  actorScope: AssignmentScope | null,
  unitId: number | null | undefined,
  businessId: number | null | undefined,
  businessOptions: ProcessBusinessOption[],
) {
  if (!actorScope || actorScope.level === 'corporate') {
    return true;
  }

  const targetScope = resolveTaskTargetScope(unitId, businessId, businessOptions);
  if (targetScope.unitId == null && targetScope.businessId == null) {
    return false;
  }

  if (actorScope.level === 'unit') {
    return actorScope.unitId != null && actorScope.unitId === targetScope.unitId;
  }

  return actorScope.businessId != null && actorScope.businessId === targetScope.businessId;
}

export function collaboratorCanReceiveAssignment(
  collaborator: ProcessCollaboratorOption,
  unitId: number | null | undefined,
  businessId: number | null | undefined,
  businessOptions: ProcessBusinessOption[] = [],
) {
  const receiverScope = resolveCollaboratorAssignmentScope(collaborator);
  if (!receiverScope || receiverScope.level === 'corporate') {
    return true;
  }

  const targetScope = resolveTaskTargetScope(unitId, businessId, businessOptions);
  if (targetScope.unitId == null && targetScope.businessId == null) {
    return false;
  }

  if (receiverScope.level === 'unit') {
    return receiverScope.unitId != null && receiverScope.unitId === targetScope.unitId;
  }

  return receiverScope.businessId != null && receiverScope.businessId === targetScope.businessId;
}

export function collaboratorCanOwnScopedRecord(
  collaborator: ProcessCollaboratorOption,
  unitId: number | null | undefined,
  businessId: number | null | undefined,
  headquarterUnitIds: ReadonlySet<number>,
  businessOptions: ProcessBusinessOption[] = [],
) {
  if (collaborator.unitId != null && headquarterUnitIds.has(collaborator.unitId)) {
    return true;
  }

  const ownerScope = resolveCollaboratorAssignmentScope(collaborator);
  if (!ownerScope || ownerScope.level === 'corporate') {
    return true;
  }

  const targetScope = resolveTaskTargetScope(unitId, businessId, businessOptions);
  if (targetScope.unitId == null && targetScope.businessId == null) {
    return true;
  }

  if (ownerScope.level === 'unit') {
    return ownerScope.unitId != null && ownerScope.unitId === targetScope.unitId;
  }

  if (targetScope.businessId != null) {
    return ownerScope.businessId != null && ownerScope.businessId === targetScope.businessId;
  }

  return ownerScope.unitId != null && ownerScope.unitId === targetScope.unitId;
}

export function filterUnitsForActor(
  units: ProcessUnitOption[],
  businessOptions: ProcessBusinessOption[],
  actorScope: AssignmentScope | null,
) {
  if (!actorScope || actorScope.level === 'corporate') {
    return units;
  }

  if (actorScope.level === 'unit') {
    return units.filter((unit) => unit.id === actorScope.unitId);
  }

  const businessUnitId =
    businessOptions.find((business) => business.id === actorScope.businessId)?.unitId ?? actorScope.unitId;
  return units.filter((unit) => unit.id === businessUnitId);
}

export function filterBusinessesForActor(
  businesses: ProcessBusinessOption[],
  actorScope: AssignmentScope | null,
) {
  if (!actorScope || actorScope.level === 'corporate') {
    return businesses;
  }

  if (actorScope.level === 'unit') {
    return businesses.filter((business) => business.unitId === actorScope.unitId);
  }

  return businesses.filter((business) => business.id === actorScope.businessId);
}

export function defaultTaskScopeForActor(
  collaborator?: ProcessCollaboratorOption | null,
): Pick<TaskTargetScope, 'unitId' | 'businessId'> {
  const scope = resolveCollaboratorAssignmentScope(collaborator);
  if (!scope || scope.level === 'corporate') {
    return { unitId: null, businessId: null };
  }

  if (scope.level === 'unit') {
    return { unitId: scope.unitId, businessId: null };
  }

  return { unitId: scope.unitId, businessId: scope.businessId };
}
