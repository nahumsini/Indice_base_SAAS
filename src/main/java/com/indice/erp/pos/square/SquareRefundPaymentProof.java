package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
class SquareRefundPaymentProof {
    void require(SquareRecords.PaymentIntent intent, SquareRefundRecord refund, JsonNode payment) {
        validate(intent,refund,payment);
    }
    void requireReplay(SquareRecords.PaymentIntent intent, SquareRefundRecord refund, JsonNode payment) {
        validate(intent,refund,payment);
    }
    private void validate(SquareRecords.PaymentIntent intent, SquareRefundRecord refund,
            JsonNode payment) {
        try {
            valid(intent.squarePaymentId().equals(payment.path("id").asText()));
            valid("COMPLETED".equals(payment.path("status").asText()));
            money(payment.path("amount_money"), intent.amount(), intent.currencyCode());
            valid(intent.squareLocationId().equals(payment.path("location_id").asText()));
            if (payment.hasNonNull("terminal_checkout_id"))
                valid(intent.squareCheckoutId().equals(payment.path("terminal_checkout_id").asText()));
            if (payment.hasNonNull("merchant_id")) valid(refund.merchantId().equals(payment.path("merchant_id").asText()));
            var refunded = payment.path("refunded_money");
            var observed = refunded.isMissingNode() || refunded.isNull()
                ? BigDecimal.ZERO : money(refunded, intent.currencyCode());
            valid(observed.compareTo(refund.baselineAmount())==0);
        } catch (RuntimeException invalid) {
            if (invalid instanceof SquareRefundEvidenceException known) throw known;
            throw new SquareRefundEvidenceException("Square payment refund eligibility is invalid.");
        }
    }
    private void money(JsonNode money, BigDecimal expected, String currency) {
        valid(money(money,currency).compareTo(expected)==0);
    }
    private BigDecimal money(JsonNode money, String currency) {
        valid(money.path("amount").isIntegralNumber() && money.path("amount").canConvertToLong());
        valid(currency.equals(money.path("currency").asText()));
        return BigDecimal.valueOf(money.path("amount").longValue(), 2);
    }
    private void valid(boolean value) { if (!value) throw new SquareRefundEvidenceException(
        "Square payment no longer matches confirmed local refund evidence."); }
}
