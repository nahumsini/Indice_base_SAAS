import { useCallback, useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from 'react';
import { updateProcessTaskAgendaPlacement } from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type {
  AgendaSchedulePlacement,
  AgendaSchedulePlacements,
  AgendaScheduleViewMode,
} from '../types';
import { isDateInputValue } from '../utils/agendaDateUtils';
import {
  agendaScheduleHours,
  getBrowserAgendaTimeZone,
  getTaskScheduleDateKey,
  getTaskScheduleHour,
  normalizeAgendaScheduleHour,
} from '../utils/agendaScheduleUtils';
import { getErrorMessage } from '../utils/agendaTaskStatus';

const agendaScheduleStorageKey = 'processes-tasks-agenda-schedule-v1';

type UseAgendaScheduleStateOptions = {
  agendaCopy: AgendaTranslations;
  loadAgenda: () => Promise<void>;
  patchTaskInAgenda: (taskId: number, patch: Partial<AgendaTaskItem>) => void;
  setAgendaError: (message: string | null) => void;
  setTaskPendingState: (taskId: number, isPending: boolean) => void;
  tasks: AgendaTaskItem[];
  todayAgendaValue: string;
};

function getInitialAgendaSchedulePlacements(): AgendaSchedulePlacements {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawPlacements = window.localStorage.getItem(agendaScheduleStorageKey);
    if (!rawPlacements) {
      return {};
    }

    const parsedPlacements = JSON.parse(rawPlacements) as Record<string, Partial<AgendaSchedulePlacement>>;
    const restoredPlacements: AgendaSchedulePlacements = {};

    Object.entries(parsedPlacements).forEach(([taskId, placement]) => {
      if (!placement?.date || typeof placement.date !== 'string') {
        return;
      }

      restoredPlacements[taskId] = {
        date: placement.date,
        hour:
          typeof placement.hour === 'string' && agendaScheduleHours.includes(placement.hour)
            ? placement.hour
            : null,
      };
    });

    return restoredPlacements;
  } catch {
    return {};
  }
}

export function useAgendaScheduleState({
  agendaCopy,
  loadAgenda,
  patchTaskInAgenda,
  setAgendaError,
  setTaskPendingState,
  tasks,
  todayAgendaValue,
}: UseAgendaScheduleStateOptions) {
  const [scheduleViewMode, setScheduleViewMode] = useState<AgendaScheduleViewMode>('day');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(todayAgendaValue);
  const [scheduleDraggingTaskId, setScheduleDraggingTaskId] = useState<number | null>(null);
  const [agendaSchedulePlacements, setAgendaSchedulePlacements] = useState<AgendaSchedulePlacements>(() =>
    getInitialAgendaSchedulePlacements(),
  );
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.taskId, task])), [tasks]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(agendaScheduleStorageKey, JSON.stringify(agendaSchedulePlacements));
  }, [agendaSchedulePlacements]);

  useEffect(() => {
    setAgendaSchedulePlacements((currentPlacements) => {
      let didChange = false;
      const nextPlacements = { ...currentPlacements };

      Object.entries(currentPlacements).forEach(([taskId, placement]) => {
        const task = taskMap.get(Number(taskId));
        const canonicalDate = task ? getTaskScheduleDateKey(task, todayAgendaValue) : null;
        const canonicalHour = task ? getTaskScheduleHour(task, todayAgendaValue) : null;

        if (!canonicalDate) {
          return;
        }

        if (placement.hour && !canonicalHour) {
          return;
        }

        if (placement.date !== canonicalDate || placement.hour !== canonicalHour) {
          nextPlacements[taskId] = {
            ...placement,
            date: canonicalDate,
            hour: canonicalHour,
          };
          didChange = true;
        }
      });

      return didChange ? nextPlacements : currentPlacements;
    });
  }, [taskMap, todayAgendaValue]);

  const syncTaskSchedulePlacement = useCallback(
    (taskId: number, dateKey: string, hour: string | null) => {
      if (!isDateInputValue(dateKey)) {
        return;
      }

      const normalizedHour = normalizeAgendaScheduleHour(hour);

      setAgendaSchedulePlacements((currentPlacements) => ({
        ...currentPlacements,
        [String(taskId)]: { date: dateKey, hour: normalizedHour },
      }));

      patchTaskInAgenda(taskId, {
        agendaDate: dateKey,
        agendaStartTime: normalizedHour,
        agendaEndTime: null,
        agendaTimeZone: getBrowserAgendaTimeZone(),
      });
      setTaskPendingState(taskId, true);
      setAgendaError(null);

      void updateProcessTaskAgendaPlacement(taskId, {
        agendaDate: dateKey,
        agendaStartTime: normalizedHour,
        agendaEndTime: null,
        agendaTimeZone: getBrowserAgendaTimeZone(),
      })
        .then((updatedTask) => {
          patchTaskInAgenda(taskId, {
            agendaDate: updatedTask.agendaDate ?? dateKey,
            agendaStartTime: updatedTask.agendaStartTime ?? normalizedHour,
            agendaEndTime: updatedTask.agendaEndTime ?? null,
            agendaTimeZone: updatedTask.agendaTimeZone ?? getBrowserAgendaTimeZone(),
          });
          return loadAgenda();
        })
        .catch((error) => {
          if (import.meta.env.DEV) {
            console.warn('Agenda placement save failed.', { error, taskId, dateKey, hour: normalizedHour });
          }
          setAgendaError(getErrorMessage(error, agendaCopy.messages.updateTask));
          void loadAgenda();
        })
        .finally(() => {
          setTaskPendingState(taskId, false);
        });
    },
    [agendaCopy.messages.updateTask, loadAgenda, patchTaskInAgenda, setAgendaError, setTaskPendingState],
  );

  const handleScheduleTaskDragStart = useCallback((event: ReactDragEvent<HTMLElement>, taskId: number) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-indice-agenda-task-id', String(taskId));
    event.dataTransfer.setData('text/plain', String(taskId));
    setScheduleDraggingTaskId(taskId);
  }, []);

  const resolveScheduleDraggedTaskId = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const rawTaskId =
        event.dataTransfer.getData('application/x-indice-agenda-task-id') ||
        event.dataTransfer.getData('text/plain');
      const parsedTaskId = Number(rawTaskId);

      if (Number.isFinite(parsedTaskId) && parsedTaskId > 0) {
        return parsedTaskId;
      }

      return scheduleDraggingTaskId;
    },
    [scheduleDraggingTaskId],
  );

  const handleScheduleDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleScheduleDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>, dateKey: string, hour: string | null) => {
      event.preventDefault();
      event.stopPropagation();
      const taskId = resolveScheduleDraggedTaskId(event);

      if (taskId == null) {
        return;
      }

      syncTaskSchedulePlacement(taskId, dateKey, hour);
      setScheduleDraggingTaskId(null);
    },
    [resolveScheduleDraggedTaskId, syncTaskSchedulePlacement],
  );

  const handleScheduleDateDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>, dateKey: string) => {
      event.preventDefault();
      event.stopPropagation();
      const taskId = resolveScheduleDraggedTaskId(event);

      if (taskId == null) {
        return;
      }

      const currentPlacement = agendaSchedulePlacements[String(taskId)];
      const task = taskMap.get(taskId);
      const currentHour = currentPlacement?.hour ?? (task ? getTaskScheduleHour(task, todayAgendaValue) : null);

      syncTaskSchedulePlacement(taskId, dateKey, currentHour);
      setScheduleDraggingTaskId(null);
    },
    [agendaSchedulePlacements, resolveScheduleDraggedTaskId, syncTaskSchedulePlacement, taskMap, todayAgendaValue],
  );

  const updateTaskSchedulePlacement = useCallback(
    (taskId: number, dateKey: string, hour: string | null) => {
      syncTaskSchedulePlacement(taskId, dateKey, hour);
    },
    [syncTaskSchedulePlacement],
  );

  const handleScheduleDragEnd = useCallback(() => {
    setScheduleDraggingTaskId(null);
  }, []);

  return {
    agendaSchedulePlacements,
    handleScheduleDateDrop,
    handleScheduleDragEnd,
    handleScheduleDragOver,
    handleScheduleDrop,
    handleScheduleTaskDragStart,
    scheduleDraggingTaskId,
    scheduleViewMode,
    selectedScheduleDate,
    setScheduleViewMode,
    setSelectedScheduleDate,
    updateTaskSchedulePlacement,
  };
}
