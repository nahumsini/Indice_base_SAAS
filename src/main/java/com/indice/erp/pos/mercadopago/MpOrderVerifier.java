package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public class MpOrderVerifier {
    private final MpOrderOwnership ownership; private final MpPaymentStatePolicy policy; private final MpJson json;
    public MpOrderVerifier(MpOrderOwnership ownership, MpPaymentStatePolicy policy, MpJson json) {
        this.ownership=ownership; this.policy=policy; this.json=json;
    }
    public MpEvidence verify(MpIntent intent, JsonNode order) {
        var payment = ownership.validate(intent, order);
        var state = order.path("status").asText();
        var verified = policy.verify(intent, order, payment);
        var status = verified.status();
        var paymentId = payment.path("id").asText(null);
        var safe = json.mapper().createObjectNode();
        safe.put("orderId", order.path("id").asText());
        safe.put("paymentId", paymentId);
        safe.put("status", state);
        safe.put("amount", intent.amount().toPlainString());
        safe.put("refundedAmount", verified.refundedAmount().toPlainString());
        return new MpEvidence(order.path("id").asText(), paymentId, status, state,
            status.equals("UNCERTAIN") ? "Payment requires verified recovery." : null,
            json.write(safe), verified.refundedAmount(), verified.blocksFinalization());
    }
}
