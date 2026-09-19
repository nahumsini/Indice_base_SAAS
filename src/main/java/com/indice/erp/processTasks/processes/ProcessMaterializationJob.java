package com.indice.erp.processTasks.processes;

import java.sql.Date;
import java.time.LocalDate;
import java.util.NoSuchElementException;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Coordinates recurring process generation without sharing one transaction across tenants. */
@Service
public class ProcessMaterializationJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProcessMaterializationJob.class);

    private final JdbcTemplate jdbcTemplate;
    private final ScheduledProcessMaterializer materializer;
    private final int batchSize;

    public ProcessMaterializationJob(
            JdbcTemplate jdbcTemplate,
            ScheduledProcessMaterializer materializer,
            @Value("${app.process-tasks.processes.materialization-batch-size:100}") int batchSize) {
        this.jdbcTemplate = jdbcTemplate;
        this.materializer = materializer;
        this.batchSize = Math.max(1, Math.min(500, batchSize));
    }

    @Scheduled(fixedDelayString = "${app.process-tasks.processes.materialization-delay-ms:900000}")
    public void materializeDueProcesses() {
        var today = Date.valueOf(LocalDate.now());
        var candidates = jdbcTemplate.query(
            """
                SELECT id, company_id
                FROM processes
                WHERE deleted_at IS NULL
                  AND is_active = TRUE
                  AND activation_mode = 'recurring'
                  AND (end_date IS NULL OR end_date >= ?)
                  AND (materialization_retry_at IS NULL OR materialization_retry_at <= CURRENT_TIMESTAMP)
                  AND (
                      generated_until_date IS NULL
                      OR generated_until_date < CASE
                          WHEN end_date IS NOT NULL
                               AND end_date < DATE_ADD(?, INTERVAL generation_window_days DAY)
                              THEN end_date
                          ELSE DATE_ADD(?, INTERVAL generation_window_days DAY)
                      END
                  )
                ORDER BY COALESCE(generated_until_date, '1000-01-01'), company_id, id
                LIMIT ?
                """,
            (rs, rowNum) -> new ProcessMaterializationCandidate(
                rs.getLong("company_id"), rs.getLong("id")),
            today,
            today,
            today,
            batchSize
        );

        for (var candidate : candidates) {
            try {
                materializer.materialize(candidate.companyId(), candidate.processId());
            } catch (NoSuchElementException unavailable) {
                LOGGER.warn(
                    "Recurring process skipped because a required record is unavailable"
                        + " companyId={} processId={} reason={}",
                    candidate.companyId(), candidate.processId(), safeMessage(unavailable));
                recordFailure(candidate, unavailable);
            } catch (RuntimeException failure) {
                LOGGER.error(
                    "Recurring process materialization failed companyId={} processId={} reason={}",
                    candidate.companyId(), candidate.processId(), safeMessage(failure), failure);
                recordFailure(candidate, failure);
            }
        }
    }

    private void recordFailure(ProcessMaterializationCandidate candidate, RuntimeException failure) {
        try {
            jdbcTemplate.update(
                """
                    UPDATE processes
                    SET materialization_failure_count = materialization_failure_count + 1,
                        materialization_retry_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE),
                        materialization_last_failed_at = CURRENT_TIMESTAMP,
                        materialization_last_error = ?
                    WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                    """,
                safeMessage(failure),
                candidate.companyId(),
                candidate.processId());
        } catch (RuntimeException recordingFailure) {
            LOGGER.error(
                "Recurring process failure could not be recorded companyId={} processId={} reason={}",
                candidate.companyId(), candidate.processId(), safeMessage(recordingFailure), recordingFailure);
        }
    }

    private String safeMessage(RuntimeException failure) {
        var message = Objects.toString(failure.getMessage(), "")
            .replaceAll("[\\r\\n\\t]+", " ")
            .trim();
        var summary = failure.getClass().getSimpleName() + (message.isBlank() ? "" : ": " + message);
        return summary.length() <= 500 ? summary : summary.substring(0, 500);
    }

    record ProcessMaterializationCandidate(long companyId, long processId) {
    }
}
