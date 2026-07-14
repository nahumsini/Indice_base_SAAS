import { apiClient } from '../../../lib/apiClient';

export type ProcessTaskKpiStatus = 'healthy' | 'watch' | 'critical';

export interface ProcessTaskKpiCard {
  id: string;
  title: string;
  value: string;
  target: string;
  description: string;
  status: ProcessTaskKpiStatus;
}

export interface ProcessTaskKpiSummary {
  totalTasks: number;
  actionableTasks: number;
  activeOnTrackTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  pausedTasks: number;
  openTasks: number;
  completedTasks: number;
  closedTasks: number;
  cancelledTasks: number;
  unassignedTasks: number;
  unassignedOpenTasks: number;
  unassignedOverdueTasks: number;
  overdueTasks: number;
  overdue1To3Days: number;
  overdue4To7Days: number;
  overdue8PlusDays: number;
  pendingAuditTasks: number;
  auditedTasks: number;
  averageCompletion: number;
  averageWeighting: number | null;
  evidenceTasks: number;
  processTasks: number;
  projectTasks: number;
  completionRate: number;
  timelinessRate: number;
  auditRate: number;
  qualityScore: number;
  evidenceRate: number;
  productivityScore: number;
  insight: string;
}

export interface ProcessTaskKpiComparison {
  available: boolean;
  from: string | null;
  to: string | null;
  productivityScore: number;
  productivityDelta: number;
  completionRate: number;
  completionDelta: number;
  overdueTasks: number;
  overdueDelta: number;
  totalTasks: number;
  totalDelta: number;
}

export interface CollaboratorPerformanceRow {
  rank: number;
  collaboratorId: number | null;
  collaboratorName: string;
  unitId: number | null;
  unitName: string | null;
  businessId: number | null;
  businessName: string | null;
  totalTasks: number;
  actionableTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  pausedTasks: number;
  openTasks: number;
  completedTasks: number;
  closedTasks: number;
  overdueTasks: number;
  pendingAuditTasks: number;
  auditedTasks: number;
  averageCompletion: number;
  averageWeighting: number | null;
  evidenceTasks: number;
  completionRate: number;
  timelinessRate: number;
  auditRate: number;
  qualityScore: number;
  evidenceRate: number;
  productivityScore: number;
  status: ProcessTaskKpiStatus;
}

export interface ProcessPerformanceRow {
  processId: number;
  processFolio: string | null;
  processTitle: string;
  isActive: boolean;
  nextOccurrenceDate: string | null;
  generatedUntilDate: string | null;
  evidenceRequired: boolean;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  pausedTasks: number;
  openTasks: number;
  completedTasks: number;
  closedTasks: number;
  overdueTasks: number;
  pendingAuditTasks: number;
  auditedTasks: number;
  averageCompletion: number;
  averageWeighting: number | null;
  productivityScore: number;
  completionRate: number;
  auditRate: number;
  status: ProcessTaskKpiStatus;
}

export interface ProjectPerformanceRow {
  projectId: number;
  projectFolio: string | null;
  projectName: string;
  projectStatus: string | null;
  dueDate: string | null;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  pausedTasks: number;
  openTasks: number;
  completedTasks: number;
  closedTasks: number;
  overdueTasks: number;
  pendingAuditTasks: number;
  auditedTasks: number;
  averageCompletion: number;
  averageWeighting: number | null;
  productivityScore: number;
  healthScore: number;
  completionRate: number;
  auditRate: number;
  status: ProcessTaskKpiStatus;
}

export interface UnitPerformanceRow {
  unitId: number | null;
  unitName: string;
  totalTasks: number;
  openTasks: number;
  closedTasks: number;
  overdueTasks: number;
  pendingAuditTasks: number;
  completionRate: number;
  timelinessRate: number;
  auditRate: number;
  evidenceRate: number;
  productivityScore: number;
  status: ProcessTaskKpiStatus;
}

export interface ProcessTaskKpiTrendPoint {
  date: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  auditedTasks: number;
}

export interface ProcessTaskKpiDashboard {
  range: {
    from: string;
    to: string;
    includeOverdueBacklog: boolean;
    overdueOnly: boolean;
  };
  summary: ProcessTaskKpiSummary;
  comparison: ProcessTaskKpiComparison;
  cards: ProcessTaskKpiCard[];
  collaborators: CollaboratorPerformanceRow[];
  processes: ProcessPerformanceRow[];
  projects: ProjectPerformanceRow[];
  units: UnitPerformanceRow[];
  trend: ProcessTaskKpiTrendPoint[];
  generatedAt: string;
}

export interface ProcessTaskKpiParams {
  from: string;
  to: string;
  includeOverdueBacklog?: boolean;
  overdueOnly?: boolean;
  unitId?: number | null;
  businessId?: number | null;
  collaboratorId?: number | null;
  projectId?: number | null;
  focus?: string;
  status?: string;
  search?: string;
}

type BackendRecord = Record<string, unknown>;

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNumberOrNull(value: unknown) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asStatus(value: unknown): ProcessTaskKpiStatus {
  return value === 'healthy' || value === 'watch' || value === 'critical' ? value : 'critical';
}

function normalizeSummary(record: BackendRecord): ProcessTaskKpiSummary {
  return {
    totalTasks: asNumber(record.totalTasks),
    actionableTasks: asNumber(record.actionableTasks),
    activeOnTrackTasks: asNumber(record.activeOnTrackTasks),
    pendingTasks: asNumber(record.pendingTasks),
    inProgressTasks: asNumber(record.inProgressTasks),
    pausedTasks: asNumber(record.pausedTasks),
    openTasks: asNumber(record.openTasks),
    completedTasks: asNumber(record.completedTasks),
    closedTasks: asNumber(record.closedTasks),
    cancelledTasks: asNumber(record.cancelledTasks),
    unassignedTasks: asNumber(record.unassignedTasks),
    unassignedOpenTasks: asNumber(record.unassignedOpenTasks),
    unassignedOverdueTasks: asNumber(record.unassignedOverdueTasks),
    overdueTasks: asNumber(record.overdueTasks),
    overdue1To3Days: asNumber(record.overdue1To3Days),
    overdue4To7Days: asNumber(record.overdue4To7Days),
    overdue8PlusDays: asNumber(record.overdue8PlusDays),
    pendingAuditTasks: asNumber(record.pendingAuditTasks),
    auditedTasks: asNumber(record.auditedTasks),
    averageCompletion: asNumber(record.averageCompletion),
    averageWeighting: asNumberOrNull(record.averageWeighting),
    evidenceTasks: asNumber(record.evidenceTasks),
    processTasks: asNumber(record.processTasks),
    projectTasks: asNumber(record.projectTasks),
    completionRate: asNumber(record.completionRate),
    timelinessRate: asNumber(record.timelinessRate),
    auditRate: asNumber(record.auditRate),
    qualityScore: asNumber(record.qualityScore),
    evidenceRate: asNumber(record.evidenceRate),
    productivityScore: asNumber(record.productivityScore),
    insight:
      typeof record.insight === 'string'
        ? record.insight
        : 'No hay lectura operativa disponible para el filtro actual.',
  };
}

function normalizeComparison(record: BackendRecord): ProcessTaskKpiComparison {
  return {
    available: Boolean(record.available),
    from: asStringOrNull(record.from),
    to: asStringOrNull(record.to),
    productivityScore: asNumber(record.productivityScore),
    productivityDelta: asNumber(record.productivityDelta),
    completionRate: asNumber(record.completionRate),
    completionDelta: asNumber(record.completionDelta),
    overdueTasks: asNumber(record.overdueTasks),
    overdueDelta: asNumber(record.overdueDelta),
    totalTasks: asNumber(record.totalTasks),
    totalDelta: asNumber(record.totalDelta),
  };
}

function normalizeCard(record: BackendRecord): ProcessTaskKpiCard {
  return {
    id: String(record.id ?? ''),
    title: String(record.title ?? ''),
    value: String(record.value ?? ''),
    target: String(record.target ?? ''),
    description: String(record.description ?? ''),
    status: asStatus(record.status),
  };
}

function normalizeCollaborator(record: BackendRecord): CollaboratorPerformanceRow {
  return {
    rank: asNumber(record.rank),
    collaboratorId: asNumberOrNull(record.collaboratorId),
    collaboratorName: String(record.collaboratorName ?? 'Sin responsable'),
    unitId: asNumberOrNull(record.unitId),
    unitName: asStringOrNull(record.unitName),
    businessId: asNumberOrNull(record.businessId),
    businessName: asStringOrNull(record.businessName),
    totalTasks: asNumber(record.totalTasks),
    actionableTasks: asNumber(record.actionableTasks),
    pendingTasks: asNumber(record.pendingTasks),
    inProgressTasks: asNumber(record.inProgressTasks),
    pausedTasks: asNumber(record.pausedTasks),
    openTasks: asNumber(record.openTasks),
    completedTasks: asNumber(record.completedTasks),
    closedTasks: asNumber(record.closedTasks),
    overdueTasks: asNumber(record.overdueTasks),
    pendingAuditTasks: asNumber(record.pendingAuditTasks),
    auditedTasks: asNumber(record.auditedTasks),
    averageCompletion: asNumber(record.averageCompletion),
    averageWeighting: asNumberOrNull(record.averageWeighting),
    evidenceTasks: asNumber(record.evidenceTasks),
    completionRate: asNumber(record.completionRate),
    timelinessRate: asNumber(record.timelinessRate),
    auditRate: asNumber(record.auditRate),
    qualityScore: asNumber(record.qualityScore),
    evidenceRate: asNumber(record.evidenceRate),
    productivityScore: asNumber(record.productivityScore),
    status: asStatus(record.status),
  };
}

function normalizeProcess(record: BackendRecord): ProcessPerformanceRow {
  return {
    processId: asNumber(record.processId),
    processFolio: asStringOrNull(record.processFolio),
    processTitle: String(record.processTitle ?? 'Proceso sin nombre'),
    isActive: Boolean(record.isActive),
    nextOccurrenceDate: asStringOrNull(record.nextOccurrenceDate),
    generatedUntilDate: asStringOrNull(record.generatedUntilDate),
    evidenceRequired: Boolean(record.evidenceRequired),
    totalTasks: asNumber(record.totalTasks),
    pendingTasks: asNumber(record.pendingTasks),
    inProgressTasks: asNumber(record.inProgressTasks),
    pausedTasks: asNumber(record.pausedTasks),
    openTasks: asNumber(record.openTasks),
    completedTasks: asNumber(record.completedTasks),
    closedTasks: asNumber(record.closedTasks),
    overdueTasks: asNumber(record.overdueTasks),
    pendingAuditTasks: asNumber(record.pendingAuditTasks),
    auditedTasks: asNumber(record.auditedTasks),
    averageCompletion: asNumber(record.averageCompletion),
    averageWeighting: asNumberOrNull(record.averageWeighting),
    productivityScore: asNumber(record.productivityScore),
    completionRate: asNumber(record.completionRate),
    auditRate: asNumber(record.auditRate),
    status: asStatus(record.status),
  };
}

function normalizeProject(record: BackendRecord): ProjectPerformanceRow {
  return {
    projectId: asNumber(record.projectId),
    projectFolio: asStringOrNull(record.projectFolio),
    projectName: String(record.projectName ?? 'Proyecto sin nombre'),
    projectStatus: asStringOrNull(record.projectStatus),
    dueDate: asStringOrNull(record.dueDate),
    totalTasks: asNumber(record.totalTasks),
    pendingTasks: asNumber(record.pendingTasks),
    inProgressTasks: asNumber(record.inProgressTasks),
    pausedTasks: asNumber(record.pausedTasks),
    openTasks: asNumber(record.openTasks),
    completedTasks: asNumber(record.completedTasks),
    closedTasks: asNumber(record.closedTasks),
    overdueTasks: asNumber(record.overdueTasks),
    pendingAuditTasks: asNumber(record.pendingAuditTasks),
    auditedTasks: asNumber(record.auditedTasks),
    averageCompletion: asNumber(record.averageCompletion),
    averageWeighting: asNumberOrNull(record.averageWeighting),
    productivityScore: asNumber(record.productivityScore),
    healthScore: asNumber(record.healthScore),
    completionRate: asNumber(record.completionRate),
    auditRate: asNumber(record.auditRate),
    status: asStatus(record.status),
  };
}

function normalizeUnit(record: BackendRecord): UnitPerformanceRow {
  return {
    unitId: asNumberOrNull(record.unitId),
    unitName: String(record.unitName ?? 'Sin unidad'),
    totalTasks: asNumber(record.totalTasks),
    openTasks: asNumber(record.openTasks),
    closedTasks: asNumber(record.closedTasks),
    overdueTasks: asNumber(record.overdueTasks),
    pendingAuditTasks: asNumber(record.pendingAuditTasks),
    completionRate: asNumber(record.completionRate),
    timelinessRate: asNumber(record.timelinessRate),
    auditRate: asNumber(record.auditRate),
    evidenceRate: asNumber(record.evidenceRate),
    productivityScore: asNumber(record.productivityScore),
    status: asStatus(record.status),
  };
}

function normalizeTrendPoint(record: BackendRecord): ProcessTaskKpiTrendPoint {
  return {
    date: String(record.date ?? ''),
    totalTasks: asNumber(record.totalTasks),
    completedTasks: asNumber(record.completedTasks),
    overdueTasks: asNumber(record.overdueTasks),
    auditedTasks: asNumber(record.auditedTasks),
  };
}

export async function listProcessTaskKpis(params: ProcessTaskKpiParams) {
  const query = new URLSearchParams();
  query.set('from', params.from);
  query.set('to', params.to);

  if (params.includeOverdueBacklog) {
    query.set('includeOverdueBacklog', 'true');
  }
  if (params.overdueOnly) {
    query.set('overdueOnly', 'true');
  }
  if (params.unitId) {
    query.set('unitId', String(params.unitId));
  }
  if (params.businessId) {
    query.set('businessId', String(params.businessId));
  }
  if (params.collaboratorId) {
    query.set('collaboratorId', String(params.collaboratorId));
  }
  if (params.projectId) {
    query.set('projectId', String(params.projectId));
  }
  if (params.focus) {
    query.set('focus', params.focus);
  }
  if (params.status && params.status !== 'all') {
    query.set('status', params.status);
  }
  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }

  const response = await apiClient<BackendRecord>(`/api/v1/process-task-kpis?${query.toString()}`);
  const range = (response.range ?? {}) as BackendRecord;

  return {
    range: {
      from: String(range.from ?? params.from),
      to: String(range.to ?? params.to),
      includeOverdueBacklog: Boolean(range.includeOverdueBacklog),
      overdueOnly: Boolean(range.overdueOnly),
    },
    summary: normalizeSummary((response.summary ?? {}) as BackendRecord),
    comparison: normalizeComparison((response.comparison ?? {}) as BackendRecord),
    cards: Array.isArray(response.cards) ? response.cards.map((item) => normalizeCard(item as BackendRecord)) : [],
    collaborators: Array.isArray(response.collaborators)
      ? response.collaborators.map((item) => normalizeCollaborator(item as BackendRecord))
      : [],
    processes: Array.isArray(response.processes)
      ? response.processes.map((item) => normalizeProcess(item as BackendRecord))
      : [],
    projects: Array.isArray(response.projects)
      ? response.projects.map((item) => normalizeProject(item as BackendRecord))
      : [],
    units: Array.isArray(response.units)
      ? response.units.map((item) => normalizeUnit(item as BackendRecord))
      : [],
    trend: Array.isArray(response.trend)
      ? response.trend.map((item) => normalizeTrendPoint(item as BackendRecord))
      : [],
    generatedAt: String(response.generatedAt ?? ''),
  } satisfies ProcessTaskKpiDashboard;
}
