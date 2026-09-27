package com.indice.erp.pos.mercadopago;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpIntentStore {
    private final JdbcTemplate jdbc;
    private final MpIntentMapper mapper;
    public Optional<MpIntent> find(long companyId, long id) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_payment_intents "
            + "WHERE company_id=? AND id=?", mapper, companyId, id).stream().findFirst();
    }

    public MpIntent lock(long companyId, long id) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_payment_intents "
            + "WHERE company_id=? AND id=? FOR UPDATE", mapper, companyId, id)
            .stream().findFirst().orElseThrow();
    }

    public Optional<MpIntent> byOrder(String environment, String orderId) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_payment_intents "
            + "WHERE environment=? AND order_id=?", mapper, environment, orderId)
            .stream().findFirst();
    }

    public List<MpIntent> recoveryBatch(Instant before, int limit) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_payment_intents "
            + "WHERE next_reconcile_at<=UTC_TIMESTAMP(6) AND ((pos_ticket_id IS NULL "
            + "AND status IN ('WAITING','UNCERTAIN','APPROVED','PARTIALLY_REFUNDED')) "
            + "OR (order_id IS NOT NULL AND created_at>UTC_TIMESTAMP()-INTERVAL 90 DAY "
            + "AND status IN ('APPROVED','PARTIALLY_REFUNDED') AND updated_at<?)) "
            + "ORDER BY next_reconcile_at,id LIMIT ?", mapper,
            Timestamp.from(before), Math.max(1, Math.min(limit, 50)));
    }
}
