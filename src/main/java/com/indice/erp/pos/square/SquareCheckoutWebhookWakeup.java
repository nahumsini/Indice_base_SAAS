package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import org.springframework.stereotype.Component;

@Component
class SquareCheckoutWebhookWakeup {
    private final SquarePaymentDependencies d;
    private final SquarePaymentResponses responses;
    private final SquareCheckoutIdentityPolicy identity;
    private final SquareWebhookEventRepository events;
    private final ObjectMapper mapper;
    SquareCheckoutWebhookWakeup(SquarePaymentDependencies dependencies, SquarePaymentResponses responses,
            SquareCheckoutIdentityPolicy identity, SquareWebhookEventRepository events, ObjectMapper mapper) {
        this.d = dependencies;
        this.responses = responses;
        this.identity = identity;
        this.events = events;
        this.mapper = mapper;
    }
    void process(long eventId, SquareWebhookEventClaims.Lease lease, long companyId, String checkoutId) {
        try {
            var checkout = d.tokens().withCompanyToken(companyId, token -> d.gateway().getCheckout(token, checkoutId));
            var node = mapper.readTree(checkout.rawJson()).path("checkout");
            var reference = node.path("reference_id").asText();
            if (!reference.matches("INDICE-POS-[1-9][0-9]*")) throw new IllegalArgumentException();
            var id = Long.parseLong(reference.substring("INDICE-POS-".length()));
            var internal = new PosContext(null, companyId, "Webhook", "system", true, PosScope.corporateOffice());
            var intent = d.intents().findById(internal, id).orElseThrow();
            if (!checkoutId.equals(checkout.id())) throw new IllegalArgumentException();
            identity.require(intent, checkout, node);
            var status = d.evidence().verify(null, intent, checkout);
            d.intents().markSquareCreated(id, checkout.id(), null, checkout.rawJson());
            d.intents().markGatewayStatus(id, status);
            d.audit().recordIntent(intent, "PAYMENT_WEBHOOK", status.status().name(), status.failureMessage());
            if (status.status() == SquareTerminalPaymentStatus.APPROVED)
                responses.finish(d.intents().findById(internal, id).orElseThrow());
            events.markProcessed(eventId, lease, companyId, intent.id(), intent.terminalId());
        } catch (Exception failed) {
            throw new IllegalStateException("Square checkout verification must be retried.", failed);
        }
    }
}
