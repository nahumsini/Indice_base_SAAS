package com.indice.erp.processTasks.kpis;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProcessTaskKpiMeasurementsTest {
    private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
    private static final LocalDate TO = LocalDate.of(2026, 9, 30);
    private static final LocalDate CUT = LocalDate.of(2026, 9, 15);
    private static class Task {
        long id = 1; Long member = 10L, run, process; int runCount = 1;
        LocalDate due = CUT.minusDays(2), planned = CUT.minusDays(4), runStart = FROM;
        LocalDateTime created = FROM.atStartOfDay(), closed, auditedAt, cancelledAt;
        String status = "pending", priority = "medium";
        boolean audited, required, evidence; Integer rating;
        ProcessTaskKpiMeasurements.Observation observation() {
            return new ProcessTaskKpiMeasurements.Observation(id, 1L, member, process, null, run, runCount, runStart,
                    planned, due, created, closed, auditedAt, cancelledAt, status, priority, audited, rating, required, evidence);
        }
    }
    private ProcessTaskKpiMeasurements.Metrics summarize(Task... tasks) {
        return ProcessTaskKpiMeasurements.summarize(java.util.Arrays.stream(tasks).map(Task::observation).toList(), FROM, TO, CUT);
    }
    @Test void lateCompletionNeverCountsAsOnTimeAndAuditDoesNotCountASecondClosure() {
        var late = new Task(); late.closed = CUT.minusDays(1).atTime(18, 0); late.status = "completed";
        late.audited = true; late.auditedAt = CUT.atTime(9, 0); late.rating = 4;
        var onTime = new Task(); onTime.id = 2; onTime.closed = onTime.due.atTime(23, 59); onTime.status = "completed";
        var result = summarize(late, onTime);
        assertThat(result.closedInPeriod()).isEqualTo(2);
        assertThat(result.onTimeRate()).isEqualTo(50.0);
        assertThat(result.openTasks()).isZero();
        assertThat(result.averageRating()).isEqualTo(4.0);
        assertThat(result.medianAuditDurationDays()).isEqualTo(0.6);
    }
    @Test void inProgressAndPausedRemainLateEvenWithAnotherAgendaDate() {
        var progress = new Task(); progress.status = "in_progress"; progress.priority = "high"; progress.planned = CUT.plusDays(5);
        var paused = new Task(); paused.id = 2; paused.status = "paused"; paused.due = CUT.minusDays(9);
        var result = summarize(progress, paused);
        assertThat(result.lateOpenTasks()).isEqualTo(2);
        assertThat(result.highPriorityLateTasks()).isEqualTo(1);
        assertThat(result.late1To3Days()).isEqualTo(1);
        assertThat(result.late8PlusDays()).isEqualTo(1);
    }
    @Test void evidenceOnlyAppliesWhereRequiredAndNoRatingsRemainUnavailable() {
        var optional = new Task();
        var required = new Task(); required.id = 2; required.required = true;
        var result = summarize(optional, required);
        assertThat(result.requiredEvidenceTasks()).isEqualTo(1);
        assertThat(result.openMissingEvidence()).isEqualTo(1);
        assertThat(result.averageRating()).isNull();
        assertThat(result.onTimeRate()).isNull();
        assertThat(result.medianAuditDurationDays()).isNull();
    }
    @Test void teamParticipationDoesNotMultiplyTotalsButEachMemberRetainsTheirScope() {
        var task = new Task();
        var first = task.observation(); task.member = 20L; var second = task.observation();
        var rows = List.of(first, second);
        assertThat(ProcessTaskKpiMeasurements.summarize(rows, FROM, TO, CUT).tasks()).isEqualTo(1);
        var groups = ProcessTaskKpiMeasurements.group(rows, ProcessTaskKpiMeasurements.Observation::collaboratorId, FROM, TO, CUT);
        assertThat(groups).hasSize(2);
        assertThat(groups.get(20L).tasks()).isEqualTo(1);
    }
    @Test void auditAgeAndMissingDeadlineHaveExplicitSamples() {
        var task = new Task(); task.closed = CUT.minusDays(5).atTime(9, 0); task.status = "completed"; task.due = null;
        var result = summarize(task);
        assertThat(result.pendingAuditTasks()).isEqualTo(1);
        assertThat(result.medianAuditWaitDays()).isEqualTo(5.0);
        assertThat(result.closuresWithoutDeadline()).isEqualTo(1);
        assertThat(result.onTimeRate()).isNull();
    }
    @Test void cancelledAndFutureClosuresAreNotDeliveriesAtCutoff() {
        var future = new Task(); future.closed = CUT.plusDays(3).atStartOfDay(); future.status = "completed";
        var cancelled = new Task(); cancelled.id = 2; cancelled.status = "cancelled"; cancelled.cancelledAt = CUT.atStartOfDay();
        var result = summarize(future, cancelled);
        assertThat(result.closedInPeriod()).isZero();
        assertThat(result.openTasks()).isEqualTo(1);
        assertThat(result.lateOpenTasks()).isEqualTo(1);
    }
    @Test void partialAndFutureRunsNeverBecomeCompletedRunsAndGeneratedLeadTimeIsExcluded() {
        var task = new Task(); task.run = 50L; task.process = 5L; task.runCount = 2;
        task.closed = CUT.atStartOfDay(); task.status = "completed";
        assertThat(summarize(task).fullyObservedCompletedRuns()).isZero();
        assertThat(summarize(task).elapsedSamples()).isZero();
        task.runCount = 1;
        assertThat(summarize(task).fullyObservedCompletedRuns()).isEqualTo(1);
        task.runStart = CUT.plusDays(10);
        assertThat(summarize(task).observedRuns()).isZero();
    }
    @Test void activityUsesActualEventDatesAndCountsAuditSeparately() {
        var task = new Task(); task.closed = CUT.minusDays(1).atStartOfDay(); task.status = "completed";
        task.audited = true; task.auditedAt = CUT.atStartOfDay();
        var rows = ProcessTaskKpiMeasurements.activity(List.of(task.observation()), FROM, TO);
        assertThat(rows).containsExactly(
                new ProcessTaskKpiMeasurements.Activity(task.planned, 1, 0, 0),
                new ProcessTaskKpiMeasurements.Activity(CUT.minusDays(1), 0, 1, 0),
                new ProcessTaskKpiMeasurements.Activity(CUT, 0, 0, 1));
    }
    @Test void upcomingWindowIsClippedToTheSelectedPeriod() {
        var task = new Task(); task.due = CUT.plusDays(1);
        assertThat(ProcessTaskKpiMeasurements.summarize(List.of(task.observation()), FROM, CUT, CUT).upcomingTasks()).isZero();
        assertThat(summarize(task).upcomingTasks()).isEqualTo(1);
    }
    @Test void zeroRatingIsObservedAndInvalidDurationIsExcluded() {
        var task = new Task(); task.status = "completed"; task.closed = CUT.atTime(12, 0);
        task.audited = true; task.auditedAt = CUT.atTime(10, 0); task.rating = 0;
        var result = summarize(task);
        assertThat(result.averageRating()).isEqualTo(0.0);
        assertThat(result.ratingDistribution().getFirst()).isEqualTo(1);
        assertThat(result.auditDurationSamples()).isZero();
    }
}
