package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class MpActionRequiredRecovery {
    private final MpPointGateway gateway; private final MpOrderOwnership ownership; private final MpJson json;
    public MpActionRequiredRecovery(MpPointGateway gateway, MpOrderOwnership ownership, MpJson json) {
        this.gateway=gateway; this.ownership=ownership; this.json=json;
    }
    public MpEvidence verify(MpIntent intent, JsonNode order, String token, MpEvidence initial) {
        if (!order.path("status").asText().equals("action_required")) return initial;
        var transaction = ownership.validate(intent, order);
        var reference = transaction.path("reference_id").asText(
            transaction.path("reference").path("id").asText());
        if (!reference.matches("[0-9]{1,32}")) return initial;
        var payment = gateway.getPayment(token, reference);
        boolean approved = reference.equals(payment.path("id").asText())
            && intent.sellerId().equals(payment.path("collector_id").asText(
                payment.path("collector").path("id").asText()))
            && "MXN".equals(payment.path("currency_id").asText())
            && "approved".equals(payment.path("status").asText())
            && new BigDecimal(payment.path("transaction_amount").asText("0"))
                .compareTo(intent.amount()) == 0;
        approved &= "accredited".equals(payment.path("status_detail").asText())
            && payment.hasNonNull("transaction_amount_refunded") && payment.hasNonNull("live_mode")
            && ownership.money(payment, "transaction_amount_refunded").signum() == 0
            && !initial.blocksFinalization() && initial.paymentId() != null
            && initial.paymentId().matches("PAY[A-Za-z0-9_-]{1,125}")
            && payment.path("live_mode").asBoolean() == intent.environment().equals("production");
        if (!approved || ownership.money(transaction, "tip_amount").signum() != 0) return initial;
        var safe = json.mapper().createObjectNode();
        safe.put("orderId", initial.orderId());
        safe.put("pointPaymentId", initial.paymentId());
        safe.put("paymentReference", reference);
        safe.put("status", "approved");
        safe.put("amount", intent.amount().toPlainString());
        return new MpEvidence(initial.orderId(), initial.paymentId(), "APPROVED", "action_required",
            null, json.write(safe), BigDecimal.ZERO, false);
    }
}
