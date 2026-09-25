package com.indice.erp.pos.mercadopago;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpRecoveryLease {
    private final JdbcTemplate jdbc;
    public boolean claim(MpIntent intent, String lease, Instant until) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET reconcile_lease_id=?,reconcile_lease_until=?
            WHERE company_id=? AND id=?
            AND (reconcile_lease_until IS NULL OR reconcile_lease_until<UTC_TIMESTAMP(6))
            """, lease, Timestamp.from(until), intent.companyId(), intent.id()) == 1;
    }

    public void release(MpIntent intent, String lease, Instant next) {
        jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET reconcile_lease_id=NULL,
            reconcile_lease_until=NULL,next_reconcile_at=?
            WHERE company_id=? AND id=? AND reconcile_lease_id=?
            """, Timestamp.from(next), intent.companyId(), intent.id(), lease);
    }
}
