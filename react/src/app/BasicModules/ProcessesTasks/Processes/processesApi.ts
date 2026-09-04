import { apiClient } from '../../../lib/apiClient';
import { createDefaultRecurrenceConfig, normalizeRecurrenceConfig } from './processesData';
import type { ProcessCollaboratorOption, ProcessFormState, ProcessRecord, ProcessTaskTemplate } from './types';

export interface OccasionalProcessOption {
    id: number;
    folio: string;
    title: string;
    distributionMode: 'individual' | 'shared';
    organizationMode: 'parallel' | 'sequential' | 'staged';
    currentVersion: number;
    taskCount: number;
}

export interface ProcessRunPreviewTask {
    templateId: number;
    position: number;
    stage: number;
    title: string;
    priority: string;
    scheduledDate: string;
    dueDate: string;
    evidenceRequired: boolean;
    assignees: string[];
}

export interface ProcessRunPreview {
    processId: number;
    version: number;
    reference: string;
    startDate: string;
    duplicateReference: boolean;
    matchingRuns: number;
    tasks: ProcessRunPreviewTask[];
}

export interface ProcessRunTask extends ProcessRunPreviewTask {
    id: number;
    folio: string;
    status: string;
    attachmentCount: number;
}

export interface ProcessRun {
    id: number;
    processId: number;
    version: number;
    folio: string;
    activationMode: 'recurring' | 'occasional';
    reference: string;
    notes: string | null;
    startDate: string;
    coordinator: string | null;
    status: 'pending' | 'in_progress' | 'finalized' | 'finalized_with_incidents';
    requiresAttention: boolean;
    hasDelays: boolean;
    completedTasks: number;
    cancelledTasks: number;
    totalTasks: number;
    createdAt: string;
    finalizedAt: string | null;
    tasks: ProcessRunTask[];
}

type ProcessesListResponse = {
    items: BackendProcessRecord[];
    count: number;
};

type BackendProcessRecord = Partial<ProcessRecord> & {
    id: number;
    folio: string;
};

function normalizeProcessRecord(record: BackendProcessRecord): ProcessRecord {
    const frequency = record.frequency ?? 'weekly';
    const priority = record.priority ?? 'medium';
    const taskCount = Number(record.taskCount ?? record.tasks ?? 0);
    const openTaskCount = Number(record.openTaskCount ?? record.openTasks ?? 0);
    const completedTaskCount = Number(record.completedTaskCount ?? record.completedTasks ?? 0);
    const overdueTaskCount = Number(record.overdueTaskCount ?? record.overdueTasks ?? 0);
    const auditedTaskCount = Number(record.auditedTaskCount ?? record.auditedTasks ?? 0);
    const completionPercent = Number(record.completionPercent ?? record.progress ?? 0);
    const recurrence = normalizeRecurrenceConfig(
        frequency,
        record.recurrence ?? createDefaultRecurrenceConfig(),
    );
    const graceDays = Number(record.graceDays ?? 0);
    const generationWindowDays = Number(record.generationWindowDays ?? 45);
    const taskTemplates = Array.isArray(record.taskTemplates)
        ? record.taskTemplates.map((template, index): ProcessTaskTemplate => ({
            id: template.id,
            position: Number(template.position ?? index + 1),
            stage: Number(template.stage ?? 1),
            title: template.title ?? '',
            description: template.description ?? '',
            notes: template.notes ?? '',
            priority: template.priority ?? priority,
            unitId: template.unitId ?? null,
            unitName: template.unitName ?? '',
            businessId: template.businessId ?? null,
            businessName: template.businessName ?? '',
            scheduledOffsetDays: Number(template.scheduledOffsetDays ?? 0),
            deadlineOffsetDays: Number(template.deadlineOffsetDays ?? 0),
            evidenceRequired: Boolean(template.evidenceRequired),
            assigneeUserCompanyIds: Array.isArray(template.assigneeUserCompanyIds)
                ? template.assigneeUserCompanyIds.map(Number)
                : [],
            assignees: Array.isArray(template.assignees) ? template.assignees : [],
        }))
        : [];

    return {
        id: record.id,
        companyId: Number(record.companyId ?? 0),
        folio: record.folio,
        unitId: record.unitId ?? null,
        unit: record.unit ?? record.unitName ?? '',
        unitName: record.unitName ?? record.unit ?? '',
        businessId: record.businessId ?? null,
        business: record.business ?? record.businessName ?? '',
        businessName: record.businessName ?? record.business ?? '',
        title: record.title ?? '',
        description: record.description ?? '',
        taskTitleTemplate: record.taskTitleTemplate ?? record.title ?? '',
        taskDescriptionTemplate: record.taskDescriptionTemplate ?? record.description ?? '',
        taskNotesTemplate: record.taskNotesTemplate ?? '',
        createdAt: record.createdAt ?? new Date().toISOString().slice(0, 10),
        frequency,
        creatorUserCompanyId: record.creatorUserCompanyId ?? null,
        creatorUserId: record.creatorUserId ?? null,
        creator: record.creator ?? '',
        responsibleUserCompanyId: record.responsibleUserCompanyId ?? null,
        responsibleUserId: record.responsibleUserId ?? null,
        responsible: record.responsible ?? '',
        priority,
        recurrence,
        startDate: record.startDate ?? null,
        endDate: record.endDate ?? null,
        graceDays,
        generationWindowDays,
        evidenceRequired: Boolean(record.evidenceRequired),
        distributionMode: record.distributionMode ?? (taskTemplates.length > 1 ? 'shared' : 'individual'),
        activationMode: record.activationMode ?? 'recurring',
        organizationMode: record.organizationMode ?? 'parallel',
        includeWeekends: record.includeWeekends ?? true,
        coordinatorUserCompanyId: record.coordinatorUserCompanyId ?? record.creatorUserCompanyId ?? null,
        coordinatorUserId: record.coordinatorUserId ?? record.creatorUserId ?? null,
        coordinator: record.coordinator ?? record.creator ?? '',
        currentVersion: Number(record.currentVersion ?? 1),
        definitionTaskCount: Number(record.definitionTaskCount ?? (taskTemplates.length || 1)),
        taskTemplates: taskTemplates.length > 0 ? taskTemplates : [{
            stage: 1,
            title: record.taskTitleTemplate ?? record.title ?? '',
            description: record.taskDescriptionTemplate ?? record.description ?? '',
            notes: record.taskNotesTemplate ?? '',
            priority,
            unitId: record.unitId ?? null,
            unitName: record.unitName ?? record.unit ?? '',
            businessId: record.businessId ?? null,
            businessName: record.businessName ?? record.business ?? '',
            scheduledOffsetDays: 0,
            deadlineOffsetDays: graceDays,
            evidenceRequired: Boolean(record.evidenceRequired),
            assigneeUserCompanyIds: record.responsibleUserCompanyId ? [record.responsibleUserCompanyId] : [],
        }],
        lastGeneratedForDate: record.lastGeneratedForDate ?? null,
        nextOccurrenceDate: record.nextOccurrenceDate ?? null,
        generatedUntilDate: record.generatedUntilDate ?? null,
        lastMaterializedAt: record.lastMaterializedAt ?? null,
        isActive: record.isActive ?? true,
        taskCount,
        tasks: taskCount,
        openTaskCount,
        openTasks: openTaskCount,
        completedTaskCount,
        completedTasks: completedTaskCount,
        overdueTaskCount,
        overdueTasks: overdueTaskCount,
        auditedTaskCount,
        auditedTasks: auditedTaskCount,
        completionPercent,
        progress: completionPercent,
    };
}

function parseProcessInteger(value: string, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
}

function buildProcessPayload(form: ProcessFormState, isActive = true) {
    const firstTask = form.taskTemplates[0];
    const firstAssigneeId = firstTask?.assigneeUserCompanyIds[0] ?? form.responsibleUserCompanyId ?? null;
    return {
        unitId: form.unitId ?? null,
        unit: form.unit,
        businessId: form.businessId ?? null,
        business: form.business,
        title: form.title,
        description: form.description,
        taskTitleTemplate: firstTask?.title.trim() || form.taskTitleTemplate.trim() || form.title,
        taskDescriptionTemplate: firstTask?.description.trim() || form.taskDescriptionTemplate.trim() || form.description,
        taskNotesTemplate: firstTask?.notes.trim() || form.taskNotesTemplate.trim() || null,
        frequency: form.frequency,
        responsibleUserCompanyId: firstAssigneeId,
        responsible: form.responsible,
        priority: form.priority,
        recurrence: form.recurrence,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        graceDays: parseProcessInteger(form.graceDays, 0),
        generationWindowDays: parseProcessInteger(form.generationWindowDays, 45),
        evidenceRequired: form.evidenceRequired,
        distributionMode: form.distributionMode,
        activationMode: form.activationMode,
        organizationMode: form.organizationMode,
        includeWeekends: form.includeWeekends,
        coordinatorUserCompanyId: form.coordinatorUserCompanyId ?? null,
        taskTemplates: form.taskTemplates,
        isActive,
    };
}

export async function listOccasionalProcesses() {
    return apiClient<{ items: OccasionalProcessOption[]; count: number }>('/api/v1/processes/occasional');
}

export async function listProcessCollaborators() {
    const response = await apiClient<{
        items: Array<Omit<ProcessCollaboratorOption, 'email'>>;
        count: number;
    }>('/api/v1/processes/collaborators');
    return response.items.map((item): ProcessCollaboratorOption => ({ ...item, email: null }));
}

export async function previewOccasionalProcessRun(input: {
    processId: number;
    reference: string;
    startDate: string;
}) {
    return apiClient<ProcessRunPreview>('/api/v1/processes/occasional/preview', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function createOccasionalProcessRun(input: {
    processId: number;
    reference: string;
    startDate: string;
    notes?: string;
    allowDuplicateReference: boolean;
}, idempotencyKey: string) {
    return apiClient<ProcessRun>('/api/v1/processes/occasional/runs', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(input),
    });
}

export async function listProcessRuns(processId: number) {
    return apiClient<{ items: ProcessRun[]; count: number }>(`/api/v1/processes/${processId}/runs`);
}

export async function listProcesses() {
    const response = await apiClient<ProcessesListResponse>('/api/v1/processes');
    return response.items.map(normalizeProcessRecord);
}

export async function createProcess(form: ProcessFormState) {
    const response = await apiClient<BackendProcessRecord>('/api/v1/processes', {
        method: 'POST',
        body: JSON.stringify(buildProcessPayload(form)),
    });

    return normalizeProcessRecord(response);
}

export async function updateProcess(
    processId: number,
    form: ProcessFormState & { isActive?: boolean },
) {
    const response = await apiClient<BackendProcessRecord>(`/api/v1/processes/${processId}`, {
        method: 'PUT',
        body: JSON.stringify(buildProcessPayload(form, form.isActive ?? true)),
    });

    return normalizeProcessRecord(response);
}

export async function deleteProcess(processId: number) {
    return apiClient<{ success: boolean }>(`/api/v1/processes/${processId}`, {
        method: 'DELETE',
    });
}

export async function materializeProcess(processId: number) {
    const response = await apiClient<BackendProcessRecord>(`/api/v1/processes/${processId}/materialize`, {
        method: 'POST',
    });

    return normalizeProcessRecord(response);
}
