package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "app.entitlements.enforcement-enabled=false",
    "app.entitlements.projection-enabled=false"
})
class PlatformCatalogManagementServiceIntegrationTest {

    private static final String EMAIL_PREFIX = "catalog-management-";
    private static final String VERSION_PREFIX = "catalog-management-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformCatalogManagementService service;

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
        var versionCode = VERSION_PREFIX + discriminator;
        jdbc.update(
            "INSERT INTO billing_catalog_versions (version_code, status) VALUES (?, 'DRAFT')",
            versionCode
        );
        versionId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
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

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM platform_audit_events WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM billing_catalog_versions WHERE version_code LIKE ?",
            VERSION_PREFIX + "%"
        );
        jdbc.update(
            "DELETE FROM platform_administrators WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)",
            EMAIL_PREFIX + "%"
        );
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
