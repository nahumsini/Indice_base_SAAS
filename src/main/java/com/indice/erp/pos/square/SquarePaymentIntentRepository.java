package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class SquarePaymentIntentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SquarePaymentIntentMapper mapper;

    public SquarePaymentIntentRepository(JdbcTemplate jdbcTemplate, SquarePaymentIntentMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public SquareRecords.PaymentIntent createOrFind(
        PosContext context, long registerId, long shiftId, SquareRecords.Terminal terminal,
        String idempotencyKey, BigDecimal amount, String currency, String payloadHash,
        String checkoutJson, Instant expiresAt) {
        try {
            var key = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var ps = connection.prepareStatement("""
                    INSERT INTO pos_square_terminal_payment_intents
                      (company_id, cash_register_id, shift_id, terminal_id, square_location_id,
                       square_device_id, idempotency_key, amount, currency_code, checkout_payload_sha256,
                       checkout_request_json, created_by_user_id, created_by_role, scope_type,
                       scope_unit_id, scope_business_id, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
                bindCreate(ps, context, registerId, shiftId, terminal, idempotencyKey, amount,
                    currency, payloadHash, checkoutJson, expiresAt);
                return ps;
            }, key);
            return findById(context, key.getKey().longValue()).orElseThrow();
        } catch (DuplicateKeyException ignored) {
            return findByIdempotency(context, idempotencyKey)
                .or(() -> listRecoverable(context, registerId, shiftId, 1).stream().findFirst())
                .orElseThrow();
        }
    }

    public Optional<SquareRecords.PaymentIntent> findById(PosContext context, long intentId) {
        return query("""
            WHERE company_id = ? AND id = ?
            """, context.companyId(), intentId);
    }

    public Optional<SquareRecords.PaymentIntent> findByIdempotency(PosContext context, String key) {
        return query("""
            WHERE company_id = ? AND idempotency_key = ?
            """, context.companyId(), key);
    }

    public Optional<SquareRecords.PaymentIntent> findByCheckout(long companyId, String checkoutId) {
        return query("""
            WHERE company_id = ? AND square_checkout_id = ?
            """, companyId, checkoutId);
    }

    public List<SquareRecords.PaymentIntent> listRecoverable(
            PosContext context, Long registerId, Long shiftId, int limit) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        var sql = new StringBuilder("""
            SELECT * FROM pos_square_terminal_payment_intents
            WHERE company_id = ? AND status IN ('WAITING', 'APPROVED', 'UNCERTAIN') AND pos_ticket_id IS NULL
            """);
        if (registerId != null) {
            sql.append(" AND cash_register_id = ?");
            params.add(registerId);
        }
        if (shiftId != null) {
            sql.append(" AND shift_id = ?");
            params.add(shiftId);
        }
        sql.append(" ORDER BY updated_at DESC, id DESC LIMIT ?");
        params.add(Math.max(1, Math.min(limit, 100)));
        return jdbcTemplate.query(sql.toString(), mapper::map, params.toArray());
    }

    public List<SquareRecords.PaymentIntent> findRecoveryBatch(Instant before, int limit) {
        return jdbcTemplate.query("""
            SELECT * FROM pos_square_terminal_payment_intents
            WHERE status IN ('WAITING', 'APPROVED', 'UNCERTAIN') AND pos_ticket_id IS NULL
              AND (expires_at IS NULL OR expires_at <= ? OR updated_at <= ?)
            ORDER BY updated_at ASC, id ASC
            LIMIT ?
            """, mapper::map, Timestamp.from(before), Timestamp.from(before), Math.max(1, Math.min(limit, 100)));
    }

    public Optional<SquareRecords.PaymentIntent> lockById(long companyId, long intentId) {
        return query("""
            WHERE company_id = ? AND id = ? FOR UPDATE
            """, companyId, intentId);
    }

    public void markSquareCreated(long id, String checkoutId, String requestJson, String responseJson) {
        jdbcTemplate.update("""
            UPDATE pos_square_terminal_payment_intents
            SET square_checkout_id = ?, square_request_json = ?, square_response_json = ?,
                status = 'WAITING', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'WAITING'
            """, checkoutId, requestJson, responseJson, id);
    }

    public void markGatewayStatus(long id, SquareRecords.GatewayStatus status) {
        jdbcTemplate.update("""
            UPDATE pos_square_terminal_payment_intents
            SET status = CASE WHEN status = 'APPROVED' THEN status ELSE ? END,
                square_payment_id = COALESCE(?, square_payment_id),
                square_response_json = COALESCE(?, square_response_json),
                failure_code = ?, failure_message = ?,
                completed_at = CASE WHEN ? IN ('APPROVED', 'DECLINED', 'CANCELLED')
                  THEN CURRENT_TIMESTAMP ELSE completed_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, status.status().name(), blank(status.squarePaymentId()), status.rawJson(),
            blank(status.failureCode()), blank(status.failureMessage()), status.status().name(), id);
    }

    public boolean markFinalized(long id, long ticketId) {
        return jdbcTemplate.update("""
            UPDATE pos_square_terminal_payment_intents
            SET status = 'APPROVED', pos_ticket_id = ?, completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND pos_ticket_id IS NULL
            """, ticketId, id) > 0;
    }

    public void incrementFinalizeAttempt(long id) {
        jdbcTemplate.update("""
            UPDATE pos_square_terminal_payment_intents
            SET finalize_attempts = finalize_attempts + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, id);
    }

    public void markFinalizationFailed(long id, String message) {
        jdbcTemplate.update("""
            UPDATE pos_square_terminal_payment_intents
            SET status = 'UNCERTAIN', failure_code = 'INDICE_FINALIZE_FAILED',
                failure_message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND pos_ticket_id IS NULL
            """, truncate(message, 500), id);
    }

    public String userName(long userId) {
        return jdbcTemplate.query("""
            SELECT COALESCE(NULLIF(full_name, ''), email) AS display_name
            FROM users
            WHERE id = ?
            """, (rs, row) -> rs.getString("display_name"), userId).stream()
            .findFirst().orElse("Square POS cashier");
    }

    private Optional<SquareRecords.PaymentIntent> query(String where, Object... params) {
        return jdbcTemplate.query("SELECT * FROM pos_square_terminal_payment_intents " + where,
            mapper::map, params).stream().findFirst();
    }

    private void bindCreate(java.sql.PreparedStatement ps, PosContext context, long registerId, long shiftId,
            SquareRecords.Terminal terminal, String key, java.math.BigDecimal amount, String currency,
            String payloadHash, String checkoutJson, Instant expiresAt) throws java.sql.SQLException {
        ps.setLong(1, context.companyId()); ps.setLong(2, registerId); ps.setLong(3, shiftId);
        ps.setLong(4, terminal.id()); ps.setString(5, terminal.squareLocationId());
        ps.setString(6, terminal.deviceId()); ps.setString(7, key); ps.setBigDecimal(8, amount);
        ps.setString(9, currency); ps.setString(10, payloadHash); ps.setString(11, checkoutJson);
        ps.setLong(12, context.userId()); ps.setString(13, context.role());
        ps.setString(14, context.scope().type().name()); ps.setObject(15, context.scope().unitId());
        ps.setObject(16, context.scope().businessId()); ps.setTimestamp(17, timestamp(expiresAt));
    }

    private Timestamp timestamp(Instant value) { return value == null ? null : Timestamp.from(value); }
    private String blank(String value) { return value == null || value.isBlank() ? null : value; }
    private String truncate(String value, int length) {
        return value == null || value.length() <= length ? value : value.substring(0, length);
    }
}
