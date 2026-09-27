package com.indice.erp.pos.square;

import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundWorkStatus {
    private final JdbcTemplate jdbc;
    boolean submitted(SquareRefundRecord r, String lease, SquareRefundSubmissionOutcome outcome, Instant next) {
        return jdbc.update("""
            UPDATE pos_square_refund_requests SET status=?,provider_refund_id=COALESCE(provider_refund_id,?),
              work_lease_id=NULL,work_lease_until=NULL,next_attempt_at=?,last_error_code=?,
              version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND work_lease_id=? AND status='SUBMITTING'
            """, outcome.status(), outcome.providerRefundId(), Timestamp.from(next), outcome.error(),
            r.companyId(), r.id(), lease) == 1;
    }
    boolean checked(SquareRefundRecord r, String lease, String status,
            String error, String evidence, Instant next) {
        return jdbc.update("""
            UPDATE pos_square_refund_requests SET status=?,verified_evidence_json=?,work_lease_id=NULL,
              work_lease_until=NULL,next_attempt_at=?,last_error_code=?,last_provider_check_at=UTC_TIMESTAMP(6),
              dead_lettered_at=IF(?='DEAD_LETTER',UTC_TIMESTAMP(6),NULL),version=version+1,
              updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=? AND work_lease_id=?
              AND status<>'CONFIRMED'
            """, status, evidence, Timestamp.from(next), error, status, r.companyId(), r.id(), lease) == 1;
    }
    boolean unresolved(SquareRefundRecord r, String status, String error) {
        return jdbc.update("UPDATE pos_square_refund_requests SET status=?,work_lease_id=NULL,"
            + "work_lease_until=NULL,last_error_code=?,dead_lettered_at=IF(?='DEAD_LETTER',UTC_TIMESTAMP(6),NULL),"
            + "version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=? "
            + "AND status<>'CONFIRMED'", status, error, status, r.companyId(), r.id(), r.version()) == 1;
    }
}
