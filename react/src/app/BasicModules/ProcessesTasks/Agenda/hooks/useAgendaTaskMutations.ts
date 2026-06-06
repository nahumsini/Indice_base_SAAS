import { useCallback, useState } from 'react';
import {
  createProcessTask,
  deleteProcessTask,
  updateProcessTask,
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
  const [deleteTask, setDeleteTask] = useState<AgendaTaskItem | null>(null);

  const scopeResponsiblePatch = useCallback(
    (task: AgendaTaskItem, unitId: number | null, businessId: number | null): Partial<TaskPayload> => {
      if (task.assignedUserCompanyId == null) {
        return {};
      }

      const currentCollaborator = catalogCollaborators.find(
        (collaborator) => collaborator.userCompanyId === task.assignedUserCompanyId,
      );

      if (
        !currentCollaborator ||
        collaboratorCanReceiveAssignment(currentCollaborator, unitId, businessId, catalogBusinesses)
      ) {
        return {};
      }

      return {
        assignedName: null,
        assignedUserCompanyId: null,
      };
    },
    [catalogBusinesses, catalogCollaborators],
  );

  const persistTaskChange = useCallback(
    async (task: AgendaTaskItem, patch: Partial<TaskPayload>) => {
      const latestTask = tasks.find((currentTask) => currentTask.taskId === task.taskId) ?? task;
      const nextTitle = 'title' in patch ? patch.title : latestTask.title;
      if (!nextTitle?.trim()) {
        setAgendaError(agendaCopy.messages.titleRequired);
        return;
      }

      setTaskPendingState(task.taskId, true);
      setAgendaError(null);

      try {
        const payload = buildAgendaTaskPayload(latestTask, patch);
        patchTaskInAgenda(
          task.taskId,
          buildAgendaOptimisticPatch(payload, catalogUnits, catalogBusinesses, projects),
        );
        await updateProcessTask(task.taskId, payload);
        await loadAgenda();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Agenda task inline save failed.', { error, patch, taskId: task.taskId });
        }
        setAgendaError(getErrorMessage(error, agendaCopy.messages.updateTask));
        await loadAgenda();
      } finally {
        setTaskPendingState(task.taskId, false);
      }
    },
    [
      agendaCopy.messages.titleRequired,
      agendaCopy.messages.updateTask,
      catalogBusinesses,
      catalogUnits,
      loadAgenda,
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

  return {
    deleteTask,
    handleBusinessCellChange,
    handleConfirmDeleteTask,
    handleDuplicateTask,
    handleProjectCellChange,
    handleResponsibleCellChange,
    handleUnitCellChange,
    persistTaskChange,
    scopeResponsiblePatch,
    setDeleteTask,
  };
}
