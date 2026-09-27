package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
class SquareCheckoutEvidencePolicy {
    private final ObjectMapper mapper;
    private final SquareCheckoutIdentityPolicy identity;
    SquareCheckoutEvidencePolicy(ObjectMapper mapper, SquareCheckoutIdentityPolicy identity) {
        this.mapper = mapper;
        this.identity = identity;
    }
    void require(SquareRecords.PaymentIntent intent, SquareTerminalGateway.Checkout checkout) {
        try {
            var node = mapper.readTree(checkout.rawJson()).path("checkout");
            identity.require(intent, checkout, node);
            SquareCheckoutIdentityPolicy.check("COMPLETED".equals(node.path("status").asText()));
            var payments = node.path("payment_ids");
            SquareCheckoutIdentityPolicy.check(payments.isArray() && payments.size() == 1
                && checkout.paymentId().equals(payments.get(0).asText()));
        } catch (Exception invalid) {
            throw new SquareGatewayException("Square completed checkout evidence is invalid.", true, invalid);
        }
    }
}
