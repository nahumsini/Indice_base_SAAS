package com.indice.erp.billing.stripe;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.exception.StripeException;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StripeWebhookPaymentContextResolver {

    private static final Set<String> PAYMENT_EVENTS = Set.of(
        "charge.refunded", "refund.updated", "charge.dispute.created",
        "charge.dispute.updated", "charge.dispute.closed"
    );

    private final StripeBillingGateway gateway;
    private final ObjectMapper objectMapper;
    private final StripeSecretProvider secrets;

    public StripeWebhookPaymentContextResolver(
        StripeBillingGateway gateway, ObjectMapper objectMapper, StripeSecretProvider secrets
    ) {
        this.gateway = gateway;
        this.objectMapper = objectMapper;
        this.secrets = secrets;
    }

    // Resolve provider references before the handler starts its database transaction.
    @Transactional(propagation = Propagation.NEVER)
    public PaymentContext resolve(StripeWebhookEventRepository.ClaimedEvent event) {
        if (!PAYMENT_EVENTS.contains(event.eventType())) {
            return null;
        }
        final JsonNode object;
        try {
            object = objectMapper.readTree(event.rawPayload()).path("data").path("object");
        } catch (JsonProcessingException exception) {
            throw new StripeEventProcessingException("INVALID_STORED_PAYLOAD", "Stored Stripe payload is invalid.");
        }
        if (id(object.path("subscription")) != null || id(object.path("invoice")) != null
            || id(object.path("customer")) != null) {
            return null;
        }
        var chargeId = "charge.refunded".equals(event.eventType())
            ? id(object.path("id")) : id(object.path("charge"));
        if (chargeId == null) {
            throw new StripeEventProcessingException(
                "WAITING_PAYMENT_ASSOCIATION", "The payment event has no resolvable charge reference."
            );
        }
        try {
            var charge = gateway.retrieveCharge(chargeId);
            if (charge == null || !chargeId.equals(charge.getId()) || charge.getLivemode() == null
                || charge.getLivemode() != secrets.isLiveMode()) {
                throw new StripeEventProcessingException(
                    "PAYMENT_REFERENCE_MISMATCH", "The retrieved charge does not match the event and configured mode."
                );
            }
            return new PaymentContext(chargeId, charge.getCustomer());
        } catch (StripeException exception) {
            throw new StripeEventProcessingException(
                "PAYMENT_REFERENCE_UNAVAILABLE", "Stripe charge verification is temporarily unavailable.", exception
            );
        }
    }

    private String id(JsonNode node) {
        var value = node.isObject() ? node.path("id") : node;
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    public record PaymentContext(String chargeId, String customerId) {
    }
}
