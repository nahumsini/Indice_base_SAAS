package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public record MpPaymentStatePolicy(MpOrderOwnership ownership, MpRefundVerifier refunds) {
    public MpVerifiedState verify(MpIntent intent, JsonNode order, JsonNode payment) {
        var state = order.path("status").asText();
        var hint = order.path("status_detail").asText().contains("refund") || state.equals("refunded")
            || ownership.money(payment, "refunded_amount").signum() > 0
            || order.path("transactions").path("refunds").size() > 0;
        var status = switch (state) {
            case "created", "at_terminal" -> "WAITING";
            case "failed" -> "DECLINED";
            case "canceled" -> "CANCELLED";
            case "expired" -> "EXPIRED";
            default -> "UNCERTAIN";
        };
        boolean paid = state.equals("processed") && payment.path("status").asText().equals("processed")
            && payment.path("status_detail").asText().equals("accredited")
            && ownership.money(payment, "paid_amount").compareTo(intent.amount()) == 0
            && ownership.money(payment, "tip_amount").signum() == 0;
        if (paid && !hint) status = "APPROVED";
        var refund = refunds.confirmed(intent, order, payment);
        if (refund.signum() > 0) status = refund.compareTo(intent.amount()) == 0
            ? "REFUNDED" : "PARTIALLY_REFUNDED";
        if (state.equals("refunded") && !status.equals("REFUNDED")) status = "UNCERTAIN";
        if ((status.equals("APPROVED") || status.contains("REFUNDED"))
                && !payment.path("id").asText().matches("PAY[A-Za-z0-9_-]{1,125}")) status = "UNCERTAIN";
        return new MpVerifiedState(status, refund, hint);
    }
}
