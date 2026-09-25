package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public record MpRefundVerifier(MpOrderOwnership ownership) {
    public BigDecimal confirmed(MpIntent intent, JsonNode order, JsonNode payment) {
        var refunds = order.path("transactions").path("refunds");
        var total = BigDecimal.ZERO;
        var identifiers = new java.util.HashSet<String>();
        if (!refunds.isArray()) return total;
        for (var refund : refunds) {
            if (!refund.path("status").asText().equals("processed")) continue;
            if (!refund.path("id").asText().matches("REF[A-Za-z0-9_-]{1,125}")
                    || !identifiers.add(refund.path("id").asText())
                    || !payment.path("id").asText().equals(refund.path("transaction_id").asText())) {
                throw PosApiException.conflict("Provider refund ownership could not be verified.");
            }
            var amount = ownership.money(refund, "amount");
            if (amount.signum() <= 0) throw PosApiException.conflict("Provider refund amount is invalid.");
            total = total.add(amount);
        }
        if (total.compareTo(intent.amount()) > 0) {
            throw PosApiException.conflict("Provider refund amount exceeds this payment.");
        }
        return total;
    }
}
