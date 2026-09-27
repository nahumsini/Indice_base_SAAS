package com.indice.erp.pos.square;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundQueries {
    private final JdbcTemplate jdbc;
    private final SquareRefundMapper mapper;
    Optional<SquareRefundRecord> find(long company, long id, boolean lock) {
        return jdbc.query("SELECT * FROM pos_square_refund_requests WHERE company_id=? AND id=?"
            + (lock ? " FOR UPDATE" : ""), mapper, company, id).stream().findFirst();
    }
    Optional<SquareRefundRecord> byKey(long company, String key) {
        return jdbc.query("SELECT * FROM pos_square_refund_requests WHERE company_id=? AND request_key=?",
            mapper, company, key).stream().findFirst();
    }
    Optional<SquareRefundRecord> byProvider(long company, String id) {
        return jdbc.query("SELECT * FROM pos_square_refund_requests WHERE company_id=? AND provider_refund_id=?",
            mapper, company, id).stream().findFirst();
    }
    Optional<SquareRefundRecord> latest(long company, long intent) {
        return jdbc.query("SELECT * FROM pos_square_refund_requests WHERE company_id=? AND intent_id=? "
            + "ORDER BY id DESC LIMIT 1", mapper, company, intent).stream().findFirst();
    }
    List<SquareRefundRecord> due(int limit) {
        return jdbc.query("""
            SELECT * FROM pos_square_refund_requests
            WHERE status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN')
              AND next_attempt_at<=UTC_TIMESTAMP(6)
              AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))
            ORDER BY next_attempt_at,id LIMIT ?
            """, mapper, Math.max(1, Math.min(limit, 50)));
    }
}
