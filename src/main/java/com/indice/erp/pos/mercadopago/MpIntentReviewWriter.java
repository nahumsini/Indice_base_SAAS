package com.indice.erp.pos.mercadopago;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpIntentReviewWriter {
    private final JdbcTemplate jdbc;
    boolean requireReview(MpIntent intent, String message) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET status='RECONCILIATION_REQUIRED',
            message=?,version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND order_id IS NULL AND version=?
            AND status IN ('WAITING','UNCERTAIN')
            """, message, intent.companyId(), intent.id(), intent.version()) == 1;
    }
}
