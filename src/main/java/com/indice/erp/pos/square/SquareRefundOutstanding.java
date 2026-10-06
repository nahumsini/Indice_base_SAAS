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
        requireNone(intent,true);
    }
    void inspectNone(SquareRecords.PaymentIntent intent) {
        requireNone(intent,false);
    }
    private void requireNone(SquareRecords.PaymentIntent intent,boolean lock) {
        if(intent.posTicketId()!=null&&jdbc.queryForObject("SELECT COUNT(*) FROM pos_returns r WHERE r.company_id=? AND r.ticket_id=? AND (r.status<>'CANCELLED' OR EXISTS (SELECT 1 FROM pos_return_payments p WHERE p.company_id=r.company_id AND p.return_id=r.id AND p.status='COMPLETED'))",Integer.class,intent.companyId(),intent.posTicketId())>0)
            throw PosApiException.conflict("An original-tender return already owns this ticket. Recover that return before any separate refund.");
        var rows = jdbc.queryForList("SELECT id FROM pos_square_refund_requests WHERE company_id=? "
            + "AND intent_id=? AND status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN',"
            + "'RECONCILIATION_REQUIRED','DEAD_LETTER')" + (lock ? " FOR UPDATE" : ""), Long.class,
            intent.companyId(), intent.id());
        if (!rows.isEmpty()) throw PosApiException.conflict(
            "Recover the unresolved Square refund before submitting another refund.");
    }
}
