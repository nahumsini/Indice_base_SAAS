package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class SquareIntentInsert {
    private final JdbcTemplate jdbc;
    private final SquareIntentQueries queries;
    SquareIntentInsert(JdbcTemplate jdbc, SquareIntentQueries queries) {
        this.jdbc = jdbc;
        this.queries = queries;
    }
    SquareRecords.PaymentIntent create(PosContext context, long register, long shift, SquareRecords.Terminal terminal,
            String idempotency, BigDecimal amount, String currency, String hash, String json, Instant expires) {
        try {
            var key = new GeneratedKeyHolder();
            var values = new Object[]{context.companyId(), register, shift, terminal.id(), terminal.squareLocationId(),
                terminal.deviceId(), idempotency, amount, currency, hash, json, context.userId(), context.role(),
                context.scope().type().name(), context.scope().unitId(), context.scope().businessId(),
                expires == null ? null : Timestamp.from(expires)};
            jdbc.update(connection -> {
                var statement = connection.prepareStatement("""
                    INSERT INTO pos_square_terminal_payment_intents
                      (company_id, cash_register_id, shift_id, terminal_id, square_location_id, square_device_id,
                       idempotency_key, amount, currency_code, checkout_payload_sha256, checkout_request_json,
                       created_by_user_id, created_by_role, scope_type, scope_unit_id, scope_business_id, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
                for (var i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
                return statement;
            }, key);
            return queries.byId(context.companyId(), key.getKey().longValue(), false).orElseThrow();
        } catch (DuplicateKeyException duplicate) {
            return queries.byKey(context, idempotency)
                .or(() -> queries.recoverable(context, register, shift, 1).stream().findFirst()).orElseThrow();
        }
    }
}
