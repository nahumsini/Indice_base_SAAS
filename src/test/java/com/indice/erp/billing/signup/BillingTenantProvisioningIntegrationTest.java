package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.stripe.StripeWebhookEnvelope;
import com.indice.erp.billing.stripe.StripeWebhookEventRepository;
import com.indice.erp.billing.stripe.StripeWebhookProcessor;
import com.indice.erp.entitlement.CompanyEntitlementService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.billing.provisioning.enabled=true",
    "app.billing.stripe.enabled=false"
})
class BillingTenantProvisioningIntegrationTest {

    private static final String TEST_EMAIL_PREFIX = "phase3-provisioning-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private BillingSignupIntentRepository signupIntents;

    @Autowired
    private CommercialOfferSelectionService offers;

    @Autowired
    private BillingTenantProvisioningService provisioning;

    @Autowired
    private CompanyEntitlementService entitlements;

    @Autowired private StripeWebhookEventRepository events;
    @Autowired private StripeWebhookProcessor processor;
    @Autowired private CommercialLifecycleService lifecycle;

    @BeforeEach
    void cleanBefore() {
        cleanTestState();
    }

    @AfterEach
    void cleanAfter() {
        cleanTestState();
    }

    @Test
    void provisionsExactlyOnceWhenTwoWorkersRaceTheSameCompletedCheckout() throws Exception {
        var intent = completedIntent(uniqueEmail("race"));
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);

        var first = CompletableFuture.supplyAsync(() -> provisionAfterBarrier(intent.id(), ready, start));
        var second = CompletableFuture.supplyAsync(() -> provisionAfterBarrier(intent.id(), ready, start));
        assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
        start.countDown();

        var results = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        assertThat(results).allSatisfy(result -> {
            assertThat(result.provisioned()).isTrue();
            assertThat(result.status()).isEqualTo("PROVISIONED");
        });
        assertThat(results.get(0).companyId()).isEqualTo(results.get(1).companyId());
        assertThat(results.get(0).ownerUserId()).isEqualTo(results.get(1).ownerUserId());

        var provisioned = signupIntents.findById(intent.id());
        assertThat(provisioned.provisioningStatus()).isEqualTo("PROVISIONED");
        assertThat(provisioned.companyId()).isNotNull();
        assertThat(jdbc.queryForObject(
            "SELECT commercial_account_type FROM companies WHERE id = ?",
            String.class,
            provisioned.companyId()
        )).isEqualTo("SUPER_ADMIN");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_ownerships WHERE source_signup_intent_id = ?",
            Integer.class,
            intent.id()
        )).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ?",
            Integer.class,
            intentEmail(intent.id())
        )).isEqualTo(1);
        assertThat(jdbc.queryForMap(
            "SELECT role, status, visibility FROM user_companies WHERE id = ?",
            provisioned.ownerUserCompanyId()
        )).containsEntry("role", "superadmin").containsEntry("status", "active").containsEntry("visibility", "all");
        assertThat(jdbc.queryForMap(
            "SELECT unit_id, business_id, department FROM user_work_profiles WHERE user_company_id = ?",
            provisioned.ownerUserCompanyId()
        )).containsEntry("unit_id", null).containsEntry("business_id", null).containsEntry("department", "Corporate office");

        var expectedProducts = signupIntents.productIds(intent.id()).size();
        var expectedCapabilities = jdbc.queryForObject(
            """
                SELECT COUNT(DISTINCT capability_code)
                FROM billing_product_capabilities capability
                JOIN billing_signup_intent_products selected ON selected.catalog_product_id = capability.product_id
                WHERE selected.signup_intent_id = ?
                """,
            Integer.class,
            intent.id()
        );
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_trial_product_grants WHERE source_signup_intent_id = ? AND status = 'ACTIVE'",
            Integer.class,
            intent.id()
        )).isEqualTo(expectedProducts);
        assertThat(jdbc.queryForObject(
            "SELECT TIMESTAMPDIFF(DAY, MIN(starts_at), MAX(ends_at)) FROM company_trial_product_grants WHERE source_signup_intent_id = ?",
            Integer.class,
            intent.id()
        )).isEqualTo(15);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_company_module_roles WHERE user_company_id = ?",
            Integer.class,
            provisioned.ownerUserCompanyId()
        )).isGreaterThanOrEqualTo(expectedCapabilities == null ? 0 : expectedCapabilities);
        assertThat(jdbc.queryForObject(
            "SELECT mode FROM company_entitlement_policies WHERE company_id = ?",
            String.class,
            provisioned.companyId()
        )).isEqualTo("SHADOW");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(DISTINCT capability_code) FROM company_entitlements WHERE company_id = ?",
            Integer.class,
            provisioned.companyId()
        )).isGreaterThanOrEqualTo(expectedCapabilities == null ? 0 : expectedCapabilities);
        assertThat(jdbc.queryForMap(
            "SELECT included_seats, purchased_extra_seats, reserved_seats FROM company_seat_states WHERE company_id = ?",
            provisioned.companyId()
        )).containsEntry("included_seats", 5)
            .containsEntry("purchased_extra_seats", 0)
            .containsEntry("reserved_seats", 0);
        assertThat(jdbc.queryForMap(
            "SELECT state, access_mode FROM company_commercial_states WHERE company_id = ?",
            provisioned.companyId()
        )).containsEntry("state", "TRIAL").containsEntry("access_mode", "FULL");
        assertThat(entitlements.resolve(provisioned.companyId(), "human_resources").allowed()).isTrue();
        assertThat(entitlements.resolve(provisioned.companyId(), "receivables").allowed()).isFalse();
    }

    @Test
    void movesExistingEmailToManualReviewWithoutCreatingOrMutatingATenant() {
        var email = uniqueEmail("existing");
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$existing', 'Existing User')",
            email
        );
        var companiesBefore = jdbc.queryForObject("SELECT COUNT(*) FROM companies", Integer.class);
        var intent = completedIntent(email);

        var result = provisioning.provisionIfEligible(intent.id());

        assertThat(result.status()).isEqualTo("REQUIRES_REVIEW");
        assertThat(result.provisioned()).isFalse();
        assertThat(signupIntents.findById(intent.id()).provisioningStatus()).isEqualTo("REQUIRES_REVIEW");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM companies", Integer.class)).isEqualTo(companiesBefore);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_ownerships WHERE source_signup_intent_id = ?",
            Integer.class,
            intent.id()
        )).isZero();
    }

    @Test
    void delayedProvisioningRestoresPaidAccessUsingTheOriginalPaymentEventTime() {
        var intent = completedIntent(uniqueEmail("delayed-paid"));
        var trialEnd = Instant.now().minus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        var paymentAt = trialEnd.plusSeconds(20);
        projectSubscriptionAndInvoice(intent, "active", trialEnd, "invoice.paid", "paid", paymentAt, trialEnd);

        var result = provisioning.provisionIfEligible(intent.id());

        assertThat(lifecycle.snapshot(result.companyId()).orElseThrow().state()).isEqualTo("ACTIVE");
        assertThat(jdbc.queryForObject(
            "SELECT last_source_event_created_at FROM company_commercial_states WHERE company_id = ?",
            java.sql.Timestamp.class, result.companyId()
        ).toInstant()).isEqualTo(paymentAt);
        lifecycle.advanceDueStates();
        assertThat(lifecycle.snapshot(result.companyId()).orElseThrow().state()).isEqualTo("ACTIVE");
    }

    @Test
    void delayedProvisioningRestoresPaymentFailureAndItsOriginalGraceWindow() {
        var intent = completedIntent(uniqueEmail("delayed-failed"));
        var trialEnd = Instant.now().minus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        var failedAt = trialEnd.plusSeconds(20);
        projectSubscriptionAndInvoice(intent, "active", trialEnd, "invoice.payment_failed", "open", failedAt, trialEnd);

        var result = provisioning.provisionIfEligible(intent.id());

        var state = lifecycle.snapshot(result.companyId()).orElseThrow();
        assertThat(state.state()).isEqualTo("GRACE");
        assertThat(state.grace_ends_at()).isEqualTo(failedAt.plus(14, ChronoUnit.DAYS));
        lifecycle.advanceDueStates();
        assertThat(lifecycle.snapshot(result.companyId()).orElseThrow().state()).isEqualTo("GRACE");
    }

    @Test
    void initialPaidTrialInvoiceDoesNotEndTheNormalFifteenDayTrial() {
        var intent = completedIntent(uniqueEmail("trial-invoice"));
        var trialStart = Instant.now().minus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);
        var trialEnd = trialStart.plus(15, ChronoUnit.DAYS);
        projectSubscriptionAndInvoice(intent, "trialing", trialEnd, "invoice.paid", "paid", trialStart.plusSeconds(20), trialStart);

        var result = provisioning.provisionIfEligible(intent.id());

        var state = lifecycle.snapshot(result.companyId()).orElseThrow();
        assertThat(state.state()).isEqualTo("TRIAL");
        assertThat(state.trial_ends_at()).isEqualTo(trialEnd);
    }

    @Test
    void delayedExpiredTrialWithoutRenewalPaymentDoesNotGainPaidAccess() {
        var intent = completedIntent(uniqueEmail("expired-trial"));
        var trialEnd = Instant.now().minus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        var trialStart = trialEnd.minus(15, ChronoUnit.DAYS);
        projectSubscriptionAndInvoice(intent, "trialing", trialEnd, "invoice.paid", "paid", trialStart.plusSeconds(20), trialStart);

        var result = provisioning.provisionIfEligible(intent.id());
        lifecycle.advanceDueStates();

        assertThat(lifecycle.snapshot(result.companyId()).orElseThrow().state()).isEqualTo("READ_ONLY");
    }

    @Test
    void anOlderPaidInvoiceCannotOverrideANewerPastDueSubscriptionAtProvisioning() {
        var intent = completedIntent(uniqueEmail("newer-past-due"));
        var trialEnd = Instant.now().minus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        projectSubscriptionAndInvoice(intent, "active", trialEnd, "invoice.paid", "paid", trialEnd.plusSeconds(20), trialEnd);
        var latestAt = trialEnd.plusSeconds(30);
        enqueueProjection("evt_phase3_projection_past_due", "customer.subscription.updated", intent.stripeSubscriptionId(), latestAt,
            """
                {"id":"%s","object":"subscription","customer":"%s","status":"past_due",
                 "trial_start":%d,"trial_end":%d,"metadata":{"indice_signup_ref":"%s"}}
                """.formatted(intent.stripeSubscriptionId(), intent.stripeCustomerId(),
                    trialEnd.minus(15, ChronoUnit.DAYS).getEpochSecond(), trialEnd.getEpochSecond(), intent.publicReference())
        );
        processor.processBatch();

        var result = provisioning.provisionIfEligible(intent.id());

        var state = lifecycle.snapshot(result.companyId()).orElseThrow();
        assertThat(state.state()).isEqualTo("GRACE");
        assertThat(state.subscription_status()).isEqualTo("past_due");
        assertThat(state.grace_ends_at()).isEqualTo(latestAt.plus(14, ChronoUnit.DAYS));
    }

    private void projectSubscriptionAndInvoice(
        BillingSignupIntent intent, String subscriptionStatus, Instant trialEnd,
        String invoiceType, String invoiceStatus, Instant invoiceAt, Instant invoicePeriodStart
    ) {
        var subscriptionAt = invoiceAt.minusSeconds(10);
        var prefix = "evt_phase3_projection_" + UUID.randomUUID().toString().replace("-", "");
        var subscription = """
            {"id":"%s","object":"subscription","customer":"%s","status":"%s",
             "trial_start":%d,"trial_end":%d,
             "metadata":{"indice_signup_ref":"%s"}}
            """.formatted(intent.stripeSubscriptionId(), intent.stripeCustomerId(), subscriptionStatus,
                trialEnd.minus(15, ChronoUnit.DAYS).getEpochSecond(), trialEnd.getEpochSecond(), intent.publicReference());
        enqueueProjection(prefix + "_subscription", "customer.subscription.updated", intent.stripeSubscriptionId(), subscriptionAt, subscription);
        var invoiceId = "in_" + prefix;
        var invoice = """
            {"id":"%s","object":"invoice","subscription":"%s","customer":"%s","status":"%s",
             "period_start":%d,"period_end":%d}
            """.formatted(invoiceId, intent.stripeSubscriptionId(), intent.stripeCustomerId(), invoiceStatus,
                invoicePeriodStart.getEpochSecond(), invoicePeriodStart.plus(30, ChronoUnit.DAYS).getEpochSecond());
        enqueueProjection(prefix + "_invoice", invoiceType, invoiceId, invoiceAt, invoice);
        processor.processBatch();
        assertThat(signupIntents.findById(intent.id()).companyId()).isNull();
    }

    private void enqueueProjection(String eventId, String type, String objectId, Instant created, String object) {
        var payload = """
            {"id":"%s","type":"%s","created":%d,"livemode":false,"data":{"object":%s}}
            """.formatted(eventId, type, created.getEpochSecond(), object);
        events.ingest(new StripeWebhookEnvelope(
            eventId, type, false, "2026-06-24.dahlia", objectId, "projection",
            BillingHashing.sha256(payload), payload, created, Instant.now().plus(90, ChronoUnit.DAYS)
        ));
    }

    private BillingTenantProvisioningService.ProvisioningResult provisionAfterBarrier(
        long intentId,
        CountDownLatch ready,
        CountDownLatch start
    ) {
        ready.countDown();
        try {
            if (!start.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Provisioning race did not start.");
            }
            return provisioning.provisionIfEligible(intentId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private BillingSignupIntent completedIntent(String email) {
        var product = offers.activeBasicProducts().getFirst();
        var selection = offers.select(List.of(product.code()), "MONTH", 0);
        var request = new BillingSignupRequest(
            "Premium Owner", email, email, "very-secure-password", "Phase 3 Premium Company",
            "MX", "+529981234567", "Services", "6-20", "MONTH", 0, List.of(product.code()), null, null
        );
        var discriminator = UUID.randomUUID().toString();
        var intent = signupIntents.createOrLoad(
            BillingHashing.randomReference(),
            BillingHashing.sha256("idem-" + discriminator),
            BillingHashing.sha256("fingerprint-" + discriminator),
            request,
            email,
            "$2a$10$phase3-test-hash",
            selection,
            null,
            null
        );
        var customerId = "cus_phase3_" + discriminator.replace("-", "");
        signupIntents.markCustomerCreated(intent.id(), customerId);
        signupIntents.markCheckoutCompleted(
            intent.id(),
            "evt_phase3_" + discriminator.replace("-", ""),
            Instant.now(),
            customerId,
            "cs_phase3_" + discriminator.replace("-", ""),
            "sub_phase3_" + discriminator.replace("-", "")
        );
        return signupIntents.findById(intent.id());
    }

    private String intentEmail(long intentId) {
        return jdbc.queryForObject(
            "SELECT email_normalized FROM billing_signup_intents WHERE id = ?",
            String.class,
            intentId
        );
    }

    private String uniqueEmail(String label) {
        return TEST_EMAIL_PREFIX + label + "-" + UUID.randomUUID() + "@example.com";
    }

    private void cleanTestState() {
        jdbc.update("DELETE FROM stripe_webhook_events WHERE stripe_event_id LIKE 'evt_phase3_projection_%'");
        jdbc.update(
            "DELETE FROM billing_invoice_snapshots WHERE stripe_subscription_id IN (SELECT stripe_subscription_id FROM company_billing_subscriptions WHERE signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?))",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM company_billing_subscriptions WHERE signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM billing_audit_events WHERE signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM company_trial_product_grants WHERE source_signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM company_ownerships WHERE source_signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM companies WHERE id IN (SELECT company_id FROM billing_signup_intents WHERE email_normalized LIKE ? AND company_id IS NOT NULL)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM users WHERE email LIKE ?", TEST_EMAIL_PREFIX + "%");
        jdbc.update(
            "DELETE FROM billing_signup_intent_products WHERE signup_intent_id IN (SELECT id FROM billing_signup_intents WHERE email_normalized LIKE ?)",
            TEST_EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM billing_signup_intents WHERE email_normalized LIKE ?", TEST_EMAIL_PREFIX + "%");
    }
}
