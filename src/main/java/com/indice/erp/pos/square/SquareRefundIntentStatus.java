package com.indice.erp.pos.square;

import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundIntentStatus {
    private final JdbcTemplate jdbc;
    void apply(SquareRecords.PaymentIntent intent, BigDecimal cumulative) {
        if (jdbc.update("""
            UPDATE pos_square_terminal_payment_intents SET
              status=CASE WHEN ?>=amount THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END,
              updated_at=CURRENT_TIMESTAMP WHERE company_id=? AND id=?
              AND status IN ('APPROVED','PARTIALLY_REFUNDED','REFUNDED')
            """, cumulative, intent.companyId(), intent.id()) != 1)
            throw new IllegalStateException("Square refund intent changed during confirmation.");
    }
}
