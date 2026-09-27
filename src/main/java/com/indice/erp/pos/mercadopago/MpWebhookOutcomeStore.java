package com.indice.erp.pos.mercadopago;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MpWebhookOutcomeStore {
    private final JdbcTemplate jdbc;

    public void processed(MpWebhookRecord event, String lease, MpIntent intent) {
        jdbc.update("""
            UPDATE pos_mercado_pago_webhook_inbox SET status='PROCESSED',company_id=?,intent_id=?,
            processed_at=UTC_TIMESTAMP(6),error_code=NULL,lease_id=NULL,lease_until=NULL
            WHERE id=? AND lease_id=?
            """, intent.companyId(), intent.id(), event.id(), lease);
    }

    public void retry(MpWebhookRecord event, String lease, String code) {
        jdbc.update("""
            UPDATE pos_mercado_pago_webhook_inbox SET status=?,error_code=?,lease_id=NULL,
            lease_until=NULL,next_attempt_at=UTC_TIMESTAMP(6)+INTERVAL ? SECOND
            WHERE id=? AND lease_id=?
            """, event.attempts() >= 19 ? "DEAD_LETTER" : "FAILED", code,
            Math.min(3600, 30L << Math.min(event.attempts(), 7)), event.id(), lease);
    }
}
