package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.stripe.model.Charge;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@SpringBootTest(properties = {
    "app.billing.stripe.enabled=true",
    "app.billing.stripe.mode=test",
    "app.billing.stripe.processor-enabled=false",
    "app.billing.lifecycle.enabled=true",
    "app.billing.lifecycle.scheduler-enabled=false"
})
class StripeWebhookPaymentCorrelationIntegrationTest {

    private static final String PREFIX = "payment-correlation-test-";
    private static final Instant STARTED = Instant.now().minus(1, ChronoUnit.HOURS);

    @Autowired private JdbcTemplate jdbc;
    @Autowired private StripeWebhookEventRepository events;
    @Autowired private StripeWebhookProcessor processor;
    @Autowired private CommercialLifecycleService lifecycle;
    @MockitoBean private StripeBillingGateway gateway;

    @BeforeEach
    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM billing_audit_events WHERE stripe_event_id LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM stripe_webhook_events WHERE stripe_event_id LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM company_billing_subscriptions WHERE stripe_subscription_id LIKE ?", PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", PREFIX + "%");
    }

    @Test
    void chargeOnlyDisputeAndRefundEventsApplyOnlyToTheVerifiedCompany() throws Exception {
        var expectedCompany = company("expected", "cus_payment_expected");
        var otherCompany = company("other", "cus_payment_other");
        verifiedCharge("ch_payment", "cus_payment_expected");

        enqueue("dispute", "charge.dispute.created", "needs_response", 10);
        processor.processBatch();
        assertThat(lifecycle.snapshot(expectedCompany).orElseThrow().state()).isEqualTo("GRACE");
        assertThat(lifecycle.snapshot(otherCompany).orElseThrow().state()).isEqualTo("ACTIVE");

        enqueue("won", "charge.dispute.closed", "won", 20);
        processor.processBatch();
        assertThat(lifecycle.snapshot(expectedCompany).orElseThrow().state()).isEqualTo("ACTIVE");

        enqueue("refund", "refund.updated", "succeeded", 30);
        processor.processBatch();
        var refunded = lifecycle.snapshot(expectedCompany).orElseThrow();
        assertThat(refunded.state()).isEqualTo("ACTIVE");
        assertThat(refunded.reason_code()).isEqualTo("PAYMENT_REFUNDED");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM billing_audit_events WHERE stripe_event_id LIKE ? AND company_id = ? AND action_code = 'PAYMENT_RISK_EVENT_RECORDED'",
            Long.class, PREFIX + "%", expectedCompany
        )).isEqualTo(3L);
        assertThat(events.statuses()).filteredOn(event -> event.eventId().startsWith(PREFIX))
            .hasSize(3).allSatisfy(event -> assertThat(event.status()).isEqualTo("PROCESSED"));
    }

    @Test
    void lateCustomerAssociationRetriesAndThenAppliesTheOriginalEvent() throws Exception {
        verifiedCharge("ch_payment", "cus_payment_late");
        enqueue("late", "charge.dispute.created", "needs_response", 10);
        processor.processBatch();
        assertThat(status("late")).isEqualTo("RETRY");

        var companyId = company("late", "cus_payment_late");
        jdbc.update("UPDATE stripe_webhook_events SET available_at = CURRENT_TIMESTAMP(6) WHERE stripe_event_id = ?", PREFIX + "late");
        processor.processBatch();
        assertThat(status("late")).isEqualTo("PROCESSED");
        assertThat(lifecycle.snapshot(companyId).orElseThrow().state()).isEqualTo("GRACE");
    }

    @Test
    void conflictingLocalCustomerOwnershipDoesNotMutateEitherCompany() throws Exception {
        var firstCompany = company("first", "cus_payment_shared");
        var secondCompany = company("second", "cus_payment_second");
        jdbc.update(
            """
                INSERT INTO company_billing_subscriptions
                    (stripe_subscription_id, stripe_customer_id, company_id, status, last_event_id, last_event_created_at)
                VALUES (?, 'cus_payment_shared', ?, 'active', 'evt_initial', ?)
                """,
            PREFIX + "conflict", secondCompany, Timestamp.from(STARTED)
        );
        verifiedCharge("ch_payment", "cus_payment_shared");
        enqueue("ambiguous", "charge.dispute.created", "needs_response", 10);

        processor.processBatch();

        assertThat(status("ambiguous")).isEqualTo("RETRY");
        assertThat(jdbc.queryForObject(
            "SELECT last_error_code FROM stripe_webhook_events WHERE stripe_event_id = ?",
            String.class, PREFIX + "ambiguous"
        )).isEqualTo("AMBIGUOUS_PAYMENT_COMPANY");
        assertThat(lifecycle.snapshot(firstCompany).orElseThrow().state()).isEqualTo("ACTIVE");
        assertThat(lifecycle.snapshot(secondCompany).orElseThrow().state()).isEqualTo("ACTIVE");
    }

    private void verifiedCharge(String chargeId, String customerId) throws Exception {
        var charge = new Charge();
        charge.setId(chargeId);
        charge.setLivemode(false);
        charge.setCustomer(customerId);
        when(gateway.retrieveCharge(chargeId)).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return charge;
        });
    }

    private long company(String label, String customerId) {
        jdbc.update("INSERT INTO companies (name) VALUES (?)", PREFIX + label);
        var companyId = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, PREFIX + label);
        jdbc.update("INSERT INTO company_entitlement_policies (company_id, mode, reason) VALUES (?, 'SHADOW', 'payment correlation test')", companyId);
        jdbc.update("INSERT INTO company_billing_customers (company_id, stripe_customer_id) VALUES (?, ?)", companyId, customerId);
        lifecycle.applySubscriptionEvent(companyId, PREFIX + "active-" + label, STARTED, "active", null);
        return companyId;
    }

    private void enqueue(String suffix, String type, String status, long seconds) {
        var eventId = PREFIX + suffix;
        var created = STARTED.plusSeconds(seconds);
        var payload = """
            {"id":"%s","type":"%s","created":%d,"livemode":false,
             "data":{"object":{"id":"object_%s","charge":"ch_payment","status":"%s"}}}
            """.formatted(eventId, type, created.getEpochSecond(), suffix, status);
        events.ingest(new StripeWebhookEnvelope(
            eventId, type, false, "2026-06-24.dahlia", "object_" + suffix, "dispute",
            BillingHashing.sha256(payload), payload, created, Instant.now().plus(90, ChronoUnit.DAYS)
        ));
    }

    private String status(String suffix) {
        return jdbc.queryForObject("SELECT status FROM stripe_webhook_events WHERE stripe_event_id = ?", String.class, PREFIX + suffix);
    }
}
