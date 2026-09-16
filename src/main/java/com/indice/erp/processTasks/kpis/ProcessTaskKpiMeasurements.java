package com.indice.erp.processTasks.kpis;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;

/** Additive, scope-preserving measurements. Legacy Agenda aggregates keep their contract. */
public record ProcessTaskKpiMeasurements(
        int definitionVersion, LocalDate cutoffDate, LocalDate upcomingThrough,
        Metrics summary, List<Activity> activity) {

    public record Metrics(
            int tasks, int closedInPeriod, int openTasks, int lateOpenTasks,
            int highPriorityOpenTasks, int highPriorityLateTasks,
            int late1To3Days, int late4To7Days, int late8PlusDays,
            int eligibleDeliveries, int onTimeDeliveries, Double onTimeRate, int closuresWithoutDeadline,
            int pendingAuditTasks, Double medianAuditWaitDays,
            int auditDurationSamples, Double medianAuditDurationDays,
            int auditedTasks, int ratedTasks, Double averageRating, List<Integer> ratingDistribution,
            int requiredEvidenceTasks, int missingRequiredEvidence, int openMissingEvidence,
            int closedMissingEvidence, int elapsedSamples, Double medianElapsedDays,
            int upcomingTasks, int observedRuns, int runsWithLateTasks, int fullyObservedCompletedRuns) {}

    public record Activity(LocalDate date, int scheduledTasks, int closedTasks, int auditedTasks) {}

    record Observation(
            long id, Long unitId, Long collaboratorId, Long processId, Long projectId, Long runId,
            int runTaskCount, LocalDate runStartDate, LocalDate scheduledDate, LocalDate dueDate, LocalDateTime createdAt,
            LocalDateTime completedAt, LocalDateTime auditedAt, LocalDateTime cancelledAt,
            String status, String priority, boolean audited, Integer rating,
            boolean evidenceRequired, boolean hasEvidence) {}

    static Metrics summarize(List<Observation> observations, LocalDate from, LocalDate to, LocalDate cutoff) {
        var unique = new LinkedHashMap<Long, Observation>();
        observations.forEach(task -> unique.putIfAbsent(task.id(), task));
        int closed = 0, open = 0, late = 0, highOpen = 0, highLate = 0;
        int age1 = 0, age4 = 0, age8 = 0, eligible = 0, onTime = 0, noDeadline = 0;
        int pendingAudit = 0, audited = 0, required = 0, missing = 0, openMissing = 0, closedMissing = 0, upcoming = 0;
        var waits = new ArrayList<Double>();
        var audits = new ArrayList<Double>();
        var elapsed = new ArrayList<Double>();
        var ratings = new ArrayList<Double>();
        var distribution = new ArrayList<>(List.of(0, 0, 0, 0, 0, 0));
        var runs = new LinkedHashMap<Long, List<Observation>>();
        var lateRuns = new java.util.HashSet<Long>();
        var horizon = cutoff.plusDays(7).isAfter(to) ? to : cutoff.plusDays(7);

        for (var task : unique.values()) {
            var completeDate = date(task.completedAt());
            var auditDate = date(task.auditedAt());
            boolean closedAtCutoff = completeDate != null && !completeDate.isAfter(cutoff);
            boolean legacyClosed = completeDate == null && "completed".equals(task.status());
            boolean cancelled = "cancelled".equals(task.status())
                    || (task.cancelledAt() != null && !date(task.cancelledAt()).isAfter(cutoff));
            boolean existed = task.createdAt() == null || !date(task.createdAt()).isAfter(cutoff);
            boolean isOpen = existed && !closedAtCutoff && !legacyClosed && !cancelled;
            boolean isLate = isOpen && task.dueDate() != null && task.dueDate().isBefore(cutoff);
            boolean isAudited = task.audited() && auditDate != null && !auditDate.isAfter(cutoff);
            if (inRange(completeDate, from, to) && !completeDate.isAfter(cutoff) && !cancelled) {
                closed++;
                if (task.dueDate() == null) noDeadline++;
                else {
                    eligible++;
                    if (!completeDate.isAfter(task.dueDate())) onTime++;
                }
                // Creation-to-close elapsed time, never effort. Generated tasks have a separate lifecycle.
                if (task.runId() == null && task.processId() == null && task.createdAt() != null
                        && !task.completedAt().isBefore(task.createdAt())) {
                    elapsed.add(days(task.createdAt(), task.completedAt()));
                }
            }
            if (isOpen) {
                open++;
                if ("high".equals(task.priority())) highOpen++;
                if (task.dueDate() != null && !task.dueDate().isBefore(cutoff)
                        && !task.dueDate().isAfter(horizon)) upcoming++;
            }
            if (isLate) {
                late++;
                if ("high".equals(task.priority())) highLate++;
                long age = ChronoUnit.DAYS.between(task.dueDate(), cutoff);
                if (age <= 3) age1++; else if (age <= 7) age4++; else age8++;
                if (task.runId() != null && task.runStartDate() != null && !task.runStartDate().isAfter(cutoff)) lateRuns.add(task.runId());
            }
            if ((closedAtCutoff || legacyClosed) && !cancelled && !isAudited) {
                pendingAudit++;
                if (completeDate != null) waits.add((double) ChronoUnit.DAYS.between(completeDate, cutoff));
            }
            if (isAudited && inRange(auditDate, from, to) && !cancelled) {
                audited++;
                if (task.rating() != null && task.rating() >= 0 && task.rating() <= 5) {
                    ratings.add(task.rating().doubleValue());
                    distribution.set(task.rating(), distribution.get(task.rating()) + 1);
                }
                if (task.completedAt() != null && !task.auditedAt().isBefore(task.completedAt())) {
                    audits.add(days(task.completedAt(), task.auditedAt()));
                }
            }
            if (task.evidenceRequired() && !cancelled) {
                required++;
                if (!task.hasEvidence()) {
                    missing++;
                    if (isOpen) openMissing++;
                    if (closedAtCutoff || legacyClosed) closedMissing++;
                }
            }
            if (task.runId() != null && existed && task.runStartDate() != null && !task.runStartDate().isAfter(cutoff)) {
                runs.computeIfAbsent(task.runId(), ignored -> new ArrayList<>()).add(task);
            }
        }
        int completedRuns = (int) runs.values().stream().filter(tasks ->
                tasks.size() == tasks.getFirst().runTaskCount() && tasks.stream().allMatch(task ->
                        task.completedAt() != null && !date(task.completedAt()).isAfter(cutoff)
                                && !"cancelled".equals(task.status()))).count();
        return new Metrics(unique.size(), closed, open, late, highOpen, highLate, age1, age4, age8,
                eligible, onTime, eligible == 0 ? null : round(onTime * 100.0 / eligible), noDeadline,
                pendingAudit, median(waits), audits.size(), median(audits), audited, ratings.size(),
                ratings.isEmpty() ? null : round(ratings.stream().mapToDouble(Double::doubleValue).average().orElseThrow()),
                List.copyOf(distribution), required, missing, openMissing, closedMissing,
                elapsed.size(), median(elapsed), upcoming, runs.size(), lateRuns.size(), completedRuns);
    }

    static Map<Long, Metrics> group(List<Observation> observations, Function<Observation, Long> key,
            LocalDate from, LocalDate to, LocalDate cutoff) {
        var buckets = new LinkedHashMap<Long, List<Observation>>();
        for (var task : observations) {
            var id = key.apply(task);
            buckets.computeIfAbsent(id == null ? 0L : id, ignored -> new ArrayList<>()).add(task);
        }
        var result = new LinkedHashMap<Long, Metrics>();
        buckets.forEach((id, tasks) -> result.put(id, summarize(tasks, from, to, cutoff)));
        return result;
    }

    static List<Activity> activity(List<Observation> observations, LocalDate from, LocalDate to) {
        var unique = new LinkedHashMap<Long, Observation>();
        observations.forEach(task -> unique.putIfAbsent(task.id(), task));
        var daily = new TreeMap<LocalDate, int[]>();
        for (var task : unique.values()) {
            if (inRange(task.scheduledDate(), from, to)) daily.computeIfAbsent(task.scheduledDate(), d -> new int[3])[0]++;
            if (inRange(date(task.completedAt()), from, to)) daily.computeIfAbsent(date(task.completedAt()), d -> new int[3])[1]++;
            if (task.audited() && inRange(date(task.auditedAt()), from, to)) daily.computeIfAbsent(date(task.auditedAt()), d -> new int[3])[2]++;
        }
        return daily.entrySet().stream().map(e -> new Activity(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2])).toList();
    }

    private static LocalDate date(LocalDateTime value) { return value == null ? null : value.toLocalDate(); }
    private static boolean inRange(LocalDate date, LocalDate from, LocalDate to) {
        return date != null && !date.isBefore(from) && !date.isAfter(to);
    }
    private static double days(LocalDateTime start, LocalDateTime end) { return Duration.between(start, end).toSeconds() / 86400.0; }
    private static double round(double value) { return Math.round(value * 10.0) / 10.0; }
    private static Double median(List<Double> values) {
        if (values.isEmpty()) return null;
        values.sort(Double::compare);
        int middle = values.size() / 2;
        return round(values.size() % 2 == 0 ? (values.get(middle - 1) + values.get(middle)) / 2 : values.get(middle));
    }
}
