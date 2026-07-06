package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.payablekiosk.dto.PayableKioskRequest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class PayableKioskRepository {

    private final JdbcTemplate jdbcTemplate;

    PayableKioskRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<PayableKioskRow> list(long companyId) {
        return jdbcTemplate.query(
                """
                SELECT * FROM finance_payable_kiosks
                WHERE company_id = ? AND deleted_at IS NULL
                ORDER BY created_at DESC, id DESC
                """,
                this::mapRow,
                companyId);
    }

    PayableKioskRow getById(long companyId, long kioskId) {
        var rows = jdbcTemplate.query(
                "SELECT * FROM finance_payable_kiosks WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
                this::mapRow,
                companyId,
                kioskId);
        return rows.stream().findFirst().orElseThrow(() -> new NoSuchElementException("Payable kiosk not found."));
    }

    PayableKioskRow getByToken(String token) {
        var rows = jdbcTemplate.query(
                "SELECT * FROM finance_payable_kiosks WHERE public_access_token = ? AND deleted_at IS NULL",
                this::mapRow,
                token);
        return rows.stream().findFirst().orElseThrow(() -> new NoSuchElementException("Payable kiosk not found."));
    }

    boolean codeExists(long companyId, String code, Long excludedId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_payable_kiosks
                WHERE company_id = ? AND code = ? AND deleted_at IS NULL
                  AND (? IS NULL OR id <> ?)
                """,
                Integer.class,
                companyId,
                code,
                excludedId,
                excludedId);
        return count != null && count > 0;
    }

    boolean tokenExists(String token) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM finance_payable_kiosks WHERE public_access_token = ?",
                Integer.class,
                token);
        return count != null && count > 0;
    }

    void insert(long companyId, long userId, PayableKioskRequest request, String token, String pinHash, String metadataJson) {
        jdbcTemplate.update(
                """
                INSERT INTO finance_payable_kiosks (
                  company_id, unit_id, business_id, provider_id, code, name, status, access_type,
                  public_access_token, pin_hash, currency_code, allow_provider_registration,
                  created_by_user_id, metadata_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                companyId,
                request.unitId(),
                request.businessId(),
                request.providerId(),
                PayableKioskRules.normalizeCode(request.code()),
                request.name().trim(),
                PayableKioskRules.normalizeStatus(request.status()),
                PayableKioskRules.normalizeAccessType(request.accessType()),
                token,
                pinHash,
                PayableKioskRules.normalizeCurrency(request.currencyCode()),
                Boolean.TRUE.equals(request.allowProviderRegistration()),
                userId,
                metadataJson);
    }

    void update(PayableKioskRow existing, long userId, PayableKioskRequest request) {
        jdbcTemplate.update(
                """
                UPDATE finance_payable_kiosks
                SET unit_id = ?, business_id = ?, provider_id = ?, code = ?, name = ?,
                    status = ?, access_type = ?, currency_code = ?, allow_provider_registration = ?,
                    updated_by_user_id = ?, version = version + 1
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                """,
                request.unitId(),
                request.businessId(),
                request.providerId(),
                PayableKioskRules.normalizeCode(request.code()),
                request.name().trim(),
                PayableKioskRules.normalizeStatus(request.status()),
                PayableKioskRules.normalizeAccessType(request.accessType()),
                PayableKioskRules.normalizeCurrency(request.currencyCode()),
                Boolean.TRUE.equals(request.allowProviderRegistration()),
                userId,
                existing.companyId(),
                existing.id());
    }

    void updatePin(long companyId, long userId, long kioskId, String pinHash) {
        jdbcTemplate.update(
                """
                UPDATE finance_payable_kiosks
                SET pin_hash = ?, updated_by_user_id = ?, version = version + 1
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                """,
                pinHash,
                userId,
                companyId,
                kioskId);
    }

    void softDelete(long companyId, long userId, long kioskId) {
        jdbcTemplate.update(
                """
                UPDATE finance_payable_kiosks
                SET deleted_at = CURRENT_TIMESTAMP, updated_by_user_id = ?, version = version + 1
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                """,
                userId,
                companyId,
                kioskId);
    }

    private PayableKioskRow mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new PayableKioskRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                nullableLong(rs, "unit_id"),
                nullableLong(rs, "business_id"),
                nullableLong(rs, "provider_id"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("status"),
                rs.getString("access_type"),
                rs.getString("public_access_token"),
                rs.getString("pin_hash"),
                rs.getString("currency_code"),
                rs.getBoolean("allow_provider_registration"));
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    static void setLong(java.sql.PreparedStatement statement, int index, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
        } else {
            statement.setLong(index, value);
        }
    }
}
