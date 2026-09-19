export interface TaskMeasurements {
  tasks: number; closedInPeriod: number; openTasks: number; lateOpenTasks: number;
  highPriorityOpenTasks: number; highPriorityLateTasks: number;
  late1To3Days: number; late4To7Days: number; late8PlusDays: number;
  eligibleDeliveries: number; onTimeDeliveries: number; onTimeRate: number | null; closuresWithoutDeadline: number;
  pendingAuditTasks: number; medianAuditWaitDays: number | null;
  auditDurationSamples: number; medianAuditDurationDays: number | null;
  auditedTasks: number; ratedTasks: number; averageRating: number | null; ratingDistribution: number[];
  requiredEvidenceTasks: number; missingRequiredEvidence: number; openMissingEvidence: number;
  closedMissingEvidence: number; elapsedSamples: number; medianElapsedDays: number | null;
  upcomingTasks: number; observedRuns: number; runsWithLateTasks: number; fullyObservedCompletedRuns: number;
}
export interface KpiMeasurements {
  definitionVersion: 1;
  cutoffDate: string;
  upcomingThrough: string;
  summary: TaskMeasurements;
  activity: Array<{ date: string; scheduledTasks: number; closedTasks: number; auditedTasks: number }>;
}
const countFields = [
  'tasks', 'closedInPeriod', 'openTasks', 'lateOpenTasks', 'highPriorityOpenTasks', 'highPriorityLateTasks',
  'late1To3Days', 'late4To7Days', 'late8PlusDays', 'eligibleDeliveries', 'onTimeDeliveries', 'closuresWithoutDeadline',
  'pendingAuditTasks', 'auditDurationSamples', 'auditedTasks', 'ratedTasks', 'requiredEvidenceTasks',
  'missingRequiredEvidence', 'openMissingEvidence', 'closedMissingEvidence', 'elapsedSamples', 'upcomingTasks',
  'observedRuns', 'runsWithLateTasks', 'fullyObservedCompletedRuns',
] as const;
const optionalFields = ['onTimeRate', 'medianAuditWaitDays', 'medianAuditDurationDays', 'averageRating', 'medianElapsedDays'] as const;
export function normalizeTaskMeasurements(value: unknown): TaskMeasurements | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (countFields.some(key => typeof row[key] !== 'number' || !Number.isInteger(row[key]) || Number(row[key]) < 0)) return null;
  if (optionalFields.some(key => row[key] !== null && (typeof row[key] !== 'number' || !Number.isFinite(row[key])))) return null;
  if (!Array.isArray(row.ratingDistribution) || row.ratingDistribution.length !== 6 || row.ratingDistribution.some(n => !Number.isInteger(n) || n < 0)) return null;
  return { ...Object.fromEntries([...countFields, ...optionalFields].map(key => [key, row[key]])), ratingDistribution: [...row.ratingDistribution] } as unknown as TaskMeasurements;
}
export function normalizeKpiMeasurements(value: unknown): KpiMeasurements | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const summary = normalizeTaskMeasurements(row.summary);
  if (row.definitionVersion !== 1 || !summary || typeof row.cutoffDate !== 'string' || typeof row.upcomingThrough !== 'string' || !Array.isArray(row.activity)) return null;
  const activity = row.activity.filter((point): point is KpiMeasurements['activity'][number] => point && typeof point.date === 'string' &&
    ['scheduledTasks', 'closedTasks', 'auditedTasks'].every(key => Number.isInteger(point[key]) && point[key] >= 0));
  return { definitionVersion: 1, cutoffDate: row.cutoffDate, upcomingThrough: row.upcomingThrough, summary, activity };
}
