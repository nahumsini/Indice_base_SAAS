package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.util.List;

final class MpPaymentTestFixtures {
    static final MpJson JSON = new MpJson(new ObjectMapper().findAndRegisterModules());
    static MpCreatePayment request(String key) {
        return new MpCreatePayment(key, 9L, null, null, null, "MXN", List.of(), "synthetic sale");
    }
    static MpIntent intent() {
        return new MpIntent(17, 42, 9, 11, 5, 3, "NEWLAND_N950__TEST0001", "12345",
            "sandbox", "original_key", "indice_reference", "WAITING", new BigDecimal("70.00"),
            "MXN", "hash", JSON.write(request("original_key")), "{\"type\":\"point\"}",
            "ORDtest", "PAYtest", null, null, 11, "cashier", "BUSINESS_OFFICE", 6L, 7L,
            MpTestFixtures.NOW, MpTestFixtures.NOW.plusSeconds(600), 4,
            MpTestFixtures.NOW, "at_terminal", false);
    }
    static MpIntent change(MpIntent intent, String field, Object value) {
        ObjectNode node = JSON.mapper().valueToTree(intent);
        node.set(field, JSON.mapper().valueToTree(value));
        return JSON.mapper().convertValue(node, MpIntent.class);
    }
    static ObjectNode order() {
        return JSON.read("""
            {"id":"ORDtest","user_id":"12345","type":"point","country_code":"MX",
             "currency_id":"MXN","live_mode":false,"external_reference":"indice_reference",
             "status":"processed","status_detail":"accredited",
             "config":{"point":{"terminal_id":"NEWLAND_N950__TEST0001"}},
             "transactions":{"payments":[{"id":"PAYtest","amount":"70.00",
              "paid_amount":"70.00","tip_amount":"0.00","refunded_amount":"0.00",
              "status":"processed","status_detail":"accredited","reference_id":"987"}]}}
            """, ObjectNode.class);
    }
    static ObjectNode transaction(ObjectNode order) {
        return (ObjectNode) order.path("transactions").path("payments").get(0);
    }
    static MpOrderVerifier verifier() {
        var ownership = new MpOrderOwnership();
        return new MpOrderVerifier(ownership, new MpPaymentStatePolicy(ownership,
            new MpRefundVerifier(ownership)), JSON);
    }
    private MpPaymentTestFixtures() {}
}
