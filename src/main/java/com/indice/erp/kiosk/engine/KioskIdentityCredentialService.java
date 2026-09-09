package com.indice.erp.kiosk.engine;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Central personal credentials used by module adapters without moving identity ownership into the Engine. */
@Service
public class KioskIdentityCredentialService {

    public static final String PROVIDER_CENTER_ORIGIN = "PROVIDER_CENTER_ADMIN";

    private final JdbcTemplate jdbcTemplate;

    public KioskIdentityCredentialService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> activePinHash(long companyId, String identityType, long identityId) {
        return pinCredential(companyId, identityType, identityId)
            .filter(credential -> "ACTIVE".equals(credential.status()))
            .map(PersonalPinCredential::secretHash)
            .filter(value -> value != null && !value.isBlank());
    }

    public Optional<String> activeProviderCenterPinHash(long companyId, long providerId) {
        return pinCredential(companyId, "PROVIDER", providerId)
            .filter(credential -> "ACTIVE".equalsIgnoreCase(credential.status()))
            .filter(credential -> PROVIDER_CENTER_ORIGIN.equals(credential.origin()))
            .map(PersonalPinCredential::secretHash)
            .filter(value -> value != null && !value.isBlank());
    }

    public Optional<PersonalPinCredential> pinCredential(
            long companyId,
            String identityType,
            long identityId) {
        var rows = jdbcTemplate.query(
            """
                SELECT secret_hash, status, credential_origin
                FROM kiosk_identity_credentials
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND credential_type = 'PIN'
                LIMIT 1
                """,
            (rs, rowNum) -> new PersonalPinCredential(
                rs.getString("secret_hash"), rs.getString("status"),
                rs.getString("credential_origin")),
            companyId, normalizeType(identityType), identityId
        );
        return rows.stream().findFirst();
    }

    @Transactional
    public void rotatePersonalPin(
            long companyId,
            String identityType,
            long identityId,
            String secretHash) {
        rotatePin(companyId, identityType, identityId, secretHash, "PERSONAL_ROTATION");
    }

    /**
     * Activates a provider specifically for the company-wide Provider Center.
     * Legacy module credentials deliberately use a different origin and cannot
     * grant access to the central multikiosk.
     */
    @Transactional
    public void rotateProviderCenterPin(long companyId, long providerId, String secretHash) {
        rotatePin(companyId, "PROVIDER", providerId, secretHash, PROVIDER_CENTER_ORIGIN);
    }

    private void rotatePin(
            long companyId,
            String identityType,
            long identityId,
            String secretHash,
            String credentialOrigin) {
        if (companyId <= 0 || identityId <= 0 || secretHash == null || secretHash.isBlank()) {
            throw new IllegalArgumentException("A valid personal PIN credential is required.");
        }
        var normalizedType = normalizeType(identityType);
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_identity_credentials (
                    company_id, identity_type, identity_id, credential_type,
                    credential_reference, secret_hash, status, credential_origin, rotated_at
                ) VALUES (?, ?, ?, 'PIN', ?, ?, 'ACTIVE', ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    credential_reference = VALUES(credential_reference),
                    secret_hash = VALUES(secret_hash), status = 'ACTIVE',
                    credential_origin = VALUES(credential_origin),
                    rotated_at = CURRENT_TIMESTAMP
                """,
            companyId, normalizedType, identityId,
            normalizedType.toLowerCase() + ":" + identityId, secretHash, credentialOrigin
        );
        if ("PROVIDER".equals(normalizedType)) {
            // The central factor is authoritative while legacy supplier links coexist.
            // Keeping both compatibility tables aligned prevents an old module link from
            // accepting a PIN that the Provider Center has already replaced.
            jdbcTemplate.update(
                """
                    UPDATE pos_supplier_portal_access
                    SET pin_hash = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ? AND provider_id = ?
                      AND status = 'ACTIVE' AND deleted_at IS NULL
                    """,
                secretHash, companyId, identityId);
            jdbcTemplate.update(
                """
                    UPDATE finance_payable_kiosk_provider_access
                    SET pin_hash = ?, failed_attempts = 0, locked_until = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ? AND provider_id = ? AND status = 'ACTIVE'
                    """,
                secretHash, companyId, identityId);
        }
        // The credential is personal across kiosks. A rotation must invalidate every
        // session established with the previous factor, while preserving grants.
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions
                SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND revoked_at IS NULL
                """,
            companyId, normalizedType, identityId
        );
        revokeMultiKioskSessions(companyId, normalizedType, identityId);
    }

    @Transactional
    public void revokeIfUnreferenced(
            long companyId,
            String identityType,
            long identityId,
            boolean stillGranted) {
        var normalizedType = normalizeType(identityType);
        if ("PROVIDER".equals(normalizedType)) {
            // Module-level compatibility access must never deactivate a PIN managed by
            // the central Provider Center.
            stillGranted = activeProviderCenterPinHash(companyId, identityId).isPresent()
                || providerHasOperationalModuleAccess(companyId, identityId);
        }
        if (stillGranted) {
            return;
        }
        var revoked = jdbcTemplate.update(
            """
                UPDATE kiosk_identity_credentials
                SET status = 'REVOKED', rotated_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND credential_type = 'PIN' AND status = 'ACTIVE'
                """,
            companyId, normalizedType, identityId
        );
        if (revoked > 0) {
            revokeMultiKioskSessions(companyId, normalizedType, identityId);
        }
    }

    /** Explicit central revocation. Unlike module cleanup, this always disables the identity. */
    @Transactional
    public void revokePersonalPin(long companyId, String identityType, long identityId) {
        var normalizedType = normalizeType(identityType);
        jdbcTemplate.update(
            """
                UPDATE kiosk_identity_credentials
                SET status = 'REVOKED', rotated_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND credential_type = 'PIN' AND status <> 'REVOKED'
                """,
            companyId, normalizedType, identityId);
        jdbcTemplate.update(
            """
                UPDATE kiosk_sessions
                SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                WHERE company_id = ? AND identity_type = ? AND identity_id = ?
                  AND revoked_at IS NULL
                """,
            companyId, normalizedType, identityId);
        revokeMultiKioskSessions(companyId, normalizedType, identityId);
    }

    /** Revokes only a PIN explicitly issued from the Provider Center administration. */
    @Transactional
    public void revokeProviderCenterPin(long companyId, long providerId) {
        var revoked = jdbcTemplate.update(
            """
                UPDATE kiosk_identity_credentials
                SET status = 'REVOKED', rotated_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND identity_type = 'PROVIDER' AND identity_id = ?
                  AND credential_type = 'PIN' AND credential_origin = ?
                  AND status <> 'REVOKED'
                """,
            companyId, providerId, PROVIDER_CENTER_ORIGIN);
        if (revoked > 0) {
            jdbcTemplate.update(
                """
                    UPDATE kiosk_sessions
                    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                    WHERE company_id = ? AND identity_type = 'PROVIDER' AND identity_id = ?
                      AND revoked_at IS NULL
                    """,
                companyId, providerId);
            revokeMultiKioskSessions(companyId, "PROVIDER", providerId);
        }
    }

    private boolean providerHasOperationalModuleAccess(long companyId, long providerId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM (
                    SELECT procurement.id
                    FROM pos_supplier_portal_access procurement
                    WHERE procurement.company_id = ? AND procurement.provider_id = ?
                      AND procurement.status = 'ACTIVE' AND procurement.deleted_at IS NULL
                      AND (procurement.expires_at IS NULL OR procurement.expires_at > CURRENT_TIMESTAMP)
                    UNION ALL
                    SELECT payable_access.id
                    FROM finance_payable_kiosk_provider_access payable_access
                    INNER JOIN finance_payable_kiosks payable_kiosk
                      ON payable_kiosk.id = payable_access.kiosk_id
                     AND payable_kiosk.company_id = payable_access.company_id
                     AND payable_kiosk.status = 'ACTIVE' AND payable_kiosk.deleted_at IS NULL
                    WHERE payable_access.company_id = ? AND payable_access.provider_id = ?
                      AND payable_access.status = 'ACTIVE'
                ) operational_access
                """,
            Integer.class, companyId, providerId, companyId, providerId);
        return count != null && count > 0;
    }

    private void revokeMultiKioskSessions(
            long companyId,
            String identityType,
            long identityId) {
        if ("USER".equals(identityType)) {
            jdbcTemplate.update(
                """
                    UPDATE multi_kiosk_sessions
                    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                    WHERE company_id = ? AND user_id = ? AND revoked_at IS NULL
                    """,
                companyId, identityId
            );
        } else if ("EMPLOYEE".equals(identityType)) {
            jdbcTemplate.update(
                """
                    UPDATE multi_kiosk_sessions
                    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                    WHERE company_id = ? AND user_company_id = ? AND revoked_at IS NULL
                    """,
                companyId, identityId
            );
        } else if ("PROVIDER".equals(identityType)) {
            jdbcTemplate.update(
                """
                    UPDATE multi_kiosk_sessions
                    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                    WHERE company_id = ? AND identity_type = 'PROVIDER' AND identity_id = ?
                      AND revoked_at IS NULL
                    """,
                companyId, identityId
            );
        }
    }

    private String normalizeType(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase();
        if (!List.of("USER", "EMPLOYEE", "PROVIDER", "CUSTOMER", "EXTERNAL_VERIFIED").contains(normalized)) {
            throw new IllegalArgumentException("Unsupported kiosk identity type.");
        }
        return normalized;
    }

    public record PersonalPinCredential(String secretHash, String status, String origin) {
    }
}
