package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class MpOrderOwnership {
    public JsonNode validate(MpIntent intent, JsonNode order) {
        var id = order.path("id").asText();
        var payments = order.path("transactions").path("payments");
        boolean identity = id.matches("ORD[A-Za-z0-9_-]{1,125}")
            && (intent.orderId() == null || intent.orderId().equals(id))
            && intent.sellerId().equals(order.path("user_id").asText())
            && "point".equals(order.path("type").asText())
            && "MX".equals(order.path("country_code").asText())
            && intent.externalReference().equals(order.path("external_reference").asText())
            && intent.providerTerminalId().equals(order.path("config").path("point")
                .path("terminal_id").asText());
        if (order.has("live_mode")) {
            identity &= order.path("live_mode").asBoolean() == intent.environment().equals("production");
        }
        if (order.has("currency_id")) identity &= "MXN".equals(order.path("currency_id").asText());
        if (!identity || !payments.isArray() || payments.size() != 1) {
            throw PosApiException.conflict("Provider order ownership could not be verified.");
        }
        var payment = payments.get(0);
        if (intent.paymentId() != null && !intent.paymentId().equals(payment.path("id").asText())) {
            throw PosApiException.conflict("Provider payment identity changed.");
        }
        if (money(payment, "amount").compareTo(intent.amount()) != 0) {
            throw PosApiException.conflict("Provider order amount differs from this sale.");
        }
        return payment;
    }

    public BigDecimal money(JsonNode value, String field) {
        var amount = new BigDecimal(value.path(field).asText("0"));
        if (amount.signum() < 0) throw PosApiException.conflict("Provider amount is invalid.");
        return amount;
    }
}
