import { useCallback, useRef, useState } from 'react';
import {
  cancelProcessTask,
  createProcessTask,
  deleteProcessTask,
  patchProcessTask,
  type TaskPayload,
} from '../../Tasks/tasksApi';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessUnitOption,
} from '../../Processes/types';
import type { ProjectRecord } from '../../Projects/projectsApi';
import { collaboratorCanReceiveAssignment } from '../../shared/assignmentScope';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import {
  buildAgendaOptimisticPatch,
  buildAgendaTaskPayload,
} from '../utils/agendaTaskPayloads';
import { businessMatchesUnit } from '../utils/agendaFilterOptions';
import { getErrorMessage } from '../utils/agendaTaskStatus';

type UseAgendaTaskMutationsOptions = {
  agendaCopy: AgendaTranslations;
  attachmentsTask: AgendaTaskItem | null;
  catalogBusinesses: ProcessBusinessOption[];
  catalogCollaborators: ProcessCollaboratorOption[];
  catalogUnits: ProcessUnitOption[];
  loadAgenda: () => Promise<void>;
  noBusinessValue: string;
  noProjectValue: string;
  noUnitValue: string;
  patchTaskInAgenda: (taskId: number, patch: Partial<AgendaTaskItem>) => void;
  projects: ProjectRecord[];
  reportTask: AgendaTaskItem | null;
  scopedCatalogBusinesses: ProcessBusinessOption[];
  setAgendaError: (message: string | null) => void;
  setAttachmentsTask: (task: AgendaTaskItem | null) => void;
  setReportTask: (task: AgendaTaskItem | null) => void;
  setTaskPendingState: (taskId: number, isPending: boolean) => void;
  tasks: AgendaTaskItem[];
  unassignedResponsibleValue: string;
};

export function useAgendaTaskMutations({
  agendaCopy,
  attachmentsTask,
  catalogBusinesses,
  catalogCollaborators,
  catalogUnits,
  loadAgenda,
  noBusinessValue,
  noProjectValue,
  noUnitValue,
  patchTaskInAgenda,
  projects,
  reportTask,
  scopedCatalogBusinesses,
  setAgendaError,
  setAttachmentsTask,
  setReportTask,
  setTaskPendingState,
  tasks,
  unassignedResponsibleValue,
}: UseAgendaTaskMutationsOptions) {
  const [cancelTask, setCancelTask] = useState<AgendaTaskItem | null>(null);
  const [deleteTask, setDeleteTask] = useState<AgendaTaskItem | null>(null);
  const inlineSaveQueueRef = useRef(new Map<number, Promise<void>>());

  const scopeResponsiblePatch = useCallback(
    (task: AgendaTaskItem, unitId: number | null, businessId: number | null): Partial<TaskPayload> => {
      const currentIds = task.assigneeUserCompanyIds.length > 0
        ? task.assigneeUserCompanyIds
        : task.assignedUserCompanyId != null
          ? [task.assignedUserCompanyId]
          : [];
      if (currentIds.length === 0) {
        return {};
      }

      const validCollaborators = catalogCollaborators.filter(
        (collaborator) =>
          currentIds.includes(collaborator.userCompanyId) &&
          collaboratorCanReceiveAssignment(collaborator, unitId, businessId, catalogBusinesses),
      );
      if (validCollaborators.length === currentIds.length) {
        return {};
      }

      const currentLead = validCollaborators.find(
        (collaborator) => collaborator.userCompanyId === task.assignedUserCompanyId,
      );
      const nextLead = currentLead ?? validCollaborators[0] ?? null;

      return {
        assignedName: nextLead?.name ?? null,
        assignedUserCompanyId: nextLead?.userCompanyId ?? null,
        assigneeUserCompanyIds: validCollaborators.map((collaborator) => collaborator.userCompanyId),
      };
    },
    [catalogBusinesses, catalogCollaborators],
  );

  const persistTaskChange = useCallback(
    (task: AgendaTaskItem, patch: Partial<TaskPayload>) => {
      const latestTask = tasks.find((currentTask) => currentTask.taskId === task.taskId) ?? task;
      const nextTitle = 'title' in patch ? patch.title : latestTask.title;
      if (!nextTitle?.trim()) {
        setAgendaError(agendaCopy.messages.titleRequired);
        return Promise.resolve();
      }

      setTaskPendingState(task.taskId, true);
      setAgendaError(null);

      const previousSave = inlineSaveQueueRef.current.get(task.taskId) ?? Promise.resolve();
      const queuedSave = previousSave
        .catch(() => undefined)
        .then(async () => {
          const payload = buildAgendaTaskPayload(latestTask, patch);
          patchTaskInAgenda(
            task.taskId,
            buildAgendaOptimisticPatch(payload, catalogUnits, catalogBusinesses, projects),
          );

          try {
            const updatedTask = await patchProcessTask(task.taskId, patch);
            patchTaskInAgenda(task.taskId, updatedTask);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('Agenda task inline save failed.', { error, patch, taskId: task.taskId });
            }
            setAgendaError(getErrorMessage(error, agendaCopy.messages.updateTask));
            patchTaskInAgenda(task.taskId, latestTask);
          }
        });

      inlineSaveQueueRef.current.set(task.taskId, queuedSave);
      void queuedSave.finally(() => {
        if (inlineSaveQueueRef.current.get(task.taskId) === queuedSave) {
          inlineSaveQueueRef.current.delete(task.taskId);
          setTaskPendingState(task.taskId, false);
        }
      });

      return queuedSave;
    },
    [
      agendaCopy.messages.titleRequired,
      agendaCopy.messages.updateTask,
      catalogBusinesses,
      catalogUnits,
      patchTaskInAgenda,
      projects,
      setAgendaError,
      setTaskPendingState,
      tasks,
    ],
  );

  const handleUnitCellChange = useCallback(
    (task: AgendaTaskItem, value: string) => {
      const parsedUnitId = value === noUnitValue ? null : Number(value);
      const nextUnitId =
        typeof parsedUnitId === 'number' && Number.isFinite(parsedUnitId) ? parsedUnitId : null;
      const currentBusiness =
        task.businessId != null
          ? scopedCatalogBusinesses.find((business) => business.id === task.businessId)
          : undefined;
      const nextBusinessId =
        currentBusiness && businessMatchesUnit(currentBusiness, nextUnitId) ? task.businessId : null;

      void persistTaskChange(task, {
        businessId: nextBusinessId,
        unitId: nextUnitId,
        ...scopeResponsiblePatch(task, nextUnitId, nextBusinessId),
      });
    },
    [noUnitValue, persistTaskChange, scopedCatalogBusinesses, scopeResponsiblePatch],
  );

  const handleBusinessCellChange = useCallback(
    (task: AgendaTaskItem, value: string) => {
      const selectedBusiness =
        value === noBusinessValue
          ? null
          : scopedCatalogBusinesses.find((business) => business.id === Number(value)) ?? null;
      const nextBusinessId = selectedBusiness?.id ?? null;
      const nextUnitId = selectedBusiness?.unitId ?? task.unitId ?? null;

      void persistTaskChange(task, {
        businessId: nextBusinessId,
        unitId: nextUnitId,
        ...scopeResponsiblePatch(task, nextUnitId, nextBusinessId),
      });
    },
    [noBusinessValue, persistTaskChange, scopedCatalogBusinesses, scopeResponsiblePatch],
  );

  const handleResponsibleCellChange = useCallback(
    (task: AgendaTaskItem, value: string) => {
      if (value === unassignedResponsibleValue) {
        void persistTaskChange(task, {
          assignedName: null,
          assignedUserCompanyId: null,
          assigneeUserCompanyIds: [],
        });
        return;
      }

      const selectedCollaborator = catalogCollaborators.find(
        (collaborator) => collaborator.userCompanyId === Number(value),
      );

      if (!selectedCollaborator) {
        return;
      }

      void persistTaskChange(task, {
        assignedName: selectedCollaborator.name,
        assignedUserCompanyId: selectedCollaborator.userCompanyId,
        assigneeUserCompanyIds: Array.from(
          new Set([selectedCollaborator.userCompanyId, ...task.assigneeUserCompanyIds]),
        ),
        businessId: task.businessId ?? selectedCollaborator.businessId ?? null,
        unitId: task.unitId ?? selectedCollaborator.unitId ?? null,
      });
    },
    [catalogCollaborators, persistTaskChange, unassignedResponsibleValue],
  );

  const handleProjectCellChange = useCallback(
    (task: AgendaTaskItem, value: string) => {
      if (value === noProjectValue) {
        void persistTaskChange(task, {
          projectId: null,
        });
        return;
      }

      const selectedProject = projects.find((project) => project.id === Number(value));

      if (!selectedProject) {
        return;
      }

      void persistTaskChange(task, {
        businessId: task.businessId ?? selectedProject.businessId ?? null,
        projectId: selectedProject.id,
        unitId: task.unitId ?? selectedProject.unitId ?? null,
      });
    },
    [noProjectValue, persistTaskChange, projects],
  );

  const handlePriorityCellChange = useCallback(
    (task: AgendaTaskItem, value: string) => {
      if (value !== 'low' && value !== 'medium' && value !== 'high') {
        return;
      }

      if (task.priority === value) {
        return;
      }

      void persistTaskChange(task, { priority: value });
    },
    [persistTaskChange],
  );

  const handleDuplicateTask = useCallback(
    async (task: AgendaTaskItem) => {
      setTaskPendingState(task.taskId, true);
      setAgendaError(null);

      try {
        await createProcessTask(
          buildAgendaTaskPayload(task, {
            auditNotes: null,
            audited: false,
            completionPercent: 0,
            status: 'pending',
            title: `Copia de ${task.title}`,
          }),
        );
        await loadAgenda();
      } catch (error) {
        setAgendaError(getErrorMessage(error, agendaCopy.messages.duplicateTask));
      } finally {
        setTaskPendingState(task.taskId, false);
      }
    },
    [agendaCopy.messages.duplicateTask, loadAgenda, setAgendaError, setTaskPendingState],
  );

  const handleConfirmDeleteTask = useCallback(async () => {
    if (!deleteTask) {
      return;
    }

    setTaskPendingState(deleteTask.taskId, true);
    setAgendaError(null);

    try {
      await deleteProcessTask(deleteTask.taskId);
      setDeleteTask(null);
      if (reportTask?.taskId === deleteTask.taskId) {
        setReportTask(null);
      }
      if (attachmentsTask?.taskId === deleteTask.taskId) {
        setAttachmentsTask(null);
      }
      await loadAgenda();
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.deleteTask));
    } finally {
      setTaskPendingState(deleteTask.taskId, false);
    }
  }, [
    agendaCopy.messages.deleteTask,
    attachmentsTask,
    deleteTask,
    loadAgenda,
    reportTask,
    setAgendaError,
    setAttachmentsTask,
    setReportTask,
    setTaskPendingState,
  ]);

  const handleConfirmCancelTask = useCallback(async () => {
    if (!cancelTask) {
      return;
    }

    setTaskPendingState(cancelTask.taskId, true);
    setAgendaError(null);

    try {
      const updatedTask = await cancelProcessTask(cancelTask.taskId);
      patchTaskInAgenda(cancelTask.taskId, updatedTask);
      setCancelTask(null);
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.updateTask));
    } finally {
      setTaskPendingState(cancelTask.taskId, false);
    }
  }, [
    agendaCopy.messages.updateTask,
    cancelTask,
    patchTaskInAgenda,
    setAgendaError,
    setTaskPendingState,
  ]);

  return {
    cancelTask,
    deleteTask,
    handleBusinessCellChange,
    handleConfirmCancelTask,
    handleConfirmDeleteTask,
    handleDuplicateTask,
    handleProjectCellChange,
    handlePriorityCellChange,
    handleResponsibleCellChange,
    handleUnitCellChange,
    persistTaskChange,
    scopeResponsiblePatch,
    setCancelTask,
    setDeleteTask,
  };
}
