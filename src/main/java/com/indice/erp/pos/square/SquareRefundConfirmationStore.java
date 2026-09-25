package com.indice.erp.pos.square;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundConfirmationStore {
    private final JdbcTemplate jdbc;
    boolean confirm(SquareRefundRecord refund, String lease, String evidence) {
        return jdbc.update("""
            UPDATE pos_square_refund_requests SET status='CONFIRMED',verified_evidence_json=?,
              work_lease_id=NULL,work_lease_until=NULL,last_error_code=NULL,
              dead_lettered_at=NULL,
              last_provider_check_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND work_lease_id=? AND provider_refund_id=?
              AND status IN ('PENDING','UNCERTAIN','RECONCILIATION_REQUIRED','DEAD_LETTER')
            """, evidence, refund.companyId(), refund.id(), lease, refund.providerRefundId()) == 1;
    }
}
