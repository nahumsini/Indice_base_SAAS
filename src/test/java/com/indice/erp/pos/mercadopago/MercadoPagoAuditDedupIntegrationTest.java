package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MercadoPagoAuditDedupIntegrationTest extends MpFinancialDatabaseFixture {
    @Test void unchangedApprovedPollingDoesNotCreateAnotherFinancialAuditEvent() {
        var order = (ObjectNode) partialRefund().order();
        order.put("status_detail", "processed");
        order.withObject("transactions").remove("refunds");
        MpPaymentTestFixtures.transaction(order).put("refunded_amount", "0.00");
        var writer = application.getBean(MpEvidenceApplication.class);
        var verified = new MpVerifiedOrder(order, MpPaymentTestFixtures.verifier().verify(observed, order));
        assertTrue(writer.apply(observed, verified));
        observed = application.getBean(MpIntentStore.class).find(companyId, observed.id()).orElseThrow();
        assertEquals("APPROVED", observed.status());
        assertTrue(writer.apply(observed, verified));
        assertEquals(1, jdbc.queryForObject("""
            SELECT COUNT(*) FROM pos_mercado_pago_audit_events
            WHERE company_id=? AND intent_id=? AND event_type='ORDER_VERIFIED'
            """, Integer.class, companyId, observed.id()));
    }
}
