package com.indice.erp.billing.stripe;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.signup.BillingSignupIntent;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingTenantProvisioningService;
import com.indice.erp.billing.subscription.BillingActivationService;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StripeWebhookEventHandler {

    private final ObjectMapper objectMapper;
    private final BillingSignupIntentRepository signupIntents;
    private final BillingProjectionRepository projections;
    private final BillingTenantProvisioningService provisioning;
    private final BillingAuditService audit;
    private final CompanyEntitlementProjectionService entitlementProjection;
    private final CommercialLifecycleService commercialLifecycle;
    private final BillingActivationService activationService;

    public StripeWebhookEventHandler(
        ObjectMapper objectMapper,
        BillingSignupIntentRepository signupIntents,
        BillingProjectionRepository projections,
        BillingTenantProvisioningService provisioning,
        BillingAuditService audit,
        CompanyEntitlementProjectionService entitlementProjection,
        CommercialLifecycleService commercialLifecycle,
        BillingActivationService activationService
    ) {
        this.objectMapper = objectMapper;
        this.signupIntents = signupIntents;
        this.projections = projections;
        this.provisioning = provisioning;
        this.audit = audit;
        this.entitlementProjection = entitlementProjection;
        this.commercialLifecycle = commercialLifecycle;
        this.activationService = activationService;
    }

    @Transactional
    public StripeWebhookEventRepository.ProcessingResult process(StripeWebhookEventRepository.ClaimedEvent claimed) {
        var root = json(claimed.rawPayload());
        var object = root.path("data").path("object");
        var eventId = requiredText(root, "id");
        var eventType = requiredText(root, "type");
        var eventCreatedAt = instant(root.path("created"));

        return switch (eventType) {
            case "checkout.session.completed" -> checkoutCompleted(eventId, eventCreatedAt, object);
            case "checkout.session.expired" -> checkoutExpired(eventId, eventCreatedAt, object);
            case "customer.subscription.created", "customer.subscription.updated",
                 "customer.subscription.deleted", "customer.subscription.paused",
                 "customer.subscription.resumed" -> subscriptionChanged(eventId, eventCreatedAt, eventType, object);
            case "invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed",
                 "invoice.finalized", "invoice.voided" -> invoiceChanged(eventId, eventCreatedAt, eventType, object);
            case "charge.refunded", "refund.updated", "charge.dispute.created",
                 "charge.dispute.updated", "charge.dispute.closed" -> paymentRiskChanged(eventId, eventCreatedAt, eventType, object);
            case "entitlements.active_entitlement_summary.updated" -> stripeEntitlementSummaryChanged(eventId, eventType, object);
            default -> ignored(eventId, eventType, text(object, "id"));
        };
    }

    private StripeWebhookEventRepository.ProcessingResult checkoutCompleted(
        String eventId,
        Instant eventCreatedAt,
        JsonNode object
    ) {
        var intent = resolveIntent(object);
        var reference = metadata(object, "indice_signup_ref");
        if (intent == null) {
            if (reference != null) {
                throw new StripeEventProcessingException(
                    "WAITING_SIGNUP_INTENT",
                    "Checkout event arrived before its signup intent was available."
                );
            }
            return ignored(eventId, "checkout.session.completed", text(object, "id"));
        }
        var sessionId = requiredText(object, "id");
        var customerId = objectId(object.path("customer"));
        var subscriptionId = objectId(object.path("subscription"));
        signupIntents.markCheckoutCompleted(
            intent.id(), eventId, eventCreatedAt, customerId, sessionId, subscriptionId
        );
        var association = projections.associateSubscription(subscriptionId, intent.id());
        var provisioningResult = provisioning.provisionIfEligible(intent.id());
        if (activationService.isActivationIntent(intent.id())) {
            activationService.complete(intent.id(), customerId);
        }
        var companyId = provisioningResult.companyId() == null && association != null
            ? association.companyId()
            : provisioningResult.companyId();
        audit.record(
            "STRIPE_WEBHOOK", "CHECKOUT_COMPLETED", "SUCCESS", null, eventId, sessionId,
            companyId, intent.id(),
            Map.of(
                "provisioningStatus", provisioningResult.status(),
                "provisioned", provisioningResult.provisioned()
            )
        );
        return StripeWebhookEventRepository.ProcessingResult.processed(
            companyId, intent.id(), subscriptionId
        );
    }

    private StripeWebhookEventRepository.ProcessingResult checkoutExpired(
        String eventId,
        Instant eventCreatedAt,
        JsonNode object
    ) {
        var intent = resolveIntent(object);
        if (intent == null) {
            return ignored(eventId, "checkout.session.expired", text(object, "id"));
        }
        signupIntents.markCheckoutExpired(intent.id(), eventId, eventCreatedAt);
        audit.record("STRIPE_WEBHOOK", "CHECKOUT_EXPIRED", "SUCCESS", null, eventId,
            text(object, "id"), null, intent.id(), Map.of());
        return StripeWebhookEventRepository.ProcessingResult.processed(null, intent.id(), intent.stripeSubscriptionId());
    }

    private StripeWebhookEventRepository.ProcessingResult subscriptionChanged(
        String eventId,
        Instant eventCreatedAt,
        String eventType,
        JsonNode object
    ) {
        var subscriptionId = requiredText(object, "id");
        var intent = resolveIntent(object);
        var status = text(object, "status");
        if ("customer.subscription.deleted".equals(eventType)) {
            status = "canceled";
        }
        if (status == null) {
            status = "unknown";
        }
        var currentPeriodStart = firstInstant(
            object.path("current_period_start"),
            object.path("items").path("data").path(0).path("current_period_start")
        );
        var currentPeriodEnd = firstInstant(
            object.path("current_period_end"),
            object.path("items").path("data").path(0).path("current_period_end")
        );
        var association = projections.upsertSubscription(
            new BillingProjectionRepository.SubscriptionSnapshot(
                eventId,
                eventCreatedAt,
                subscriptionId,
                objectId(object.path("customer")),
                status,
                text(object, "collection_method"),
                text(object, "currency"),
                object.path("cancel_at_period_end").asBoolean(false),
                nullableInstant(object.path("trial_start")),
                nullableInstant(object.path("trial_end")),
                currentPeriodStart,
                currentPeriodEnd,
                nullableInstant(object.path("canceled_at")),
                objectId(object.path("latest_invoice")),
                null
            ),
            intent == null ? null : intent.id()
        );
        if (intent != null) {
            signupIntents.attachSubscription(intent.id(), subscriptionId, eventId, eventCreatedAt);
            if (activationService.isActivationIntent(intent.id())) {
                activationService.complete(intent.id(), objectId(object.path("customer")));
            }
        }
        if (association.companyId() != null) {
            entitlementProjection.refreshIfEnrolled(association.companyId());
            commercialLifecycle.applySubscriptionEvent(
                association.companyId(), eventId, eventCreatedAt, status,
                nullableInstant(object.path("trial_end"))
            );
        }
        audit.record(
            "STRIPE_WEBHOOK", "SUBSCRIPTION_PROJECTED", "SUCCESS", null, eventId, subscriptionId,
            association.companyId(), association.signupIntentId(),
            Map.of("stripeStatus", status, "projectionApplied", association.applied())
        );
        return StripeWebhookEventRepository.ProcessingResult.processed(
            association.companyId(), association.signupIntentId(), subscriptionId
        );
    }

    private StripeWebhookEventRepository.ProcessingResult invoiceChanged(
        String eventId,
        Instant eventCreatedAt,
        String eventType,
        JsonNode object
    ) {
        var invoiceId = requiredText(object, "id");
        var subscriptionId = invoiceSubscriptionId(object);
        var association = subscriptionId == null ? null : projections.associationForSubscription(subscriptionId);
        projections.upsertInvoice(
            new BillingProjectionRepository.InvoiceSnapshot(
                eventId,
                eventCreatedAt,
                invoiceId,
                subscriptionId,
                objectId(object.path("customer")),
                text(object, "status"),
                text(object, "currency"),
                nullableLong(object.path("amount_due")),
                nullableLong(object.path("amount_paid")),
                text(object, "hosted_invoice_url"),
                text(object, "invoice_pdf"),
                nullableInstant(object.path("period_start")),
                nullableInstant(object.path("period_end"))
            ),
            association
        );
        if (association != null && association.companyId() != null
            && ("invoice.payment_failed".equals(eventType)
                || "invoice.paid".equals(eventType)
                || "invoice.payment_succeeded".equals(eventType))) {
            commercialLifecycle.applyInvoiceEvent(
                association.companyId(), eventId, eventCreatedAt, eventType, text(object, "status")
            );
        }
        audit.record(
            "STRIPE_WEBHOOK", "INVOICE_PROJECTED", "SUCCESS", null, eventId, invoiceId,
            association == null ? null : association.companyId(),
            association == null ? null : association.signupIntentId(),
            Map.of("eventType", eventType)
        );
        return StripeWebhookEventRepository.ProcessingResult.processed(
            association == null ? null : association.companyId(),
            association == null ? null : association.signupIntentId(),
            subscriptionId
        );
    }

    private StripeWebhookEventRepository.ProcessingResult paymentRiskChanged(
        String eventId,
        Instant eventCreatedAt,
        String eventType,
        JsonNode object
    ) {
        var objectId = requiredText(object, "id");
        var association = associationForObject(object);
        if (association != null && association.companyId() != null) {
            commercialLifecycle.applyInvoiceEvent(
                association.companyId(),
                eventId,
                eventCreatedAt,
                eventType,
                clean(text(object, "status"), eventType)
            );
        }
        audit.record(
            "STRIPE_WEBHOOK", "PAYMENT_RISK_EVENT_RECORDED", "SUCCESS", null, eventId, objectId,
            association == null ? null : association.companyId(),
            association == null ? null : association.signupIntentId(),
            details(
                "eventType", eventType,
                "stripeStatus", clean(text(object, "status"), ""),
                "invoiceId", clean(objectId(object.path("invoice")), ""),
                "customerId", clean(objectId(object.path("customer")), "")
            )
        );
        return StripeWebhookEventRepository.ProcessingResult.processed(
            association == null ? null : association.companyId(),
            association == null ? null : association.signupIntentId(),
            null
        );
    }

    private StripeWebhookEventRepository.ProcessingResult stripeEntitlementSummaryChanged(
        String eventId,
        String eventType,
        JsonNode object
    ) {
        var objectId = clean(text(object, "id"), clean(objectId(object.path("customer")), eventType));
        var association = associationForObject(object);
        var refreshed = association != null
            && association.companyId() != null
            && entitlementProjection.refreshIfEnrolled(association.companyId());
        audit.record(
            "STRIPE_WEBHOOK", "STRIPE_ENTITLEMENT_SUMMARY_RECORDED", "SUCCESS", null, eventId, objectId,
            association == null ? null : association.companyId(),
            association == null ? null : association.signupIntentId(),
            details(
                "eventType", eventType,
                "customerId", clean(objectId(object.path("customer")), ""),
                "internalProjectionRefreshed", Boolean.toString(refreshed)
            )
        );
        return StripeWebhookEventRepository.ProcessingResult.processed(
            association == null ? null : association.companyId(),
            association == null ? null : association.signupIntentId(),
            null
        );
    }

    private StripeWebhookEventRepository.ProcessingResult ignored(String eventId, String eventType, String objectId) {
        audit.record(
            "STRIPE_WEBHOOK", "EVENT_IGNORED", "SUCCESS", null, eventId, objectId,
            null, null, Map.of("eventType", eventType)
        );
        return StripeWebhookEventRepository.ProcessingResult.ignoredResult();
    }

    private BillingProjectionRepository.ProjectionAssociation associationForObject(JsonNode object) {
        var subscriptionId = objectId(object.path("subscription"));
        if (subscriptionId != null) {
            var association = projections.associationForSubscription(subscriptionId);
            if (association != null) {
                return association;
            }
        }
        var invoiceId = objectId(object.path("invoice"));
        if (invoiceId != null) {
            var association = projections.associationForInvoice(invoiceId);
            if (association != null) {
                return association;
            }
        }
        var customerId = objectId(object.path("customer"));
        return customerId == null ? null : projections.associationForCustomer(customerId);
    }

    private Map<String, String> details(String... pairs) {
        var detail = new LinkedHashMap<String, String>();
        for (var index = 0; index + 1 < pairs.length; index += 2) {
            detail.put(pairs[index], pairs[index + 1] == null ? "" : pairs[index + 1]);
        }
        return detail;
    }

    private BillingSignupIntent resolveIntent(JsonNode object) {
        var reference = metadata(object, "indice_signup_ref");
        if (reference != null) {
            var byReference = signupIntents.findByPublicReference(reference);
            if (byReference != null) {
                return byReference;
            }
        }
        var sessionId = text(object, "id");
        if (sessionId != null && "checkout.session".equals(text(object, "object"))) {
            var bySession = signupIntents.findByCheckoutSessionId(sessionId);
            if (bySession != null) {
                return bySession;
            }
        }
        var subscriptionId = "subscription".equals(text(object, "object"))
            ? text(object, "id")
            : objectId(object.path("subscription"));
        if (subscriptionId != null) {
            var bySubscription = signupIntents.findBySubscriptionId(subscriptionId);
            if (bySubscription != null) {
                return bySubscription;
            }
        }
        var customerId = objectId(object.path("customer"));
        return customerId == null ? null : signupIntents.findByStripeCustomerId(customerId);
    }

    private String invoiceSubscriptionId(JsonNode object) {
        var direct = objectId(object.path("subscription"));
        if (direct != null) {
            return direct;
        }
        return objectId(object.path("parent").path("subscription_details").path("subscription"));
    }

    private String metadata(JsonNode object, String key) {
        return text(object.path("metadata"), key);
    }

    private JsonNode json(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException exception) {
            throw new StripeEventProcessingException("INVALID_STORED_PAYLOAD", "Stored Stripe payload is invalid.", exception);
        }
    }

    private String requiredText(JsonNode node, String field) {
        var value = text(node, field);
        if (value == null) {
            throw new StripeEventProcessingException("MISSING_STRIPE_FIELD", "Stripe field is missing: " + field);
        }
        return value;
    }

    private String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        var value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    private String objectId(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isTextual()) {
            return node.asText().isBlank() ? null : node.asText();
        }
        return text(node, "id");
    }

    private Instant instant(JsonNode node) {
        var value = node.asLong(0);
        if (value <= 0) {
            throw new StripeEventProcessingException("MISSING_EVENT_TIME", "Stripe event creation time is missing.");
        }
        return Instant.ofEpochSecond(value);
    }

    private Instant nullableInstant(JsonNode node) {
        var value = node == null ? 0 : node.asLong(0);
        return value <= 0 ? null : Instant.ofEpochSecond(value);
    }

    private Instant firstInstant(JsonNode first, JsonNode second) {
        var value = nullableInstant(first);
        return value == null ? nullableInstant(second) : value;
    }

    private Long nullableLong(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() || !node.isNumber() ? null : node.longValue();
    }

    private String clean(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred.trim();
    }
}
