package com.indice.erp.kiosk.engine;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class KioskEngineMaintenanceJob {

    private final JdbcTemplate jdbcTemplate;
    private final int hrInactivityTimeoutSeconds;
    private final int expensesInactivityTimeoutSeconds;
    private final int pettyCashInactivityTimeoutSeconds;
    private final int processTasksInactivityTimeoutSeconds;

    @Autowired
    public KioskEngineMaintenanceJob(
            JdbcTemplate jdbcTemplate,
            @Value("${app.hr.kiosk.inactivity-timeout-seconds:180}") int hrInactivityTimeoutSeconds,
            @Value("${app.expenses.kiosk.inactivity-timeout-seconds:300}") int expensesInactivityTimeoutSeconds,
            @Value("${app.petty-cash.kiosk.inactivity-timeout-seconds:900}") int pettyCashInactivityTimeoutSeconds,
            @Value("${app.process-tasks.kiosk.inactivity-timeout-seconds:1800}") int processTasksInactivityTimeoutSeconds) {
        this.jdbcTemplate = jdbcTemplate;
        this.hrInactivityTimeoutSeconds = timeoutSeconds(hrInactivityTimeoutSeconds, 180);
        this.expensesInactivityTimeoutSeconds = timeoutSeconds(expensesInactivityTimeoutSeconds, 300);
        this.pettyCashInactivityTimeoutSeconds = timeoutSeconds(pettyCashInactivityTimeoutSeconds, 900);
        this.processTasksInactivityTimeoutSeconds = timeoutSeconds(processTasksInactivityTimeoutSeconds, 1800);
    }

    KioskEngineMaintenanceJob(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, 180, 300, 900, 1800);
    }

    @Scheduled(
            fixedDelayString = "${app.kiosk-engine.idempotency-cleanup-delay-ms:3600000}",
            initialDelayString = "${app.kiosk-engine.idempotency-cleanup-initial-delay-ms:300000}")
    public int deleteExpiredIdempotencyRecords() {
        return jdbcTemplate.update(
                "DELETE FROM kiosk_engine_idempotency WHERE expires_at < CURRENT_TIMESTAMP");
    }

    @Scheduled(
            fixedDelayString = "${app.kiosk-engine.rate-limit-cleanup-delay-ms:3600000}",
            initialDelayString = "${app.kiosk-engine.rate-limit-cleanup-initial-delay-ms:300000}")
    public int deleteStaleRateLimitBuckets() {
        return jdbcTemplate.update(
            "DELETE FROM kiosk_engine_rate_limit_buckets WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL 1 DAY");
    }

    @Scheduled(
            fixedDelayString = "${app.kiosk-engine.lifecycle-delay-ms:60000}",
            initialDelayString = "${app.kiosk-engine.lifecycle-initial-delay-ms:30000}")
    @Transactional
    public int materializeExpiredDefinitions() {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, kiosk_definition_id, historical_kiosk_id, company_id, owner_module,
                    event_type, outcome, actor_type, snapshot_json, retain_until
                )
                SELECT UUID(), definition.id, definition.id, definition.company_id,
                       definition.owner_module, 'KIOSK_EXPIRED', 'SUCCEEDED', 'SYSTEM',
                       JSON_OBJECT('code', definition.code, 'name', definition.name,
                                   'unit_id', definition.unit_id, 'business_id', definition.business_id),
                       CURRENT_TIMESTAMP + INTERVAL 1 YEAR
                FROM kiosk_definitions definition
                WHERE definition.status = 'ACTIVE' AND definition.expires_at IS NOT NULL
                  AND definition.expires_at <= CURRENT_TIMESTAMP
                """
        );
        var expired = jdbcTemplate.update(
            """
                UPDATE kiosk_definitions SET status = 'EXPIRED'
                WHERE status = 'ACTIVE' AND expires_at IS NOT NULL
                  AND expires_at <= CURRENT_TIMESTAMP
                """
        );
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions session
                JOIN kiosk_definitions definition ON definition.id = session.kiosk_definition_id
                SET session.revoked_at = COALESCE(session.revoked_at, CURRENT_TIMESTAMP)
                WHERE definition.status IN ('DISABLED', 'EXPIRED', 'REVOKED', 'DELETED')
                  AND session.revoked_at IS NULL
                """
        );
        return expired;
    }

    @Scheduled(
            fixedDelayString = "${app.kiosk-engine.session-cleanup-delay-ms:60000}",
            initialDelayString = "${app.kiosk-engine.session-cleanup-initial-delay-ms:30000}")
    @Transactional
    public int expireSessions() {
        var inactivityExpired = inactivityExpiredPredicate();
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, session_id, kiosk_definition_id, historical_kiosk_id,
                    company_id, owner_module, event_type, outcome, actor_type, actor_id,
                    retain_until
                )
                SELECT UUID(), session.session_id, definition.id, definition.id,
                       definition.company_id, definition.owner_module,
                       'KIOSK_SESSION_EXPIRED', 'SUCCEEDED', session.identity_type,
                       session.identity_id, CURRENT_TIMESTAMP + INTERVAL 1 YEAR
                FROM kiosk_sessions session
                JOIN kiosk_definitions definition ON definition.id = session.kiosk_definition_id
                WHERE session.revoked_at IS NULL
                  AND (session.expires_at <= CURRENT_TIMESTAMP
                       OR %s)
                """.formatted(inactivityExpired)
        );
        return jdbcTemplate.update(
            """
                UPDATE kiosk_sessions session
                JOIN kiosk_definitions definition ON definition.id = session.kiosk_definition_id
                SET session.revoked_at = CURRENT_TIMESTAMP
                WHERE session.revoked_at IS NULL
                  AND (session.expires_at <= CURRENT_TIMESTAMP
                       OR %s)
                """.formatted(inactivityExpired)
        );
    }

    private String inactivityExpiredPredicate() {
        return """
            session.last_activity_at < TIMESTAMPADD(
                SECOND,
                -(CASE
                    WHEN definition.owner_module = 'PROCUREMENT'
                         AND definition.kiosk_type = 'supplier_portal' THEN 900
                    WHEN definition.owner_module = 'HUMAN_RESOURCES' THEN %d
                    WHEN definition.owner_module = 'EXPENSES' THEN %d
                    WHEN definition.owner_module = 'PETTY_CASH' THEN %d
                    WHEN definition.owner_module = 'PROCESS_TASKS' THEN %d
                    ELSE 180
                END),
                CURRENT_TIMESTAMP)
            """.formatted(
                hrInactivityTimeoutSeconds,
                expensesInactivityTimeoutSeconds,
                pettyCashInactivityTimeoutSeconds,
                processTasksInactivityTimeoutSeconds);
    }

    private static int timeoutSeconds(int configuredSeconds, int fallbackSeconds) {
        return Math.max(30, configuredSeconds > 0 ? configuredSeconds : fallbackSeconds);
    }

    @Scheduled(
            fixedDelayString = "${app.kiosk-engine.audit-retention-delay-ms:86400000}",
            initialDelayString = "${app.kiosk-engine.audit-retention-initial-delay-ms:3600000}")
    public int deleteAuditPastRetention() {
        return jdbcTemplate.update(
            "DELETE FROM kiosk_audit_events WHERE retain_until < CURRENT_TIMESTAMP");
    }
}
