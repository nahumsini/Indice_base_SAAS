package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskSessionService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final Duration DEFAULT_INACTIVITY_TIMEOUT = Duration.ofMinutes(3);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Duration hrInactivityTimeout;
    private final Duration expensesInactivityTimeout;
    private final Duration pettyCashInactivityTimeout;
    private final Duration processTasksInactivityTimeout;

    @Autowired
    public KioskSessionService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            @Value("${app.hr.kiosk.inactivity-timeout-seconds:180}") int hrInactivityTimeoutSeconds,
            @Value("${app.expenses.kiosk.inactivity-timeout-seconds:300}") int expensesInactivityTimeoutSeconds,
            @Value("${app.petty-cash.kiosk.inactivity-timeout-seconds:900}") int pettyCashInactivityTimeoutSeconds,
            @Value("${app.process-tasks.kiosk.inactivity-timeout-seconds:1800}") int processTasksInactivityTimeoutSeconds) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.hrInactivityTimeout = durationSeconds(hrInactivityTimeoutSeconds, 180);
        this.expensesInactivityTimeout = durationSeconds(expensesInactivityTimeoutSeconds, 300);
        this.pettyCashInactivityTimeout = durationSeconds(pettyCashInactivityTimeoutSeconds, 900);
        this.processTasksInactivityTimeout = durationSeconds(processTasksInactivityTimeoutSeconds, 1800);
    }

    KioskSessionService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this(jdbcTemplate, objectMapper, 180, 300, 900, 1800);
    }

    @Transactional
    public KioskSessionPrincipal createControlledSession(
            KioskResolvedDefinition definition,
            String identityType,
            long identityId,
            String accessToken,
            String browserSessionReference,
            Set<String> grantedCapabilities,
            Instant expiresAt) {
        if (requiresPreexistingGrant(definition)) {
            requireGrant(definition.id(), identityType, identityId);
        } else {
            ensureGrant(definition.id(), identityType, identityId);
        }
        var sessionId = UUID.randomUUID().toString();
        var effectiveExpiry = expiresAt == null
            ? Instant.now().plus(Duration.ofHours(8))
            : expiresAt;
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_sessions (
                    session_id, kiosk_definition_id, company_id, channel, access_level,
                    identity_type, identity_id, access_token_hash, browser_session_hash,
                    verified_factors_json, granted_capabilities_json, scope_snapshot_json,
                    expires_at
                ) VALUES (?, ?, ?, 'PUBLIC_LINK', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            sessionId, definition.id(), definition.companyId(), definition.accessLevel().name(),
            identityType, identityId, sha256(accessToken), hashNullable(browserSessionReference),
            json(List.of("PIN")), json(grantedCapabilities),
            json(Map.of(
                "company_id", definition.companyId(),
                "unit_id", definition.unitId() == null ? "" : definition.unitId(),
                "business_id", definition.businessId() == null ? "" : definition.businessId()
            )),
            Timestamp.from(effectiveExpiry)
        );
        auditSession(definition, sessionId, identityType, identityId, "KIOSK_SESSION_CREATED", "SUCCEEDED");
        return new KioskSessionPrincipal(
            sessionId, definition.id(), definition.companyId(), identityType, identityId,
            Set.copyOf(grantedCapabilities), effectiveExpiry);
    }

    /**
     * Creates a controlled session with an Engine-owned token.
     *
     * <p>The module identification token remains private to the module workflow. Keeping both
     * tokens separate prevents legacy token refresh or expiry rules from changing the Engine
     * session identity midway through a public kiosk flow.
     */
    @Transactional
    public KioskSessionLaunch createControlledSessionLaunch(
            KioskResolvedDefinition definition,
            String identityType,
            long identityId,
            String browserSessionReference,
            Set<String> grantedCapabilities,
            Instant expiresAt) {
        var accessToken = randomToken();
        var session = createControlledSession(
            definition, identityType, identityId, accessToken, browserSessionReference,
            grantedCapabilities, expiresAt);
        return new KioskSessionLaunch(session, accessToken);
    }

    @Transactional
    public KioskSessionLaunch createAuthenticatedIndexSession(
            KioskResolvedDefinition definition,
            long userIdentityId,
            String browserSessionReference,
            Set<String> grantedCapabilities) {
        if (userIdentityId <= 0 || grantedCapabilities == null || grantedCapabilities.isEmpty()) {
            throw new SecurityException("No kiosk capability is available for this user.");
        }
        ensureInternalPolicyGrant(definition.id(), userIdentityId);
        var rawToken = randomToken();
        var sessionId = UUID.randomUUID().toString();
        var expiresAt = Instant.now().plus(Duration.ofHours(8));
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_sessions (
                    session_id, kiosk_definition_id, company_id, channel, access_level,
                    identity_type, identity_id, access_token_hash, browser_session_hash,
                    verified_factors_json, granted_capabilities_json, scope_snapshot_json,
                    expires_at
                ) VALUES (?, ?, ?, 'AUTHENTICATED_WEB', 'CONTROLLED', 'USER', ?, ?, ?, ?, ?, ?, ?)
                """,
            sessionId, definition.id(), definition.companyId(), userIdentityId, sha256(rawToken),
            hashNullable(browserSessionReference), json(List.of("INDEX_SESSION")),
            json(grantedCapabilities),
            json(Map.of(
                "company_id", definition.companyId(),
                "unit_id", definition.unitId() == null ? "" : definition.unitId(),
                "business_id", definition.businessId() == null ? "" : definition.businessId()
            )),
            Timestamp.from(expiresAt)
        );
        auditSession(definition, sessionId, "USER", userIdentityId,
            "KIOSK_SESSION_CREATED", "SUCCEEDED");
        var principal = new KioskSessionPrincipal(
            sessionId, definition.id(), definition.companyId(), "USER", userIdentityId,
            Set.copyOf(grantedCapabilities), expiresAt);
        return new KioskSessionLaunch(principal, rawToken);
    }

    @Transactional
    public KioskSessionPrincipal requireSession(
            KioskResolvedDefinition definition,
            KioskCapabilityDescriptor capability,
            Map<String, Object> payload,
            String browserSessionReference) {
        var accessToken = tokenFrom(payload);
        if (accessToken == null) {
            throw new SecurityException("Kiosk authentication is required.");
        }
        var rows = jdbcTemplate.query(
            """
                SELECT session_id, kiosk_definition_id, company_id, identity_type, identity_id,
                       granted_capabilities_json, last_activity_at, expires_at, revoked_at,
                       browser_session_hash
                FROM kiosk_sessions
                WHERE kiosk_definition_id = ? AND access_token_hash = ?
                LIMIT 1
                """,
            (rs, rowNum) -> {
                var lastActivity = rs.getTimestamp("last_activity_at").toInstant();
                var expiresAt = rs.getTimestamp("expires_at").toInstant();
                var revokedAt = rs.getTimestamp("revoked_at");
                var browserHash = rs.getString("browser_session_hash");
                if (revokedAt != null || !expiresAt.isAfter(Instant.now())
                        || lastActivity.plus(inactivityTimeout(definition)).isBefore(Instant.now())) {
                    throw new SecurityException("Kiosk session expired.");
                }
                if (browserHash != null && !browserHash.equals(hashNullable(browserSessionReference))) {
                    throw new SecurityException("Kiosk session does not belong to this browser.");
                }
                return new KioskSessionPrincipal(
                    rs.getString("session_id"), rs.getLong("kiosk_definition_id"),
                    rs.getLong("company_id"), rs.getString("identity_type"),
                    rs.getLong("identity_id"), stringSet(rs.getString("granted_capabilities_json")),
                    expiresAt
                );
            },
            definition.id(), sha256(accessToken)
        );
        if (rows.isEmpty()) {
            throw new SecurityException("Kiosk authentication is required.");
        }
        var session = rows.getFirst();
        if (!session.grantedCapabilities().contains(capability.versionedKey())) {
            throw new SecurityException("Kiosk capability is not granted.");
        }
        if (!hasGrant(definition.id(), session.identityType(), session.identityId(), capability.key())) {
            throw new SecurityException("Kiosk grant is not active.");
        }
        jdbcTemplate.update(
            "UPDATE kiosk_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE session_id = ?",
            session.sessionId()
        );
        return session;
    }

    @Transactional
    public void revoke(String sessionId, KioskResolvedDefinition definition) {
        jdbcTemplate.update(
            "UPDATE kiosk_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE session_id = ?",
            sessionId
        );
        auditSession(definition, sessionId, null, null, "KIOSK_SESSION_REVOKED", "SUCCEEDED");
    }

    /** Records a specialized module verification without moving the biometric template into the Engine. */
    @Transactional
    public void recordVerifiedFactor(KioskSessionPrincipal session, String factor) {
        if (session == null || factor == null || factor.isBlank()) {
            throw new SecurityException("Kiosk session is not valid.");
        }
        var normalized = factor.trim().toUpperCase();
        if (!"FACE".equals(normalized)) {
            throw new IllegalArgumentException("Unsupported kiosk verification factor.");
        }
        var updated = jdbcTemplate.update(
            """
                UPDATE kiosk_sessions
                SET verified_factors_json = JSON_ARRAY('PIN', 'FACE'),
                    last_face_verified_at = CURRENT_TIMESTAMP,
                    last_activity_at = CURRENT_TIMESTAMP
                WHERE session_id = ? AND kiosk_definition_id = ?
                  AND identity_type = ? AND identity_id = ?
                  AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
                """,
            session.sessionId(), session.kioskDefinitionId(),
            session.identityType(), session.identityId()
        );
        if (updated != 1) {
            throw new SecurityException("Kiosk session is not valid.");
        }
    }

    private void ensureGrant(long definitionId, String identityType, long identityId) {
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO kiosk_grants (
                    kiosk_definition_id, identity_type, identity_id, capability_key, status, source
                ) VALUES (?, ?, ?, '*', 'ACTIVE', 'AUTO_SCOPE')
                """,
            definitionId, identityType, identityId
        );
        if (!hasGrant(definitionId, identityType, identityId, "*")) {
            throw new SecurityException("Kiosk grant is not active.");
        }
    }

    private void requireGrant(long definitionId, String identityType, long identityId) {
        if (!hasGrant(definitionId, identityType, identityId, "*")) {
            throw new SecurityException("Kiosk grant is not active.");
        }
    }

    private boolean requiresPreexistingGrant(KioskResolvedDefinition definition) {
        return "PROCUREMENT".equals(definition.ownerModule())
            && "supplier_portal".equals(definition.kioskType());
    }

    private void ensureInternalPolicyGrant(long definitionId, long identityId) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_grants (
                    kiosk_definition_id, identity_type, identity_id, capability_key, status, source
                ) VALUES (?, 'USER', ?, '*', 'ACTIVE', 'INTERNAL_POLICY')
                ON DUPLICATE KEY UPDATE
                    status = 'ACTIVE', source = 'INTERNAL_POLICY', revoked_at = NULL
                """,
            definitionId, identityId
        );
    }

    private boolean hasGrant(long definitionId, String identityType, long identityId, String capabilityKey) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM kiosk_grants
                WHERE kiosk_definition_id = ? AND identity_type = ? AND identity_id = ?
                  AND status = 'ACTIVE' AND capability_key IN ('*', ?)
                """,
            Integer.class,
            definitionId, identityType, identityId, capabilityKey
        );
        return count != null && count > 0;
    }

    private String tokenFrom(Map<String, Object> payload) {
        if (payload == null) {
            return null;
        }
        for (var key : List.of("kiosk_session_token", "identification_token", "identificationToken")) {
            var value = payload.get(key);
            if (value != null && !String.valueOf(value).isBlank()) {
                return String.valueOf(value).trim();
            }
        }
        return null;
    }

    private Set<String> stringSet(String json) {
        try {
            return new LinkedHashSet<>(objectMapper.readValue(json, STRING_LIST));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Stored kiosk session capabilities are invalid.", ex);
        }
    }

    private Duration inactivityTimeout(KioskResolvedDefinition definition) {
        if ("PROCUREMENT".equals(definition.ownerModule())
                && "supplier_portal".equals(definition.kioskType())) {
            return Duration.ofMinutes(15);
        }
        return switch (definition.ownerModule()) {
            case "HUMAN_RESOURCES" -> hrInactivityTimeout;
            case "EXPENSES" -> expensesInactivityTimeout;
            case "PETTY_CASH" -> pettyCashInactivityTimeout;
            case "PROCESS_TASKS" -> processTasksInactivityTimeout;
            default -> DEFAULT_INACTIVITY_TIMEOUT;
        };
    }

    private static Duration durationSeconds(int configuredSeconds, int fallbackSeconds) {
        return Duration.ofSeconds(Math.max(30, configuredSeconds > 0 ? configuredSeconds : fallbackSeconds));
    }

    private void auditSession(
            KioskResolvedDefinition definition,
            String sessionId,
            String actorType,
            Long actorId,
            String eventType,
            String outcome) {
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, session_id, kiosk_definition_id, historical_kiosk_id, company_id,
                    owner_module, event_type, outcome, actor_type, actor_id, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString(), sessionId, definition.id(), definition.id(),
            definition.companyId(), definition.ownerModule(), eventType, outcome, actorType, actorId,
            Timestamp.from(Instant.now().plus(Duration.ofDays(365)))
        );
    }

    private String hashNullable(String value) {
        return value == null || value.isBlank() ? null : sha256(value.trim());
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private String randomToken() {
        var bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Kiosk session value is not serializable.", ex);
        }
    }
}
