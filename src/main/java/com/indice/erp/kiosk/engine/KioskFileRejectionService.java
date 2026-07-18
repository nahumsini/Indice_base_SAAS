package com.indice.erp.kiosk.engine;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Persists file rejection evidence independently from the rejected action transaction. */
@Service
public class KioskFileRejectionService {

    private final JdbcTemplate jdbcTemplate;

    public KioskFileRejectionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean reject(
            KioskExecutionContext context,
            String versionedCapability,
            String moduleReference,
            String intentObjectKey,
            String cleanupObjectKey) {
        var updated = jdbcTemplate.update(
            """
                UPDATE kiosk_file_intents
                SET status = 'REJECTED', rejected_at = CURRENT_TIMESTAMP,
                    staging_object_key = ?
                WHERE kiosk_definition_id = ? AND session_id = ? AND module_reference = ?
                  AND object_key = ? AND status = 'PENDING'
                """,
            cleanupObjectKey, context.definition().id(), context.session().sessionId(), moduleReference,
            intentObjectKey);
        if (updated != 1) return false;
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, action_id, session_id, kiosk_definition_id, historical_kiosk_id,
                    company_id, owner_module, event_type, outcome, actor_type, actor_id,
                    capability_key, technical_detail_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'KIOSK_FILE_REJECTED', 'FAILED', ?, ?, ?,
                          JSON_OBJECT('object_key_hash', SHA2(?, 256)), ?)
                """,
            UUID.randomUUID().toString(), MDC.get("actionId"), context.session().sessionId(),
            context.definition().id(), context.definition().id(), context.definition().companyId(),
            context.ownerModule(), context.session().identityType(), context.session().identityId(),
            versionedCapability, intentObjectKey,
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS)));
        return true;
    }
}
