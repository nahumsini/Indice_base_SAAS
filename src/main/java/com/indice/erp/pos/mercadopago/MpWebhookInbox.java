package com.indice.erp.pos.mercadopago;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MpWebhookInbox {
    private final JdbcTemplate jdbc;

    public void receive(String environment, String orderId, String digest) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_webhook_inbox (environment,order_id,delivery_hash)
            VALUES (?,?,?) ON DUPLICATE KEY UPDATE duplicate_count=duplicate_count+1
            """, environment, orderId, digest);
    }

    public List<MpWebhookRecord> due() {
        return jdbc.query("""
            SELECT id,environment,order_id,attempts FROM pos_mercado_pago_webhook_inbox
            WHERE status IN ('RECEIVED','FAILED') AND next_attempt_at<=UTC_TIMESTAMP(6)
              AND (lease_until IS NULL OR lease_until<UTC_TIMESTAMP(6))
            ORDER BY next_attempt_at,id LIMIT 25
            """, (rs, row) -> new MpWebhookRecord(rs.getLong("id"), rs.getString("environment"),
                rs.getString("order_id"), rs.getInt("attempts")));
    }

    public boolean claim(MpWebhookRecord event, String lease) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_webhook_inbox SET lease_id=?,
            lease_until=UTC_TIMESTAMP(6)+INTERVAL 90 SECOND,attempts=attempts+1
            WHERE id=? AND status IN ('RECEIVED','FAILED')
              AND (lease_until IS NULL OR lease_until<UTC_TIMESTAMP(6))
            """, lease, event.id()) == 1;
    }
}
