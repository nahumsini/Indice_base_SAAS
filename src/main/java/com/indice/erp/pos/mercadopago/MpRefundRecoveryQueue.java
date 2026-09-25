package com.indice.erp.pos.mercadopago;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpRefundRecoveryQueue {
    private final JdbcTemplate jdbc;
    private final MpRefundRequestMapper mapper;
    List<MpRefundRecord> due(int limit) {
        return jdbc.query("""
            SELECT * FROM pos_mercado_pago_refund_requests
            WHERE status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN')
            AND next_attempt_at<=UTC_TIMESTAMP(6)
            AND (work_lease_until IS NULL OR work_lease_until<UTC_TIMESTAMP(6))
            ORDER BY next_attempt_at,id LIMIT ?
            """, mapper, Math.max(1, Math.min(limit, 50)));
    }
}
