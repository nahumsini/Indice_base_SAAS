package com.indice.erp.billing.signup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.RegionalCommercialOfferService;
import com.indice.erp.billing.stripe.*;
import com.indice.erp.billing.subscription.BillingAccountAuthorityService;
import com.indice.erp.billing.subscription.BillingActivationService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicTrialPaymentService {
    private final boolean enabled;
    private final String returnUrl;
    private final PublicTrialPaymentRepository payments;
    private final RegionalCommercialOfferService offers;
    private final BillingAccountAuthorityService authority;
    private final BillingActivationService activation;
    private final BillingSignupIntentRepository intents;
    private final StripeCheckoutGateway customers;
    private final StripeTrialPaymentGateway stripe;
    private final StripePhaseTwoProperties properties;
    private final JdbcTemplate jdbc;
    private final BillingAuditService audit;
    private final Clock clock;
    private final ObjectMapper mapper;

    public PublicTrialPaymentService(@Value("${app.billing.signup.regional-payments-enabled:false}") boolean enabled,
        @Value("${app.web.public-url:}") String publicUrl, PublicTrialPaymentRepository payments,
        RegionalCommercialOfferService offers, BillingAccountAuthorityService authority, BillingActivationService activation,
        BillingSignupIntentRepository intents, StripeCheckoutGateway customers, StripeTrialPaymentGateway stripe,
        StripePhaseTwoProperties properties, JdbcTemplate jdbc, BillingAuditService audit, Clock clock, ObjectMapper mapper) {
        this.enabled = enabled; this.returnUrl = publicUrl.replaceAll("/+$", "") + "/billing";
        this.payments = payments; this.offers = offers; this.authority = authority; this.activation = activation;
        this.intents = intents; this.customers = customers; this.stripe = stripe; this.properties = properties;
        this.jdbc = jdbc; this.audit = audit; this.clock = clock; this.mapper = mapper;
    }

    public PublicTrialPaymentContracts.Workspace workspace(long companyId, long actor, String interval) {
        var trial = payments.trial(companyId, false);
        if (trial == null) return new PublicTrialPaymentContracts.Workspace(false, false, false, null, null, null, null, List.of());
        authority.requireOwner(companyId, actor);
        var selections = trial.converted() ? List.<CommercialOfferSelection>of() : offers.available(trial.countryCode(), interval);
        var pending = jdbc.query("""
            SELECT CASE WHEN i.stripe_subscription_id IS NOT NULL THEN 'METHOD_REGISTERED'
                        WHEN i.status = 'CHECKOUT_CREATED' THEN 'SETUP_PENDING' ELSE 'NONE' END,
                   CASE WHEN i.status = 'CHECKOUT_CREATED' AND i.checkout_expires_at > CURRENT_TIMESTAMP(6)
                        THEN i.checkout_url ELSE NULL END
            FROM billing_trial_payment_consents c JOIN billing_signup_intents i ON i.id = c.signup_intent_id
            WHERE c.company_id = ? ORDER BY c.id DESC LIMIT 1
            """, (rs, n) -> new String[] {rs.getString(1), rs.getString(2)}, companyId).stream().findFirst().orElse(new String[] {"NONE", null});
        return new PublicTrialPaymentContracts.Workspace(true, trial.converted(), enabled && properties.isEnabled()
            && properties.isProcessorEnabled() && !selections.isEmpty(), trial.countryCode(), trial.endsAt(), pending[0], pending[1],
            selections.stream().map(selection -> quote(selection, trial)).toList());
    }

    /** Availability, not public launch approval or proof of a future successful payment. */
    public boolean publicReady() {
        return enabled && properties.isEnabled() && properties.isProcessorEnabled()
            && java.util.stream.Stream.of("CA", "MX").allMatch(country ->
                !offers.available(country, "MONTH").isEmpty() && !offers.available(country, "YEAR").isEmpty());
    }

    @Transactional(propagation = Propagation.NEVER)
    public PublicTrialPaymentContracts.Setup activate(long companyId, long actor, String key, PublicTrialPaymentContracts.Activation request) {
        authority.requireOwner(companyId, actor);
        if (!enabled || !properties.isEnabled() || !properties.isProcessorEnabled()) throw new IllegalStateException("Regional payments are not enabled.");
        requireReturnUrl();
        if (!BillingSignupEmailVerificationInput.validReference(key)) throw new IllegalArgumentException("A hexadecimal idempotency key is required.");
        if (request == null || !request.acceptedAutomaticPayment()
            || !PublicTrialPaymentContracts.TERMS_VERSION.equals(request.termsVersion())) {
            throw new IllegalArgumentException("Separate automatic payment consent is required.");
        }
        var trial = payments.trial(companyId, false);
        if (trial == null || trial.converted()) throw new IllegalStateException("No unpaid regional trial is available.");
        var selection = offers.select(trial.countryCode(), request.productCode(), request.billingInterval());
        var quote = quote(selection, trial);
        if (!quote.quoteHash().equals(request.quoteHash())) throw new BillingSignupConflictException("The quote changed; review it again.");
        var acceptedAt = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        var intentId = activation.prepareRegionalIntent(companyId, actor, key, selection,
            id -> payments.freeze(companyId, actor, id, selection, quote, acceptedAt));
        var intent = intents.findById(intentId);
        if (intent.checkoutUrl() != null) {
            if (!intent.checkoutExpiresAt().isAfter(clock.instant())) throw new BillingSignupConflictException("The setup expired; refresh its status before retrying.");
            return new PublicTrialPaymentContracts.Setup("SETUP_PENDING", intent.checkoutUrl(), intent.checkoutExpiresAt(), true);
        }
        var spec = intents.checkoutSpec(intentId);
        // Freeze every provider attempt's deadline, including a lost customer response.
        jdbc.update("UPDATE billing_signup_intents SET checkout_expires_at = COALESCE(checkout_expires_at, ?) WHERE id = ? AND company_id = ?",
            Timestamp.from(acceptedAt.plus(Duration.ofMinutes(31)).truncatedTo(java.time.temporal.ChronoUnit.SECONDS)), intentId, companyId);
        var expiresAt = intents.findById(intentId).checkoutExpiresAt();
        if (!expiresAt.isAfter(clock.instant())) throw new BillingSignupConflictException("Setup needs reconciliation before another attempt.");
        var customerId = intent.stripeCustomerId();
        if (customerId == null) {
            customerId = payments.customer(companyId);
            if (customerId == null) customerId = customers.createCustomer(new StripeCheckoutGateway.CustomerCommand(spec.email(), spec.fullName(),
                spec.phone(), trial.countryCode(), Map.of("indice_flow", "regional_trial_payment", "indice_company_ref", Long.toString(companyId))),
                "indice-trial-customer-" + companyId).id();
            payments.saveCustomer(companyId, intentId, customerId);
            intents.markCustomerCreated(intentId, customerId);
        }
        var setup = stripe.createSetup(customerId, selection.currency(), returnUrl, expiresAt,
            metadata(intentId, quote.quoteHash()), "indice-trial-setup-" + intentId);
        intents.markCheckoutCreated(intentId, setup.id(), setup.url(), setup.expiresAt());
        audit.record("BILLING", "REGIONAL_TRIAL_CONSENT_AND_SETUP", "SUCCESS", BillingHashing.sha256(key), null,
            setup.id(), companyId, intentId, Map.of("termsVersion", quote.termsVersion(), "quoteHash", quote.quoteHash(),
                "currency", selection.currency(), "chargeTiming", quote.chargeTiming()));
        return new PublicTrialPaymentContracts.Setup("SETUP_PENDING", setup.url(), setup.expiresAt(), false);
    }

    /** Called only for the signature-verified durable inbox, before its financial transaction. */
    @Transactional(propagation = Propagation.NEVER)
    public void prepareSetup(StripeWebhookEventRepository.ClaimedEvent event) {
        if (!"checkout.session.completed".equals(event.eventType())) return;
        final JsonNode object;
        try { object = mapper.readTree(event.rawPayload()).path("data").path("object"); }
        catch (java.io.IOException ex) { throw failure("INVALID_TRIAL_SETUP"); }
        if (!"regional_trial_payment".equals(object.path("metadata").path("indice_flow").asText())) return;
        var intent = intents.findByPublicReference(object.path("metadata").path("indice_signup_ref").asText());
        var consent = intent == null ? null : payments.consent(intent.id());
        if (consent == null || consent.sessionId() == null || !consent.sessionId().equals(object.path("id").asText())) {
            throw failure("WAITING_TRIAL_SETUP_ASSOCIATION");
        }
        if (consent.subscriptionId() != null) return;
        var verified = stripe.verifySetup(consent.sessionId());
        var trial = payments.trial(consent.companyId(), false);
        if (trial == null || !consent.customerId().equals(verified.customerId())
            || !consent.accountId().equals(verified.accountId()) || verified.liveMode() != "LIVE".equals(consent.stripeMode())
            || !trial.countryCode().equalsIgnoreCase(verified.countryCode())
            || !consent.quoteHash().equals(verified.metadata().get("indice_quote_hash"))) throw failure("TRIAL_SETUP_OWNERSHIP_MISMATCH");
        payments.verifiedSetup(consent.intentId(), clock.instant());
        payments.requireSubscriptionAttempt(consent.intentId(), clock.instant());
        if (!payments.subscriptionAttemptRecorded(consent.intentId())) throw failure("TRIAL_SETUP_DEADLINE_PASSED");
        // Setup mode has no Checkout 48-hour minimum. Subscription uses the original absolute
        // cutoff even on retries. A setup completed too late is not changed into an immediate charge.
        var subscriptionId = stripe.createSubscription(new StripeTrialPaymentGateway.SubscriptionCommand(
            verified.customerId(), verified.paymentMethodId(), consent.priceId(),
            "AFTER_TRIAL".equals(consent.chargeTiming()) ? consent.firstChargeAt() : null,
            properties.isAutomaticTaxEnabled(), metadata(consent.intentId(), consent.quoteHash())),
            "indice-trial-subscription-" + consent.intentId());
        intents.attachSubscription(consent.intentId(), subscriptionId, event.eventId(), clock.instant());
    }

    public boolean regionalIntent(long intentId) { return payments.consent(intentId) != null; }
    public PublicTrialPaymentRepository.Consent consent(long intentId) { return payments.consent(intentId); }
    public PublicTrialPaymentRepository.Consent bySubscription(String id) { return payments.bySubscription(id); }

    public boolean unconvertedRegionalCustomer(String customerId) {
        if (customerId == null || customerId.isBlank()) return false;
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM company_billing_customers customer
                JOIN billing_trial_entries trial ON trial.company_id = customer.company_id AND trial.status = 'ACTIVE'
                WHERE customer.stripe_customer_id = ? AND customer.status = 'ACTIVE')
            """, Boolean.class, customerId));
    }

    /** Validate before projecting an unpaid regional subscription, including out-of-order delivery. */
    public void requireSubscriptionBinding(Long intentId, JsonNode subscription) {
        var consent = intentId == null ? payments.bySubscription(id(subscription.path("id"))) : payments.consent(intentId);
        if (consent == null) {
            if (unconvertedRegionalCustomer(id(subscription.path("customer")))) throw failure("WAITING_TRIAL_SUBSCRIPTION_BINDING");
            return;
        }
        if (consent.paidInvoiceId() != null) return;
        if (consent.subscriptionId() == null) throw failure("WAITING_TRIAL_SUBSCRIPTION_BINDING");
        if (!validSubscription(consent, subscription)) throw failure("TRIAL_SUBSCRIPTION_BINDING_MISMATCH");
    }

    public static boolean validSubscription(PublicTrialPaymentRepository.Consent c, JsonNode subscription) {
        var items = subscription.path("items");
        if (!c.subscriptionId().equals(id(subscription.path("id")))
            || !c.customerId().equals(id(subscription.path("customer")))
            || !c.currency().equalsIgnoreCase(subscription.path("currency").asText())
            || !"charge_automatically".equals(subscription.path("collection_method").asText())
            || subscription.path("livemode").asBoolean() != "LIVE".equals(c.stripeMode())
            || !c.quoteHash().equals(subscription.path("metadata").path("indice_quote_hash").asText())
            || items.path("has_more").asBoolean() || items.path("data").size() != 1) return false;
        var item = items.path("data").path(0);
        if (!c.priceId().equals(id(item.path("price"))) || item.path("quantity").asLong() != 1) return false;
        return "AFTER_TRIAL".equals(c.chargeTiming())
            ? subscription.path("trial_end").asLong() == c.firstChargeAt().getEpochSecond()
            : subscription.path("trial_end").isMissingNode() || subscription.path("trial_end").isNull();
    }

    /** Card/setup/zero trial invoice cannot lift expiry. This is invoked within the native webhook transaction. */
    public boolean confirmPaid(String subscriptionId, Long associatedCompanyId, JsonNode invoice, Instant eventAt) {
        var consent = payments.bySubscription(subscriptionId);
        if (consent == null || consent.paidInvoiceId() != null) return false;
        if (associatedCompanyId == null) throw failure("WAITING_TRIAL_SUBSCRIPTION_PROJECTION");
        if (associatedCompanyId != consent.companyId() || consent.verifiedAt() == null) throw failure("TRIAL_PAYMENT_BINDING_MISMATCH");
        if (invoice.path("amount_paid").asLong() == 0) return false;
        var earliest = "AFTER_TRIAL".equals(consent.chargeTiming()) ? consent.firstChargeAt() : consent.acceptedAt();
        if (eventAt.getEpochSecond() < earliest.getEpochSecond() || !validPaidInvoice(consent, invoice)) throw failure("TRIAL_PAID_INVOICE_MISMATCH");
        return payments.convert(consent, invoice.path("id").asText(), eventAt);
    }

    public static boolean validPaidInvoice(PublicTrialPaymentRepository.Consent c, JsonNode invoice) {
        var lines = invoice.path("lines");
        var subscription = id(invoice.path("subscription"));
        if (subscription == null) subscription = id(invoice.path("parent").path("subscription_details").path("subscription"));
        if (!c.subscriptionId().equals(subscription)
            || invoice.path("livemode").asBoolean() != "LIVE".equals(c.stripeMode())
            || !"paid".equals(invoice.path("status").asText()) || invoice.path("paid_out_of_band").asBoolean()
            || !c.customerId().equals(id(invoice.path("customer"))) || !c.currency().equalsIgnoreCase(invoice.path("currency").asText())
            || invoice.path("amount_paid").asLong() < c.amountCents() || invoice.path("amount_paid").asLong() < invoice.path("amount_due").asLong()
            || invoice.path("amount_paid").asLong() < invoice.path("total").asLong()
            || lines.path("has_more").asBoolean() || lines.path("data").size() != 1) return false;
        var line = lines.path("data").path(0);
        var priceId = id(line.path("pricing").path("price_details").path("price"));
        if (priceId == null) priceId = id(line.path("price"));
        return c.priceId().equals(priceId) && line.path("quantity").asLong() == 1
            && line.path("amount").asLong() == c.amountCents()
            && line.path("period").path("start").asLong() >= ("AFTER_TRIAL".equals(c.chargeTiming()) ? c.firstChargeAt() : c.acceptedAt()).getEpochSecond();
    }

    private PublicTrialPaymentContracts.Quote quote(CommercialOfferSelection offer, PublicTrialPaymentRepository.Trial trial) {
        var timing = trial.endsAt().isAfter(clock.instant()) ? "AFTER_TRIAL" : "IMMEDIATE";
        var hash = BillingHashing.sha256(String.join("|", Long.toString(offer.catalogVersionId()), offer.offerCode(),
            offer.billingInterval().name(), offer.currency(), String.valueOf(offer.estimatedAmountCents()),
            Integer.toString(offer.includedSeats()), offer.baseExternalPriceId(), trial.endsAt().toString(), timing,
            PublicTrialPaymentContracts.TERMS_VERSION, "STRIPE_TAX_EXCLUSIVE"));
        return new PublicTrialPaymentContracts.Quote(offer.offerCode(), offer.products().getFirst().displayName(),
            offer.billingInterval().name(), offer.currency(), offer.estimatedAmountCents(), offer.includedSeats(), hash,
            PublicTrialPaymentContracts.TERMS_VERSION, timing, trial.endsAt(), offer.moduleSlugs());
    }
    private Map<String, String> metadata(long intentId, String quoteHash) {
        return Map.of("indice_flow", "regional_trial_payment", "indice_signup_ref", intents.findById(intentId).publicReference(),
            "indice_quote_hash", quoteHash);
    }
    private void requireReturnUrl() {
        var uri = java.net.URI.create(returnUrl);
        var local = List.of("localhost", "127.0.0.1", "::1").contains(uri.getHost());
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
            || !("https".equals(uri.getScheme()) || (local && "http".equals(uri.getScheme())))) {
            throw new IllegalStateException("A server-configured HTTPS billing return URL is required.");
        }
    }
    private static String id(JsonNode value) { return value.isTextual() ? value.asText() : value.path("id").isTextual() ? value.path("id").asText() : null; }
    private static StripeEventProcessingException failure(String code) { return new StripeEventProcessingException(code, "Regional trial payment needs verification or reconciliation."); }
}
