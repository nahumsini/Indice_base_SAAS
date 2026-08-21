import { useCallback } from 'react';
import type { TaskPayload } from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type { AgendaKanbanColumnId, AgendaLoadRange } from '../types';
import { getTaskKanbanColumnId } from '../utils/agendaTaskStatus';

type UseAgendaKanbanDropOptions = {
  activeRange: AgendaLoadRange;
  agendaStatusDate: string;
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
  activeRange,
  agendaStatusDate,
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
    (columnId: AgendaKanbanColumnId, droppedTaskId: number | null = null) => {
      const resolvedTaskId = droppedTaskId ?? draggingTaskId;
      const draggedTask = sortedTasks.find((task) => task.taskId === resolvedTaskId);

      setDraggingTaskId(null);

      if (!draggedTask) {
        return;
      }

      const currentColumnId = getTaskKanbanColumnId(draggedTask, agendaStatusDate, activeRange);

      if (columnId === currentColumnId) {
        return;
      }

      if (columnId === 'overdue' || (currentColumnId === 'overdue' && columnId === 'pending')) {
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
      activeRange,
      agendaStatusDate,
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
