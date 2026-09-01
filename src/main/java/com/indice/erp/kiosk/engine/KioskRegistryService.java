package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KioskRegistryService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final KioskPayloadProtectionService payloadProtection;

    public KioskRegistryService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            KioskPayloadProtectionService payloadProtection) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.payloadProtection = payloadProtection;
    }

    @Transactional
    public KioskResolvedDefinition resolvePublic(String ownerModule, String publicToken) {
        if (ownerModule == null || ownerModule.isBlank() || publicToken == null || publicToken.isBlank()) {
            throw new KioskUnavailableException();
        }
        var definitions = jdbcTemplate.query(
            definitionSelect() + " WHERE definition.owner_module = ? AND definition.public_token_hash = ?"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%' LIMIT 1",
            this::mapDefinition, ownerModule.trim(), sha256(publicToken.trim()));
        return requireOperational(definitions);
    }

    /** Resolves a known link for a minimized bootstrap even when its lifecycle is non-operational. */
    @Transactional
    public KioskResolvedDefinition resolvePublicForBootstrap(String ownerModule, String publicToken) {
        if (ownerModule == null || ownerModule.isBlank() || publicToken == null || publicToken.isBlank()) {
            throw new KioskUnavailableException();
        }
        var definitions = jdbcTemplate.query(
            definitionSelect() + " WHERE definition.owner_module = ? AND definition.public_token_hash = ?"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%' LIMIT 1",
            this::mapDefinition, ownerModule.trim(), sha256(publicToken.trim()));
        if (definitions.isEmpty()) {
            throw new KioskUnavailableException();
        }
        var definition = definitions.getFirst();
        if (definition.effectiveStatus(Instant.now()) == KioskDefinitionStatus.EXPIRED
                && definition.status() == KioskDefinitionStatus.ACTIVE) {
            jdbcTemplate.update(
                "UPDATE kiosk_definitions SET status = 'EXPIRED' WHERE id = ? AND status = 'ACTIVE'",
                definition.id());
            revokeSessions(definition.id());
            auditLifecycle(definition, "KIOSK_EXPIRED", "SUCCEEDED", 0L, "Configured validity ended");
        }
        return definition;
    }

    /** Canonical-token variant used before the owner module is known. */
    @Transactional
    public KioskResolvedDefinition resolvePublicForBootstrap(String publicToken) {
        if (publicToken == null || publicToken.isBlank()) {
            throw new KioskUnavailableException();
        }
        var definitions = jdbcTemplate.query(
            definitionSelect() + " WHERE definition.public_token_hash = ?"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%' LIMIT 1",
            this::mapDefinition, sha256(publicToken.trim()));
        if (definitions.isEmpty()) {
            throw new KioskUnavailableException();
        }
        var definition = definitions.getFirst();
        if (definition.effectiveStatus(Instant.now()) == KioskDefinitionStatus.EXPIRED
                && definition.status() == KioskDefinitionStatus.ACTIVE) {
            jdbcTemplate.update(
                "UPDATE kiosk_definitions SET status = 'EXPIRED' WHERE id = ? AND status = 'ACTIVE'",
                definition.id());
            revokeSessions(definition.id());
            auditLifecycle(definition, "KIOSK_EXPIRED", "SUCCEEDED", 0L,
                "Configured validity ended");
        }
        return definition;
    }

    @Transactional
    public KioskResolvedDefinition resolvePublic(String publicToken) {
        if (publicToken == null || publicToken.isBlank()) {
            throw new KioskUnavailableException();
        }
        var definitions = jdbcTemplate.query(
            definitionSelect() + " WHERE definition.public_token_hash = ?"
                + " AND definition.code NOT LIKE 'INDICE-EMPLOYEE-TOOL-%' LIMIT 1",
            this::mapDefinition,
            sha256(publicToken.trim())
        );
        return requireOperational(definitions);
    }

    private KioskResolvedDefinition requireOperational(List<KioskResolvedDefinition> definitions) {
        if (definitions.isEmpty()) {
            throw new KioskUnavailableException();
        }
        var definition = definitions.getFirst();
        var effective = definition.effectiveStatus(Instant.now());
        if (effective == KioskDefinitionStatus.EXPIRED && definition.status() == KioskDefinitionStatus.ACTIVE) {
            jdbcTemplate.update(
                "UPDATE kiosk_definitions SET status = 'EXPIRED' WHERE id = ? AND status = 'ACTIVE'",
                definition.id()
            );
            revokeSessions(definition.id());
            auditLifecycle(definition, "KIOSK_EXPIRED", "SUCCEEDED", 0L, "Configured validity ended");
        }
        if (!effective.operational()) {
            throw new KioskUnavailableException();
        }
        return definition;
    }

    public KioskResolvedDefinition requireByLegacyReference(
            long companyId,
            String ownerModule,
            long legacyReferenceId) {
        return requireByLegacyReference(companyId, ownerModule, null, legacyReferenceId);
    }

    public KioskResolvedDefinition requireByLegacyReference(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId) {
        var typePredicate = kioskType == null ? "" : " AND definition.kiosk_type = ?";
        var arguments = kioskType == null
            ? new Object[] { companyId, ownerModule, legacyReferenceId }
            : new Object[] { companyId, ownerModule, legacyReferenceId, kioskType };
        var definitions = jdbcTemplate.query(
            definitionSelect()
                + " WHERE definition.company_id = ? AND definition.owner_module = ?"
                + " AND definition.legacy_reference_id = ?" + typePredicate + " LIMIT 1",
            this::mapDefinition,
            arguments
        );
        if (definitions.isEmpty()) {
            throw new NoSuchElementException("Kiosk definition not found.");
        }
        return definitions.getFirst();
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void synchronizeScopeSnapshot(
            KioskResolvedDefinition definition,
            Long unitId,
            Long businessId) {
        if (java.util.Objects.equals(definition.unitId(), unitId)
                && java.util.Objects.equals(definition.businessId(), businessId)) {
            return;
        }
        jdbcTemplate.update(
            """
                UPDATE kiosk_definitions
                SET unit_id = ?, business_id = ?,
                    configuration_version = configuration_version + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ?
                """,
            unitId, businessId, definition.id(), definition.companyId());
        revokeSessions(definition.id());
        var updated = requireById(definition.companyId(), definition.id());
        auditLifecycle(updated, "KIOSK_SCOPE_CHANGED", "SUCCEEDED", 0L,
            "Module-owned organizational scope changed");
    }

    public KioskResolvedDefinition requireById(long companyId, long kioskDefinitionId) {
        var definitions = jdbcTemplate.query(
            definitionSelect() + " WHERE definition.company_id = ? AND definition.id = ? LIMIT 1",
            this::mapDefinition,
            companyId,
            kioskDefinitionId
        );
        if (definitions.isEmpty()) {
            throw new NoSuchElementException("Kiosk definition not found.");
        }
        return definitions.getFirst();
    }

    public List<KioskResolvedDefinition> list(long companyId, String ownerModule) {
        return jdbcTemplate.query(
            definitionSelect()
                + " WHERE definition.company_id = ? AND definition.owner_module = ?"
                + " ORDER BY definition.name ASC",
            this::mapDefinition,
            companyId,
            ownerModule
        );
    }

    public List<KioskResolvedDefinition> list(long companyId) {
        return jdbcTemplate.query(
            definitionSelect()
                + " WHERE definition.company_id = ?"
                + " ORDER BY definition.owner_module ASC, definition.name ASC",
            this::mapDefinition,
            companyId
        );
    }

    @Transactional
    public KioskResolvedDefinition registerLegacyDefinition(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId,
            String code,
            String name,
            String legacyStatus,
            Long unitId,
            Long businessId,
            Instant expiresAt,
            String publicToken,
            boolean legacyTokenRecoverable,
            long actorId) {
        return registerLegacyDefinition(
            companyId, ownerModule, kioskType, legacyReferenceId, code, name, legacyStatus,
            unitId, businessId, expiresAt, publicToken, legacyTokenRecoverable,
            KioskAccessLevel.CONTROLLED, "process-tasks", "es-MX", actorId);
    }

    @Transactional
    public KioskResolvedDefinition registerLegacyDefinitionWithLocation(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId,
            String code,
            String name,
            String legacyStatus,
            Long unitId,
            Long businessId,
            Long locationId,
            Instant expiresAt,
            String publicToken,
            boolean legacyTokenRecoverable,
            KioskAccessLevel accessLevel,
            String themeKey,
            String defaultLocale,
            long actorId) {
        return registerLegacyDefinitionInternal(
            companyId, ownerModule, kioskType, legacyReferenceId, code, name, legacyStatus,
            unitId, businessId, locationId, true, expiresAt, publicToken, legacyTokenRecoverable,
            accessLevel, themeKey, defaultLocale, actorId
        );
    }

    @Transactional
    public KioskResolvedDefinition registerLegacyDefinition(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId,
            String code,
            String name,
            String legacyStatus,
            Long unitId,
            Long businessId,
            Instant expiresAt,
            String publicToken,
            boolean legacyTokenRecoverable,
            KioskAccessLevel accessLevel,
            String themeKey,
            String defaultLocale,
            long actorId) {
        return registerLegacyDefinitionInternal(
            companyId, ownerModule, kioskType, legacyReferenceId, code, name, legacyStatus,
            unitId, businessId, null, false, expiresAt, publicToken, legacyTokenRecoverable,
            accessLevel, themeKey, defaultLocale, actorId
        );
    }

    private KioskResolvedDefinition registerLegacyDefinitionInternal(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId,
            String code,
            String name,
            String legacyStatus,
            Long unitId,
            Long businessId,
            Long locationId,
            boolean synchronizeLocation,
            Instant expiresAt,
            String publicToken,
            boolean legacyTokenRecoverable,
            KioskAccessLevel accessLevel,
            String themeKey,
            String defaultLocale,
            long actorId) {
        var status = fromLegacyStatus(legacyStatus, expiresAt);
        KioskResolvedDefinition previous = null;
        try {
            previous = requireByLegacyReference(
                companyId, ownerModule, kioskType, legacyReferenceId);
        } catch (NoSuchElementException ignored) {
            // The module row is being registered in the Engine for the first time.
        }
        if (previous != null) {
            if (previous.status().terminal()) {
                throw new IllegalStateException("A revoked kiosk cannot be edited.");
            }
            if (previous.status() == KioskDefinitionStatus.EXPIRED && status != KioskDefinitionStatus.EXPIRED) {
                throw new IllegalStateException("An expired kiosk cannot be reactivated by editing it.");
            }
        }
        var locationUpdate = synchronizeLocation ? ", location_id = VALUES(location_id)" : "";
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_definitions (
                    company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
                    status, unit_id, business_id, location_id, access_level,
                    audience, employee_center_enabled, employee_assignment_policy, expires_at,
                    public_token_hash, public_token_hint, protected_public_token,
                    legacy_token_recoverable,
                    theme_key, default_locale, configuration_version, adapter_version,
                    created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
                ON DUPLICATE KEY UPDATE
                    kiosk_type = VALUES(kiosk_type), code = VALUES(code), name = VALUES(name),
                    status = VALUES(status), unit_id = VALUES(unit_id), business_id = VALUES(business_id)%s,
                    access_level = VALUES(access_level), expires_at = VALUES(expires_at),
                    theme_key = VALUES(theme_key), default_locale = VALUES(default_locale),
                    updated_by = VALUES(updated_by),
                    configuration_version = configuration_version + 1
                """.formatted(locationUpdate),
            companyId, ownerModule, kioskType, legacyReferenceId, code, name, status.name(),
            unitId, businessId, locationId, accessLevel.name(),
            employeeCenterDefault(ownerModule, kioskType) ? "EMPLOYEE" : "EXTERNAL",
            employeeCenterDefault(ownerModule, kioskType), "EXPLICIT", timestamp(expiresAt),
            sha256(publicToken), tokenHint(publicToken), payloadProtection.protect(publicToken),
            legacyTokenRecoverable, themeKey, defaultLocale, actorId, actorId
        );
        var saved = requireByLegacyReference(
            companyId, ownerModule, kioskType, legacyReferenceId);
        if (previous == null) {
            auditLifecycle(saved, "KIOSK_CREATED", "SUCCEEDED", actorId, null);
            auditLifecycle(saved, "KIOSK_TOKEN_ISSUED", "SUCCEEDED", actorId, null);
        } else {
            auditLifecycle(saved, "KIOSK_UPDATED", "SUCCEEDED", actorId, null);
            if (previous.status() != saved.status()) {
                auditLifecycle(saved, "KIOSK_" + saved.status().name(), "SUCCEEDED", actorId, null);
            }
        }
        if (!saved.status().operational()) {
            revokeSessions(saved.id());
        }
        return saved;
    }

    @Transactional
    public void replacePublicToken(
            long companyId,
            String ownerModule,
            long legacyReferenceId,
            String publicToken,
            long actorId) {
        replacePublicToken(
            companyId, ownerModule, null, legacyReferenceId, publicToken, actorId);
    }

    @Transactional
    public void replacePublicToken(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId,
            String publicToken,
            long actorId) {
        var definition = requireByLegacyReference(
            companyId, ownerModule, kioskType, legacyReferenceId);
        if (definition.status().terminal()) {
            throw new IllegalStateException("A revoked kiosk cannot rotate its link.");
        }
        jdbcTemplate.update(
            """
                UPDATE kiosk_definitions
                SET public_token_hash = ?, public_token_hint = ?, protected_public_token = ?,
                    legacy_token_recoverable = 0,
                    updated_by = ?, configuration_version = configuration_version + 1
                WHERE id = ?
                """,
            sha256(publicToken), tokenHint(publicToken), payloadProtection.protect(publicToken),
            actorId, definition.id()
        );
        revokeSessions(definition.id());
        auditLifecycle(definition, "KIOSK_TOKEN_ROTATED", "SUCCEEDED", actorId, null);
    }

    public String recoverPublicToken(
            long companyId,
            String ownerModule,
            long legacyReferenceId) {
        return recoverPublicToken(companyId, ownerModule, null, legacyReferenceId);
    }

    public String recoverPublicToken(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId) {
        var definition = requireByLegacyReference(
            companyId, ownerModule, kioskType, legacyReferenceId);
        var values = jdbcTemplate.query(
            """
                SELECT protected_public_token
                FROM kiosk_definitions
                WHERE id = ? AND company_id = ? AND owner_module = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("protected_public_token"),
            definition.id(), companyId, ownerModule);
        if (values.isEmpty() || values.getFirst() == null || values.getFirst().isBlank()) {
            throw new IllegalStateException(
                "The current kiosk link is not recoverable. Regenerate access to issue a new link.");
        }
        return payloadProtection.reveal(values.getFirst());
    }

    public boolean publicTokenRecoverable(long companyId, long kioskDefinitionId) {
        var available = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM kiosk_definitions
                WHERE id = ? AND company_id = ?
                  AND protected_public_token IS NOT NULL
                  AND protected_public_token <> ''
                """,
            Integer.class, kioskDefinitionId, companyId);
        return available != null && available > 0;
    }

    public void touchPresence(long kioskDefinitionId) {
        jdbcTemplate.update(
            """
                UPDATE kiosk_definitions
                SET last_seen_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND (last_seen_at IS NULL
                       OR last_seen_at < CURRENT_TIMESTAMP - INTERVAL 30 SECOND)
                """,
            kioskDefinitionId);
    }

    @Transactional
    public KioskResolvedDefinition transition(
            long companyId,
            String ownerModule,
            long legacyReferenceId,
            KioskDefinitionStatus target,
            long actorId,
            String reason) {
        return transition(
            companyId, ownerModule, null, legacyReferenceId, target, actorId, reason);
    }

    @Transactional
    public KioskResolvedDefinition transition(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId,
            KioskDefinitionStatus target,
            long actorId,
            String reason) {
        var definition = requireByLegacyReference(
            companyId, ownerModule, kioskType, legacyReferenceId);
        requireTransition(definition.status(), target);
        jdbcTemplate.update(
            """
                UPDATE kiosk_definitions
                SET status = ?, updated_by = ?, configuration_version = configuration_version + 1
                WHERE id = ?
                """,
            target.name(), actorId, definition.id()
        );
        if (!target.operational()) {
            revokeSessions(definition.id());
        }
        auditLifecycle(definition, "KIOSK_" + target.name(), "SUCCEEDED", actorId, reason);
        return requireByLegacyReference(
            companyId, ownerModule, kioskType, legacyReferenceId);
    }

    @Transactional
    public KioskResolvedDefinition transitionById(
            long companyId,
            long kioskDefinitionId,
            KioskDefinitionStatus target,
            long actorId,
            String reason) {
        var definition = requireById(companyId, kioskDefinitionId);
        requireTransition(definition.status(), target);
        jdbcTemplate.update(
            "UPDATE kiosk_definitions SET status = ?, updated_by = ?,"
                + " configuration_version = configuration_version + 1 WHERE id = ?",
            target.name(), actorId, definition.id()
        );
        if (!target.operational()) {
            revokeSessions(definition.id());
        }
        auditLifecycle(definition, "KIOSK_" + target.name(), "SUCCEEDED", actorId, reason);
        return requireById(companyId, kioskDefinitionId);
    }

    @Transactional
    public KioskResolvedDefinition updateConfiguration(
            long companyId,
            String ownerModule,
            long legacyReferenceId,
            String name,
            Instant expiresAt,
            long actorId) {
        var definition = requireByLegacyReference(companyId, ownerModule, legacyReferenceId);
        if (definition.status().terminal()
                || definition.effectiveStatus(Instant.now()) == KioskDefinitionStatus.EXPIRED) {
            throw new IllegalStateException("A revoked or expired kiosk cannot be edited.");
        }
        if (name == null || name.isBlank() || name.trim().length() > 180) {
            throw new IllegalArgumentException("Kiosk name is invalid.");
        }
        if (expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            throw new IllegalArgumentException("Kiosk expiration must be in the future.");
        }
        jdbcTemplate.update(
            """
                UPDATE kiosk_definitions
                SET name = ?, expires_at = ?, updated_by = ?,
                    configuration_version = configuration_version + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
            name.trim(), timestamp(expiresAt), actorId, definition.id()
        );
        var updated = requireByLegacyReference(companyId, ownerModule, legacyReferenceId);
        auditLifecycle(updated, "KIOSK_UPDATED", "SUCCEEDED", actorId,
            "Name or validity updated");
        return updated;
    }

    @Transactional
    public KioskResolvedDefinition disableForInvalidScope(
            KioskResolvedDefinition definition,
            String reason) {
        var current = requireById(definition.companyId(), definition.id());
        if (current.status() == KioskDefinitionStatus.ACTIVE) {
            jdbcTemplate.update(
                """
                    UPDATE kiosk_definitions
                    SET status = 'DISABLED', updated_by = NULL,
                        configuration_version = configuration_version + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND status = 'ACTIVE'
                    """,
                current.id());
            revokeSessions(current.id());
            auditLifecycle(current, "KIOSK_DISABLED", "SUCCEEDED", 0L, reason);
        }
        return requireById(definition.companyId(), definition.id());
    }

    @Transactional
    public void deleteDefinition(
            long companyId,
            String ownerModule,
            long legacyReferenceId,
            long actorId,
            String reason) {
        deleteDefinition(
            companyId, ownerModule, null, legacyReferenceId, actorId, reason);
    }

    @Transactional
    public void deleteDefinition(
            long companyId,
            String ownerModule,
            String kioskType,
            long legacyReferenceId,
            long actorId,
            String reason) {
        var definition = requireByLegacyReference(
            companyId, ownerModule, kioskType, legacyReferenceId);
        auditLifecycle(definition, "KIOSK_DELETED", "SUCCEEDED", actorId, reason);
        revokeSessions(definition.id());
        jdbcTemplate.update("DELETE FROM kiosk_definitions WHERE id = ?", definition.id());
    }

    @Transactional
    public void synchronizeCapabilities(
            KioskResolvedDefinition definition,
            Iterable<KioskCapabilityDescriptor> descriptors) {
        for (var descriptor : descriptors) {
            jdbcTemplate.update(
                """
                    INSERT INTO kiosk_capabilities (
                        capability_key, capability_version, owner_module, operation_policy,
                        access_level, `sensitive`, mutation, input_contract_json,
                        result_contract_json, file_policy_json, enabled
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    ON DUPLICATE KEY UPDATE
                        owner_module = VALUES(owner_module), operation_policy = VALUES(operation_policy),
                        access_level = VALUES(access_level), `sensitive` = VALUES(`sensitive`),
                        mutation = VALUES(mutation), input_contract_json = VALUES(input_contract_json),
                        result_contract_json = VALUES(result_contract_json),
                        file_policy_json = VALUES(file_policy_json), enabled = 1
                    """,
                descriptor.key(), descriptor.version(), descriptor.ownerModule(),
                descriptor.operationPolicy().name(), descriptor.accessLevel().name(),
                descriptor.sensitive(), descriptor.mutation(), json(descriptor.inputContract()),
                json(descriptor.resultContract()), json(descriptor.filePolicy())
            );
            jdbcTemplate.update(
                """
                    INSERT INTO kiosk_definition_capabilities (
                        kiosk_definition_id, kiosk_capability_id, enabled
                    )
                    SELECT ?, capability.id, 1
                    FROM kiosk_capabilities capability
                    WHERE capability.capability_key = ? AND capability.capability_version = ?
                    ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)
                    """,
                definition.id(), descriptor.key(), descriptor.version()
            );
        }
    }

    public boolean capabilityEnabled(long definitionId, KioskCapabilityDescriptor descriptor) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM kiosk_definition_capabilities link
                JOIN kiosk_capabilities capability ON capability.id = link.kiosk_capability_id
                WHERE link.kiosk_definition_id = ? AND link.enabled = 1 AND capability.enabled = 1
                  AND capability.capability_key = ? AND capability.capability_version = ?
                """,
            Integer.class,
            definitionId,
            descriptor.key(),
            descriptor.version()
        );
        return count != null && count > 0;
    }

    private void requireTransition(KioskDefinitionStatus current, KioskDefinitionStatus target) {
        if (current.terminal()) {
            throw new IllegalStateException("A revoked or deleted kiosk cannot change state.");
        }
        if (target == KioskDefinitionStatus.DELETED || target == KioskDefinitionStatus.EXPIRED) {
            throw new IllegalArgumentException("Use expiration or audited deletion for that state.");
        }
        if (target == KioskDefinitionStatus.ACTIVE && current != KioskDefinitionStatus.DISABLED) {
            throw new IllegalStateException("Only a disabled kiosk can be enabled.");
        }
        if (target == KioskDefinitionStatus.DISABLED && current != KioskDefinitionStatus.ACTIVE) {
            throw new IllegalStateException("Only an active kiosk can be disabled.");
        }
    }

    private void revokeSessions(long definitionId) {
        jdbcTemplate.update(
            "UPDATE kiosk_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)"
                + " WHERE kiosk_definition_id = ? AND revoked_at IS NULL",
            definitionId
        );
    }

    private void auditLifecycle(
            KioskResolvedDefinition definition,
            String eventType,
            String outcome,
            long actorId,
            String reason) {
        var snapshot = Map.<String, Object>ofEntries(
            Map.entry("historical_kiosk_id", definition.id()),
            Map.entry("company_id", definition.companyId()),
            Map.entry("owner_module", definition.ownerModule()),
            Map.entry("kiosk_type", definition.kioskType()),
            Map.entry("legacy_reference_id", definition.legacyReferenceId() == null
                ? "" : definition.legacyReferenceId()),
            Map.entry("code", definition.code()),
            Map.entry("name", definition.name()),
            Map.entry("unit_id", definition.unitId() == null ? "" : definition.unitId()),
            Map.entry("business_id", definition.businessId() == null ? "" : definition.businessId()),
            Map.entry("location_id", definition.locationId() == null ? "" : definition.locationId()),
            Map.entry("reason", reason == null ? "" : reason)
        );
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_audit_events (
                    event_id, kiosk_definition_id, historical_kiosk_id, company_id, owner_module,
                    event_type, outcome, actor_type, actor_id, snapshot_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            UUID.randomUUID().toString(), definition.id(), definition.id(), definition.companyId(),
            definition.ownerModule(), eventType, outcome,
            actorId > 0 ? "USER" : "SYSTEM", actorId > 0 ? actorId : null, json(snapshot),
            Timestamp.from(Instant.now().plus(365, ChronoUnit.DAYS))
        );
    }

    private String definitionSelect() {
        return """
            SELECT definition.id, definition.company_id, definition.owner_module,
                   definition.kiosk_type, definition.legacy_reference_id, definition.code,
                   definition.name, definition.status, definition.unit_id, definition.business_id,
                   definition.location_id, definition.access_level, definition.expires_at,
                   definition.public_token_hint, definition.legacy_token_recoverable,
                   definition.configuration_version, definition.adapter_version
            FROM kiosk_definitions definition
            """;
    }

    private KioskResolvedDefinition mapDefinition(ResultSet rs, int rowNum) throws SQLException {
        var expiresAt = rs.getTimestamp("expires_at");
        return new KioskResolvedDefinition(
            rs.getLong("id"), rs.getLong("company_id"), rs.getString("owner_module"),
            rs.getString("kiosk_type"), rs.getObject("legacy_reference_id", Long.class),
            rs.getString("code"), rs.getString("name"),
            KioskDefinitionStatus.valueOf(rs.getString("status")),
            rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class),
            rs.getObject("location_id", Long.class),
            KioskAccessLevel.valueOf(rs.getString("access_level")),
            expiresAt == null ? null : expiresAt.toInstant(), rs.getString("public_token_hint"),
            rs.getBoolean("legacy_token_recoverable"), rs.getInt("configuration_version"),
            rs.getInt("adapter_version")
        );
    }

    private KioskDefinitionStatus fromLegacyStatus(String status, Instant expiresAt) {
        if (expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            return KioskDefinitionStatus.EXPIRED;
        }
        return "active".equalsIgnoreCase(status)
            ? KioskDefinitionStatus.ACTIVE
            : KioskDefinitionStatus.DISABLED;
    }

    private boolean employeeCenterDefault(String ownerModule, String kioskType) {
        return switch (ownerModule == null ? "" : ownerModule) {
            case "PROCESS_TASKS", "HUMAN_RESOURCES", "PETTY_CASH" -> true;
            default -> false;
        };
    }

    private Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private String tokenHint(String token) {
        var normalized = token == null ? "" : token.trim();
        if (normalized.isBlank()) {
            return "";
        }
        var visible = Math.min(4, normalized.length());
        return "..." + normalized.substring(normalized.length() - visible);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Kiosk audit snapshot is not serializable.", ex);
        }
    }
}
