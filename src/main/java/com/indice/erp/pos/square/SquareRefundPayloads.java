package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
record SquareRefundPayloads(ObjectMapper mapper) {
    SquareRefundPayload create(SquareRecords.PaymentIntent intent, SquareRefundRequest request,
            BigDecimal amount) {
        var key = request == null ? "" : request.idempotencyKey();
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (key == null || !key.matches("[A-Za-z0-9_-]{1,45}"))
            throw PosApiException.badRequest("Square refund key is invalid.");
        if (reason.length() < 3 || reason.length() > 192)
            throw PosApiException.badRequest("Square refund reason must be 3 to 192 characters.");
        var root = mapper.createObjectNode();
        root.put("idempotency_key", key);
        var money = root.putObject("amount_money");
        money.put("amount", amount.movePointRight(2).longValueExact());
        money.put("currency", intent.currencyCode());
        root.put("payment_id", intent.squarePaymentId());
        root.put("reason", reason);
        return new SquareRefundPayload(root.toString());
    }
}
