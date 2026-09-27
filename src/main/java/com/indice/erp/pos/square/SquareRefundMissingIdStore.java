package com.indice.erp.pos.square;

import lombok.RequiredArgsConstructor;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundMissingIdStore {
    private final JdbcTemplate jdbc;
    boolean claim(SquareRefundRecord refund, String lease, Instant until) {
        return jdbc.update("""
            UPDATE pos_square_refund_requests SET status='SUBMITTING',last_error_code=NULL,
              work_lease_id=?,work_lease_until=?,next_attempt_at=?,submission_attempts=submission_attempts+1,
              manual_replay_attempts=manual_replay_attempts+1,dead_lettered_at=NULL,
              version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND version=? AND provider_refund_id IS NULL
              AND status IN ('UNCERTAIN','RECONCILIATION_REQUIRED','DEAD_LETTER')
              AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))
            """, lease, Timestamp.from(until), Timestamp.from(until),
            refund.companyId(), refund.id(), refund.version()) == 1;
    }
}
