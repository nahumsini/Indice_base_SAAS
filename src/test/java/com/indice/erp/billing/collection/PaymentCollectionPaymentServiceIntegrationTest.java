package com.indice.erp.billing.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.catalog.BillingInterval;
import com.indice.erp.billing.catalog.CommercialOfferSelection;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripeCollectionGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.indice.erp.billing.subscription.BillingActivationResponse;
import com.indice.erp.billing.subscription.BillingActivationService;
import com.indice.erp.billing.subscription.BillingSelectionChangeService;
import com.indice.erp.platformadmin.PlatformAdminService;
import com.indice.erp.platformadmin.PlatformTrialExtensionService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** Uses only the isolated test database. Provider calls are mocked and never hold a DB transaction. */
@SpringBootTest
class PaymentCollectionPaymentServiceIntegrationTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private TransactionTemplate transactions;
    @Autowired private BillingSelectionChangeService selections;
    @Autowired private ObjectMapper json;
    @Autowired private PlatformAdminService platformAdmin;
    private StripeCollectionGateway stripe;
    private StripeCatalogGateway catalog;
    private BillingActivationService activation;
    private CommercialOfferSelectionService offers;
    private StripePhaseTwoProperties properties;
    private PaymentCollectionPaymentService service;
    private PaymentCollectionProtectionService protection;
    private long companyId;
    private long actorId;
    private long versionId;
    private long productId;
    private long subscriptionRowId;
    private String subscriptionId;
    private String customerId;
    private String invoiceId;
    private Instant now;

    @BeforeEach
    void setUp() {
        now = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        var suffix = UUID.randomUUID().toString().replace("-", "");
        subscriptionId = "sub_collection_" + suffix;
        customerId = "cus_collection_" + suffix;
        invoiceId = "in_collection_" + suffix;
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "Collection integration " + suffix);
        companyId = lastId();
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'test-only', 'Collection fixture')", suffix + "@example.test");
        actorId = lastId();
        jdbc.update("INSERT INTO billing_catalog_versions (version_code, status) VALUES (?, 'SUPERSEDED')", "collection-" + suffix);
        versionId = lastId();
        jdbc.update("INSERT INTO billing_catalog_products (catalog_version_id, product_code, display_name, product_type, commercial_kind, active) VALUES (?, 'basic_hr', 'Collection product', 'BASIC', 'MODULE', 1)", versionId);
        productId = lastId();
        jdbc.update("""
            INSERT INTO company_billing_subscriptions (stripe_subscription_id, stripe_customer_id, company_id,
                catalog_version_id, offer_code, billing_interval, currency, status, last_event_id, last_event_created_at)
            VALUES (?, ?, ?, ?, 'basic_hr', 'MONTH', 'USD', 'ACTIVE', 'evt_collection_fixture', CURRENT_TIMESTAMP(6))
            """, subscriptionId, customerId, companyId, versionId);
        subscriptionRowId = lastId();
        jdbc.update("INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id) VALUES (?, ?)", subscriptionRowId, productId);
        jdbc.update("""
            INSERT INTO billing_invoice_snapshots (stripe_invoice_id, stripe_subscription_id, stripe_customer_id,
                company_id, status, currency, amount_due_cents, amount_paid_cents, hosted_invoice_url,
                last_event_id, last_event_created_at)
            VALUES (?, ?, ?, ?, 'open', 'USD', 1500, 500, 'https://invoice.stripe.com/i/fixture', 'evt_collection_fixture', CURRENT_TIMESTAMP(6))
            """, invoiceId, subscriptionId, customerId, companyId);
        stripe = mock(StripeCollectionGateway.class);
        catalog = mock(StripeCatalogGateway.class);
        activation = mock(BillingActivationService.class);
        offers = mock(CommercialOfferSelectionService.class);
        var secrets = mock(StripeSecretProvider.class);
        when(secrets.isApiConfigured()).thenReturn(true);
        properties = new StripePhaseTwoProperties();
        properties.setEnabled(true);
        properties.setMode("test");
        protection = new PaymentCollectionProtectionService(jdbc, Clock.fixed(now, ZoneOffset.UTC));
        service = new PaymentCollectionPaymentService(jdbc, offers, selections, activation, stripe, catalog, secrets,
            properties, json, Clock.fixed(now, ZoneOffset.UTC), protection);
        when(stripe.retrieveInvoice(invoiceId)).thenReturn(invoice("open", 500, 1000, 0, Map.of()));
    }

    @AfterEach
    void cleanUp() {
        // Fixtures are committed because provider orchestration must be outside a transaction.
        // Every deletion below is restricted to this newly created disposable-test company.
        transactions.executeWithoutResult(status -> {
            jdbc.update("DELETE FROM payment_collection_obligations WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM payment_collection_payment_states WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM company_payment_request_deliveries WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM company_payment_request_events WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM company_payment_requests WHERE company_id = ?", companyId);
            jdbc.update("DELETE product FROM company_billing_selection_change_products product JOIN company_billing_selection_changes change_row ON change_row.id = product.change_id WHERE change_row.company_id = ?", companyId);
            jdbc.update("DELETE FROM company_billing_selection_changes WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM company_benefit_grants WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM billing_invoice_snapshots WHERE company_id = ?", companyId);
            jdbc.update("DELETE product FROM company_billing_subscription_products product JOIN company_billing_subscriptions subscription ON subscription.id = product.subscription_id WHERE subscription.company_id = ?", companyId);
            jdbc.update("DELETE FROM company_billing_subscriptions WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM billing_signup_intents WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM platform_trial_extensions WHERE company_id = ?", companyId);
            jdbc.update("DELETE FROM billing_catalog_products WHERE catalog_version_id = ?", versionId);
            jdbc.update("DELETE FROM billing_catalog_versions WHERE id = ?", versionId);
            jdbc.update("DELETE FROM companies WHERE id = ?", companyId);
            jdbc.update("DELETE FROM users WHERE id = ?", actorId);
        });
    }

    @Test
    void persistsExactInvoiceObligationAndReconcilesProviderPaymentWithoutMutatingTheSubscription() {
        var before = jdbc.queryForMap("SELECT * FROM company_billing_subscriptions WHERE id = ?", subscriptionRowId);
        var quote = service.quote(companyId);
        assertThat(quote.blockers()).isEmpty();
        assertThat(quote.kind()).isEqualTo("INVOICE");
        assertThat(quote.amountCents()).isEqualTo(1000);
        var requestId = persist(quote);
        assertThat(jdbc.queryForObject("SELECT amount_due_cents FROM payment_collection_obligations WHERE request_id = ?", Long.class, requestId)).isEqualTo(1500);
        assertThat(jdbc.queryForObject("SELECT amount_cents FROM payment_collection_obligations WHERE request_id = ?", Long.class, requestId)).isEqualTo(1000);
        assertThat(service.paymentUrl(companyId, requestId, actorId, "test-key").url()).isEqualTo("https://invoice.stripe.com/i/fixture");
        assertThat(service.reconcile(companyId, requestId)).isFalse();
        when(stripe.retrieveInvoice(invoiceId)).thenReturn(invoice("paid", 1500, 0, 0, Map.of()));
        assertThat(service.reconcile(companyId, requestId)).isTrue();
        assertThat(jdbc.queryForMap("SELECT * FROM company_billing_subscriptions WHERE id = ?", subscriptionRowId)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT status FROM company_payment_requests WHERE id = ?", String.class, requestId)).isEqualTo("OPEN");
    }

    @Test
    void activationUsesPersistedSelectionEvenWhenTheCurrentCatalogChangesAndRequiresItsFirstPaidInvoice() {
        jdbc.update("DELETE FROM billing_invoice_snapshots WHERE company_id = ?", companyId);
        jdbc.update("UPDATE company_billing_subscriptions SET stripe_subscription_id = ? WHERE id = ?", "internal_collection_" + companyId, subscriptionRowId);
        var selection = selection();
        selections.saveDraft(companyId, actorId, "collection-draft-" + companyId, selection);
        when(offers.select(anyList(), anyString(), anyInt(), isNull())).thenReturn(selection);
        when(catalog.account()).thenReturn(new StripeCatalogGateway.AccountResult("acct_fixture", true, true));
        when(catalog.verifyRecurringPrice("price_collection_fixture")).thenReturn(new StripeCatalogGateway.PriceVerification(
            "price_collection_fixture", "prod_fixture", "usd", 1500, "month", "exclusive", true, false));
        when(catalog.verifyProduct("prod_fixture")).thenReturn(new StripeCatalogGateway.ProductVerification("prod_fixture", "Fixture", null, true, false));
        var quote = service.quote(companyId);
        assertThat(quote.kind()).isEqualTo("ACTIVATION");
        assertThat(quote.blockers()).isEmpty();
        var requestId = persist(quote);
        when(activation.createCollectionCheckout(eq(companyId), eq(actorId), anyString(), any(), eq(requestId)))
            .thenReturn(new BillingActivationResponse("CHECKOUT_CREATED", "https://checkout.stripe.com/c/pay/fixture", now.plusSeconds(3600), 0, false));
        when(offers.select(anyList(), anyString(), anyInt(), isNull())).thenThrow(new AssertionError("Must not reselect the active catalog at payment time"));
        assertThat(service.paymentUrl(companyId, requestId, actorId, "payment-key").url()).contains("checkout.stripe.com");
        verify(activation).createCollectionCheckout(companyId, actorId, "collection-request-" + requestId, selection, requestId);
        var intentId = activationIntent(requestId);
        jdbc.update("UPDATE payment_collection_payment_states SET signup_intent_id = ? WHERE request_id = ? AND company_id = ?", intentId, requestId, companyId);
        var metadata = Map.of("indice_company_id", Long.toString(companyId), "indice_payment_request", Long.toString(requestId));
        when(stripe.retrieveCheckout("cs_fixture_" + requestId)).thenReturn(new StripeCollectionGateway.Checkout(
            "cs_fixture_" + requestId, "complete", "no_payment_required", customerId, subscriptionId, invoiceId, metadata));
        assertThat(service.reconcile(companyId, requestId)).isFalse();
        when(stripe.retrieveCheckout("cs_fixture_" + requestId)).thenReturn(new StripeCollectionGateway.Checkout(
            "cs_fixture_" + requestId, "complete", "paid", customerId, subscriptionId, invoiceId, metadata));
        when(stripe.retrieveInvoice(invoiceId)).thenReturn(invoice("paid", 1500, 0, 1500, metadata));
        assertThat(service.reconcile(companyId, requestId)).isFalse();
        when(stripe.retrieveInvoice(invoiceId)).thenReturn(invoice("paid", 1500, 0, 0, metadata));
        assertThat(service.reconcile(companyId, requestId)).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM companies WHERE id = ?", Long.class, companyId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_billing_subscriptions WHERE company_id = ?", Long.class, companyId)).isEqualTo(1);
    }

    @Test
    void rejectsTenantAndModeMismatchAndOldSettledRequestCannotClearANewRequest() {
        var quote = service.quote(companyId);
        var oldId = persist(quote);
        assertThatThrownBy(() -> service.reconcile(companyId + 1000000, oldId)).isInstanceOf(IllegalArgumentException.class);
        properties.setMode("live");
        assertThat(service.reconcile(companyId, oldId)).isFalse();
        properties.setMode("test");
        jdbc.update("UPDATE company_payment_requests SET status = 'PAID', paid_at = CURRENT_TIMESTAMP(6) WHERE id = ?", oldId);
        var newId = persist(quote);
        assertThat(service.reconcile(companyId, oldId)).isTrue();
        assertThat(jdbc.queryForObject("SELECT status FROM company_payment_requests WHERE id = ?", String.class, newId)).isEqualTo("OPEN");
    }

    @Test
    void paidAndTrialWindowsBeyondSevenDaysBlockDemandWithoutCallingStripe() {
        jdbc.update("UPDATE company_billing_subscriptions SET status = 'TRIALING', trial_ends_at = ? WHERE id = ?", Timestamp.from(now.plus(Duration.ofDays(8))), subscriptionRowId);
        assertThat(service.quote(companyId).blockers()).contains("TRIAL_EXTENDS_BEYOND_PAYMENT_WINDOW");
        jdbc.update("UPDATE company_billing_subscriptions SET trial_ends_at = NULL WHERE id = ?", subscriptionRowId);
        jdbc.update("UPDATE billing_invoice_snapshots SET status = 'paid', amount_paid_cents = 1500, period_ends_at = ? WHERE company_id = ?", Timestamp.from(now.plus(Duration.ofDays(8))), companyId);
        assertThat(service.quote(companyId).blockers()).contains("PAID_PERIOD_EXTENDS_BEYOND_PAYMENT_WINDOW");
        verify(stripe, never()).retrieveInvoice(anyString());
    }

    @Test
    void currentProtectionReflectsLaterPaymentsAndTrialsButIgnoresStaleTrialDatesAndZeroInvoices() {
        var future = now.plus(Duration.ofDays(12));
        jdbc.update("UPDATE company_billing_subscriptions SET status = 'ACTIVE', trial_ends_at = ? WHERE id = ?", Timestamp.from(future), subscriptionRowId);
        assertThat(protection.protection(companyId).protectedUntil()).isNull();
        jdbc.update("UPDATE company_billing_subscriptions SET status = 'TRIALING' WHERE id = ?", subscriptionRowId);
        assertThat(protection.protection(companyId).protectedUntil()).isEqualTo(future);
        assertThat(protection.collectionProtection(companyId).protectedUntil()).isEqualTo(future);
        jdbc.update("UPDATE company_billing_subscriptions SET status = 'ACTIVE' WHERE id = ?", subscriptionRowId);
        jdbc.update("UPDATE billing_invoice_snapshots SET status = 'paid', amount_paid_cents = 0, period_ends_at = ? WHERE company_id = ?", Timestamp.from(future), companyId);
        assertThat(protection.protection(companyId).protectedUntil()).isNull();
        jdbc.update("UPDATE billing_invoice_snapshots SET amount_paid_cents = 1500 WHERE company_id = ?", companyId);
        assertThat(protection.protection(companyId).protectedUntil()).isEqualTo(future);
        assertThat(protection.collectionProtection(companyId).protectedUntil()).isNull();
        assertThat(protection.protection(companyId + 1000000).protectedUntil()).isNull();
    }

    @Test
    void indefiniteProductBenefitBlocksInitialDemandAndItsRevocationOrFutureStartIsRespected() {
        jdbc.update("""
            INSERT INTO company_benefit_grants (public_reference, company_id, benefit_type, catalog_product_id,
                quantity, source_type, status, starts_at, ends_at, reason, idempotency_key_hash, created_by_user_id)
            VALUES (?, ?, 'PRODUCT', ?, 1, 'SUPPORT', 'ACTIVE', ?, NULL, 'Fixture protection', ?, ?)
            """, UUID.randomUUID().toString().replace("-", ""), companyId, productId,
            Timestamp.from(now.minusSeconds(60)), UUID.randomUUID().toString(), actorId);
        assertThat(protection.protection(companyId).indefiniteBenefit()).isTrue();
        assertThat(service.quote(companyId).blockers()).contains("ACTIVE_INDEFINITE_BENEFIT");
        jdbc.update("UPDATE company_benefit_grants SET starts_at = ? WHERE company_id = ?", Timestamp.from(now.plusSeconds(60)), companyId);
        assertThat(protection.protection(companyId).indefiniteBenefit()).isFalse();
        jdbc.update("UPDATE company_benefit_grants SET status = 'REVOKED', starts_at = ? WHERE company_id = ?", Timestamp.from(now.minusSeconds(60)), companyId);
        assertThat(protection.protection(companyId).indefiniteBenefit()).isFalse();
    }

    @Test
    void pendingOrdinaryActivationBlocksQuoteAndRaceAfterQuoteRollsBackNewDemand() {
        jdbc.update("DELETE FROM billing_invoice_snapshots WHERE company_id = ?", companyId);
        jdbc.update("UPDATE company_billing_subscriptions SET stripe_subscription_id = ? WHERE id = ?", "internal_collection_" + companyId, subscriptionRowId);
        when(offers.select(anyList(), anyString(), anyInt(), isNull())).thenReturn(selection());
        when(catalog.account()).thenReturn(new StripeCatalogGateway.AccountResult("acct_fixture", true, true));
        when(catalog.verifyRecurringPrice("price_collection_fixture")).thenReturn(new StripeCatalogGateway.PriceVerification(
            "price_collection_fixture", "prod_fixture", "usd", 1500, "month", "exclusive", true, false));
        when(catalog.verifyProduct("prod_fixture")).thenReturn(new StripeCatalogGateway.ProductVerification("prod_fixture", "Fixture", null, true, false));
        var quote = service.quote(companyId);
        assertThat(quote.blockers()).isEmpty();
        activationIntent(9999); // A normal activation commits after the quote but before the case.
        assertThat(service.quote(companyId).blockers()).contains("ACTIVATION_ALREADY_IN_PROGRESS");
        assertThatThrownBy(() -> persist(quote)).isInstanceOf(IllegalStateException.class).hasMessageContaining("activation is already");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_payment_requests WHERE company_id = ?", Long.class, companyId)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payment_collection_payment_states WHERE company_id = ?", Long.class, companyId)).isZero();
    }

    @Test
    void pendingCollectionCheckoutBlocksLaterProductGrantAndTrialExtensionBeforeAnyProviderMutation() {
        var requestId = persist(service.quote(companyId));
        jdbc.update("UPDATE company_payment_requests SET kind = 'ACTIVATION' WHERE id = ?", requestId);
        var intent = activationIntent(requestId);
        jdbc.update("UPDATE billing_signup_intents SET status = 'CHECKOUT_CREATED' WHERE id = ?", intent);
        jdbc.update("UPDATE payment_collection_payment_states SET signup_intent_id = ? WHERE request_id = ?", intent, requestId);
        var publishedProduct = jdbc.queryForObject("""
            SELECT product.product_code FROM billing_catalog_products product
            JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
            WHERE version.status = 'ACTIVE' AND product.active = 1 ORDER BY product.id LIMIT 1
            """, String.class);
        assertThatThrownBy(() -> platformAdmin.grantBenefitAfterAuthorization(actorId, companyId, "late-grant-" + companyId,
            new PlatformAdminService.BenefitRequest("PRODUCT", publishedProduct, 1, "SUPPORT", "Late trial fixture", null, null, null, null, null)))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("activación pendiente");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM company_benefit_grants WHERE company_id = ?", Long.class, companyId)).isZero();
        var trialStripe = mock(com.indice.erp.billing.stripe.StripeBillingGateway.class);
        var extension = new PlatformTrialExtensionService(jdbc, transactions,
            mock(com.indice.erp.platformadmin.PlatformAdminAccessService.class), mock(com.indice.erp.platformadmin.PlatformAuditService.class),
            trialStripe, mock(com.indice.erp.billing.lifecycle.CommercialLifecycleService.class),
            mock(com.indice.erp.entitlement.CompanyEntitlementProjectionService.class), Clock.fixed(now, ZoneOffset.UTC), protection);
        assertThatThrownBy(() -> extension.extendAfterAuthorization(actorId, companyId, "late-trial-" + companyId,
            new PlatformTrialExtensionService.ExtensionRequest(15, true)))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("activación pendiente");
        org.mockito.Mockito.verifyNoInteractions(trialStripe);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM platform_trial_extensions WHERE company_id = ?", Long.class, companyId)).isZero();
        jdbc.update("UPDATE billing_signup_intents SET status = 'CHECKOUT_EXPIRED' WHERE id = ?", intent);
        transactions.executeWithoutResult(status -> protection.requireGrantAllowed(companyId));
    }

    @Test
    void preparedAndFailedTrialReservationsBlockActivationWithoutExtendingEffectiveAccess() {
        jdbc.update("""
            INSERT INTO platform_trial_extensions (public_reference, company_id, actor_user_id, idempotency_key_hash,
                source_type, added_days, prior_ends_at, extended_ends_at, trial_started_at, consultation_confirmed, status)
            VALUES (?, ?, ?, ?, 'LOCAL_DEMO', 15, ?, ?, ?, 1, 'PREPARED')
            """, UUID.randomUUID().toString().replace("-", ""), companyId, actorId, UUID.randomUUID().toString(),
            Timestamp.from(now), Timestamp.from(now.plus(Duration.ofDays(15))), Timestamp.from(now.minus(Duration.ofDays(15))));
        assertThat(protection.trialExtensionPending(companyId)).isTrue();
        assertThatThrownBy(() -> transactions.executeWithoutResult(status -> protection.requireCollectionActivationAllowed(companyId)))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("extensión de prueba");
        assertThat(protection.collectionProtection(companyId).protectedUntil()).isNull();
        jdbc.update("UPDATE platform_trial_extensions SET status = 'FAILED' WHERE company_id = ?", companyId);
        assertThatThrownBy(() -> transactions.executeWithoutResult(status -> protection.requireCollectionActivationAllowed(companyId)))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("extensión de prueba");
        assertThat(protection.protection(companyId).protectedUntil()).isNull();
        jdbc.update("UPDATE platform_trial_extensions SET status = 'COMPLETED' WHERE company_id = ?", companyId);
        transactions.executeWithoutResult(status -> protection.requireCollectionActivationAllowed(companyId));
    }

    private long persist(PaymentCollectionPaymentService.Quote quote) {
        return transactions.execute(status -> {
            jdbc.update("""
                INSERT INTO company_payment_requests (public_reference, company_id, kind, status, started_at, deadline_at,
                    reason, payer_name, payer_email, amount_cents, currency, billing_interval, catalog_version_id,
                    stripe_mode, source_customer_id, source_subscription_id, quote_token, created_by_user_id)
                VALUES (?, ?, ?, 'OPEN', ?, ?, 'Fixture only', 'Fixture payer', 'fixture@example.test', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID().toString().replace("-", ""), companyId, quote.kind(), Timestamp.from(now),
                Timestamp.from(now.plus(Duration.ofDays(7))), quote.amountCents(), quote.currency(), quote.billingInterval(),
                quote.catalogVersionId(), quote.stripeMode(), quote.sourceCustomerId(), quote.sourceSubscriptionId(), quote.fingerprint(), actorId);
            var requestId = lastId();
            service.persistObligations(companyId, requestId, quote);
            return requestId;
        });
    }

    private long activationIntent(long requestId) {
        jdbc.update("""
            INSERT INTO billing_signup_intents (public_token_hash, request_idempotency_hash, request_fingerprint,
                status, intent_kind, catalog_version_id, offer_code, billing_interval, currency, included_seats,
                requested_extra_seats, estimated_amount_cents, full_name, email_normalized, password_hash,
                company_name, country_code, company_id, provisioning_status, stripe_checkout_session_id,
                stripe_customer_id, stripe_subscription_id)
            VALUES (?, ?, ?, 'CHECKOUT_COMPLETED', 'EXISTING_COMPANY_ACTIVATION', ?, 'basic_hr', 'MONTH', 'USD', 5,
                0, 1500, 'Collection fixture', 'fixture@example.test', 'test-only', 'Fixture', 'MX', ?, 'PROVISIONED', ?, ?, ?)
            """, UUID.randomUUID().toString(), UUID.randomUUID().toString(), UUID.randomUUID().toString(), versionId,
            companyId, "cs_fixture_" + requestId, customerId, subscriptionId);
        return lastId();
    }

    private CommercialOfferSelection selection() {
        return new CommercialOfferSelection(versionId, "collection-fixture", "basic_hr", BillingInterval.MONTH, "USD", 5, 0,
            1500L, 1500L, 0, 0, "price_collection_fixture", null,
            List.of(new CommercialOfferSelection.Product(productId, "basic_hr", "Collection product")));
    }

    private StripeCollectionGateway.Invoice invoice(String status, long paid, long remaining, long offStripe, Map<String, String> metadata) {
        return new StripeCollectionGateway.Invoice(invoiceId, subscriptionId, customerId, status, "usd", false, 1500L,
            paid, remaining, offStripe, 1500L, 1500L, "subscription_create", "https://invoice.stripe.com/i/fixture", now,
            List.of(new StripeCollectionGateway.Line("price_collection_fixture", 1, 1500, "usd")), metadata);
    }

    private long lastId() { return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class); }
}
