package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
class SquareRefundStoredRequestPolicy {
    void require(SquareRecords.PaymentIntent intent, SquareRefundRecord refund, JsonNode request) {
        try {
            valid(request.isObject());
            valid(SquareHashing.sha256(refund.requestJson()).equals(refund.payloadHash()));
            text(request.path("idempotency_key"),refund.key());
            text(request.path("payment_id"),intent.squarePaymentId());
            text(request.path("reason"),refund.reason());
            var money=request.path("amount_money");
            valid(money.path("amount").isIntegralNumber() && money.path("amount").canConvertToLong());
            text(money.path("currency"),intent.currencyCode());
            valid(BigDecimal.valueOf(money.path("amount").longValue(),2).compareTo(refund.amount())==0);
        } catch (RuntimeException invalid) {
            if (invalid instanceof SquareRefundEvidenceException known) throw known;
            throw new SquareRefundEvidenceException("Stored Square refund request is invalid.");
        }
    }
    private void text(JsonNode value,String expected) {
        valid(value.isTextual() && expected.equals(value.textValue()));
    }
    private void valid(boolean value) {
        if (!value) throw new SquareRefundEvidenceException(
            "Stored Square refund request no longer matches its immutable fields.");
    }
}
