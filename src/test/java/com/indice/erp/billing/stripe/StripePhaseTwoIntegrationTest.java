package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingSignupRequest;
import com.stripe.model.Charge;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
    "app.billing.stripe.enabled=true",
    "app.billing.stripe.mode=test",
    "app.billing.stripe.webhook-secret=whsec_phase_two_test",
    "app.billing.stripe.processor-enabled=false"
})
class StripePhaseTwoIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private StripeWebhookIngressService ingress;

    @Autowired
    private StripePhaseTwoProperties stripeProperties;

    @Autowired
    private StripeWebhookEventRepository events;

    @Autowired
    private StripeWebhookProcessor processor;

    @Autowired
    private BillingProjectionRepository projections;

    @Autowired
    private BillingSignupIntentRepository signupIntents;

    @Autowired
    private CommercialOfferSelectionService offers;

    @MockitoBean
    private StripeBillingGateway billingGateway;

    @BeforeEach
    void cleanBillingPhaseTwoState() {
        jdbc.update("DELETE FROM billing_audit_events");
        jdbc.update("DELETE FROM billing_invoice_snapshots");
        jdbc.update("DELETE FROM company_billing_subscription_products");
        jdbc.update("DELETE FROM company_billing_subscriptions");
        jdbc.update("DELETE FROM company_billing_customers");
        jdbc.update("DELETE FROM stripe_webhook_events");
        jdbc.update("DELETE FROM billing_signup_intent_products");
        jdbc.update("DELETE FROM billing_signup_intents");
    }

    @Test
    void verifiesSignatureStoresExactPayloadAndDeduplicatesBeforeAcknowledging() throws Exception {
        var created = Instant.now().getEpochSecond();
        var payload = event("evt_ingress_1", "customer.created", created, """
            {"id":"cus_test","object":"customer"}
            """);
        var signature = signature(payload, created, "whsec_phase_two_test");

        var first = ingress.receive(payload, signature);
        var duplicate = ingress.receive(payload, signature);

        assertThat(first.durablyStored()).isTrue();
        assertThat(first.duplicate()).isFalse();
        assertThat(duplicate.duplicate()).isTrue();
        assertThat(events.statuses()).singleElement().satisfies(status -> {
            assertThat(status.status()).isEqualTo("RECEIVED");
            assertThat(status.duplicates()).isEqualTo(1);
        });
        assertThat(jdbc.queryForObject(
            "SELECT raw_payload FROM stripe_webhook_events WHERE stripe_event_id = 'evt_ingress_1'",
            String.class
        )).isEqualTo(payload);

        assertThatThrownBy(() -> ingress.receive(payload, signature(payload, created, "wrong_secret")))
            .isInstanceOf(StripeWebhookSignatureException.class);
    }

    @Test
    void acceptsOnlyWebhookEventsThatMatchTheConfiguredStripeMode() throws Exception {
        var created = Instant.now().getEpochSecond();
        stripeProperties.setMode("live");
        try {
            var livePayload = event("evt_live_ingress", "customer.created", created, true, """
                {"id":"cus_live","object":"customer"}
                """);
            var signature = signature(livePayload, created, "whsec_phase_two_test");

            assertThat(ingress.receive(livePayload, signature).durablyStored()).isTrue();
            assertThat(jdbc.queryForObject(
                "SELECT livemode FROM stripe_webhook_events WHERE stripe_event_id = 'evt_live_ingress'",
                Boolean.class
            )).isTrue();

            var testPayload = event("evt_test_mismatch", "customer.created", created, false, """
                {"id":"cus_test_mismatch","object":"customer"}
                """);
            assertThatThrownBy(() -> ingress.receive(
                testPayload,
                signature(testPayload, created, "whsec_phase_two_test")
            )).isInstanceOf(StripeWebhookIntegrityException.class)
                .hasMessageContaining("does not match");
        } finally {
            stripeProperties.setMode("test");
        }
    }

    @Test
    void convergesDuplicatesOutOfOrderAndLateAssociationWithoutChangingTenancy() {
        var companiesBefore = jdbc.queryForObject("SELECT COUNT(*) FROM companies", Integer.class);
        var usersBefore = jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        var intent = createIntent("cus_ordered", "idem-ordered");

        var newer = event("evt_sub_new", "customer.subscription.updated", 2_000, """
            {"id":"sub_ordered","object":"subscription","customer":"cus_ordered","status":"active",
             "currency":"usd","collection_method":"charge_automatically","cancel_at_period_end":false,
             "current_period_start":1900,"current_period_end":3000,
             "metadata":{"indice_signup_ref":"%s"}}
            """.formatted(intent.publicReference()));
        events.ingest(envelope(newer, "evt_sub_new", "customer.subscription.updated", 2_000, "sub_ordered"));
        processor.processBatch();
        events.ingest(envelope(newer, "evt_sub_new", "customer.subscription.updated", 2_000, "sub_ordered"));

        var older = event("evt_sub_old", "customer.subscription.updated", 1_000, """
            {"id":"sub_ordered","object":"subscription","customer":"cus_ordered","status":"incomplete",
             "currency":"usd","collection_method":"charge_automatically","cancel_at_period_end":false,
             "current_period_start":900,"current_period_end":1800,
             "metadata":{"indice_signup_ref":"%s"}}
            """.formatted(intent.publicReference()));
        events.ingest(envelope(older, "evt_sub_old", "customer.subscription.updated", 1_000, "sub_ordered"));
        processor.processBatch();

        assertThat(jdbc.queryForObject(
            "SELECT status FROM company_billing_subscriptions WHERE stripe_subscription_id = 'sub_ordered'",
            String.class
        )).isEqualTo("active");
        assertThat(jdbc.queryForObject(
            "SELECT signup_intent_id FROM company_billing_subscriptions WHERE stripe_subscription_id = 'sub_ordered'",
            Long.class
        )).isEqualTo(intent.id());
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_billing_subscription_products WHERE subscription_id = (SELECT id FROM company_billing_subscriptions WHERE stripe_subscription_id = 'sub_ordered')",
            Integer.class
        )).isEqualTo(1);
        assertThat(events.statuses()).filteredOn(status -> status.eventId().equals("evt_sub_new"))
            .singleElement().satisfies(status -> assertThat(status.duplicates()).isEqualTo(1));

        var unassociated = event("evt_sub_late", "customer.subscription.created", 3_000, """
            {"id":"sub_late","object":"subscription","customer":"cus_late","status":"trialing",
             "currency":"usd","collection_method":"charge_automatically","cancel_at_period_end":false,
             "current_period_start":3000,"current_period_end":4000,"metadata":{}}
            """);
        events.ingest(envelope(unassociated, "evt_sub_late", "customer.subscription.created", 3_000, "sub_late"));
        processor.processBatch();
        assertThat(jdbc.queryForObject(
            "SELECT signup_intent_id FROM company_billing_subscriptions WHERE stripe_subscription_id = 'sub_late'",
            Long.class
        )).isNull();

        var lateIntent = createIntent("cus_late", "idem-late");
        assertThat(projections.reconcileUnassociatedSubscriptions()).isEqualTo(1);
        assertThat(jdbc.queryForObject(
            "SELECT signup_intent_id FROM company_billing_subscriptions WHERE stripe_subscription_id = 'sub_late'",
            Long.class
        )).isEqualTo(lateIntent.id());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM companies", Integer.class)).isEqualTo(companiesBefore);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class)).isEqualTo(usersBefore);
    }

    @Test
    void recordsPaymentRiskAndStripeEntitlementEventsInsteadOfIgnoringThem() throws Exception {
        var charge = new Charge();
        charge.setId("ch_test");
        charge.setLivemode(false);
        when(billingGateway.retrieveCharge("ch_test")).thenReturn(charge);
        var dispute = event("evt_dispute_created", "charge.dispute.created", 4_000, """
            {"id":"dp_test","object":"dispute","status":"needs_response","charge":"ch_test"}
            """);
        events.ingest(envelope(dispute, "evt_dispute_created", "charge.dispute.created", 4_000, "dp_test"));

        var entitlement = event("evt_entitlement_summary", "entitlements.active_entitlement_summary.updated", 4_001, """
            {"object":"entitlements.active_entitlement_summary","customer":"cus_entitlement"}
            """);
        events.ingest(envelope(
            entitlement,
            "evt_entitlement_summary",
            "entitlements.active_entitlement_summary.updated",
            4_001,
            "cus_entitlement"
        ));

        processor.processBatch();
        processor.processBatch();

        assertThat(events.statuses())
            .filteredOn(status -> status.eventId().equals("evt_dispute_created")
                || status.eventId().equals("evt_entitlement_summary"))
            .allSatisfy(status -> assertThat(status.status()).isEqualTo("PROCESSED"));
        assertThat(jdbc.queryForObject(
            """
                SELECT COUNT(*)
                FROM billing_audit_events
                WHERE action_code IN (
                    'PAYMENT_RISK_EVENT_RECORDED',
                    'STRIPE_ENTITLEMENT_SUMMARY_RECORDED'
                )
                """,
            Integer.class
        )).isEqualTo(2);
    }

    @Test
    void newerSubscriptionEventAndCheckoutReplayPreserveTheAgreedRenewalSelection() {
        var intent = createIntent("cus_renewed", "idem-renewed");
        jdbc.update("""
            UPDATE billing_signup_intents SET requested_extra_seats = 2,
                subtotal_amount_cents = 7900, discount_amount_cents = 1200, promotion_code = 'ORIGINAL'
            WHERE id = ?
            """, intent.id());
        var first = projections.upsertSubscription(subscriptionSnapshot("sub_renewed", "cus_renewed", "evt_initial", 1000), intent.id());
        var originalProduct = jdbc.queryForObject(
            "SELECT catalog_product_id FROM billing_signup_intent_products WHERE signup_intent_id = ? LIMIT 1",
            Long.class, intent.id());
        var replacementProduct = jdbc.queryForObject("""
            SELECT id FROM billing_catalog_products
            WHERE catalog_version_id = (SELECT catalog_version_id FROM billing_signup_intents WHERE id = ?)
              AND id <> ? ORDER BY id LIMIT 1
            """, Long.class, intent.id(), originalProduct);
        // State committed by an accepted renewal; zero discounts/subtotals and cleared promotion
        // are deliberate contract values, not missing fields to refill from the signup intent.
        jdbc.update("""
            UPDATE company_billing_subscriptions
            SET offer_code = 'RENEWED', billing_interval = 'YEAR', currency = 'CAD',
                included_seats = 7, extra_seats = 4, subtotal_amount_cents = 0,
                discount_amount_cents = 0, promotion_code = NULL
            WHERE id = ?
            """, first.subscriptionInternalId());
        jdbc.update("DELETE FROM company_billing_subscription_products WHERE subscription_id = ?", first.subscriptionInternalId());
        jdbc.update("""
            INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id, source)
            VALUES (?, ?, 'SCHEDULED_CHANGE')
            """, first.subscriptionInternalId(), replacementProduct);
        var agreedTerms = commercialTerms(first.subscriptionInternalId());
        var updated = event("evt_after_renewal", "customer.subscription.updated", 2000, """
            {"id":"sub_renewed","object":"subscription","customer":"cus_renewed","status":"past_due",
             "currency":"usd","collection_method":"charge_automatically","current_period_start":2000,
             "current_period_end":3000,"metadata":{"indice_signup_ref":"%s"}}
            """.formatted(intent.publicReference()));
        events.ingest(envelope(updated, "evt_after_renewal", "customer.subscription.updated", 2000, "sub_renewed"));
        processor.processBatch();
        projections.associateSubscription("sub_renewed", intent.id());

        assertThat(commercialTerms(first.subscriptionInternalId())).isEqualTo(agreedTerms);
        assertThat(jdbc.queryForList("SELECT catalog_product_id FROM company_billing_subscription_products WHERE subscription_id = ?",
            Long.class, first.subscriptionInternalId())).containsExactly(replacementProduct);
        assertThat(jdbc.queryForObject("SELECT status FROM company_billing_subscriptions WHERE id = ?",
            String.class, first.subscriptionInternalId())).isEqualTo("past_due");
        assertThat(events.statuses()).singleElement().satisfies(status -> assertThat(status.status()).isEqualTo("PROCESSED"));
    }

    @Test
    void lateIntentHydratesOnlyTheFirstMissingCatalogSnapshotAndDoesNotRecreateRemovedProducts() {
        var initial = projections.upsertSubscription(subscriptionSnapshot("sub_initializing", "cus_initializing", "evt_unassociated", 2000), null);
        var intent = createIntent("cus_initializing", "idem-initializing");
        jdbc.update("""
            UPDATE billing_signup_intents SET requested_extra_seats = 3,
                subtotal_amount_cents = 9900, discount_amount_cents = 500, promotion_code = 'INITIAL'
            WHERE id = ?
            """, intent.id());
        // Even an older delivery may safely initialize an association without replacing provider state.
        var associated = projections.upsertSubscription(subscriptionSnapshot("sub_initializing", "cus_initializing", "evt_old_association", 1000), intent.id());
        assertThat(associated.applied()).isFalse();
        assertThat(associated.signupIntentId()).isEqualTo(intent.id());
        assertThat(commercialTerms(initial.subscriptionInternalId())).containsEntry("extra_seats", 3)
            .containsEntry("subtotal_amount_cents", 9900L).containsEntry("promotion_code", "INITIAL");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_subscription_products WHERE subscription_id = ?",
            Integer.class, initial.subscriptionInternalId())).isEqualTo(1);

        jdbc.update("UPDATE company_billing_subscriptions SET extra_seats = 8, discount_amount_cents = 0, promotion_code = NULL WHERE id = ?",
            initial.subscriptionInternalId());
        jdbc.update("DELETE FROM company_billing_subscription_products WHERE subscription_id = ?", initial.subscriptionInternalId());
        var agreedTerms = commercialTerms(initial.subscriptionInternalId());
        projections.associateSubscription("sub_initializing", intent.id());
        projections.upsertSubscription(subscriptionSnapshot("sub_initializing", "cus_initializing", "evt_after_seat_purchase", 3000), intent.id());
        assertThat(commercialTerms(initial.subscriptionInternalId())).isEqualTo(agreedTerms);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_subscription_products WHERE subscription_id = ?",
            Integer.class, initial.subscriptionInternalId())).isZero();
    }

    private java.util.Map<String, Object> commercialTerms(long subscriptionId) {
        return jdbc.queryForMap("""
            SELECT catalog_version_id, offer_code, billing_interval, currency, included_seats,
                   extra_seats, subtotal_amount_cents, discount_amount_cents, promotion_code
            FROM company_billing_subscriptions WHERE id = ?
            """, subscriptionId);
    }

    private BillingProjectionRepository.SubscriptionSnapshot subscriptionSnapshot(
            String subscriptionId, String customerId, String eventId, long eventCreatedAt) {
        return new BillingProjectionRepository.SubscriptionSnapshot(eventId, Instant.ofEpochSecond(eventCreatedAt),
            subscriptionId, customerId, "active", "charge_automatically", "usd", false,
            null, null, Instant.ofEpochSecond(eventCreatedAt), Instant.ofEpochSecond(eventCreatedAt + 1000),
            null, null, null);
    }

    private com.indice.erp.billing.signup.BillingSignupIntent createIntent(String customerId, String idempotency) {
        var product = offers.activeBasicProducts().getFirst();
        var selection = offers.select(List.of(product.code()), "MONTH", 0);
        var request = new BillingSignupRequest(
            "Premium Owner", "owner-" + idempotency + "@example.com", "owner-" + idempotency + "@example.com",
            "very-secure-password", "Premium Company", "MX", null, null, null, "MONTH", 0, List.of(product.code()),
            null, null
        );
        var intent = signupIntents.createOrLoad(
            BillingHashing.randomReference(), BillingHashing.sha256(idempotency), BillingHashing.sha256("fp-" + idempotency),
            request, request.email(), "$2a$10$test", selection, null, null
        );
        signupIntents.markCustomerCreated(intent.id(), customerId);
        return signupIntents.findById(intent.id());
    }

    private StripeWebhookEnvelope envelope(
        String payload,
        String eventId,
        String type,
        long created,
        String objectId
    ) {
        return new StripeWebhookEnvelope(
            eventId, type, false, "2025-06-30.basil", objectId, "subscription",
            BillingHashing.sha256(payload), payload, Instant.ofEpochSecond(created),
            Instant.now().plus(90, ChronoUnit.DAYS)
        );
    }

    private String event(String id, String type, long created, String objectJson) {
        return event(id, type, created, false, objectJson);
    }

    private String event(String id, String type, long created, boolean livemode, String objectJson) {
        return """
            {"id":"%s","object":"event","api_version":"2025-06-30.basil","created":%d,"livemode":%s,
             "type":"%s","data":{"object":%s}}
            """.formatted(id, created, livemode, type, objectJson).trim();
    }

    private String signature(String payload, long timestamp, String secret) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        var digest = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
        return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(digest);
    }
}
