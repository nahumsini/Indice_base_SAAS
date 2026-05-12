import { apiClient } from '../../../lib/apiClient';
import { createDefaultRecurrenceConfig, normalizeRecurrenceConfig } from './processesData';
import type { ProcessFormState, ProcessRecord } from './types';

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
    return {
        unitId: form.unitId ?? null,
        unit: form.unit,
        businessId: form.businessId ?? null,
        business: form.business,
        title: form.title,
        description: form.description,
        taskTitleTemplate: form.taskTitleTemplate.trim() ? form.taskTitleTemplate.trim() : form.title,
        taskDescriptionTemplate: form.taskDescriptionTemplate.trim()
            ? form.taskDescriptionTemplate.trim()
            : form.description,
        taskNotesTemplate: form.taskNotesTemplate.trim() ? form.taskNotesTemplate.trim() : null,
        frequency: form.frequency,
        responsibleUserCompanyId: form.responsibleUserCompanyId ?? null,
        responsible: form.responsible,
        priority: form.priority,
        recurrence: form.recurrence,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        graceDays: parseProcessInteger(form.graceDays, 0),
        generationWindowDays: parseProcessInteger(form.generationWindowDays, 45),
        evidenceRequired: form.evidenceRequired,
        isActive,
    };
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
