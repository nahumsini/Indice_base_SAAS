import { useCallback } from 'react';
import type { TaskPayload } from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type { AgendaKanbanColumnId } from '../types';
import { getTaskKanbanColumnId } from '../utils/agendaTaskStatus';

type UseAgendaKanbanDropOptions = {
  agendaCopy: AgendaTranslations;
  draggingTaskId: number | null;
  handleAuditTask: (task: AgendaTaskItem) => void;
  handleCloseTask: (task: AgendaTaskItem) => void;
  persistTaskChange: (task: AgendaTaskItem, patch: Partial<TaskPayload>) => Promise<void>;
  setAgendaError: (message: string | null) => void;
  setDraggingTaskId: (taskId: number | null) => void;
  sortedTasks: AgendaTaskItem[];
};

export function useAgendaKanbanDrop({
  agendaCopy,
  draggingTaskId,
  handleAuditTask,
  handleCloseTask,
  persistTaskChange,
  setAgendaError,
  setDraggingTaskId,
  sortedTasks,
}: UseAgendaKanbanDropOptions) {
  return useCallback(
    (columnId: AgendaKanbanColumnId) => {
      const draggedTask = sortedTasks.find((task) => task.taskId === draggingTaskId);

      setDraggingTaskId(null);

      if (!draggedTask) {
        return;
      }

      if (columnId === getTaskKanbanColumnId(draggedTask)) {
        return;
      }

      if (columnId === 'overdue') {
        setAgendaError(agendaCopy.messages.overdueDragBlocked);
        return;
      }

      if (columnId === 'completed') {
        if (draggedTask.status !== 'completed') {
          handleCloseTask(draggedTask);
        }
        return;
      }

      if (columnId === 'audited') {
        if (draggedTask.status !== 'completed') {
          setAgendaError(agendaCopy.messages.closeBeforeAudit);
          return;
        }

        handleAuditTask(draggedTask);
        return;
      }

      void persistTaskChange(draggedTask, {
        auditNotes: null,
        audited: false,
        completionPercent: columnId === 'pending' ? 0 : draggedTask.completionPercent,
        status: columnId,
        weighting: null,
      });
    },
    [
      agendaCopy.messages.closeBeforeAudit,
      agendaCopy.messages.overdueDragBlocked,
      draggingTaskId,
      handleAuditTask,
      handleCloseTask,
      persistTaskChange,
      setAgendaError,
      setDraggingTaskId,
      sortedTasks,
    ],
  );
}
