package com.indice.erp.processTasks.processes;

import java.util.NoSuchElementException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Coordinates recurring process generation without sharing one transaction across tenants. */
@Service
public class ProcessMaterializationJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProcessMaterializationJob.class);

    private final JdbcTemplate jdbcTemplate;
    private final ScheduledProcessMaterializer materializer;

    public ProcessMaterializationJob(
            JdbcTemplate jdbcTemplate,
            ScheduledProcessMaterializer materializer) {
        this.jdbcTemplate = jdbcTemplate;
        this.materializer = materializer;
    }

    @Scheduled(fixedDelayString = "${app.process-tasks.processes.materialization-delay-ms:900000}")
    public void materializeDueProcesses() {
        var candidates = jdbcTemplate.query(
            """
                SELECT id, company_id
                FROM processes
                WHERE deleted_at IS NULL
                  AND is_active = TRUE
                  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
                  AND (
                      generated_until_date IS NULL
                      OR generated_until_date < CURRENT_DATE
                      OR next_occurrence_date IS NULL
                      OR next_occurrence_date <= DATE_ADD(CURRENT_DATE, INTERVAL generation_window_days DAY)
                  )
                ORDER BY company_id, id
                """,
            (rs, rowNum) -> new ProcessMaterializationCandidate(
                rs.getLong("company_id"), rs.getLong("id"))
        );

        for (var candidate : candidates) {
            try {
                materializer.materialize(candidate.companyId(), candidate.processId());
            } catch (NoSuchElementException unavailable) {
                LOGGER.warn(
                    "Recurring process skipped because a required record is unavailable"
                        + " companyId={} processId={} reason={}",
                    candidate.companyId(), candidate.processId(), safeMessage(unavailable));
            } catch (RuntimeException failure) {
                LOGGER.error(
                    "Recurring process materialization failed companyId={} processId={} reason={}",
                    candidate.companyId(), candidate.processId(), safeMessage(failure), failure);
            }
        }
    }

    private String safeMessage(RuntimeException failure) {
        return failure.getMessage() == null || failure.getMessage().isBlank()
            ? failure.getClass().getSimpleName()
            : failure.getMessage();
    }

    record ProcessMaterializationCandidate(long companyId, long processId) {
    }
}
