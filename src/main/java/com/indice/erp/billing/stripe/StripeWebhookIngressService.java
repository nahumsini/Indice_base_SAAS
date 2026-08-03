package com.indice.erp.billing.stripe;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.audit.BillingAuditService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.net.Webhook;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class StripeWebhookIngressService {

    private final StripeSecretProvider secrets;
    private final StripePhaseTwoProperties properties;
    private final StripeWebhookEventRepository repository;
    private final BillingAuditService audit;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public StripeWebhookIngressService(
        StripeSecretProvider secrets,
        StripePhaseTwoProperties properties,
        StripeWebhookEventRepository repository,
        BillingAuditService audit,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.secrets = secrets;
        this.properties = properties;
        this.repository = repository;
        this.audit = audit;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public IngressResponse receive(String rawPayload, String stripeSignature) {
        if (rawPayload == null || rawPayload.isBlank() || stripeSignature == null || stripeSignature.isBlank()) {
            throw new StripeWebhookSignatureException("Stripe payload and signature are required.", null);
        }
        try {
            Webhook.constructEvent(rawPayload, stripeSignature, secrets.webhookSecret());
        } catch (SignatureVerificationException exception) {
            throw new StripeWebhookSignatureException("Stripe webhook signature is invalid.", exception);
        }

        var root = json(rawPayload);
        var eventId = requiredText(root, "id");
        var eventType = requiredText(root, "type");
        var livemode = root.path("livemode").asBoolean(false);
        if (livemode != secrets.isLiveMode()) {
            throw new StripeWebhookIntegrityException(
                "Stripe event mode does not match the configured Stripe mode."
            );
        }
        var object = root.path("data").path("object");
        var created = root.path("created").asLong(0);
        if (created <= 0) {
            throw new StripeWebhookIntegrityException("Stripe event creation time is missing.");
        }
        var result = repository.ingest(new StripeWebhookEnvelope(
            eventId,
            eventType,
            livemode,
            text(root, "api_version"),
            text(object, "id"),
            text(object, "object"),
            BillingHashing.sha256(rawPayload),
            rawPayload,
            java.time.Instant.ofEpochSecond(created),
            clock.instant().plus(properties.getPayloadRetentionDays(), ChronoUnit.DAYS)
        ));
        audit.record(
            "STRIPE_WEBHOOK",
            result.duplicate() ? "EVENT_DUPLICATE" : "EVENT_RECEIVED",
            "SUCCESS",
            null,
            eventId,
            text(object, "id"),
            null,
            null,
            Map.of("eventType", eventType, "duplicate", result.duplicate())
        );
        return new IngressResponse(eventId, result.duplicate(), true);
    }

    private JsonNode json(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException exception) {
            throw new StripeWebhookIntegrityException("Stripe webhook payload is not valid JSON.");
        }
    }

    private String requiredText(JsonNode node, String field) {
        var value = text(node, field);
        if (value == null) {
            throw new StripeWebhookIntegrityException("Stripe webhook field is missing: " + field);
        }
        return value;
    }

    private String text(JsonNode node, String field) {
        var value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    public record IngressResponse(String eventId, boolean duplicate, boolean durablyStored) {
    }
}
