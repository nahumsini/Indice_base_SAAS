package com.indice.erp.billing.stripe;

import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.signup.BillingSignupIntent;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingTenantProvisioningService;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class BillingSignupCheckoutReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(BillingSignupCheckoutReconciliationService.class);

    private final BillingSignupIntentRepository signupIntents;
    private final StripeCheckoutGateway stripeGateway;
    private final BillingProjectionRepository projections;
    private final BillingTenantProvisioningService provisioning;
    private final BillingAuditService audit;
    private final Clock clock;

    public BillingSignupCheckoutReconciliationService(
        BillingSignupIntentRepository signupIntents,
        StripeCheckoutGateway stripeGateway,
        BillingProjectionRepository projections,
        BillingTenantProvisioningService provisioning,
        BillingAuditService audit,
        Clock clock
    ) {
        this.signupIntents = signupIntents;
        this.stripeGateway = stripeGateway;
        this.projections = projections;
        this.provisioning = provisioning;
        this.audit = audit;
        this.clock = clock;
    }

    public BillingSignupIntent reconcileIfCompleted(BillingSignupIntent intent) {
        if (intent == null || intent.provisioned()) {
            return intent;
        }
        if ("CHECKOUT_COMPLETED".equals(status(intent.status()))) {
            return provisionAndReload(intent, "checkout-status:" + intent.stripeCheckoutSessionId());
        }
        if (!canCheckStripe(intent)) {
            return intent;
        }

        try {
            var session = stripeGateway.retrieveCheckoutSession(intent.stripeCheckoutSessionId());
            if (!trustedSession(intent, session)) {
                return intent;
            }
            if ("expired".equalsIgnoreCase(session.status())) {
                signupIntents.markCheckoutExpired(intent.id(), "checkout-status:" + session.id(), eventCreatedAt(session));
                return reload(intent);
            }
            if (!"complete".equalsIgnoreCase(session.status()) || blank(session.subscriptionId())) {
                return intent;
            }

            var eventId = "checkout-status:" + session.id();
            var eventCreatedAt = eventCreatedAt(session);
            signupIntents.markCheckoutCompleted(
                intent.id(),
                eventId,
                eventCreatedAt,
                session.customerId(),
                session.id(),
                session.subscriptionId()
            );
            upsertSubscriptionProjection(session, eventId, eventCreatedAt, intent.id());
            return provisionAndReload(intent, eventId);
        } catch (StripeGatewayException exception) {
            log.warn("signup_checkout_status_reconciliation_failed intentId={} sessionId={}",
                intent.id(), intent.stripeCheckoutSessionId(), exception);
            return intent;
        }
    }

    private BillingSignupIntent provisionAndReload(BillingSignupIntent intent, String eventId) {
        var result = provisioning.provisionIfEligible(intent.id());
        audit.record(
            "SIGNUP",
            "CHECKOUT_STATUS_RECONCILED",
            result.provisioned() ? "SUCCESS" : result.status(),
            null,
            eventId,
            intent.stripeCheckoutSessionId(),
            result.companyId(),
            intent.id(),
            Map.of("provisioningStatus", result.status(), "provisioned", result.provisioned())
        );
        return reload(intent);
    }

    private void upsertSubscriptionProjection(
        StripeCheckoutGateway.CheckoutSessionSnapshot session,
        String eventId,
        Instant eventCreatedAt,
        long intentId
    ) {
        var subscription = session.subscription();
        if (subscription == null) {
            return;
        }
        projections.upsertSubscription(
            new BillingProjectionRepository.SubscriptionSnapshot(
                eventId,
                eventCreatedAt,
                subscription.id(),
                clean(subscription.customerId(), session.customerId()),
                clean(subscription.status(), "unknown"),
                subscription.collectionMethod(),
                subscription.currency(),
                subscription.cancelAtPeriodEnd(),
                subscription.trialStartsAt(),
                subscription.trialEndsAt(),
                subscription.currentPeriodStartsAt(),
                subscription.currentPeriodEndsAt(),
                subscription.canceledAt(),
                subscription.latestInvoiceId(),
                session.paymentStatus()
            ),
            intentId
        );
    }

    private boolean trustedSession(
        BillingSignupIntent intent,
        StripeCheckoutGateway.CheckoutSessionSnapshot session
    ) {
        if (session == null || !intent.stripeCheckoutSessionId().equals(session.id())) {
            return false;
        }
        if (blank(intent.stripeCustomerId()) || blank(session.customerId())) {
            return true;
        }
        if (intent.stripeCustomerId().equals(session.customerId())) {
            return true;
        }
        log.warn("signup_checkout_status_customer_mismatch intentId={} localCustomer={} stripeCustomer={}",
            intent.id(), intent.stripeCustomerId(), session.customerId());
        return false;
    }

    private BillingSignupIntent reload(BillingSignupIntent fallback) {
        var refreshed = signupIntents.findById(fallback.id());
        return refreshed == null ? fallback : refreshed;
    }

    private boolean canCheckStripe(BillingSignupIntent intent) {
        return !blank(intent.stripeCheckoutSessionId())
            && switch (status(intent.status())) {
                case "PENDING", "CUSTOMER_CREATED", "CHECKOUT_CREATED" -> true;
                default -> false;
            };
    }

    private Instant eventCreatedAt(StripeCheckoutGateway.CheckoutSessionSnapshot session) {
        return session.createdAt() == null ? clock.instant() : session.createdAt();
    }

    private String status(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String clean(String preferred, String fallback) {
        return blank(preferred) ? fallback : preferred;
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
