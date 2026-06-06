import type { ProcessBusinessOption } from '../../Processes/types';
import type { ProjectRecord } from '../../Projects/projectsApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type { AgendaParticipantFilterOption, AgendaProjectFilterOption } from '../types';
import { compactText } from './agendaTaskPayloads';

export const UNASSIGNED_RESPONSIBLE_VALUE = '__unassigned__';
export const NO_PROJECT_VALUE = '__no_project__';

export function unitFilterValue(task: AgendaTaskItem, copy: AgendaTranslations) {
  return task.unitName ?? (task.unitId ? `${copy.form.labels.unit} #${task.unitId}` : '');
}

export function businessFilterValue(task: AgendaTaskItem, copy: AgendaTranslations) {
  return task.businessName ?? (task.businessId ? `${copy.form.labels.business} #${task.businessId}` : '');
}

function participantFilterValue(userId: number | null, userCompanyId: number | null, name: string) {
  if (userId != null) {
    return `user:${userId}`;
  }

  if (userCompanyId != null) {
    return `user-company:${userCompanyId}`;
  }

  return `name:${name.toLowerCase()}`;
}

function addParticipantFilterOption(
  optionMap: Map<string, AgendaParticipantFilterOption>,
  candidate: {
    name?: string | null;
    userId?: number | null;
    userCompanyId?: number | null;
  },
) {
  const label = compactText(candidate.name);
  const userId = candidate.userId ?? null;
  const userCompanyId = candidate.userCompanyId ?? null;

  if (!label && userId == null && userCompanyId == null) {
    return;
  }

  const value = participantFilterValue(userId, userCompanyId, label);
  const existingOption = optionMap.get(value);

  optionMap.set(value, {
    value,
    label: existingOption?.label ?? (label || `User #${userId ?? userCompanyId}`),
    userId: existingOption?.userId ?? userId,
    userCompanyId: existingOption?.userCompanyId ?? userCompanyId,
    normalizedName: existingOption?.normalizedName ?? label.toLowerCase(),
  });
}

export function agendaParticipantOptions(tasks: AgendaTaskItem[], unassignedLabel: string) {
  const optionMap = new Map<string, AgendaParticipantFilterOption>();
  let hasUnassignedResponsible = false;

  tasks.forEach((task) => {
    addParticipantFilterOption(optionMap, {
      name: task.createdByName ?? task.creator,
      userId: task.createdBy,
    });
    addParticipantFilterOption(optionMap, {
      name: task.assignedName ?? task.responsible,
      userId: task.assignedUserId,
      userCompanyId: task.assignedUserCompanyId,
    });

    if (task.assignedUserCompanyId == null) {
      hasUnassignedResponsible = true;
    }
  });

  if (hasUnassignedResponsible) {
    optionMap.set(UNASSIGNED_RESPONSIBLE_VALUE, {
      value: UNASSIGNED_RESPONSIBLE_VALUE,
      label: unassignedLabel,
      userId: null,
      userCompanyId: null,
      normalizedName: '',
    });
  }

  return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function taskMatchesParticipantFilter(task: AgendaTaskItem, option: AgendaParticipantFilterOption) {
  if (option.value === UNASSIGNED_RESPONSIBLE_VALUE) {
    return task.assignedUserCompanyId == null;
  }

  if (option.userId != null) {
    return task.createdBy === option.userId || task.assignedUserId === option.userId;
  }

  if (option.userCompanyId != null && task.assignedUserCompanyId === option.userCompanyId) {
    return true;
  }

  if (option.normalizedName) {
    const creatorName = compactText(task.createdByName ?? task.creator).toLowerCase();
    const assignedName = compactText(task.assignedName ?? task.responsible).toLowerCase();

    return creatorName === option.normalizedName || assignedName === option.normalizedName;
  }

  return false;
}

export function uniqueSortedOptions(tasks: AgendaTaskItem[], getter: (task: AgendaTaskItem) => string) {
  return Array.from(new Set(tasks.map(getter).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function businessMatchesUnit(business: ProcessBusinessOption, unitId: number | null) {
  return unitId == null || business.unitId == null || business.unitId === unitId;
}

export function projectLabel(project: ProjectRecord) {
  return `${project.folio ? `${project.folio} - ` : ''}${project.name}`;
}

export function agendaProjectFilterValue(task: AgendaTaskItem) {
  if (task.projectId != null) {
    return `project:${task.projectId}`;
  }

  const fallbackLabel = compactText(task.projectName ?? task.project ?? task.projectFolio);
  return fallbackLabel ? `project-legacy:${fallbackLabel.toLowerCase()}` : NO_PROJECT_VALUE;
}

function agendaProjectFilterLabel(task: AgendaTaskItem, copy: AgendaTranslations) {
  if (task.projectId != null) {
    const label = compactText(task.projectName ?? task.project);
    const folio = compactText(task.projectFolio);
    return label ? `${folio ? `${folio} - ` : ''}${label}` : `${copy.form.labels.project} #${task.projectId}`;
  }

  const fallbackLabel = compactText(task.projectName ?? task.project ?? task.projectFolio);
  return fallbackLabel || copy.form.empty.project;
}

export function agendaProjectOptions(tasks: AgendaTaskItem[], copy: AgendaTranslations): AgendaProjectFilterOption[] {
  const optionMap = new Map<string, AgendaProjectFilterOption>();

  tasks.forEach((task) => {
    const value = agendaProjectFilterValue(task);
    if (!optionMap.has(value)) {
      optionMap.set(value, {
        value,
        label: agendaProjectFilterLabel(task, copy),
      });
    }
  });

  return Array.from(optionMap.values()).sort((left, right) => {
    if (left.value === NO_PROJECT_VALUE) {
      return -1;
    }

    if (right.value === NO_PROJECT_VALUE) {
      return 1;
    }

    return left.label.localeCompare(right.label);
  });
}
