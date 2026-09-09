package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import com.indice.erp.billing.lifecycle.CommercialAccessRestrictedException;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

/** Exercises post-Checkout webhook projections and access together, with all fixtures rolled back. */
@SpringBootTest(properties = {
    "app.billing.stripe.enabled=false",
    "app.billing.stripe.processor-enabled=false",
    "app.billing.lifecycle.enabled=true",
    "app.billing.lifecycle.scheduler-enabled=false",
    "app.billing.lifecycle.grace-days=14"
})
@Transactional
class StripeSubscriptionRenewalFlowIntegrationTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private StripeWebhookEventHandler handler;
    @Autowired private CommercialLifecycleService lifecycle;
    @Autowired private CommercialLifecycleAccessService access;
    @MockitoBean private StripeBillingGateway stripe;
    @MockitoBean private StripeCheckoutGateway checkout;

    private final String reference = "renewal-flow-" + UUID.randomUUID();
    private final Instant started = Instant.now().minus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);

    @Test
    void renewalFailureAndVerifiedRecoveryPreserveTheExistingTenantAndContract() {
        var company = company("customer");
        var other = company("unrelated");
        var usersBefore = jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class);
        var companiesBefore = jdbc.queryForObject("SELECT COUNT(*) FROM companies", Long.class);
        var subscription = "sub_" + reference;
        var customer = "cus_" + reference;
        var version = jdbc.queryForObject("SELECT MIN(id) FROM billing_catalog_versions", Long.class);
        jdbc.update("""
            INSERT INTO company_billing_subscriptions
              (company_id, stripe_subscription_id, stripe_customer_id, catalog_version_id, offer_code,
               billing_interval, currency, status, collection_method, included_seats, extra_seats,
               subtotal_amount_cents, discount_amount_cents, promotion_code, last_event_id, last_event_created_at)
            VALUES (?, ?, ?, ?, 'agreed_offer', 'MONTH', 'USD', 'trialing', 'charge_automatically',
                    5, 2, 10300, 100, 'AGREED', 'fixture_initial', ?)
            """, company, subscription, customer, version, Timestamp.from(started));
        var agreedContract = contract(company);
        lifecycle.applySubscriptionEvent(other, reference + "-other", started, "active", null);

        process("subscription", "customer.subscription.updated", 10, """
            {"id":"%s","object":"subscription","customer":"%s","status":"active",
             "currency":"usd","collection_method":"charge_automatically","cancel_at_period_end":false,
             "items":{"data":[{"id":"si_agreed","current_period_start":%d,"current_period_end":%d}]}}
            """.formatted(subscription, customer, started.getEpochSecond(), started.plus(30, ChronoUnit.DAYS).getEpochSecond()));
        invoice("renewal", "invoice.paid", "in_renewal_" + reference, "paid", 10200, 20, subscription, customer);
        assertThat(lifecycle.snapshot(company).orElseThrow().state()).isEqualTo("ACTIVE");
        assertThatCode(() -> access.requireWrite(company)).doesNotThrowAnyException();

        var failedInvoice = "in_failed_" + reference;
        invoice("failure", "invoice.payment_failed", failedInvoice, "open", 0, 30, subscription, customer);
        var grace = lifecycle.snapshot(company).orElseThrow();
        assertThat(grace.state()).isEqualTo("GRACE");
        assertThat(grace.operational_write_allowed()).isTrue();
        invoice("retry-failure", "invoice.payment_failed", failedInvoice, "open", 0, 40, subscription, customer);
        assertThat(lifecycle.snapshot(company).orElseThrow().grace_ends_at()).isEqualTo(grace.grace_ends_at());

        jdbc.update("UPDATE company_commercial_states SET grace_ends_at = ? WHERE company_id = ?",
            Timestamp.from(Instant.now().minusSeconds(1)), company);
        lifecycle.advanceDueStates();
        assertThat(lifecycle.snapshot(company).orElseThrow().state()).isEqualTo("READ_ONLY");
        assertThatThrownBy(() -> access.requireWrite(company)).isInstanceOf(CommercialAccessRestrictedException.class);

        // A successful attempt can still leave an invoice open; it is not settlement.
        invoice("unsettled-attempt", "invoice.payment_succeeded", failedInvoice, "open", 5000, 50, subscription, customer);
        assertThat(lifecycle.snapshot(company).orElseThrow().state()).isEqualTo("READ_ONLY");
        invoice("recovery", "invoice.payment_succeeded", failedInvoice, "paid", 10200, 60, subscription, customer);
        assertThat(lifecycle.snapshot(company).orElseThrow().state()).isEqualTo("ACTIVE");
        assertThat(lifecycle.snapshot(company).orElseThrow().grace_ends_at()).isNull();
        assertThatCode(() -> access.requireWrite(company)).doesNotThrowAnyException();

        // Late delivery and duplicate processing must not reopen debt or alter the saved contract.
        invoice("late-failure", "invoice.payment_failed", failedInvoice, "open", 0, 35, subscription, customer);
        invoice("recovery", "invoice.payment_succeeded", failedInvoice, "paid", 10200, 60, subscription, customer);
        assertThat(lifecycle.snapshot(company).orElseThrow().state()).isEqualTo("ACTIVE");
        assertThat(lifecycle.snapshot(other).orElseThrow().state()).isEqualTo("ACTIVE");
        assertThat(contract(company)).isEqualTo(agreedContract);
        assertThat(jdbc.queryForObject("SELECT status FROM billing_invoice_snapshots WHERE stripe_invoice_id = ?", String.class, failedInvoice)).isEqualTo("paid");
        assertThat(jdbc.queryForObject("SELECT amount_paid_cents FROM billing_invoice_snapshots WHERE stripe_invoice_id = ?", Long.class, failedInvoice)).isEqualTo(10200L);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_subscriptions WHERE company_id = ?", Long.class, company)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_payment_requests WHERE company_id = ?", Long.class, company)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class)).isEqualTo(usersBefore);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM companies", Long.class)).isEqualTo(companiesBefore);
        verifyNoInteractions(stripe, checkout);
    }

    private long company(String label) {
        var name = reference + "-" + label;
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        var id = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        jdbc.update("INSERT INTO company_entitlement_policies (company_id, mode, reason) VALUES (?, 'SHADOW', 'renewal flow fixture')", id);
        return id;
    }

    private Map<String, Object> contract(long company) {
        return jdbc.queryForMap("""
            SELECT stripe_subscription_id, stripe_customer_id, catalog_version_id, offer_code, billing_interval,
                   currency, included_seats, extra_seats, subtotal_amount_cents, discount_amount_cents, promotion_code
            FROM company_billing_subscriptions WHERE company_id = ?
            """, company);
    }

    private void invoice(String suffix, String type, String id, String status, long paid, long offset,
                         String subscription, String customer) {
        process(suffix, type, offset, """
            {"id":"%s","object":"invoice","customer":"%s","status":"%s","currency":"usd",
             "parent":{"subscription_details":{"subscription":"%s"}},"amount_due":10200,"amount_paid":%d,
             "hosted_invoice_url":"https://invoice.stripe.com/i/fixture","period_start":%d,"period_end":%d}
            """.formatted(id, customer, status, subscription, paid, started.getEpochSecond(),
                started.plus(30, ChronoUnit.DAYS).getEpochSecond()));
    }

    private void process(String suffix, String type, long offset, String object) {
        var id = reference + "-" + suffix;
        var created = started.plusSeconds(offset);
        var payload = """
            {"id":"%s","type":"%s","created":%d,"livemode":false,"data":{"object":%s}}
            """.formatted(id, type, created.getEpochSecond(), object);
        handler.process(new StripeWebhookEventRepository.ClaimedEvent(1L, id, type, payload, 1, created));
    }
}
