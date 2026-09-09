package com.indice.erp.finance.payablekiosk;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class PayableKioskProviderAccessRepository {

    private static final String SELECT = """
            SELECT provider_access.*, provider.name AS provider_name, kiosk.name AS kiosk_name,
                   kiosk.public_access_token
            FROM finance_payable_kiosk_provider_access provider_access
            JOIN finance_providers provider ON provider.id = provider_access.provider_id
            JOIN finance_payable_kiosks kiosk ON kiosk.id = provider_access.kiosk_id
            """;

    private final JdbcTemplate jdbcTemplate;

    PayableKioskProviderAccessRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<PayableKioskProviderAccessRow> list(long companyId) {
        return jdbcTemplate.query(
                SELECT + " WHERE provider_access.company_id = ? AND kiosk.deleted_at IS NULL AND provider.deleted_at IS NULL ORDER BY provider_access.updated_at DESC, provider_access.id DESC",
                this::mapRow,
                companyId);
    }

    PayableKioskProviderAccessRow get(long companyId, long accessId) {
        return jdbcTemplate.query(
                SELECT + " WHERE provider_access.company_id = ? AND provider_access.id = ?",
                this::mapRow,
                companyId,
                accessId).stream().findFirst()
                .orElseThrow(() -> new NoSuchElementException("Provider kiosk access not found."));
    }

    List<PayableKioskProviderAccessRow> activeForKiosk(long kioskId) {
        return jdbcTemplate.query(
                SELECT + """
                 WHERE provider_access.kiosk_id = ? AND provider_access.status = 'ACTIVE'
                   AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                   AND kiosk.status = 'ACTIVE' AND kiosk.deleted_at IS NULL
                 ORDER BY provider_access.id ASC
                """,
                this::mapRow,
                kioskId);
    }

    List<PayableKioskProviderAccessRow> activeForProvider(long companyId, long providerId) {
        return jdbcTemplate.query(
            SELECT + """
             WHERE provider_access.company_id = ? AND provider_access.provider_id = ?
               AND provider_access.status = 'ACTIVE'
               AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
               AND kiosk.status = 'ACTIVE' AND kiosk.deleted_at IS NULL
             ORDER BY provider_access.updated_at DESC, provider_access.id DESC
            """,
            this::mapRow,
            companyId,
            providerId);
    }

    PayableKioskProviderAccessRow activeById(long accessId, long kioskId) {
        return jdbcTemplate.query(
                SELECT + """
                 WHERE provider_access.id = ? AND provider_access.kiosk_id = ? AND provider_access.status = 'ACTIVE'
                   AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                   AND kiosk.status = 'ACTIVE' AND kiosk.deleted_at IS NULL
                """,
                this::mapRow,
                accessId,
                kioskId).stream().findFirst()
                .orElseThrow(() -> new NoSuchElementException("Provider kiosk access is no longer active."));
    }

    PayableKioskProviderAccessRow issue(
            long companyId,
            long userId,
            long kioskId,
            long providerId,
            String pinHash) {
        jdbcTemplate.update(
                """
                INSERT INTO finance_payable_kiosk_provider_access (
                  company_id, kiosk_id, provider_id, pin_hash, status,
                  failed_attempts, locked_until, created_by_user_id, updated_by_user_id, revoked_at
                ) VALUES (?, ?, ?, ?, 'ACTIVE', 0, NULL, ?, ?, NULL)
                ON DUPLICATE KEY UPDATE
                  pin_hash = VALUES(pin_hash), status = 'ACTIVE', failed_attempts = 0,
                  locked_until = NULL, updated_by_user_id = VALUES(updated_by_user_id),
                  revoked_at = NULL
                """,
                companyId,
                kioskId,
                providerId,
                pinHash,
                userId,
                userId);
        return jdbcTemplate.query(
                SELECT + " WHERE provider_access.company_id = ? AND provider_access.kiosk_id = ? AND provider_access.provider_id = ?",
                this::mapRow,
                companyId,
                kioskId,
                providerId).stream().findFirst().orElseThrow();
    }

    void rotate(long companyId, long userId, long accessId, String pinHash) {
        jdbcTemplate.update(
                """
                UPDATE finance_payable_kiosk_provider_access
                SET pin_hash = ?, status = 'ACTIVE', failed_attempts = 0, locked_until = NULL,
                    revoked_at = NULL, updated_by_user_id = ?
                WHERE company_id = ? AND id = ?
                """,
                pinHash,
                userId,
                companyId,
                accessId);
    }

    void synchronizePersonalPin(long companyId, long providerId, long userId, String pinHash) {
        jdbcTemplate.update(
                """
                UPDATE finance_payable_kiosk_provider_access
                SET pin_hash = ?, failed_attempts = 0, locked_until = NULL,
                    updated_by_user_id = CASE WHEN ? > 0 THEN ? ELSE updated_by_user_id END
                WHERE company_id = ? AND provider_id = ? AND status = 'ACTIVE'
                """,
                pinHash,
                userId,
                userId,
                companyId,
                providerId);
    }

    void revoke(long companyId, long userId, long accessId) {
        jdbcTemplate.update(
                """
                UPDATE finance_payable_kiosk_provider_access
                SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP, updated_by_user_id = ?
                WHERE company_id = ? AND id = ?
                """,
                userId,
                companyId,
                accessId);
    }

    void markUsed(long accessId) {
        jdbcTemplate.update(
                "UPDATE finance_payable_kiosk_provider_access SET last_used_at = CURRENT_TIMESTAMP, failed_attempts = 0 WHERE id = ?",
                accessId);
    }

    boolean providerIsActive(long companyId, long providerId) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM finance_providers WHERE company_id = ? AND id = ? AND status = 'ACTIVE' AND deleted_at IS NULL",
                Integer.class,
                companyId,
                providerId);
        return count != null && count > 0;
    }

    boolean hasActiveAccess(long companyId, long providerId) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM finance_payable_kiosk_provider_access WHERE company_id = ? AND provider_id = ? AND status = 'ACTIVE'",
                Integer.class,
                companyId,
                providerId);
        return count != null && count > 0;
    }

    private PayableKioskProviderAccessRow mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new PayableKioskProviderAccessRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("kiosk_id"),
                rs.getLong("provider_id"),
                rs.getString("provider_name"),
                rs.getString("kiosk_name"),
                rs.getString("public_access_token"),
                rs.getString("pin_hash"),
                rs.getString("status"),
                instant(rs.getTimestamp("locked_until")));
    }

    private Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
