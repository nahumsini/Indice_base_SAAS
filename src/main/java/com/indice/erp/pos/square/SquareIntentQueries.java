package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareIntentQueries {
    private final JdbcTemplate jdbc;
    private final SquarePaymentIntentMapper mapper;
    private final SquareIntentRecoveryQueries recovery;
    SquareIntentQueries(JdbcTemplate jdbc, SquarePaymentIntentMapper mapper, SquareIntentRecoveryQueries recovery) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.recovery = recovery;
    }
    Optional<SquareRecords.PaymentIntent> byId(long companyId, long id, boolean lock) {
        return query("WHERE company_id = ? AND id = ?" + (lock ? " FOR UPDATE" : ""), companyId, id);
    }
    Optional<SquareRecords.PaymentIntent> byKey(PosContext context, String key) {
        return query("WHERE company_id = ? AND idempotency_key = ?", context.companyId(), key);
    }
    Optional<SquareRecords.PaymentIntent> byCheckout(long companyId, String checkoutId) {
        return query("WHERE company_id = ? AND square_checkout_id = ?", companyId, checkoutId);
    }
    List<SquareRecords.PaymentIntent> recoverable(PosContext context, Long register, Long shift, int limit) {
        return recovery.list(context, register, shift, limit);
    }
    List<SquareRecords.PaymentIntent> batch(Instant before, int limit) {
        return recovery.batch(before, limit);
    }
    String userName(long id) {
        return jdbc.query("SELECT COALESCE(NULLIF(full_name, ''), email) display_name FROM users WHERE id = ?",
            (rs, row) -> rs.getString("display_name"), id).stream().findFirst().orElse("Square POS cashier");
    }
    private Optional<SquareRecords.PaymentIntent> query(String where, Object... params) {
        return jdbc.query("SELECT * FROM pos_square_terminal_payment_intents " + where, mapper::map, params).stream().findFirst();
    }
}
