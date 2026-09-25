package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

@Component
class SquareCheckoutIdentityPolicy {
    void require(SquareRecords.PaymentIntent intent, SquareTerminalGateway.Checkout checkout, JsonNode node) {
        try {
            check(checkout.id().equals(node.path("id").asText()));
            check(intent.squareCheckoutId() == null || intent.squareCheckoutId().equals(checkout.id()));
            check(("INDICE-POS-" + intent.id()).equals(node.path("reference_id").asText()));
            check(intent.squareDeviceId().equals(node.path("device_options").path("device_id").asText()));
            money(node.path("amount_money"), intent);
            if (node.hasNonNull("location_id")) check(intent.squareLocationId().equals(node.path("location_id").asText()));
        } catch (Exception invalid) {
            throw new SquareGatewayException("Square checkout does not match its POS attempt.", true, invalid);
        }
    }
    static void requireMinorUnits(java.math.BigDecimal amount) {
        if (amount.setScale(2, RoundingMode.HALF_UP).compareTo(amount) != 0)
            throw com.indice.erp.pos.PosApiException.badRequest("Square terminal payments require whole currency minor units.");
    }
    static void money(JsonNode money, SquareRecords.PaymentIntent intent) {
        check(money.path("amount").isIntegralNumber() && money.path("amount").canConvertToLong());
        check(money.path("amount").longValue() == intent.amount().setScale(2, RoundingMode.UNNECESSARY).movePointRight(2).longValueExact());
        check(intent.currencyCode().equals(money.path("currency").asText()));
    }
    static void check(boolean valid) {
        if (!valid) throw new IllegalArgumentException("Square evidence mismatch.");
    }
}
