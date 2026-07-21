package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingSignupRequest;
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
    private StripeWebhookEventRepository events;

    @Autowired
    private StripeWebhookProcessor processor;

    @Autowired
    private BillingProjectionRepository projections;

    @Autowired
    private BillingSignupIntentRepository signupIntents;

    @Autowired
    private CommercialOfferSelectionService offers;

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

    private com.indice.erp.billing.signup.BillingSignupIntent createIntent(String customerId, String idempotency) {
        var product = offers.activeBasicProducts().getFirst();
        var selection = offers.select(List.of(product.code()), "MONTH", 0);
        var request = new BillingSignupRequest(
            "Premium Owner", "owner-" + idempotency + "@example.com", "very-secure-password",
            "Premium Company", "MX", null, null, null, "MONTH", 0, List.of(product.code())
        );
        var intent = signupIntents.createOrLoad(
            BillingHashing.randomReference(), BillingHashing.sha256(idempotency), BillingHashing.sha256("fp-" + idempotency),
            request, request.email(), "$2a$10$test", selection
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
        return """
            {"id":"%s","object":"event","api_version":"2025-06-30.basil","created":%d,"livemode":false,
             "type":"%s","data":{"object":%s}}
            """.formatted(id, created, type, objectJson).trim();
    }

    private String signature(String payload, long timestamp, String secret) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        var digest = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
        return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(digest);
    }
}
