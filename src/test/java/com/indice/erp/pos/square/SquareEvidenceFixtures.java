package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;

final class SquareEvidenceFixtures {
    private SquareEvidenceFixtures() {}
    static SquareRecords.PaymentIntent intent() {
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1", "key-1", "co-1", null,
            SquareTerminalPaymentStatus.WAITING, new BigDecimal("10.50"), "CAD", "hash", "{}", null, null,
            11L, "admin", "CORPORATE_OFFICE", null, null, null, null, null);
    }
    static SquareTerminalGateway.Checkout checkout(long minor, String device) {
        var json = "{\"checkout\":{\"id\":\"co-1\",\"status\":\"COMPLETED\",\"reference_id\":\"INDICE-POS-91\","
            + "\"amount_money\":{\"amount\":" + minor + ",\"currency\":\"CAD\"},\"device_options\":{\"device_id\":\"" + device
            + "\"},\"payment_ids\":[\"pay-1\"]}}";
        return new SquareTerminalGateway.Checkout("co-1", "COMPLETED", "pay-1", null, json, null);
    }
    static JsonNode payment(long minor, String location) throws Exception {
        return new ObjectMapper().readTree("{\"id\":\"pay-1\",\"status\":\"COMPLETED\",\"location_id\":\"" + location
            + "\",\"amount_money\":{\"amount\":" + minor + ",\"currency\":\"CAD\"}}");
    }
}
