import type { BackendBusiness, BackendUnit } from '../../../../api/dashboard';
import type { BackendHrUser } from '../../../../api/humanResources';
import type { TaskFormValues } from '../../Tasks/components/TaskFormDialog';
import type { TaskPayload } from '../../Tasks/tasksApi';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessUnitOption,
} from '../../Processes/types';
import type { ProjectRecord } from '../../Projects/projectsApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { toDateInputValue } from './agendaDateUtils';
import { clampPercent, maximumAuditWeighting, normalizeWeighting } from './agendaTaskStatus';

export function createDefaultTaskForm() {
  const today = toDateInputValue(new Date());

  return {
    title: '',
    description: '',
    processId: '',
    projectId: '',
    assignedUserCompanyId: '',
    assigneeUserCompanyIds: [],
    assignedName: '',
    status: 'pending',
    priority: 'medium',
    startDate: today,
    dueDate: today,
    notes: '',
    completionPercent: '',
    weighting: '',
    audited: false,
    auditNotes: '',
    businessId: '',
    unitId: '',
  } satisfies TaskFormValues;
}

export function toTaskFormValues(task: AgendaTaskItem): TaskFormValues {
  const normalizedWeighting = normalizeWeighting(task.weighting);

  return {
    title: task.title,
    description: task.description ?? '',
    processId: task.processId?.toString() ?? '',
    projectId: task.projectId?.toString() ?? '',
    assignedUserCompanyId: task.assignedUserCompanyId?.toString() ?? '',
    assigneeUserCompanyIds:
      task.assigneeUserCompanyIds.length > 0
        ? task.assigneeUserCompanyIds.map(String)
        : task.assignedUserCompanyId != null
          ? [String(task.assignedUserCompanyId)]
          : [],
    assignedName: task.assignedName ?? '',
    status: task.status,
    priority: task.priority,
    startDate: task.startDate ?? '',
    dueDate: task.dueDate ?? '',
    notes: task.notes ?? '',
    completionPercent: task.completionPercent ? task.completionPercent.toString() : '',
    weighting: normalizedWeighting?.toString() ?? '',
    audited: task.audited,
    auditNotes: task.auditNotes ?? '',
    businessId: task.businessId?.toString() ?? '',
    unitId: task.unitId?.toString() ?? '',
  };
}

function parseOptionalNumber(value: string, fieldLabel: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} must be a valid positive number.`);
  }

  return parsed;
}

function parseOptionalNumberInRange(value: string, fieldLabel: string, min: number, max: number) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${fieldLabel} must be between ${min} and ${max}.`);
  }

  return parsed;
}

export function compactText(value?: string | null) {
  return value?.trim() ?? '';
}

export function normalizeUnitOption(unit: BackendUnit): ProcessUnitOption {
  return {
    id: unit.id,
    name: compactText(unit.name),
  };
}

export function normalizeBusinessOption(business: BackendBusiness): ProcessBusinessOption {
  return {
    id: business.id,
    name: compactText(business.name),
    unitId: business.unitId ?? business.unit_id ?? null,
  };
}

export function normalizeCollaboratorOption(user: BackendHrUser): ProcessCollaboratorOption | null {
  const userCompanyId = user.user_company_id ?? user.legacy_user_company_id ?? null;
  const name = compactText(user.full_name) || compactText(`${user.first_name ?? ''} ${user.last_name ?? ''}`);

  if (!userCompanyId || !name || user.status !== 'active') {
    return null;
  }

  return {
    userCompanyId,
    userId: user.user_id ?? null,
    name,
    email: user.email,
    unitId: user.unit_id ?? null,
    unitName: compactText(user.unit_name),
    businessId: user.business_id ?? null,
    businessName: compactText(user.business_name),
  };
}

export function buildTaskPayload(form: TaskFormValues, copy: AgendaTranslations): TaskPayload {
  const assignedUserCompanyId = parseOptionalNumber(form.assignedUserCompanyId, 'Assigned HR user ID');
  const assigneeUserCompanyIds = Array.from(
    new Set(
      [assignedUserCompanyId, ...form.assigneeUserCompanyIds.map((value) => Number(value))].filter(
        (value): value is number => Number.isInteger(value) && Number(value) > 0,
      ),
    ),
  );

  return {
    title: form.title.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    processId: parseOptionalNumber(form.processId, 'Process'),
    projectId: parseOptionalNumber(form.projectId, 'Project'),
    assignedUserCompanyId,
    assigneeUserCompanyIds,
    assignedName: form.assignedName.trim() ? form.assignedName.trim() : null,
    status: form.status,
    priority: form.priority,
    startDate: form.startDate || null,
    dueDate: form.dueDate || null,
    notes: form.notes.trim() ? form.notes.trim() : null,
    completionPercent: parseOptionalNumberInRange(form.completionPercent, 'Completion %', 0, 100),
    weighting: parseOptionalNumberInRange(form.weighting, copy.report.fields.weighting, 0, maximumAuditWeighting),
    audited: form.audited,
    auditNotes: form.audited && form.auditNotes.trim() ? form.auditNotes.trim() : null,
    businessId: parseOptionalNumber(form.businessId, 'Business ID'),
    unitId: parseOptionalNumber(form.unitId, 'Unit ID'),
  };
}

export function buildAgendaTaskPayload(task: AgendaTaskItem, patch: Partial<TaskPayload> = {}): TaskPayload {
  return {
    title: task.title.trim(),
    description: task.description?.trim() ? task.description.trim() : null,
    processId: task.processId,
    projectId: task.projectId,
    assignedUserCompanyId: task.assignedUserCompanyId,
    assigneeUserCompanyIds:
      task.assigneeUserCompanyIds.length > 0
        ? task.assigneeUserCompanyIds
        : task.assignedUserCompanyId != null
          ? [task.assignedUserCompanyId]
          : [],
    assignedName: task.assignedName?.trim() ? task.assignedName.trim() : null,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate ?? null,
    notes: task.notes?.trim() ? task.notes.trim() : null,
    completionPercent: clampPercent(task.completionPercent),
    weighting: normalizeWeighting(task.weighting),
    audited: task.audited,
    auditNotes: task.audited && task.auditNotes?.trim() ? task.auditNotes.trim() : null,
    businessId: task.businessId,
    unitId: task.unitId,
    ...patch,
  };
}

export function buildAgendaOptimisticPatch(
  payload: TaskPayload,
  unitOptions: ProcessUnitOption[],
  businessOptions: ProcessBusinessOption[],
  projectOptions: ProjectRecord[],
): Partial<AgendaTaskItem> {
  const selectedUnit = payload.unitId != null ? unitOptions.find((unit) => unit.id === payload.unitId) : null;
  const selectedBusiness =
    payload.businessId != null ? businessOptions.find((business) => business.id === payload.businessId) : null;
  const selectedProject =
    payload.projectId != null ? projectOptions.find((project) => project.id === payload.projectId) : null;

  return {
    assignedName: payload.assignedName,
    assignedUserCompanyId: payload.assignedUserCompanyId,
    assigneeUserCompanyIds: payload.assigneeUserCompanyIds,
    auditNotes: payload.auditNotes,
    audited: payload.audited,
    business: selectedBusiness?.name ?? null,
    businessId: payload.businessId,
    businessName: selectedBusiness?.name ?? null,
    completion: clampPercent(payload.completionPercent ?? 0),
    completionPercent: clampPercent(payload.completionPercent ?? 0),
    description: payload.description,
    dueDate: payload.dueDate ?? '',
    notes: payload.notes,
    priority: payload.priority,
    processId: payload.processId,
    project: selectedProject?.name ?? null,
    projectFolio: selectedProject?.folio ?? null,
    projectId: payload.projectId,
    projectName: selectedProject?.name ?? null,
    startDate: payload.startDate,
    status: payload.status,
    title: payload.title,
    unit: selectedUnit?.name ?? null,
    unitId: payload.unitId,
    unitName: selectedUnit?.name ?? null,
    weighting: payload.weighting,
  };
}
