import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  completeProcessTask,
  createProcessTask,
  deleteProcessTask,
  updateProcessTask,
  type TaskPayload,
  type TaskPriority,
} from '../../Tasks/tasksApi';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessUnitOption,
} from '../../Processes/types';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { clampPercent, getErrorMessage } from '../utils/agendaTaskStatus';
import { buildAgendaTaskPayload } from '../utils/agendaTaskPayloads';
import { businessMatchesUnit } from '../utils/agendaFilterOptions';

type AgendaRowSelection = {
  clearSelection: () => void;
  pruneSelection: (loadedIds: readonly number[]) => void;
  selectedIds: ReadonlySet<number>;
};

type BulkAction =
  | 'delete'
  | 'duplicate'
  | 'complete'
  | 'priority'
  | 'assign'
  | 'unit';

type BulkActionPayload = {
  collaborator?: ProcessCollaboratorOption | null;
  priority?: TaskPriority;
  unit?: ProcessUnitOption | null;
};

type UseAgendaBulkActionsOptions = {
  agendaCopy: AgendaTranslations;
  attachmentsTask: AgendaTaskItem | null;
  bulkDefaultUnitValue: string;
  bulkUnassignedResponsibleValue: string;
  catalogCollaborators: ProcessCollaboratorOption[];
  loadAgenda: () => Promise<void>;
  reportTask: AgendaTaskItem | null;
  rowSelection: AgendaRowSelection;
  scopedCatalogBusinesses: ProcessBusinessOption[];
  scopedCatalogUnits: ProcessUnitOption[];
  scopeResponsiblePatch: (
    task: AgendaTaskItem,
    unitId: number | null,
    businessId: number | null,
  ) => Partial<TaskPayload>;
  setAgendaError: (message: string | null) => void;
  setAgendaNotice: (message: string | null) => void;
  setAttachmentsTask: (task: AgendaTaskItem | null) => void;
  setManyTasksPendingState: (taskIds: number[], isPending: boolean) => void;
  setReportTask: (task: AgendaTaskItem | null) => void;
  tasks: AgendaTaskItem[];
};

export function useAgendaBulkActions({
  agendaCopy,
  attachmentsTask,
  bulkDefaultUnitValue,
  bulkUnassignedResponsibleValue,
  catalogCollaborators,
  loadAgenda,
  reportTask,
  rowSelection,
  scopedCatalogBusinesses,
  scopedCatalogUnits,
  scopeResponsiblePatch,
  setAgendaError,
  setAgendaNotice,
  setAttachmentsTask,
  setManyTasksPendingState,
  setReportTask,
  tasks,
}: UseAgendaBulkActionsOptions) {
  const [bulkConfirmation, setBulkConfirmation] = useState<'delete' | 'complete' | null>(null);
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkUnitOpen, setIsBulkUnitOpen] = useState(false);
  const [bulkResponsibleValue, setBulkResponsibleValue] = useState(bulkUnassignedResponsibleValue);
  const [bulkUnitValue, setBulkUnitValue] = useState(bulkDefaultUnitValue);

  const selectedTasks = useMemo(
    () => tasks.filter((task) => rowSelection.selectedIds.has(task.taskId)),
    [rowSelection.selectedIds, tasks],
  );

  useEffect(() => {
    rowSelection.pruneSelection(tasks.map((task) => task.taskId));
  }, [rowSelection.pruneSelection, tasks]);

  const resetBulkState = useCallback(() => {
    rowSelection.clearSelection();
    setBulkConfirmation(null);
    setIsBulkAssignOpen(false);
    setIsBulkUnitOpen(false);
    setBulkResponsibleValue(bulkUnassignedResponsibleValue);
    setBulkUnitValue(bulkDefaultUnitValue);
  }, [bulkDefaultUnitValue, bulkUnassignedResponsibleValue, rowSelection.clearSelection]);

  const runBulkTaskAction = useCallback(
    async (action: BulkAction, payload?: BulkActionPayload) => {
      if (selectedTasks.length === 0) {
        return;
      }

      const selectedTaskIds = selectedTasks.map((task) => task.taskId);

      setIsBulkActionRunning(true);
      setManyTasksPendingState(selectedTaskIds, true);
      setAgendaError(null);
      setAgendaNotice(null);

      try {
        if (action === 'delete') {
          await Promise.all(selectedTasks.map((task) => deleteProcessTask(task.taskId)));
        }

        if (action === 'duplicate') {
          await Promise.all(
            selectedTasks.map((task) =>
              createProcessTask(
                buildAgendaTaskPayload(task, {
                  title: `Copia de ${task.title}`,
                  status: 'pending',
                  completionPercent: 0,
                  audited: false,
                  auditNotes: null,
                }),
              ),
            ),
          );
        }

        if (action === 'complete') {
          const completableTasks = selectedTasks.filter(
            (task) => task.status !== 'completed' && task.status !== 'cancelled',
          );
          await Promise.all(
            completableTasks.map((task) =>
              completeProcessTask(
                task.taskId,
                task.completionNotes ?? null,
                task.completionPercent > 0 ? clampPercent(task.completionPercent) : 100,
              ),
            ),
          );
        }

        if (action === 'priority' && payload?.priority) {
          await Promise.all(
            selectedTasks.map((task) =>
              updateProcessTask(task.taskId, buildAgendaTaskPayload(task, { priority: payload.priority })),
            ),
          );
        }

        if (action === 'assign') {
          const collaborator = payload?.collaborator ?? null;
          await Promise.all(
            selectedTasks.map((task) =>
              updateProcessTask(
                task.taskId,
                buildAgendaTaskPayload(task, {
                  assignedUserCompanyId: collaborator?.userCompanyId ?? null,
                  assigneeUserCompanyIds: collaborator ? [collaborator.userCompanyId] : [],
                  assignedName: collaborator?.name ?? null,
                  unitId: task.unitId ?? collaborator?.unitId ?? null,
                  businessId: task.businessId ?? collaborator?.businessId ?? null,
                }),
              ),
            ),
          );
        }

        if (action === 'unit') {
          const unit = payload?.unit ?? null;
          await Promise.all(
            selectedTasks.map((task) => {
              const currentBusiness =
                task.businessId != null
                  ? scopedCatalogBusinesses.find((business) => business.id === task.businessId)
                  : null;
              const nextUnitId = unit?.id ?? null;
              const nextBusinessId =
                currentBusiness && businessMatchesUnit(currentBusiness, nextUnitId) ? task.businessId : null;

              return updateProcessTask(
                task.taskId,
                buildAgendaTaskPayload(task, {
                  unitId: nextUnitId,
                  businessId: nextBusinessId,
                  ...scopeResponsiblePatch(task, nextUnitId, nextBusinessId),
                }),
              );
            }),
          );
        }

        if (reportTask && selectedTaskIds.includes(reportTask.taskId)) {
          setReportTask(null);
        }
        if (attachmentsTask && selectedTaskIds.includes(attachmentsTask.taskId)) {
          setAttachmentsTask(null);
        }

        resetBulkState();
        setAgendaNotice(agendaCopy.bulk.success(selectedTasks.length));
        await loadAgenda();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Agenda bulk task action failed.', { action, error, selectedTaskIds });
        }
        setAgendaError(getErrorMessage(error, agendaCopy.messages.updateTask));
        await loadAgenda();
      } finally {
        setManyTasksPendingState(selectedTaskIds, false);
        setIsBulkActionRunning(false);
      }
    },
    [
      agendaCopy.messages.updateTask,
      attachmentsTask,
      loadAgenda,
      reportTask,
      resetBulkState,
      scopedCatalogBusinesses,
      scopeResponsiblePatch,
      selectedTasks,
      setAgendaError,
      setAgendaNotice,
      setAttachmentsTask,
      setManyTasksPendingState,
      setReportTask,
    ],
  );

  const handleBulkAssign = useCallback(() => {
    const collaborator =
      bulkResponsibleValue === bulkUnassignedResponsibleValue
        ? null
        : catalogCollaborators.find(
            (currentCollaborator) => currentCollaborator.userCompanyId === Number(bulkResponsibleValue),
          ) ?? null;

    void runBulkTaskAction('assign', { collaborator });
  }, [bulkResponsibleValue, bulkUnassignedResponsibleValue, catalogCollaborators, runBulkTaskAction]);

  const handleBulkUnitChange = useCallback(() => {
    const unit =
      bulkUnitValue === bulkDefaultUnitValue
        ? null
        : scopedCatalogUnits.find((currentUnit) => currentUnit.id === Number(bulkUnitValue)) ?? null;

    if (bulkUnitValue !== bulkDefaultUnitValue && !unit) {
      setAgendaError(agendaCopy.messages.updateTask);
      return;
    }

    void runBulkTaskAction('unit', { unit });
  }, [
    agendaCopy.messages.updateTask,
    bulkDefaultUnitValue,
    bulkUnitValue,
    runBulkTaskAction,
    scopedCatalogUnits,
    setAgendaError,
  ]);

  return {
    bulkConfirmation,
    bulkResponsibleValue,
    bulkUnitValue,
    handleBulkAssign,
    handleBulkUnitChange,
    isBulkActionRunning,
    isBulkAssignOpen,
    isBulkUnitOpen,
    runBulkTaskAction,
    setBulkConfirmation,
    setBulkResponsibleValue,
    setBulkUnitValue,
    setIsBulkAssignOpen,
    setIsBulkUnitOpen,
  };
}
