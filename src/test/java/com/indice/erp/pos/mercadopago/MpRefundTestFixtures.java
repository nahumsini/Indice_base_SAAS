package com.indice.erp.pos.mercadopago;

import java.math.BigDecimal;
import com.fasterxml.jackson.databind.node.ObjectNode;

final class MpRefundTestFixtures {
    static MpRefundRecord record(String status) { return record(17, status); }
    static MpRefundRecord record(long intentId, String status) {
        return new MpRefundRecord(19, 42, intentId, "refund_key", new BigDecimal("20.00"),
            BigDecimal.ZERO, "{}", "hash", status, 11L, "admin", "BUSINESS_OFFICE",
            6L, 7L, null, null, 0, 0, MpTestFixtures.NOW, null, null, 0);
    }
    static MpRefundRecord change(MpRefundRecord refund, String field, Object value) {
        ObjectNode node = MpPaymentTestFixtures.JSON.mapper().valueToTree(refund);
        node.set(field, MpPaymentTestFixtures.JSON.mapper().valueToTree(value));
        return MpPaymentTestFixtures.JSON.mapper().convertValue(node, MpRefundRecord.class);
    }
    private MpRefundTestFixtures() {}
}
