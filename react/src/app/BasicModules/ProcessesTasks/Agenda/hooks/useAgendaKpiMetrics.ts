import { useMemo } from 'react';
import type { AgendaKpiMetrics } from '../components/AgendaKpiStrip';
import type { AgendaTaskItem } from '../agendaApi';
import {
  clampPercent,
  isTaskOverdue,
  normalizeWeighting,
} from '../utils/agendaTaskStatus';

export function useAgendaKpiMetrics(filteredTasks: AgendaTaskItem[]) {
  return useMemo<AgendaKpiMetrics>(() => {
    const totalCount = filteredTasks.length;
    const actionableTasks = filteredTasks.filter((task) => task.status !== 'cancelled');
    const actionableCount = actionableTasks.length;
    const overdueCount = filteredTasks.filter(isTaskOverdue).length;
    const completedTasks = filteredTasks.filter((task) => task.status === 'completed');
    const completedCount = completedTasks.length;
    const auditedCount = filteredTasks.filter((task) => task.audited).length;
    const pendingAuditCount = completedTasks.filter((task) => !task.audited).length;
    const cancelledCount = filteredTasks.filter((task) => task.status === 'cancelled').length;
    const openCount = filteredTasks.filter((task) =>
      ['pending', 'in_progress', 'paused'].includes(task.status),
    ).length;
    const activeOnTrackCount = Math.max(0, openCount - overdueCount);
    const averageCompletion =
      actionableCount > 0
        ? Math.round(
            actionableTasks.reduce((sum, task) => sum + clampPercent(task.completionPercent), 0) /
              actionableCount,
          )
        : 0;
    const auditedTasksWithWeighting = filteredTasks.filter(
      (task) => task.audited && typeof task.weighting === 'number',
    );
    const averageWeighting =
      auditedTasksWithWeighting.length > 0
        ? Math.round(
            auditedTasksWithWeighting.reduce((sum, task) => sum + (normalizeWeighting(task.weighting) ?? 0), 0) /
              auditedTasksWithWeighting.length,
          )
        : null;
    const completionRate = actionableCount > 0 ? (completedCount / actionableCount) * 100 : 0;
    const timelinessRate = actionableCount > 0 ? ((actionableCount - overdueCount) / actionableCount) * 100 : 0;
    const auditRate = completedCount > 0 ? (auditedCount / completedCount) * 100 : 0;
    const qualityScore = averageWeighting != null ? averageWeighting * 20 : auditRate;
    const productivityScore =
      actionableCount > 0
        ? Math.round(
            averageCompletion * 0.35 +
              completionRate * 0.25 +
              Math.max(0, timelinessRate) * 0.2 +
              auditRate * 0.1 +
              qualityScore * 0.1,
          )
        : 0;

    return {
      activeOnTrackCount,
      auditedCount,
      averageCompletion,
      averageWeighting,
      cancelledCount,
      completedCount,
      openCount,
      overdueCount,
      pendingAuditCount,
      productivityScore: clampPercent(productivityScore),
      totalCount,
    };
  }, [filteredTasks]);
}
