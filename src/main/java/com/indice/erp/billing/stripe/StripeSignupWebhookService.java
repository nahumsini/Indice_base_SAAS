package com.indice.erp.billing.stripe;

import com.indice.erp.auth.SignupService;
import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import java.time.Clock;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StripeSignupWebhookService {

    private static final Logger log = LoggerFactory.getLogger(StripeSignupWebhookService.class);

    private final StripeSignupProperties properties;
    private final SignupIntentRepository intentRepository;
    private final SignupIntentModuleRepository intentModuleRepository;
    private final StripeWebhookEventRepository eventRepository;
    private final StripeUnmatchedWebhookEventRepository unmatchedEventRepository;
    private final CompanyBillingSubscriptionRepository subscriptionRepository;
    private final StripeBillingGateway stripeGateway;
    private final StripeSubscriptionBillingMapper subscriptionMapper;
    private final CompanyModuleEntitlementService moduleEntitlementService;
    private final StripeInvoicePaymentHandler invoicePaymentHandler;
    private final StripeBillingNotificationService notificationService;
    private final StripeWebhookReconciliationService reconciliationService;
    private final SignupService signupService;
    private final BillingPaymentAuditService auditService;
    private final Clock clock;

    public StripeSignupWebhookService(StripeSignupProperties properties, SignupIntentRepository intentRepository,
            SignupIntentModuleRepository intentModuleRepository, StripeWebhookEventRepository eventRepository,
            StripeUnmatchedWebhookEventRepository unmatchedEventRepository,
            CompanyBillingSubscriptionRepository subscriptionRepository,
            StripeBillingGateway stripeGateway,
            StripeSubscriptionBillingMapper subscriptionMapper,
            CompanyModuleEntitlementService moduleEntitlementService,
            StripeInvoicePaymentHandler invoicePaymentHandler,
            StripeBillingNotificationService notificationService,
            StripeWebhookReconciliationService reconciliationService,
            SignupService signupService,
            BillingPaymentAuditService auditService,
            Clock clock) {
        this.properties = properties;
        this.intentRepository = intentRepository;
        this.intentModuleRepository = intentModuleRepository;
        this.eventRepository = eventRepository;
        this.unmatchedEventRepository = unmatchedEventRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.stripeGateway = stripeGateway;
        this.subscriptionMapper = subscriptionMapper;
        this.moduleEntitlementService = moduleEntitlementService;
        this.invoicePaymentHandler = invoicePaymentHandler;
        this.notificationService = notificationService;
        this.reconciliationService = reconciliationService;
        this.signupService = signupService;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Transactional(noRollbackFor = StripeWebhookRetryableException.class)
    public void handle(String payload, String signatureHeader) {
        var event = verify(payload, signatureHeader);
        auditService.webhook(event.getId(), event.getType(), "received", null, null);
        if (eventRepository.alreadyProcessed(event.getId())) {
            auditService.webhook(event.getId(), event.getType(), "ignored", null, "Duplicate Stripe webhook event.");
            return;
        }
        try {
            switch (event.getType()) {
                case "checkout.session.completed" -> handleCheckoutCompleted(event);
                case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted" ->
                    handleSubscriptionChanged(event);
                case "customer.subscription.trial_will_end" -> handleTrialWillEnd(event);
                case "invoice.payment_succeeded", "invoice.paid" -> handleInvoicePaymentSucceeded(event);
                case "invoice.payment_failed" -> handleInvoicePaymentFailed(event);
                default -> {
                }
            }
        } catch (StripeWebhookRetryableException ex) {
            unmatchedEventRepository.record(event.getId(), event.getType(), payload, ex.subscriptionId(), ex.getMessage());
            auditService.webhook(event.getId(), event.getType(), "retrying", ex.subscriptionId(), ex.getMessage());
            throw ex;
        }
        eventRepository.recordProcessed(event.getId(), event.getType(), payload);
        auditService.webhook(event.getId(), event.getType(), "processed", null, null);
    }

    protected void handleCheckoutCompleted(Event event) {
        var session = object(event, Session.class)
            .orElseThrow(() -> new IllegalArgumentException("Stripe checkout session payload is missing."));
        if (!"complete".equals(session.getStatus())) {
            throw new IllegalArgumentException("Stripe checkout session is not complete.");
        }
        var token = token(session);
        var intentOptional = intentRepository.findByToken(token);
        if (intentOptional.isEmpty()) {
            auditService.webhook(event.getId(), event.getType(), "ignored", session.getSubscription(), "Signup intent was not found.");
            log.info("Ignoring Stripe checkout completion for deleted signup intent token {}", token);
            return;
        }
        var intent = intentOptional.get();
        intent = intent.withPlan(intent.plan().withSelectedModuleSlugs(intentModuleRepository.list(intent.id())));
        if ("completed".equals(intent.status())) {
            auditService.webhook(event.getId(), event.getType(), "ignored", session.getSubscription(), "Signup intent was already completed.");
            return;
        }
        if (!canProvisionCompletedCheckout(intent.status())) {
            auditService.webhook(event.getId(), event.getType(), "ignored", session.getSubscription(), "Signup intent status cannot be provisioned.");
            log.info("Ignoring Stripe checkout completion for {} signup intent {}", intent.status(), intent.id());
            return;
        }
        try {
            var subscription = stripeGateway.retrieveSubscription(requireText(session.getSubscription(), "Stripe subscription is missing."));
            var billing = subscriptionMapper.billingInfo(intent, session, subscription);
            var result = signupService.createVerifiedAccount(intent.profile(), billing);
            intentRepository.markCompleted(intent.id(), result.companyId(), billing.stripeSubscriptionId());
            auditService.checkoutCompleted(intent.id(), result.companyId(), session.getCustomer(), session.getId(),
                billing.stripeSubscriptionId(), intent.plan());
            resolvePendingWebhookEvents(subscription);
        } catch (StripeException ex) {
            intentRepository.markFailed(intent.id(), "Unable to retrieve Stripe subscription.");
            auditService.checkoutFailed(intent.id(), "Unable to retrieve Stripe subscription.");
            log.warn("Stripe subscription retrieval failed for intent {}", intent.id(), ex);
            throw new IllegalStateException("Stripe subscription could not be verified.");
        } catch (RuntimeException ex) {
            intentRepository.markFailed(intent.id(), ex.getMessage());
            auditService.checkoutFailed(intent.id(), ex.getMessage());
            throw ex;
        }
    }

    private boolean canProvisionCompletedCheckout(String status) {
        return switch (status == null ? "" : status.toLowerCase()) {
            case "pending", "checkout_created", "expired", "superseded" -> true;
            default -> false;
        };
    }

    private void resolvePendingWebhookEvents(Subscription subscription) {
        try {
            reconciliationService.resolvePendingForSubscription(subscription);
        } catch (RuntimeException ex) {
            log.warn("Unable to reconcile pending Stripe webhooks for subscription {}", subscription.getId(), ex);
        }
    }

    protected void handleSubscriptionChanged(Event event) {
        object(event, Subscription.class).ifPresent(subscription -> {
            var updated = subscriptionMapper.updateLocalState(subscriptionRepository, subscription);
            requireLocalSubscription(updated, subscription.getId());
            auditService.subscriptionEvent(event.getId(), event.getType(), subscription.getId(), subscription.getStatus());
            if ("active".equals(subscription.getStatus())) {
                moduleEntitlementService.activatePaidPlanBySubscription(subscription.getId());
            }
            if ("canceled".equals(subscription.getStatus()) || "customer.subscription.deleted".equals(event.getType())) {
                notificationService.subscriptionCanceled(subscription);
            }
        });
    }

    protected void handleTrialWillEnd(Event event) {
        object(event, Subscription.class).ifPresent(subscription -> {
            if (!subscriptionRepository.exists(subscription.getId())) {
                throw retryLater(subscription.getId());
            }
            auditService.subscriptionEvent(event.getId(), event.getType(), subscription.getId(), subscription.getStatus());
            notificationService.trialWillEnd(subscription);
        });
    }

    protected void handleInvoicePaymentSucceeded(Event event) {
        object(event, Invoice.class).ifPresent(invoice -> {
            if (!invoicePaymentHandler.handlePaymentSucceeded(invoice)) {
                throw retryLater(subscriptionId(invoice));
            }
            auditService.invoiceEvent(event.getId(), event.getType(), subscriptionId(invoice), invoice.getId(),
                "succeeded", amount(invoice.getAmountPaid()), invoice.getCurrency(), null);
            notificationService.paymentSucceeded(invoice, subscriptionId(invoice));
        });
    }

    protected void handleInvoicePaymentFailed(Event event) {
        object(event, Invoice.class).ifPresent(invoice -> {
            if (!invoicePaymentHandler.handlePaymentFailed(invoice)) {
                throw retryLater(subscriptionId(invoice));
            }
            auditService.invoiceEvent(event.getId(), event.getType(), subscriptionId(invoice), invoice.getId(),
                "failed", amount(invoice.getAmountDue()), invoice.getCurrency(), "Stripe invoice payment failed.");
            notificationService.paymentFailed(invoice, subscriptionId(invoice));
        });
    }

    private Integer amount(Long value) {
        if (value == null) {
            return null;
        }
        return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : value.intValue();
    }

    private void requireLocalSubscription(int updatedRows, String subscriptionId) {
        if (updatedRows <= 0) {
            throw retryLater(subscriptionId);
        }
    }

    private StripeWebhookRetryableException retryLater(String subscriptionId) {
        return new StripeWebhookRetryableException(subscriptionId);
    }

    private String subscriptionId(Invoice invoice) {
        if (invoice.getParent() == null || invoice.getParent().getSubscriptionDetails() == null) {
            return "";
        }
        var subscriptionId = invoice.getParent().getSubscriptionDetails().getSubscription();
        return subscriptionId == null ? "" : subscriptionId.trim();
    }

    private Event verify(String payload, String signatureHeader) {
        if (properties.getWebhookSecret().isBlank()) {
            throw new IllegalStateException("Stripe webhook secret is not configured.");
        }
        try {
            return Webhook.constructEvent(payload, signatureHeader, properties.getWebhookSecret());
        } catch (SignatureVerificationException ex) {
            throw new IllegalArgumentException("Invalid Stripe webhook signature.");
        }
    }

    private <T extends StripeObject> Optional<T> object(Event event, Class<T> expectedType) {
        return event.getDataObjectDeserializer().getObject()
            .filter(expectedType::isInstance)
            .map(expectedType::cast);
    }

    private String token(Session session) {
        var metadata = session.getMetadata();
        var token = session.getClientReferenceId();
        if ((token == null || token.isBlank()) && metadata != null) {
            token = metadata.get("signup_intent_token");
        }
        return requireText(token, "Signup checkout token is missing.");
    }

    private String requireText(String value, String message) {
        var cleaned = value == null ? "" : value.trim();
        if (cleaned.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return cleaned;
    }
}
