package com.indice.erp.pos.mercadopago;

import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpRefundWorkStatus {
    private final JdbcTemplate jdbc;
    boolean complete(MpRefundRecord refund, String lease, String status, String error, Instant next) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_refund_requests SET status=?,work_lease_id=NULL,
            work_lease_until=NULL,next_attempt_at=?,last_error_code=?,version=version+1,
            updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=? AND work_lease_id=?
            AND status<>'CONFIRMED'
            """, status, Timestamp.from(next), error, refund.companyId(), refund.id(), lease) == 1;
    }
    boolean checked(MpRefundRecord refund, String lease, String status, String error, Instant next) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_refund_requests SET status=?,work_lease_id=NULL,
            work_lease_until=NULL,next_attempt_at=?,last_error_code=?,last_provider_check_at=UTC_TIMESTAMP(6),
            dead_lettered_at=IF(?='DEAD_LETTER',UTC_TIMESTAMP(6),NULL),
            version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=?
            AND work_lease_id=? AND status<>'CONFIRMED'
            """, status, Timestamp.from(next), error, status, refund.companyId(), refund.id(), lease) == 1;
    }
    boolean unresolved(MpRefundRecord refund, String status, String error) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_refund_requests SET status=?,work_lease_id=NULL,
            work_lease_until=NULL,last_error_code=?,dead_lettered_at=IF(?='DEAD_LETTER',UTC_TIMESTAMP(6),NULL),
            version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=?
            AND version=? AND status<>'CONFIRMED'
            """, status, error, status, refund.companyId(), refund.id(), refund.version()) == 1;
    }
}
