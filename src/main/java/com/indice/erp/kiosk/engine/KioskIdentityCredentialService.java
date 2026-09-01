package com.indice.erp.kiosk.engine;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Central personal credentials used by module adapters without moving identity ownership into the Engine. */
@Service
public class KioskIdentityCredentialService {

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
        if (companyId <= 0 || identityId <= 0 || secretHash == null || secretHash.isBlank()) {
            throw new IllegalArgumentException("A valid personal PIN credential is required.");
        }
        var normalizedType = normalizeType(identityType);
        jdbcTemplate.update(
            """
                INSERT INTO kiosk_identity_credentials (
                    company_id, identity_type, identity_id, credential_type,
                    credential_reference, secret_hash, status, credential_origin, rotated_at
                ) VALUES (?, ?, ?, 'PIN', ?, ?, 'ACTIVE', 'PERSONAL_ROTATION', CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    credential_reference = VALUES(credential_reference),
                    secret_hash = VALUES(secret_hash), status = 'ACTIVE',
                    credential_origin = 'PERSONAL_ROTATION',
                    rotated_at = CURRENT_TIMESTAMP
                """,
            companyId, normalizedType, identityId,
            normalizedType.toLowerCase() + ":" + identityId, secretHash
        );
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
        if (stillGranted) {
            return;
        }
        var normalizedType = normalizeType(identityType);
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
