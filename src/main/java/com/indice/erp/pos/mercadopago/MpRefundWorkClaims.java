package com.indice.erp.pos.mercadopago;

import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpRefundWorkClaims {
    private final JdbcTemplate jdbc;
    boolean submission(MpRefundRecord refund, String lease, Instant until, int maximum) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_refund_requests SET status='SUBMITTING',work_lease_id=?,
            work_lease_until=?,submission_attempts=submission_attempts+1,next_attempt_at=?,
            last_error_code=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND version=? AND submission_attempts<?
            AND (status='WAITING' OR (status='SUBMITTING'
              AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))))
            AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))
            """, lease, Timestamp.from(until), Timestamp.from(until), refund.companyId(),
            refund.id(), refund.version(), maximum) == 1;
    }
    boolean recovery(MpRefundRecord refund, String lease, Instant until) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_refund_requests SET work_lease_id=?,work_lease_until=?,
            recovery_attempts=recovery_attempts+1,version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND version=? AND status IN ('PENDING','UNCERTAIN')
            AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))
            """, lease, Timestamp.from(until), refund.companyId(), refund.id(), refund.version()) == 1;
    }
    boolean review(MpRefundRecord refund, String lease, Instant until) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_refund_requests SET work_lease_id=?,work_lease_until=?,
            recovery_attempts=recovery_attempts+1,dead_lettered_at=NULL,version=version+1,
            updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=?
            AND status IN ('PENDING','UNCERTAIN','RECONCILIATION_REQUIRED','DEAD_LETTER')
            AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))
            """, lease, Timestamp.from(until), refund.companyId(), refund.id(), refund.version()) == 1;
    }
}
