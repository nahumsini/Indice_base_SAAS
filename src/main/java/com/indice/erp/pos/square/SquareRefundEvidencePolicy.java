package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.*;
import java.math.BigDecimal;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
record SquareRefundEvidencePolicy(ObjectMapper mapper) {
    SquareRefundEvidence verify(SquareRecords.PaymentIntent intent, SquareRefundRecord refund, JsonNode node) {
        return read(intent, refund, node, refund.providerRefundId());
    }
    private SquareRefundEvidence read(SquareRecords.PaymentIntent intent, SquareRefundRecord refund,
            JsonNode node, String expectedId) {
        try {
            var idNode = node.path("id"); var id = idNode.textValue();
            var payment = node.path("payment_id").asText();
            var status = node.path("status").asText().toUpperCase(java.util.Locale.ROOT);
            var money = node.path("amount_money");
            valid(SquareProviderIdentifiers.refund(idNode) && id.equals(expectedId));
            valid(payment.equals(intent.squarePaymentId()));
            valid(Set.of("PENDING","COMPLETED","REJECTED","FAILED").contains(status));
            valid(money.path("amount").isIntegralNumber() && money.path("amount").canConvertToLong());
            valid(intent.currencyCode().equals(money.path("currency").asText()));
            var amount = BigDecimal.valueOf(money.path("amount").longValue(), 2);
            valid(amount.compareTo(refund.amount()) == 0);
            valid(intent.squareLocationId().equals(node.path("location_id").asText()));
            var safe = mapper.createObjectNode();
            safe.put("id", id); safe.put("paymentId", payment); safe.put("status", status);
            safe.put("amount", amount.toPlainString()); safe.put("currency", intent.currencyCode());
            safe.put("locationId", intent.squareLocationId());
            return new SquareRefundEvidence(id, payment, status, amount,
                intent.currencyCode(), safe.toString());
        } catch (RuntimeException invalid) {
            if (invalid instanceof SquareRefundEvidenceException known) throw known;
            throw new SquareRefundEvidenceException("Square refund evidence is invalid.");
        }
    }
    private void valid(boolean value) {
        if (!value) throw new SquareRefundEvidenceException("Square refund evidence does not match its request.");
    }
}
