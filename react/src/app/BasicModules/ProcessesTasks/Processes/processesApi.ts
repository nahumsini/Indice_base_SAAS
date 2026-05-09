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
    const recurrence = normalizeRecurrenceConfig(
        frequency,
        record.recurrence ?? createDefaultRecurrenceConfig(),
    );

    return {
        id: record.id,
        folio: record.folio,
        unit: record.unit ?? '',
        business: record.business ?? '',
        title: record.title ?? '',
        description: record.description ?? '',
        createdAt: record.createdAt ?? new Date().toISOString().slice(0, 10),
        frequency,
        creator: record.creator ?? '',
        responsible: record.responsible ?? '',
        priority,
        recurrence,
        isActive: record.isActive ?? true,
    };
}

function buildProcessPayload(form: ProcessFormState, isActive = true) {
    return {
        unit: form.unit,
        business: form.business,
        title: form.title,
        description: form.description,
        frequency: form.frequency,
        responsible: form.responsible,
        priority: form.priority,
        recurrence: form.recurrence,
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
