package com.indice.erp.billing.stripe;

import com.indice.erp.auth.SignupCheckoutRequest;
import com.indice.erp.auth.SignupCheckoutResponse;
import com.indice.erp.auth.SignupPlanCalculator;
import com.indice.erp.auth.SignupPlanSelection;
import com.indice.erp.auth.SignupService;
import com.indice.erp.auth.SignupTrialTerms;
import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.stripe.exception.StripeException;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class StripeSignupCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(StripeSignupCheckoutService.class);
    private static final Duration CHECKOUT_TTL = Duration.ofMinutes(30);

    private final StripeSignupProperties properties;
    private final SignupService signupService;
    private final SignupPlanCalculator planCalculator;
    private final SignupIntentRepository intentRepository;
    private final SignupIntentModuleRepository intentModuleRepository;
    private final StripeCheckoutLineItemFactory lineItemFactory;
    private final StripeBillingGateway stripeGateway;
    private final BillingPaymentAuditService auditService;
    private final Clock clock;

    public StripeSignupCheckoutService(StripeSignupProperties properties, SignupService signupService,
            SignupPlanCalculator planCalculator, SignupIntentRepository intentRepository,
            SignupIntentModuleRepository intentModuleRepository,
            StripeCheckoutLineItemFactory lineItemFactory, StripeBillingGateway stripeGateway,
            BillingPaymentAuditService auditService, Clock clock) {
        this.properties = properties;
        this.signupService = signupService;
        this.planCalculator = planCalculator;
        this.intentRepository = intentRepository;
        this.intentModuleRepository = intentModuleRepository;
        this.lineItemFactory = lineItemFactory;
        this.stripeGateway = stripeGateway;
        this.auditService = auditService;
        this.clock = clock;
    }

    public SignupCheckoutResponse createCheckout(SignupCheckoutRequest request, String csrfToken) {
        requireStripeConfig();
        cleanupExpiredCheckoutAttempts();
        var profile = signupService.prepareForCheckout(request.accountRequest());
        supersedeExistingCheckoutAttempts(profile.email());
        var plan = planCalculator.calculate(request);
        var token = UUID.randomUUID().toString();
        var intentId = intentRepository.create(token, profile, plan, clock.instant().plus(CHECKOUT_TTL));
        intentModuleRepository.store(intentId, plan.selectedModuleSlugs());
        auditService.checkoutStarted(intentId, plan);

        try {
            var customer = stripeGateway.createCustomer(
                customerParams(profile.email(), profile.fullName(), token),
                StripeIdempotencyKeys.signupCustomer(intentId)
            );
            var session = stripeGateway.createCheckoutSession(
                sessionParams(token, customer.getId(), plan),
                StripeIdempotencyKeys.signupCheckoutSession(intentId)
            );
            if (session.getUrl() == null || session.getUrl().isBlank()) {
                intentRepository.markFailed(intentId, "Stripe did not return a checkout URL.");
                auditService.checkoutFailed(intentId, "Stripe did not return a checkout URL.");
                throw new IllegalStateException("Stripe did not return a checkout URL.");
            }
            intentRepository.attachCheckout(intentId, session.getId(), customer.getId());
            auditService.checkoutCreated(intentId, customer.getId(), session.getId(), plan);
            return new SignupCheckoutResponse(session.getUrl(), session.getId(), csrfToken);
        } catch (StripeException ex) {
            intentRepository.markFailed(intentId, "Unable to create Stripe checkout session.");
            auditService.checkoutFailed(intentId, "Unable to create Stripe checkout session.");
            log.warn("Stripe signup checkout creation failed for intent {}", intentId, ex);
            throw new IllegalStateException("Secure payment checkout could not be started.");
        }
    }

    public SignupCheckoutStatusResponse checkoutStatus(String sessionId) {
        var normalizedSessionId = sessionId == null ? "" : sessionId.trim();
        if (normalizedSessionId.isBlank()) {
            throw new IllegalArgumentException("Checkout session id is required.");
        }
        return intentRepository.findByCheckoutSessionId(normalizedSessionId)
            .map(this::checkoutStatus)
            .orElseGet(() -> response("not_found", "Checkout session was not found.", null, true, false));
    }

    private SignupCheckoutStatusResponse checkoutStatus(SignupIntentRecord intent) {
        var status = intent.status() == null ? "" : intent.status().toLowerCase();
        if (isLocallyExpired(intent, status)) {
            return response("expired", "Checkout expired after 30 minutes. Start account setup again.", null, true, false);
        }
        return switch (status) {
            case "completed" -> response("completed", "Account setup is complete. You can sign in.", intent.companyId(), false, true);
            case "failed" -> response("failed", failureMessage(intent), null, true, false);
            case "superseded" -> response("superseded", "Checkout was replaced by a newer attempt.", null, true, false);
            case "expired" -> response("expired", "Checkout expired after 30 minutes. Start account setup again.", null, true, false);
            case "pending", "checkout_created" -> response("pending", "Payment setup received. We are creating your account.", null, false, false);
            default -> response("failed", "Checkout status could not be completed.", null, true, false);
        };
    }

    private boolean isLocallyExpired(SignupIntentRecord intent, String status) {
        return switch (status) {
            case "pending", "checkout_created", "superseded" -> !intent.expiresAt().isAfter(clock.instant());
            default -> false;
        };
    }

    private String failureMessage(SignupIntentRecord intent) {
        var message = intent.failureMessage() == null ? "" : intent.failureMessage().trim();
        return message.isBlank() ? "Checkout could not be completed." : message;
    }

    private SignupCheckoutStatusResponse response(String status, String message, Long companyId,
            boolean canRestart, boolean canLogin) {
        return new SignupCheckoutStatusResponse(status, message, companyId, canRestart, canLogin);
    }

    private void supersedeExistingCheckoutAttempts(String email) {
        for (var intent : intentRepository.findActivePendingByEmail(email)) {
            var sessionInactive = expireCheckoutSession(intent);
            intentRepository.markSuperseded(intent.id());
            if (sessionInactive) {
                intentRepository.deleteInactive(intent.id());
            }
        }
    }

    int cleanupExpiredCheckoutAttempts() {
        var removed = 0;
        for (var intent : intentRepository.findExpiredCheckoutAttempts()) {
            if ("completed".equalsIgnoreCase(intent.status())) {
                continue;
            }
            if (expireCheckoutSession(intent)) {
                intentRepository.markExpired(intent.id());
                removed += intentRepository.deleteInactive(intent.id());
            }
        }
        return removed;
    }

    private boolean expireCheckoutSession(SignupIntentRecord intent) {
        var sessionId = intent.stripeCheckoutSessionId();
        if (sessionId == null || sessionId.isBlank()) {
            return true;
        }
        try {
            stripeGateway.expireCheckoutSession(sessionId);
            return true;
        } catch (StripeException ex) {
            log.info("Unable to expire inactive Stripe checkout session {} for intent {}", sessionId, intent.id());
            return false;
        }
    }

    private Map<String, Object> customerParams(String email, String name, String token) {
        var metadata = new LinkedHashMap<String, String>();
        metadata.put("signup_intent_token", token);
        var params = new LinkedHashMap<String, Object>();
        params.put("email", email);
        params.put("name", name);
        params.put("metadata", metadata);
        return params;
    }

    private Map<String, Object> sessionParams(String token, String customerId, SignupPlanSelection plan) {
        var metadata = metadata(token, plan);
        var params = new LinkedHashMap<String, Object>();
        params.put("mode", "subscription");
        params.put("customer", customerId);
        params.put("client_reference_id", token);
        params.put("success_url", properties.getSuccessUrl());
        params.put("cancel_url", properties.getCancelUrl());
        params.put("expires_at", clock.instant().plus(CHECKOUT_TTL).getEpochSecond());
        params.put("payment_method_types", java.util.List.of("card"));
        params.put("payment_method_collection", "always");
        params.put("billing_address_collection", "required");
        params.put("customer_update", Map.of("address", "auto", "name", "auto"));
        params.put("metadata", metadata);
        params.put("subscription_data", Map.of("trial_period_days", SignupTrialTerms.TRIAL_DAYS, "metadata", metadata));
        params.put("line_items", lineItemFactory.lineItems(plan));
        if (properties.isAutomaticTaxEnabled()) {
            params.put("automatic_tax", Map.of("enabled", true));
        }
        if (properties.isTaxIdCollectionEnabled()) {
            params.put("tax_id_collection", Map.of("enabled", true));
        }
        return params;
    }

    private Map<String, String> metadata(String token, SignupPlanSelection plan) {
        return Map.of(
            "signup_intent_token", token,
            "plan_id", plan.planId(),
            "included_users", Integer.toString(plan.includedCollaborators()),
            "extra_users", Integer.toString(plan.extraCollaborators()),
            "monthly_amount_cents", Integer.toString(plan.monthlyAmountCents()),
            "selected_module_slugs", String.join(",", plan.selectedModuleSlugs())
        );
    }

    private void requireStripeConfig() {
        if (properties.getSecretKey().isBlank() || properties.getSuccessUrl().isBlank() || properties.getCancelUrl().isBlank()) {
            throw new IllegalStateException("Stripe signup checkout is not configured.");
        }
    }
}
