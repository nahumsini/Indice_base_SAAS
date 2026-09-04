package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripeGatewayException;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false",
    "app.billing.stripe.enabled=true",
    "app.billing.stripe.mode=test",
    "app.billing.stripe.secret-key=sk_test_catalog_sync"
})
class PlatformCatalogManagementServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "catalog-management-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformCatalogManagementService service;

    @Autowired
    private PlatformCatalogStripeSynchronizationService stripeSynchronizationService;

    @MockBean
    private StripeCatalogGateway stripeCatalogGateway;

    @Autowired
    private PlatformAdminService platformAdminService;

    private long actorUserId;
    private long versionId;
    private long productId;
    private long priceId;

    @BeforeEach
    void setUp() {
        cleanTestState();
        var discriminator = UUID.randomUUID().toString();
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$catalogtest', 'Catalog Root Test')",
            EMAIL_PREFIX + discriminator + "@example.com"
        );
        actorUserId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id) VALUES (?, 'PLATFORM_ROOT', 'ACTIVE', 0, ?)",
            actorUserId,
            actorUserId
        );
        versionId = jdbc.queryForObject(
            "SELECT id FROM billing_catalog_versions WHERE status = 'DRAFT' ORDER BY id DESC LIMIT 1",
            Long.class
        );
        jdbc.update(
            """
                INSERT INTO billing_catalog_products
                    (catalog_version_id, product_code, display_name, product_type, sort_order, active)
                VALUES (?, 'addon_catalog_management', 'Catalog management add-on', 'ADDON', 9999, 0)
                """,
            versionId
        );
        productId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO billing_product_capabilities (product_id, capability_code) VALUES (?, 'catalog_management_test')",
            productId
        );
        jdbc.update(
            """
                INSERT INTO billing_catalog_prices
                    (catalog_version_id, catalog_product_id, billable_code, price_type,
                     billing_interval, currency, unit_amount_cents, included_quantity,
                     external_price_id, status)
                VALUES (?, ?, 'addon_catalog_management', 'ADDON', 'MONTH', 'USD', 900, 1,
                        'price_catalog_management_test', 'READY')
                """,
            versionId,
            productId
        );
        priceId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            """
                INSERT INTO billing_catalog_prices
                    (catalog_version_id, catalog_product_id, billable_code, price_type,
                     billing_interval, currency, unit_amount_cents, included_quantity,
                     external_price_id, status)
                VALUES (?, ?, 'addon_catalog_management', 'ADDON', 'YEAR', 'USD', 9000, 1,
                        'price_catalog_management_annual_test', 'READY')
                """,
            versionId,
            productId
        );
    }

    @AfterEach
    void clean() {
        cleanTestState();
    }

    @Test
    void changingAnAmountInvalidatesTheStripePriceAndBlocksPublication() {
        var updated = service.updatePrice(
            actorUserId,
            priceId,
            new PlatformCatalogManagementService.PriceUpdateRequest(1_200L, null, "READY")
        );

        assertThat(updated)
            .containsEntry("unit_amount_cents", 1_200L)
            .containsEntry("status", "DRAFT");
        assertThat(updated.get("external_price_id")).isNull();

        var validation = service.validateDraft(actorUserId, versionId);
        assertThat(validation)
            .containsEntry("ready", false)
            .containsEntry("stripe_mode", "TEST");
        @SuppressWarnings("unchecked")
        var blockers = (List<Map<String, Object>>) validation.get("blockers");
        assertThat(blockers)
            .isNotEmpty()
            .anyMatch(blocker -> "MISSING_BILLING_RATES".equals(blocker.get("code")));
    }

    @Test
    void addOnCanBeEnabledInDraftBeforeItsCommercialSetupIsComplete() {
        var updated = service.updateProduct(
            actorUserId,
            productId,
            new PlatformCatalogManagementService.ProductUpdateRequest(
                "Catalog management add-on",
                9999,
                true
            )
        );

        assertThat(updated).containsEntry("active", true);

        var validation = service.validateDraft(actorUserId, versionId);
        assertThat(validation).containsEntry("ready", false);
        @SuppressWarnings("unchecked")
        var blockers = (List<Map<String, Object>>) validation.get("blockers");
        assertThat(blockers)
            .isNotEmpty()
            .anyMatch(blocker ->
                "addon_catalog_management".equals(blocker.get("product_code"))
                    && ("MISSING_BILLING_RATES".equals(blocker.get("code"))
                        || "MODULE_NOT_AVAILABLE".equals(blocker.get("code")))
            );
    }

    @Test
    void productCapabilitiesCanBeManagedFromTheCatalogDraft() {
        service.updateProduct(
            actorUserId,
            productId,
            new PlatformCatalogManagementService.ProductUpdateRequest(
                "Catalog management add-on",
                9999,
                false,
                List.of("human_resources", "inventory")
            )
        );

        assertThat(jdbc.queryForList(
            "SELECT capability_code FROM billing_product_capabilities WHERE product_id = ? ORDER BY capability_code",
            String.class,
            productId
        )).containsExactly("human_resources", "inventory");
    }

    @Test
    void creatingAPackagePreparesBothRecurringPricesInTheDraft() {
        var created = service.createProduct(
            actorUserId,
            new PlatformCatalogManagementService.ProductCreateRequest(
                "Paquete operativo",
                500,
                false,
                List.of("human_resources", "inventory")
            )
        );

        var createdProductId = ((Number) created.get("id")).longValue();
        assertThat(created).containsEntry("product_type", "ADDON");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM billing_catalog_prices WHERE catalog_product_id = ? AND billing_interval IN ('MONTH', 'YEAR')",
            Integer.class,
            createdProductId
        )).isEqualTo(2);
        assertThat(jdbc.queryForList(
            "SELECT capability_code FROM billing_product_capabilities WHERE product_id = ? ORDER BY capability_code",
            String.class,
            createdProductId
        )).containsExactly("human_resources", "inventory");
    }

    @Test
    void catalogProjectionExposesCommercialKindsAndPricesForClientConfiguration() {
        var catalog = platformAdminService.catalog(actorUserId);
        @SuppressWarnings("unchecked")
        var products = (List<Map<String, Object>>) catalog.get("products");

        var product = products.stream()
            .filter(candidate -> "addon_catalog_management".equals(candidate.get("product_code")))
            .findFirst()
            .orElseThrow();
        assertThat(product)
            .containsEntry("commercial_kind", "MODULE")
            .containsEntry("monthly_price_cents", 900L)
            .containsKey("commercial_model");
        @SuppressWarnings("unchecked")
        var stripeEnvironment = (Map<String, Object>) catalog.get("stripe_environment");
        assertThat(stripeEnvironment)
            .containsEntry("enabled", true)
            .containsEntry("mode", "TEST")
            .containsEntry("catalog_live_sync_enabled", false);
    }

    @Test
    void quantityAndStorageProductsKeepTheirCommercialKindWhenEdited() {
        for (var productCode : List.of("module_additional_unit", "storage_block_5_gib")) {
            var helperProduct = jdbc.queryForMap(
                "SELECT id, display_name, sort_order, active, commercial_kind FROM billing_catalog_products WHERE catalog_version_id = ? AND product_code = ?",
                versionId,
                productCode
            );
            var helperProductId = ((Number) helperProduct.get("id")).longValue();
            var commercialKind = helperProduct.get("commercial_kind").toString();

            var updated = service.updateProduct(
                actorUserId,
                helperProductId,
                new PlatformCatalogManagementService.ProductUpdateRequest(
                    helperProduct.get("display_name").toString(),
                    ((Number) helperProduct.get("sort_order")).intValue(),
                    Boolean.parseBoolean(helperProduct.get("active").toString()),
                    null,
                    commercialKind,
                    null,
                    null
                )
            );

            assertThat(updated).containsEntry("commercial_kind", commercialKind);
            assertThat(jdbc.queryForObject(
                "SELECT commercial_kind FROM billing_catalog_products WHERE id = ?",
                String.class,
                helperProductId
            )).isEqualTo(commercialKind);
        }
    }

    @Test
    void catalogPricesAreCreatedInStripeTestAsTaxExclusiveAndPersisted() {
        given(stripeCatalogGateway.account())
            .willReturn(new StripeCatalogGateway.AccountResult("acct_catalog_test", true, true));
        given(stripeCatalogGateway.upsertProduct(any(), anyString()))
            .willReturn(new StripeCatalogGateway.ProductResult("prod_catalog_test", false));
        given(stripeCatalogGateway.verifyProduct("prod_catalog_test"))
            .willReturn(new StripeCatalogGateway.ProductVerification(
                "prod_catalog_test", "Catalog management add-on", "txcd_10103001", true, false
            ));
        given(stripeCatalogGateway.createRecurringPrice(any(), anyString()))
            .willAnswer(invocation -> {
                var command = invocation.getArgument(0, StripeCatalogGateway.PriceCommand.class);
                var suffix = "month".equals(command.interval()) ? "monthly" : "annual";
                return new StripeCatalogGateway.PriceResult("price_synced_" + suffix, "exclusive", false);
            });
        given(stripeCatalogGateway.verifyRecurringPrice(anyString()))
            .willAnswer(invocation -> {
                var priceId = invocation.getArgument(0, String.class);
                var monthly = priceId.endsWith("monthly");
                return new StripeCatalogGateway.PriceVerification(
                    priceId, "prod_catalog_test", "usd", monthly ? 1_200L : 12_000L,
                    monthly ? "month" : "year", "exclusive", true, false
                );
            });

        var result = stripeSynchronizationService.synchronize(
            actorUserId,
            productId,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(1_200L, 12_000L)
        );

        assertThat(result)
            .containsEntry("stripe_mode", "TEST")
            .containsEntry("stripe_account_id", "acct_catalog_test")
            .containsEntry("tax_behavior", "EXCLUSIVE")
            .containsEntry("tax_code", "txcd_10103001")
            .containsEntry("automatic_tax_enabled", true);
        assertThat(jdbc.queryForMap(
            "SELECT external_product_id, stripe_tax_code, stripe_mode, stripe_account_id, stripe_sync_status FROM billing_catalog_products WHERE id = ?",
            productId
        )).containsEntry("external_product_id", "prod_catalog_test")
            .containsEntry("stripe_tax_code", "txcd_10103001")
            .containsEntry("stripe_mode", "TEST")
            .containsEntry("stripe_account_id", "acct_catalog_test")
            .containsEntry("stripe_sync_status", "READY");
        assertThat(jdbc.queryForList(
            """
                SELECT billing_interval, unit_amount_cents, external_price_id, stripe_tax_behavior, status
                FROM billing_catalog_prices WHERE catalog_product_id = ? ORDER BY billing_interval
                """,
            productId
        )).allSatisfy(price -> {
            assertThat(price).containsEntry("stripe_tax_behavior", "EXCLUSIVE");
            assertThat(price).containsEntry("status", "READY");
            assertThat(price.get("external_price_id").toString()).startsWith("price_synced_");
        });
        verify(stripeCatalogGateway).upsertProduct(any(), anyString());

        var repeated = stripeSynchronizationService.synchronize(
            actorUserId,
            productId,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(1_200L, 12_000L)
        );
        assertThat(repeated.get("operation_id")).isNotEqualTo(result.get("operation_id"));
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM billing_catalog_stripe_sync_operations WHERE catalog_product_id = ?",
            Integer.class,
            productId
        )).isEqualTo(2);
    }

    @Test
    void partialStripeFailureIsRecordedWithoutPublishingPartialDatabaseState() {
        given(stripeCatalogGateway.account())
            .willReturn(new StripeCatalogGateway.AccountResult("acct_catalog_test", true, true));
        given(stripeCatalogGateway.upsertProduct(any(), anyString()))
            .willReturn(new StripeCatalogGateway.ProductResult("prod_catalog_partial", false));
        given(stripeCatalogGateway.verifyProduct("prod_catalog_partial"))
            .willReturn(new StripeCatalogGateway.ProductVerification(
                "prod_catalog_partial", "Catalog management add-on", "txcd_10103001", true, false
            ));
        var calls = new AtomicInteger();
        given(stripeCatalogGateway.createRecurringPrice(any(), anyString()))
            .willAnswer(invocation -> {
                if (calls.incrementAndGet() == 2) {
                    throw new StripeGatewayException("Annual price failed", null);
                }
                return new StripeCatalogGateway.PriceResult("price_partial_month", "exclusive", false);
            });
        given(stripeCatalogGateway.verifyRecurringPrice("price_partial_month"))
            .willReturn(new StripeCatalogGateway.PriceVerification(
                "price_partial_month", "prod_catalog_partial", "usd", 1_200L,
                "month", "exclusive", true, false
            ));

        assertThatThrownBy(() -> stripeSynchronizationService.synchronize(
            actorUserId,
            productId,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(1_200L, 12_000L)
        )).isInstanceOf(StripeGatewayException.class);

        assertThat(jdbc.queryForMap(
            "SELECT external_product_id, stripe_sync_status FROM billing_catalog_products WHERE id = ?",
            productId
        )).containsEntry("stripe_sync_status", "PENDING")
            .containsEntry("external_product_id", null);
        assertThat(jdbc.queryForList(
            "SELECT unit_amount_cents, external_price_id FROM billing_catalog_prices WHERE catalog_product_id = ? ORDER BY billing_interval",
            productId
        )).allSatisfy(price -> assertThat(price.get("external_price_id").toString()).startsWith("price_catalog_management"));
        assertThat(jdbc.queryForMap(
            "SELECT status, attempt_count, last_error FROM billing_catalog_stripe_sync_operations WHERE catalog_product_id = ?",
            productId
        )).containsEntry("status", "FAILED")
            .containsEntry("attempt_count", 1)
            .containsEntry("last_error", "Annual price failed");

        calls.set(0);
        doAnswer(invocation -> {
                var command = invocation.getArgument(0, StripeCatalogGateway.PriceCommand.class);
                var suffix = "month".equals(command.interval()) ? "month" : "year";
                return new StripeCatalogGateway.PriceResult("price_partial_" + suffix, "exclusive", false);
            })
            .when(stripeCatalogGateway).createRecurringPrice(any(), anyString());
        given(stripeCatalogGateway.verifyRecurringPrice(anyString()))
            .willAnswer(invocation -> {
                var externalId = invocation.getArgument(0, String.class);
                var monthly = externalId.endsWith("month");
                return new StripeCatalogGateway.PriceVerification(
                    externalId, "prod_catalog_partial", "usd", monthly ? 1_200L : 12_000L,
                    monthly ? "month" : "year", "exclusive", true, false
                );
            });

        stripeSynchronizationService.synchronize(
            actorUserId,
            productId,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(1_200L, 12_000L)
        );

        assertThat(jdbc.queryForMap(
            "SELECT status, attempt_count, last_error FROM billing_catalog_stripe_sync_operations WHERE catalog_product_id = ?",
            productId
        )).containsEntry("status", "SUCCEEDED")
            .containsEntry("attempt_count", 2)
            .containsEntry("last_error", null);
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM billing_catalog_stripe_sync_operations WHERE catalog_product_id = ?",
            Integer.class,
            productId
        )).isEqualTo(1);
    }

    @Test
    void aRunningOperationPreventsASecondStripeSynchronizationForTheSameProductAndMode() {
        jdbc.update(
            """
                INSERT INTO billing_catalog_stripe_sync_operations (
                    operation_key, catalog_version_id, catalog_product_id, stripe_mode,
                    stripe_account_id, monthly_amount_cents, annual_amount_cents,
                    status, running_scope, attempt_count, started_at
                ) VALUES (?, ?, ?, 'TEST', 'acct_catalog_test', 1200, 12000,
                          'RUNNING', ?, 1, CURRENT_TIMESTAMP(6))
                """,
            UUID.randomUUID().toString(), versionId, productId, productId + ":TEST"
        );
        given(stripeCatalogGateway.account())
            .willReturn(new StripeCatalogGateway.AccountResult("acct_catalog_test", true, true));

        assertThatThrownBy(() -> stripeSynchronizationService.synchronize(
            actorUserId,
            productId,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(1_300L, 13_000L)
        )).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("sincronización de Stripe en curso");

        verify(stripeCatalogGateway, never()).upsertProduct(any(), anyString());
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM billing_catalog_stripe_sync_operations WHERE catalog_product_id = ?",
            Integer.class,
            productId
        )).isEqualTo(1);
    }

    @Test
    void anAdministratorPriceChangeDuringStripeCallsIsNotOverwrittenByTheLateResponse() {
        stubSuccessfulStripeSynchronization();
        var calls = new AtomicInteger();
        doAnswer(invocation -> {
                var command = invocation.getArgument(0, StripeCatalogGateway.PriceCommand.class);
                var suffix = "month".equals(command.interval()) ? "monthly" : "annual";
                if (calls.incrementAndGet() == 1) {
                    jdbc.update(
                        "UPDATE billing_catalog_prices SET unit_amount_cents = 777, status = 'DRAFT' WHERE id = ?",
                        priceId
                    );
                }
                return new StripeCatalogGateway.PriceResult("price_synced_" + suffix, "exclusive", false);
            })
            .when(stripeCatalogGateway).createRecurringPrice(any(), anyString());

        assertThatThrownBy(() -> stripeSynchronizationService.synchronize(
            actorUserId,
            productId,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(1_200L, 12_000L)
        )).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("precios cambiaron durante la sincronización");

        assertThat(jdbc.queryForMap(
            "SELECT unit_amount_cents, external_price_id, status FROM billing_catalog_prices WHERE id = ?",
            priceId
        )).containsEntry("unit_amount_cents", 777L)
            .containsEntry("external_price_id", "price_catalog_management_test")
            .containsEntry("status", "DRAFT");
        assertThat(jdbc.queryForMap(
            "SELECT status, running_scope FROM billing_catalog_stripe_sync_operations WHERE catalog_product_id = ?",
            productId
        )).containsEntry("status", "FAILED")
            .containsEntry("running_scope", null);
    }

    @Test
    void validationRejectsARemoteStripePriceThatNoLongerMatchesTheCatalog() {
        stubSuccessfulStripeSynchronization();
        stripeSynchronizationService.synchronize(
            actorUserId,
            productId,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(1_200L, 12_000L)
        );
        jdbc.update("UPDATE billing_catalog_products SET active = 1 WHERE id = ?", productId);
        given(stripeCatalogGateway.verifyRecurringPrice(anyString()))
            .willAnswer(invocation -> new StripeCatalogGateway.PriceVerification(
                invocation.getArgument(0, String.class), "prod_catalog_test", "usd", 99_999L,
                invocation.getArgument(0, String.class).endsWith("monthly") ? "month" : "year",
                "exclusive", true, false
            ));

        var validation = service.validateDraft(actorUserId, versionId);
        @SuppressWarnings("unchecked")
        var blockers = (List<Map<String, Object>>) validation.get("blockers");

        assertThat(validation).containsEntry("ready", false);
        assertThat(blockers).anyMatch(blocker -> "STRIPE_PRICE_MISMATCH".equals(blocker.get("code")));
        assertThat(jdbc.queryForList(
            "SELECT stripe_sync_status FROM billing_catalog_prices WHERE catalog_product_id = ?",
            String.class,
            productId
        )).containsOnly("ERROR");
    }

    @Test
    void validationBindsAndVerifiesPromotionCodesAgainstTheConfiguredStripeAccount() {
        given(stripeCatalogGateway.account())
            .willReturn(new StripeCatalogGateway.AccountResult("acct_catalog_test", true, true));
        given(stripeCatalogGateway.verifyPromotionCode("promo_catalog_test"))
            .willReturn(new StripeCatalogGateway.PromotionVerification(
                "promo_catalog_test", "SAVE20", "PERCENT", 2_000, null, null,
                "ONCE", null, List.of(), true, false
            ));
        var created = service.createPromotion(
            actorUserId,
            new PlatformCatalogManagementService.PromotionRequest(
                "SAVE20", "Save twenty", null, "PERCENT", 2_000, null,
                "ONCE", null, null, null, "promo_catalog_test", true, 10, List.of()
            )
        );

        service.validateDraft(actorUserId, versionId);

        assertThat(jdbc.queryForMap(
            "SELECT stripe_mode, stripe_account_id, stripe_sync_status, stripe_verified_at FROM billing_catalog_promotions WHERE id = ?",
            created.get("id")
        )).containsEntry("stripe_mode", "TEST")
            .containsEntry("stripe_account_id", "acct_catalog_test")
            .containsEntry("stripe_sync_status", "READY")
            .doesNotContainEntry("stripe_verified_at", null);
    }

    private void stubSuccessfulStripeSynchronization() {
        given(stripeCatalogGateway.account())
            .willReturn(new StripeCatalogGateway.AccountResult("acct_catalog_test", true, true));
        given(stripeCatalogGateway.upsertProduct(any(), anyString()))
            .willReturn(new StripeCatalogGateway.ProductResult("prod_catalog_test", false));
        given(stripeCatalogGateway.verifyProduct("prod_catalog_test"))
            .willReturn(new StripeCatalogGateway.ProductVerification(
                "prod_catalog_test", "Catalog management add-on", "txcd_10103001", true, false
            ));
        given(stripeCatalogGateway.createRecurringPrice(any(), anyString()))
            .willAnswer(invocation -> {
                var command = invocation.getArgument(0, StripeCatalogGateway.PriceCommand.class);
                var suffix = "month".equals(command.interval()) ? "monthly" : "annual";
                return new StripeCatalogGateway.PriceResult("price_synced_" + suffix, "exclusive", false);
            });
        given(stripeCatalogGateway.verifyRecurringPrice(anyString()))
            .willAnswer(invocation -> {
                var priceId = invocation.getArgument(0, String.class);
                var monthly = priceId.endsWith("monthly");
                return new StripeCatalogGateway.PriceVerification(
                    priceId, "prod_catalog_test", "usd", monthly ? 1_200L : 12_000L,
                    monthly ? "month" : "year", "exclusive", true, false
                );
            });
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM platform_audit_events WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM billing_catalog_promotions WHERE promotion_code = 'SAVE20'");
        jdbc.update("DELETE FROM billing_catalog_prices WHERE billable_code = 'addon_catalog_management'");
        jdbc.update("DELETE FROM billing_catalog_products WHERE product_code = 'addon_catalog_management'");
        jdbc.update(
            "DELETE FROM platform_administrators WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
