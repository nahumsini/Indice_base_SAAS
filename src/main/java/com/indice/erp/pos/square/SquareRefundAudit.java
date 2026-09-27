package com.indice.erp.pos.square;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareRefundAudit {
    private final JdbcTemplate jdbc;
    void record(SquareRefundRecord refund, SquareRefundActor actor,
            String event, String status, String reason, long version) {
        jdbc.update("""
            INSERT INTO pos_square_refund_audit_events
              (company_id,intent_id,refund_request_id,actor_user_id,actor_type,
               event_type,status,reason,record_version)
            VALUES (?,?,?,?,?,?,?,?,?)
            """, refund.companyId(), refund.intentId(), refund.id(), actor.userId(), actor.type(),
            event, status, reason, version);
    }
}
