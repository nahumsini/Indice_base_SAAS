package com.indice.erp.pos.square;

import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundClaims {
    private final JdbcTemplate jdbc;
    boolean submission(SquareRefundRecord r, String lease, Instant until, int maximum) {
        return jdbc.update("""
            UPDATE pos_square_refund_requests SET status='SUBMITTING',work_lease_id=?,work_lease_until=?,
              submission_attempts=submission_attempts+1,next_attempt_at=?,last_error_code=NULL,
              version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND version=? AND submission_attempts<?
              AND provider_refund_id IS NULL
              AND manual_replay_attempts=0
              AND next_attempt_at<=UTC_TIMESTAMP(6)
              AND (status='WAITING' OR (status='SUBMITTING' AND work_lease_until<UTC_TIMESTAMP(6)))
              AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))
            """, lease, Timestamp.from(until), Timestamp.from(until), r.companyId(), r.id(),
            r.version(), maximum) == 1;
    }
    boolean recovery(SquareRefundRecord r, String lease, Instant until, boolean review) {
        var statuses = review
            ? "('PENDING','UNCERTAIN','RECONCILIATION_REQUIRED','DEAD_LETTER')"
            : "('PENDING','UNCERTAIN')";
        return jdbc.update("UPDATE pos_square_refund_requests SET work_lease_id=?,work_lease_until=?,"
            + "recovery_attempts=recovery_attempts+1,version=version+1,"
            + "updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=? "
            + "AND provider_refund_id IS NOT NULL AND status IN " + statuses
            + " AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))",
            lease, Timestamp.from(until), r.companyId(), r.id(), r.version()) == 1;
    }
}
