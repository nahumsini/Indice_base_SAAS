package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundOutstanding {
    private final JdbcTemplate jdbc;
    void requireNone(SquareRecords.PaymentIntent intent) {
        var rows = jdbc.queryForList("SELECT id FROM pos_square_refund_requests WHERE company_id=? "
            + "AND intent_id=? AND status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN',"
            + "'RECONCILIATION_REQUIRED','DEAD_LETTER') FOR UPDATE", Long.class,
            intent.companyId(), intent.id());
        if (!rows.isEmpty()) throw PosApiException.conflict(
            "Recover the unresolved Square refund before submitting another refund.");
    }
}
