package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.stripe.model.Price;
import com.stripe.model.Subscription;
import com.stripe.model.SubscriptionItem;
import com.stripe.model.SubscriptionItemCollection;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "app.billing.stripe.enabled=true",
    "app.billing.stripe.mode=test",
    "app.billing.stripe.secret-key=sk_test_platform_company_modules",
    "app.billing.stripe.price-basic-1-monthly=price_basic_1_test",
    "app.billing.stripe.price-basic-2-monthly=price_basic_2_test",
    "app.billing.stripe.price-basic-3-monthly=price_basic_3_test",
    "app.billing.stripe.price-basic-all-monthly=price_basic_all_test",
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class PlatformCompanyModuleServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "platform-company-modules-";
    private static final String COMPANY_PREFIX = "platform-company-modules-";
    private static final String SUBSCRIPTION_PREFIX = "sub_platform_trial_";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformCompanyModuleService service;

    @Autowired
    private CommercialOfferSelectionService offers;

    @MockBean
    private StripeBillingGateway stripeGateway;

    private long actorUserId;
    private long companyId;
    private String subscriptionId;
    private List<String> selectedProductCodes;

    @BeforeEach
    void setUp() throws Exception {
        cleanTestState();
        var discriminator = UUID.randomUUID().toString();
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$platformtest', 'Platform Root Test')",
            EMAIL_PREFIX + discriminator + "@example.com"
        );
        actorUserId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO companies (name) VALUES (?)", COMPANY_PREFIX + discriminator);
        companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'superadmin', 'active', 'all')",
            actorUserId,
            companyId
        );
        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)",
            actorUserId,
            actorUserId
        );

        var activeCatalogId = jdbc.queryForObject(
            "SELECT id FROM billing_catalog_versions WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
            Long.class
        );
        selectedProductCodes = jdbc.query(
            "SELECT product_code FROM billing_catalog_products WHERE catalog_version_id = ? AND product_type = 'BASIC' AND active = 1 ORDER BY sort_order, id LIMIT 2",
            (rs, rowNum) -> rs.getString(1),
            activeCatalogId
        );
        assertThat(selectedProductCodes).hasSize(2);

        subscriptionId = SUBSCRIPTION_PREFIX + discriminator;
        var now = Instant.now();
        jdbc.update(
            """
                INSERT INTO company_billing_subscriptions (
                    stripe_subscription_id, company_id, catalog_version_id, offer_code,
                    billing_interval, currency, status, included_seats, extra_seats,
                    trial_starts_at, trial_ends_at, last_event_id, last_event_created_at
                ) VALUES (?, ?, ?, 'basic_1', 'MONTH', 'USD', 'trialing', 5, 0, ?, ?, ?, ?)
                """,
            subscriptionId,
            companyId,
            activeCatalogId,
            Timestamp.from(now.minus(1, ChronoUnit.DAYS)),
            Timestamp.from(now.plus(29, ChronoUnit.DAYS)),
            "evt_platform_trial_" + discriminator,
            Timestamp.from(now)
        );
        var localSubscriptionId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            """
                INSERT INTO company_billing_subscription_products (subscription_id, catalog_product_id, source)
                SELECT ?, id, 'SIGNUP_INTENT'
                FROM billing_catalog_products
                WHERE catalog_version_id = ? AND product_code = ?
                """,
            localSubscriptionId,
            activeCatalogId,
            selectedProductCodes.getFirst()
        );

        var price = new Price();
        price.setId("price_basic_1_test");
        var item = new SubscriptionItem();
        item.setId("si_platform_trial_base");
        item.setPrice(price);
        var items = new SubscriptionItemCollection();
        items.setData(List.of(item));
        var stripeSubscription = new Subscription();
        stripeSubscription.setId(subscriptionId);
        stripeSubscription.setItems(items);
        when(stripeGateway.retrieveSubscription(subscriptionId)).thenReturn(stripeSubscription);
        when(stripeGateway.updateSubscription(eq(subscriptionId), anyMap(), anyString())).thenAnswer(invocation -> {
            var updatedPrice = new Price();
            updatedPrice.setId("price_basic_2_test");
            var updatedItem = new SubscriptionItem();
            updatedItem.setId("si_platform_trial_base");
            updatedItem.setPrice(updatedPrice);
            var updatedItems = new SubscriptionItemCollection();
            updatedItems.setData(List.of(updatedItem));
            var updated = new Subscription();
            updated.setId(subscriptionId);
            updated.setItems(updatedItems);
            return updated;
        });
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    @SuppressWarnings("unchecked")
    void trialModulesUpdateStripeWithoutImmediateChargeAndBecomeThePersistedSelection() throws Exception {
        var result = service.updateTrialProducts(
            actorUserId,
            companyId,
            "trial-products-" + UUID.randomUUID(),
            new PlatformCompanyModuleService.ProductSelectionRequest(selectedProductCodes)
        );

        assertThat(result)
            .containsEntry("offer_code", "basic_2")
            .containsEntry("charge_timing", "TRIAL_END")
            .containsEntry("charged_now", false);

        var parameters = ArgumentCaptor.forClass(Map.class);
        verify(stripeGateway).updateSubscription(
            eq(subscriptionId),
            parameters.capture(),
            contains("trial-products-")
        );
        assertThat(parameters.getValue()).containsEntry("proration_behavior", "none");
        var items = (List<Map<String, Object>>) parameters.getValue().get("items");
        assertThat(items).singleElement().satisfies(item -> {
            assertThat(item).containsEntry("id", "si_platform_trial_base");
            assertThat(item).containsEntry("price", "price_basic_2_test");
        });

        var persistedCodes = jdbc.query(
            """
                SELECT product.product_code
                FROM company_billing_subscription_products selected
                JOIN company_billing_subscriptions subscription ON subscription.id = selected.subscription_id
                JOIN billing_catalog_products product ON product.id = selected.catalog_product_id
                WHERE subscription.stripe_subscription_id = ?
                ORDER BY product.product_code
                """,
            (rs, rowNum) -> rs.getString(1),
            subscriptionId
        );
        assertThat(persistedCodes).containsExactlyInAnyOrderElementsOf(selectedProductCodes);
        assertThat(jdbc.queryForObject(
            "SELECT offer_code FROM company_billing_subscriptions WHERE stripe_subscription_id = ?",
            String.class,
            subscriptionId
        )).isEqualTo("basic_2");
    }

    @Test
    void productChangePreviewIsAuthoritativeAndDoesNotMutateStripe() throws Exception {
        var preview = service.previewProducts(
            actorUserId,
            companyId,
            new PlatformCompanyModuleService.ProductSelectionRequest(selectedProductCodes)
        );

        assertThat(preview.selected_product_codes()).containsExactlyInAnyOrderElementsOf(selectedProductCodes);
        assertThat(preview.change_timing()).isEqualTo("TRIAL_END");
        assertThat(preview.estimated_amount_cents()).isPositive();
        verify(stripeGateway, never()).updateSubscription(anyString(), anyMap(), anyString());
    }

    @Test
    void productChangeRejectsAStaleCatalogPreviewBeforeCallingStripe() throws Exception {
        assertThatThrownBy(() -> service.updateTrialProducts(
            actorUserId,
            companyId,
            "stale-catalog-" + UUID.randomUUID(),
            new PlatformCompanyModuleService.ProductSelectionRequest(selectedProductCodes, "stale-version")
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("catálogo activo cambió");

        verify(stripeGateway, never()).updateSubscription(anyString(), anyMap(), anyString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void activeSubscriptionChangesAreAppliedWithoutProrationAndBilledAtRenewal() throws Exception {
        jdbc.update(
            "UPDATE company_billing_subscriptions SET status = 'active' WHERE stripe_subscription_id = ?",
            subscriptionId
        );

        var result = service.updateTrialProducts(
            actorUserId,
            companyId,
            "active-products-" + UUID.randomUUID(),
            new PlatformCompanyModuleService.ProductSelectionRequest(selectedProductCodes)
        );

        assertThat(result)
            .containsEntry("offer_code", "basic_2")
            .containsEntry("charge_timing", "NEXT_INVOICE")
            .containsEntry("charged_now", false);

        var parameters = ArgumentCaptor.forClass(Map.class);
        verify(stripeGateway).updateSubscription(
            eq(subscriptionId),
            parameters.capture(),
            contains("active-products-")
        );
        assertThat(parameters.getValue()).containsEntry("proration_behavior", "none");
        var items = (List<Map<String, Object>>) parameters.getValue().get("items");
        assertThat(items).singleElement().satisfies(item -> {
            assertThat(item).containsEntry("id", "si_platform_trial_base");
            assertThat(item).containsEntry("price", "price_basic_2_test");
        });
    }

    @Test
    @Transactional
    void managedCatalogPricesFailClosedUntilTheyAreVerifiedForTheConfiguredStripeMode() {
        assertThat(offers.activeBasicProducts()).isNotEmpty();
        jdbc.update(
            """
                UPDATE billing_catalog_prices price
                JOIN billing_catalog_products product ON product.id = price.catalog_product_id
                SET price.price_type = 'PRODUCT'
                WHERE product.catalog_version_id = (
                    SELECT active_version.id
                    FROM billing_catalog_versions active_version
                    WHERE active_version.status = 'ACTIVE'
                    LIMIT 1
                )
                  AND product.active = 1
                  AND product.commercial_kind = 'MODULE'
                """
        );

        assertThatThrownBy(() -> offers.activeProducts("MONTH"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("not verified for the configured Stripe environment");
    }

    private void cleanTestState() {
        jdbc.update("DELETE FROM platform_audit_events WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ?)", EMAIL_PREFIX + "%");
        jdbc.update("DELETE FROM company_billing_subscriptions WHERE stripe_subscription_id LIKE ?", SUBSCRIPTION_PREFIX + "%");
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
