package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MercadoPagoWebhookInboxIntegrationTest extends MpIsolatedDatabaseFixture {
    @Test void duplicateSignedDeliveryHasOneDurableInboxRowAndOneLeaseOwner() {
        var inbox = application.getBean(MpWebhookInbox.class);
        var order = "ORD" + UUID.randomUUID().toString().replace("-", "");
        var digest = MpSecurity.hash("synthetic signed delivery " + order);
        inbox.receive("sandbox", order, digest);
        inbox.receive("sandbox", order, digest);
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_webhook_inbox WHERE environment='sandbox' AND delivery_hash=?",
            Integer.class, digest));
        assertEquals(1, jdbc.queryForObject("SELECT duplicate_count FROM pos_mercado_pago_webhook_inbox WHERE environment='sandbox' AND delivery_hash=?",
            Integer.class, digest));
        long id = jdbc.queryForObject("SELECT id FROM pos_mercado_pago_webhook_inbox WHERE environment='sandbox' AND delivery_hash=?",
            Long.class, digest);
        var event = new MpWebhookRecord(id, "sandbox", order, 0);
        assertTrue(inbox.claim(event, "synthetic-worker-1"));
        assertFalse(inbox.claim(event, "synthetic-worker-2"));
        assertEquals("synthetic-worker-1", jdbc.queryForObject("SELECT lease_id FROM pos_mercado_pago_webhook_inbox WHERE id=?",
            String.class, id));
        assertEquals(1, jdbc.queryForObject("SELECT attempts FROM pos_mercado_pago_webhook_inbox WHERE id=?", Integer.class, id));
    }
}
