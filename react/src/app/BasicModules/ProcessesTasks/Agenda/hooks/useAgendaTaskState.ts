import { useCallback, useState } from 'react';
import type { AgendaTaskItem } from '../agendaApi';

export function useAgendaTaskState() {
  const [tasks, setTasks] = useState<AgendaTaskItem[]>([]);
  const [pendingTaskIds, setPendingTaskIds] = useState<number[]>([]);

  const setTaskPendingState = useCallback((taskId: number, isPending: boolean) => {
    setPendingTaskIds((currentIds) =>
      isPending
        ? currentIds.includes(taskId)
          ? currentIds
          : [...currentIds, taskId]
        : currentIds.filter((currentId) => currentId !== taskId),
    );
  }, []);

  const setManyTasksPendingState = useCallback((taskIds: number[], isPending: boolean) => {
    setPendingTaskIds((currentIds) => {
      if (isPending) {
        const nextIds = new Set(currentIds);
        taskIds.forEach((taskId) => nextIds.add(taskId));
        return Array.from(nextIds);
      }

      const taskIdSet = new Set(taskIds);
      return currentIds.filter((currentId) => !taskIdSet.has(currentId));
    });
  }, []);

  const isTaskPending = useCallback(
    (taskId: number) => pendingTaskIds.includes(taskId),
    [pendingTaskIds],
  );

  const patchTaskInAgenda = useCallback((taskId: number, patch: Partial<AgendaTaskItem>) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.taskId === taskId || task.id === taskId
          ? {
              ...task,
              ...patch,
            }
          : task,
      ),
    );
  }, []);

  return {
    isTaskPending,
    patchTaskInAgenda,
    pendingTaskIds,
    setManyTasksPendingState,
    setTaskPendingState,
    setTasks,
    tasks,
  };
}
