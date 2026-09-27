package com.indice.erp.pos.mercadopago;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpDispatchStore {
    private final JdbcTemplate jdbc;
    public boolean claim(MpIntent intent, String lease, Instant until) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET dispatch_lease_id=?,dispatch_lease_until=?,
            dispatched_at=COALESCE(dispatched_at,UTC_TIMESTAMP(6)),updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND order_id IS NULL AND status IN ('WAITING','UNCERTAIN')
            AND (dispatch_lease_until IS NULL OR dispatch_lease_until<UTC_TIMESTAMP(6))
            """, lease, Timestamp.from(until), intent.companyId(), intent.id()) == 1;
    }

    public boolean owns(MpIntent intent, String lease) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT COUNT(*)=1 FROM pos_mercado_pago_payment_intents
            WHERE company_id=? AND id=? AND order_id IS NULL AND dispatch_lease_id=?
            AND dispatch_lease_until>=UTC_TIMESTAMP(6) AND status IN ('WAITING','UNCERTAIN')
            """, Boolean.class, intent.companyId(), intent.id(), lease));
    }

    public void order(MpIntent intent, String lease, String orderId) {
        if (jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET order_id=COALESCE(order_id,?),
            dispatch_lease_id=NULL,dispatch_lease_until=NULL,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND dispatch_lease_id=?
            """, orderId, intent.companyId(), intent.id(), lease) != 1) {
            throw new IllegalStateException("Payment dispatch lease changed before recording the order.");
        }
    }

    public void release(MpIntent intent, String lease) {
        jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET dispatch_lease_id=NULL,dispatch_lease_until=NULL
            WHERE company_id=? AND id=? AND dispatch_lease_id=?
            """, intent.companyId(), intent.id(), lease);
    }
}
