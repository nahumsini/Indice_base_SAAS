import type { TaskMeasurements } from './measurements';
import type { TaskKpiWorkspaceCopy } from './translations/workspaceCopy';

export function measurementCards(m: TaskMeasurements, c: TaskKpiWorkspaceCopy, locale: string) {
  const number = (value: number | null, suffix = '') => value == null ? c.noSample : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}${suffix}`;
  return [
    { id: 'tasks', label: c.tasks, value: number(m.tasks), helper: `${c.open}: ${m.openTasks} · ${c.closed}: ${m.closedInPeriod}`, description: '' },
    { id: 'closed', label: c.closed, value: number(m.closedInPeriod), helper: `${c.noDeadline}: ${m.closuresWithoutDeadline}`, description: c.delivery },
    { id: 'open', label: c.open, value: number(m.openTasks), helper: `${c.highPriority}: ${m.highPriorityOpenTasks}`, description: c.workload },
    { id: 'late', label: c.late, value: number(m.lateOpenTasks), helper: `${c.highPriority}: ${m.highPriorityLateTasks}`, description: c.workload },
    { id: 'onTime', label: c.onTime, value: number(m.onTimeRate, '%'), helper: `${m.onTimeDeliveries} / ${m.eligibleDeliveries} · ${c.eligible}`, description: c.delivery },
    { id: 'audit', label: c.audit, value: number(m.pendingAuditTasks), helper: `${c.wait}: ${number(m.medianAuditWaitDays, ` ${c.days}`)}`, description: c.auditNote },
    { id: 'quality', label: c.quality, value: number(m.averageRating, '/5'), helper: `${c.measured}: ${m.ratedTasks} / ${m.auditedTasks}`, description: c.qualityNote },
    { id: 'evidence', label: c.evidence, value: m.requiredEvidenceTasks ? number(m.missingRequiredEvidence) : c.notApplicable, helper: `${c.required}: ${m.requiredEvidenceTasks}`, description: c.evidenceNote },
  ];
}
