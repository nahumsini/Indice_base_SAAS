package com.indice.erp.kiosk.engine;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskGrantService {

    private static final Set<String> IDENTITY_TYPES = Set.of(
        "USER", "EMPLOYEE", "PROVIDER", "CUSTOMER", "EXTERNAL_VERIFIED", "PUBLIC");
    private final JdbcTemplate jdbcTemplate;

    public KioskGrantService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> list(KioskResolvedDefinition definition) {
        return jdbcTemplate.query(
            """
                SELECT id, identity_type, identity_id, capability_key, status, source,
                       granted_by, created_at, revoked_at
                FROM kiosk_grants
                WHERE kiosk_definition_id = ?
                ORDER BY status ASC, created_at DESC
                """,
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"),
                "identity_type", rs.getString("identity_type"),
                "identity_id", rs.getLong("identity_id"),
                "capability_key", rs.getString("capability_key"),
                "status", rs.getString("status"),
                "source", rs.getString("source"),
                "created_at", rs.getTimestamp("created_at").toInstant().toString()
            ),
            definition.id()
        );
    }

    @Transactional
    public Map<String, Object> grant(
            KioskResolvedDefinition definition,
            String identityType,
            long identityId,
            String capabilityKey,
            long actorId) {
        var normalizedIdentityType = identityType == null ? "" : identityType.trim().toUpperCase();
        if (!IDENTITY_TYPES.contains(normalizedIdentityType) || identityId <= 0) {
            throw new IllegalArgumentException("A valid kiosk identity is required.");
        }
        var normalizedCapability = capabilityKey == null || capabilityKey.isBlank()
            ? "*" : capabilityKey.trim();
        if (!"*".equals(normalizedCapability) && !capabilityAvailable(definition.id(), normalizedCapability)) {
            throw new IllegalArgumentException("Capability is not enabled for this kiosk.");
        }
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_grants (
                    kiosk_definition_id, identity_type, identity_id, capability_key,
                    status, source, granted_by
                ) VALUES (?, ?, ?, ?, 'ACTIVE', 'ADMIN', ?)
                ON DUPLICATE KEY UPDATE status = 'ACTIVE', source = 'ADMIN',
                    granted_by = VALUES(granted_by), revoked_at = NULL
                """,
            definition.id(), normalizedIdentityType, identityId, normalizedCapability, actorId
        );
        var grantId = jdbcTemplate.queryForObject(
            """
                SELECT id FROM kiosk_grants
                WHERE kiosk_definition_id = ? AND identity_type = ? AND identity_id = ?
                  AND capability_key = ?
                LIMIT 1
                """,
            Long.class,
            definition.id(), normalizedIdentityType, identityId, normalizedCapability
        );
        audit(definition, "KIOSK_GRANT_CREATED", actorId, grantId);
        return Map.of(
            "id", grantId == null ? 0L : grantId,
            "identity_type", normalizedIdentityType,
            "identity_id", identityId,
            "capability_key", normalizedCapability,
            "status", "ACTIVE"
        );
    }

    @Transactional
    public void revoke(KioskResolvedDefinition definition, long grantId, long actorId) {
        var updated = jdbcTemplate.update(
            """
                UPDATE kiosk_grants
                SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP
                WHERE id = ? AND kiosk_definition_id = ? AND status = 'ACTIVE'
                """,
            grantId, definition.id()
        );
        if (updated == 0) {
            throw new NoSuchElementException("Kiosk grant not found.");
        }
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions session
                JOIN kiosk_grants grant
                  ON grant.kiosk_definition_id = session.kiosk_definition_id
                 AND grant.identity_type = session.identity_type
                 AND grant.identity_id = session.identity_id
                SET session.revoked_at = COALESCE(session.revoked_at, CURRENT_TIMESTAMP)
                WHERE grant.id = ? AND session.revoked_at IS NULL
                """,
            grantId
        );
        audit(definition, "KIOSK_GRANT_REVOKED", actorId, grantId);
    }

    @Transactional
    public void revokeIdentity(
            KioskResolvedDefinition definition,
            String identityType,
            long identityId,
            long actorId) {
        var normalizedType = identityType == null ? "" : identityType.trim().toUpperCase();
        var grantIds = jdbcTemplate.query(
            """
                SELECT id FROM kiosk_grants
                WHERE kiosk_definition_id = ? AND identity_type = ? AND identity_id = ?
                  AND status = 'ACTIVE'
                """,
            (rs, rowNum) -> rs.getLong("id"), definition.id(), normalizedType, identityId
        );
        if (grantIds.isEmpty()) {
            return;
        }
        jdbcTemplate.update(
            """
                UPDATE kiosk_grants SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP
                WHERE kiosk_definition_id = ? AND identity_type = ? AND identity_id = ?
                  AND status = 'ACTIVE'
                """,
            definition.id(), normalizedType, identityId
        );
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                WHERE kiosk_definition_id = ? AND identity_type = ? AND identity_id = ?
                  AND revoked_at IS NULL
                """,
            definition.id(), normalizedType, identityId
        );
        for (var grantId : grantIds) {
            audit(definition, "KIOSK_GRANT_REVOKED", actorId, grantId);
        }
    }

    public boolean hasActiveIdentityGrant(
            long companyId,
            String identityType,
            long identityId) {
        var normalizedType = identityType == null ? "" : identityType.trim().toUpperCase();
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM kiosk_grants grant
                JOIN kiosk_definitions definition ON definition.id = grant.kiosk_definition_id
                WHERE definition.company_id = ? AND grant.identity_type = ?
                  AND grant.identity_id = ? AND grant.status = 'ACTIVE'
                  AND definition.status IN ('ACTIVE', 'DISABLED')
                """,
            Integer.class, companyId, normalizedType, identityId);
        return count != null && count > 0;
    }

    private boolean capabilityAvailable(long definitionId, String capabilityKey) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM kiosk_definition_capabilities link
                JOIN kiosk_capabilities capability ON capability.id = link.kiosk_capability_id
                WHERE link.kiosk_definition_id = ? AND link.enabled = 1 AND capability.enabled = 1
                  AND (capability.capability_key = ? OR CONCAT(capability.capability_key, '@',
                      capability.capability_version) = ?)
                """,
            Integer.class,
            definitionId, capabilityKey, capabilityKey
        );
        return count != null && count > 0;
    }

    private void audit(KioskResolvedDefinition definition, String eventType, long actorId, Long grantId) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, kiosk_definition_id, historical_kiosk_id, company_id, owner_module,
                    event_type, outcome, actor_type, actor_id, technical_detail_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, 'SUCCEEDED', 'USER', ?,
                          JSON_OBJECT('grant_id', ?), ?)
                """,
            UUID.randomUUID().toString(), definition.id(), definition.id(), definition.companyId(),
            definition.ownerModule(), eventType, actorId, grantId,
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS))
        );
    }
}
