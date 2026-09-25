package com.indice.erp.pos.mercadopago;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
@Repository
@lombok.RequiredArgsConstructor
public class MpIntentWriter {
    private final JdbcTemplate jdbc;
    public boolean evidence(MpIntent intent, MpEvidence evidence) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET
            order_id=COALESCE(order_id,?),payment_id=COALESCE(payment_id,?),
            status=CASE WHEN status='REFUNDED' THEN status
              WHEN status='PARTIALLY_REFUNDED' AND ? NOT IN ('PARTIALLY_REFUNDED','REFUNDED') THEN status
              WHEN status='APPROVED' AND ? NOT IN ('PARTIALLY_REFUNDED','REFUNDED') THEN status ELSE ? END,
            provider_state=?,message=?,verified_evidence_json=?,refund_pending=?,version=version+1,
            updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=? AND version=?
            """, evidence.orderId(), evidence.paymentId(), evidence.status(), evidence.status(), evidence.status(),
            evidence.providerState(), evidence.message(), evidence.sanitizedJson(), evidence.blocksFinalization(),
            intent.companyId(), intent.id(), intent.version()) == 1;
    }

    public void uncertain(MpIntent intent, String message) {
        jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET
            status=CASE WHEN status IN ('APPROVED','REFUNDED') THEN status ELSE 'UNCERTAIN' END,
            message=?,version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND pos_ticket_id IS NULL
            AND status IN ('WAITING','UNCERTAIN','APPROVED')
            """, message, intent.companyId(), intent.id());
    }

    public void dispatchBlocked(MpIntent intent, String message) {
        jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET message=?,version=version+1,
            updated_at=UTC_TIMESTAMP(6) WHERE company_id=? AND id=? AND order_id IS NULL
            AND status IN ('WAITING','UNCERTAIN')
            """, message, intent.companyId(), intent.id());
    }

    public void finalized(MpIntent intent, long ticketId) {
        if (jdbc.update("""
            UPDATE pos_mercado_pago_payment_intents SET pos_ticket_id=?,message=NULL,
            version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND status='APPROVED' AND pos_ticket_id IS NULL
            """, ticketId, intent.companyId(), intent.id()) != 1) {
            throw new IllegalStateException("Payment finalization conflicted.");
        }
    }
}
