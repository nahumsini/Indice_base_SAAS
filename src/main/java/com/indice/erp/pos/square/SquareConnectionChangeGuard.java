package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Repository
class SquareConnectionChangeGuard {
    private final JdbcTemplate jdbc;
    SquareConnectionChangeGuard(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    String lock(long company, String environment) {
        if (!TransactionSynchronizationManager.isActualTransactionActive())
            throw new IllegalStateException("Square connection coordination requires an active transaction.");
        jdbc.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE", Long.class, company);
        var rows = jdbc.queryForList("SELECT merchant_id FROM pos_square_connections WHERE company_id=? AND environment=? FOR UPDATE",
            String.class, company, environment);
        return rows.isEmpty() ? null : rows.getFirst();
    }
    void requireReplacementAllowed(long company, String existing, String incoming) {
        if (incoming == null || incoming.isBlank()) throw PosApiException.conflict("Square merchant identity is missing.");
        if (java.util.Objects.equals(existing, incoming)) return;
        var pending = jdbc.queryForList("""
            SELECT id FROM pos_square_terminal_payment_intents
            WHERE company_id=? AND pos_ticket_id IS NULL
              AND status IN ('WAITING','UNCERTAIN','APPROVED','PARTIALLY_REFUNDED') LIMIT 1 FOR UPDATE
            """, Long.class, company);
        var refunds = jdbc.queryForList("""
            SELECT id FROM pos_square_refund_requests WHERE company_id=?
              AND status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN','RECONCILIATION_REQUIRED','DEAD_LETTER')
            LIMIT 1 FOR UPDATE
            """, Long.class, company);
        var refundable = jdbc.queryForList("""
            SELECT id FROM pos_square_terminal_payment_intents WHERE company_id=?
              AND status IN ('APPROVED','PARTIALLY_REFUNDED')
              AND created_at>DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 90 DAY) LIMIT 1 FOR UPDATE
            """, Long.class, company);
        if (!pending.isEmpty() || !refunds.isEmpty() || !refundable.isEmpty())
            throw PosApiException.conflict("Recover unresolved Square payments or refunds and retain "
                + "the original merchant during the refund window.");
    }
}
