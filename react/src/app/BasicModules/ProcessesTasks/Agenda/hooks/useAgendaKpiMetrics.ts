import { useMemo } from 'react';
import type { AgendaKpiMetrics } from '../components/AgendaKpiStrip';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaLoadRange } from '../types';
import {
  clampPercent,
  getTaskAgendaStatusInRange,
  normalizeWeighting,
} from '../utils/agendaTaskStatus';

export function useAgendaKpiMetrics(
  filteredTasks: AgendaTaskItem[],
  agendaStatusDate: string,
  agendaStatusRange: AgendaLoadRange,
) {
  return useMemo<AgendaKpiMetrics>(() => {
    const agendaEntries = filteredTasks
      .map((task) => ({
        task,
        status: getTaskAgendaStatusInRange(task, agendaStatusRange, agendaStatusDate),
      }))
      .filter((entry) => entry.status != null);
    const totalCount = agendaEntries.length;
    const actionableTasks = agendaEntries.map((entry) => entry.task);
    const actionableCount = actionableTasks.length;
    const overdueCount = agendaEntries.filter((entry) => entry.status === 'overdue').length;
    const completedAgendaCount = agendaEntries.filter((entry) => entry.status === 'completed').length;
    const auditedCount = agendaEntries.filter((entry) => entry.status === 'audited').length;
    const completedCount = completedAgendaCount + auditedCount;
    const pendingAuditCount = completedAgendaCount;
    const cancelledCount = 0;
    const openCount = agendaEntries.filter((entry) =>
      ['pending', 'in_progress', 'paused', 'overdue'].includes(entry.status ?? ''),
    ).length;
    const activeOnTrackCount = agendaEntries.filter((entry) =>
      ['pending', 'in_progress', 'paused'].includes(entry.status ?? ''),
    ).length;
    const averageCompletion =
      actionableCount > 0
        ? Math.round(
            actionableTasks.reduce((sum, task) => sum + clampPercent(task.completionPercent), 0) /
              actionableCount,
          )
        : 0;
    const auditedTasksWithWeighting = agendaEntries.filter(
      (entry) => entry.status === 'audited' && typeof entry.task.weighting === 'number',
    );
    const averageWeighting =
      auditedTasksWithWeighting.length > 0
        ? Math.round(
            auditedTasksWithWeighting.reduce((sum, entry) => sum + (normalizeWeighting(entry.task.weighting) ?? 0), 0) /
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
  }, [agendaStatusDate, agendaStatusRange, filteredTasks]);
}
